// SequencerView: what's playing as step grids, one block per layer and one row per sound
// ('folder:n' for samples, the instrument name for synths, marked ~). Each row shows the
// cycle of the loop that plays it, in 16ths: 16 steps for a bar, or 12, 20, 22... for
// IDM loops of other lengths (long loops, over 32 steps, show the bar being heard). The
// cells are wide, low bars that light white as the playhead passes a hit.
// It only reads the layers; every change it asks for is a code edit (see App.seqAction),
// so the grid, the cards and the full code always agree:
//   [●]/[○]  the sound on/off           → the layer's mute(...) line
//   a cell   add/remove a hit           → a hits('key', 'x...') row in a 'hand' loop
//   [×]      give the row back          → the hits row is removed
//   a name   hear the sound
//   [M] [L]  mute / lock the layer
RA.SequencerView = class SequencerView {
  static MAX_STEPS = 32;

  constructor() {
    this.scroll = 0; // in pixels
    this.hits = [];
    this.rect = null;
  }

  // The window a loop's row shows at `beat`: { start, len (beats), steps }.
  static window(layer, loopName, beat, steps = null) {
    const it = loopName && layer.iterationAt ? layer.iterationAt(loopName, beat) : null;
    if (it) {
      const n = Math.round(it.len * 4);
      if (n >= 2 && n <= SequencerView.MAX_STEPS) return { start: it.start, len: it.len, steps: n };
      return { start: it.start + Math.floor((beat - it.start) / 4) * 4, len: 4, steps: 16 };
    }
    // not started yet (a new hand loop): count from the bar
    const n = steps || 16;
    const b0 = Math.floor(beat / 4) * 4;
    return { start: b0, len: n / 4, steps: n };
  }

  // The rows of one layer at `beat`:
  // [{ key, kind, loop, steps, cells: [0..1 per step], head, hand, muted, last }]
  static rows(layer, beat) {
    const mutes = layer.mutes || new Set();
    const hand = new Map(RA.CodeTools.hitsRows(layer.code).map((r) => [r.key, r]));
    const byKey = new Map();
    const row = (key, kind) => {
      if (!byKey.has(key)) byKey.set(key, { key, kind, loop: null, events: [], hand: hand.has(key), muted: mutes.has(key), last: null });
      return byKey.get(key);
    };
    for (const ev of layer.played || []) {
      if (ev.silent === 'hand') continue;          // replaced by its hits row
      if (ev.beat < beat - 32 || ev.beat > beat + 64) continue; // the last 8 bars name the rows
      const r = row(ev.key, ev.kind);
      r.events.push(ev);
      if (ev.beat <= beat + 4) { r.loop = ev.loop; r.last = ev; }
      else if (!r.loop) r.loop = ev.loop;
    }
    for (const key of hand.keys()) row(key, key.includes(':') ? 's' : 'synth');
    for (const key of mutes) row(key, key.includes(':') ? 's' : 'synth');

    const out = [];
    for (const r of byKey.values()) {
      const h = hand.get(r.key);
      const w = h ? SequencerView.window(layer, h.loop, beat, h.pattern.length) : SequencerView.window(layer, r.loop, beat);
      const cells = new Array(w.steps).fill(0);
      if (h) {
        [...h.pattern].slice(0, w.steps).forEach((c, k) => { cells[k] = c === 'X' ? 1 : c === 'x' ? 0.7 : 0; });
      } else {
        for (const ev of r.events) {
          const step = Math.floor((ev.beat - w.start) * 4 + 1e-6);
          if (step >= 0 && step < w.steps) cells[step] = Math.max(cells[step], RA.MathUtil.clamp(ev.amp != null ? ev.amp : 0.6, 0.15, 1));
        }
      }
      const head = RA.MathUtil.mod(Math.floor((beat - w.start) * 4), w.steps);
      out.push({ key: r.key, kind: r.kind, loop: h ? h.loop : r.loop, steps: w.steps, cells, head, hand: r.hand, muted: r.muted, last: r.last });
    }
    return out.sort((a, b) => (a.kind === b.kind ? a.key.localeCompare(b.key) : a.kind === 's' ? -1 : 1));
  }

  // The cycle lengths (in steps) of what's playing, for the HUD: one per layer, from the
  // loop that plays most of its sounds. Long loops (pads, drones) set no meter.
  static cycles(layers, beat) {
    const set = new Set();
    for (const layer of layers) {
      const count = new Map();
      for (const ev of layer.played || []) if (ev.beat > beat - 16 && ev.beat <= beat + 4 && !ev.silent) count.set(ev.loop, (count.get(ev.loop) || 0) + 1);
      for (const r of RA.CodeTools.hitsRows(layer.code)) count.set(r.loop, (count.get(r.loop) || 0) + 100);
      if (!count.size) continue;
      const main = [...count].sort((a, b) => b[1] - a[1])[0][0];
      const it = layer.iterationAt ? layer.iterationAt(main, beat) : null;
      if (it && Math.round(it.len * 4) > SequencerView.MAX_STEPS) continue;
      set.add(SequencerView.window(layer, main, beat).steps);
    }
    return [...set].sort((a, b) => a - b);
  }

  wheel(dy) { this.scroll = Math.max(0, this.scroll + dy); }

  draw(p, x, y, w, h, m, layers, beat, now) {
    const T = RA.Theme;
    this.rect = { x, y, w, h };
    this.hits = [];

    p.textSize(m.small);
    const g = {
      x, w, m, top: y, bottom: y + h,
      lh: Math.max(17, m.small + 7),       // row height
      labelW: Math.min(170, Math.max(100, w * 0.14)),
      btnW: p.textWidth('[●] '),
      tailW: p.textWidth(' 32  [×]') + 6,   // step count and the give-back button
    };
    g.gridX = x + m.pad + g.btnW + g.labelW;
    g.gridW = x + w - m.pad - g.tailW - g.gridX;

    const blocks = layers.map((layer) => ({ layer, rows: SequencerView.rows(layer, beat) }));
    const blockH = (b) => g.lh * (1.5 + Math.max(1, b.rows.length)) + 6;
    const total = blocks.reduce((s, b) => s + blockH(b) + 6, 0);
    this.scroll = Math.min(this.scroll, Math.max(0, total - h + 20));

    p.drawingContext.save();
    p.drawingContext.beginPath();
    p.drawingContext.rect(x, y, w, h);
    p.drawingContext.clip();
    let cy = y + 4 - this.scroll;
    for (const b of blocks) {
      const bh = blockH(b);
      if (cy + bh > y && cy < y + h) this.drawBlock(p, b.layer, b.rows, Object.assign({ cy }, g));
      cy += bh + 6;
    }
    p.drawingContext.restore();

    if (!layers.length) { p.fill(T.dim); p.text('nothing playing yet', x + m.pad, y + 24); }
  }

  drawBlock(p, layer, rows, g) {
    const T = RA.Theme;
    const { x, w, lh, gridX, gridW, btnW, labelW, m } = g;
    const add = (hit) => { if (hit.y + hit.h > g.top && hit.y < g.bottom) this.hits.push(hit); };
    let cy = g.cy;
    const a = layer.muted ? 0.4 : 1;
    const fill = (c, k = 1) => p.fill(c[0], c[1], c[2], 255 * a * k);

    // layer header: ROLE pattern            [M] [L]
    p.noStroke();
    fill(T.faint);
    p.rect(x, cy, w, 1);
    const hy = cy + lh * 0.95;
    fill(T.bright);
    const role = layer.role.toUpperCase();
    p.text(role, x + m.pad, hy);
    fill(T.dim);
    const seq = rows.some((r) => r.hand);
    p.text(`${layer.patternId}${seq ? ' · seq' : ''}${layer.locked ? ' · locked' : ''}`, x + m.pad + p.textWidth(role + '  '), hy);
    let bx = x + w - m.pad;
    for (const [type, label, on] of [['layer-lock', '[L]', layer.locked], ['layer-mute', '[M]', layer.muted]]) {
      const bw = p.textWidth(label);
      bx -= bw;
      if (on) { p.fill(T.bright); p.rect(bx - 1, hy - m.small - 1, bw + 2, m.small + 5); p.fill(T.bg); } else fill(T.dim);
      p.text(label, bx, hy);
      add({ type, layerId: layer.id, x: bx - 2, y: hy - m.small - 3, w: bw + 4, h: m.small + 8 });
      bx -= 8;
    }
    cy += lh * 1.5;

    if (!rows.length) { fill(T.faint); p.text('(no sounds yet)', x + m.pad, cy + lh * 0.7); return; }

    const cellH = 6;
    for (const r of rows) {
      const ty = cy + lh * 0.68;
      const k = r.muted ? 0.4 : 1;
      fill(r.muted ? T.dim : T.bright);
      p.text(r.muted ? '[○]' : '[●]', x + m.pad, ty);
      add({ type: 'mute-row', layerId: layer.id, key: r.key, x: x + m.pad - 2, y: cy, w: btnW - 2, h: lh });
      fill(r.hand ? T.bright : T.text, k);
      let name = r.key + (r.kind === 'synth' ? ' ~' : '');
      while (name.length > 3 && p.textWidth(name) > labelW - 8) name = name.slice(0, -1);
      p.text(name, x + m.pad + btnW, ty);
      add({ type: 'audition', layerId: layer.id, key: r.key, row: r, x: x + m.pad + btnW, y: cy, w: labelW - 6, h: lh });

      // cells: wide, low bars in groups of four
      const gap = 8; // between groups of four; cells are 6 px apart
      const groups = Math.ceil(r.steps / 4) - 1;
      const cw = (gridW - groups * gap) / r.steps;
      const yy = cy + (lh - cellH) / 2;
      for (let s = 0; s < r.steps; s++) {
        const cx = gridX + s * cw + Math.floor(s / 4) * gap;
        const v = r.cells[s];
        const now = s === r.head;
        if (v > 0) {
          if (now) p.fill(T.bright[0], T.bright[1], T.bright[2], 255 * a);
          else fill(T.dim, k * (0.5 + 0.5 * v));
          p.noStroke();
          p.rect(cx + 3, yy, cw - 6, cellH);
        } else {
          p.noFill();
          const c = now ? T.dim : T.faint;
          p.stroke(c[0], c[1], c[2], 255 * a);
          p.rect(cx + 3.5, yy + 0.5, cw - 7, cellH - 1);
          p.noStroke();
        }
        add({ type: 'cell', layerId: layer.id, key: r.key, step: s, row: r, x: cx, y: cy, w: cw, h: lh });
      }
      // the cycle length, and the button that gives a hand row back to the code
      const tx = gridX + gridW + 8;
      fill(r.steps === 16 ? T.faint : T.dim);
      p.text(String(r.steps), tx, ty);
      if (r.hand) {
        const rx = tx + p.textWidth('32  ');
        fill(T.dim);
        p.text('[×]', rx, ty);
        add({ type: 'release-row', layerId: layer.id, key: r.key, x: rx - 2, y: cy, w: p.textWidth('[×]') + 4, h: lh });
      }
      cy += lh;
    }
  }

  contains(mx, my) { const r = this.rect; return !!r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h; }

  hit(mx, my) {
    if (!this.contains(mx, my)) return null;
    return this.hits.find((b) => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
  }
};
