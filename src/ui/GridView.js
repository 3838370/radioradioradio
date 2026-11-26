import { PatternBank } from '../music/PatternBank.js';
import { MathUtil } from '../core/MathUtil.js';
import { SequencerView } from './SequencerView.js';
import { Theme } from './Theme.js';

// GridView: the GRELHA view (the 4th, beside the cards, the full code and the sequencer).
// One box per layer:
//   a layer with grid()s   each grid as it is written, its cursors where they are now and
//                          the cells they just played lit
//   any other layer        what it played, as cells per sound (like the sequencer); long
//                          notes (pads, drones) as bars
// Each box is drawn once into a picture of its own and drawn again only when it changes
// (its grids' text, its sounds, its width); each frame only places the pictures and draws
// the cursors, the lights and the playhead on top. The view scrolls like the cards.
export class GridView {
  static CELL_H = 18;
  static HEADER = 24;

  constructor() {
    this.scroll = 0;
    this.area = null;
    this.contentH = 0;
    this.boxes = [];       // what was drawn: [{ layer, x, y, w, h, parts: [...] }] (for clicks)
    this.pictures = new Map(); // layer id -> { key, canvas }
    this.rowsCache = new Map(); // layer id -> { at, rows } (what it played, ~10 times a second)
  }

  // The grids of a layer that the view draws as grids: [{ name, g }]
  static gridsOf(layer) {
    return Object.entries(layer.grids || {}).map(([name, g]) => ({ name, g }));
  }

  // Where a grid's cursors are at `beat`: { k, positions: [[x, y]], prev } or null.
  static cursorsAt(layer, name, beat) {
    const st = layer.vars && layer.vars.get('grid:' + name);
    if (!st || !st.trace || !st.trace.length) return null;
    for (let i = st.trace.length - 1; i >= 0; i--) {
      const t = st.trace[i];
      if (beat + 1e-6 >= t.start) {
        const k = Math.floor((beat - t.start) / t.passo + 1e-6);
        if (k >= t.path.length) return { k, positions: t.path[t.path.length - 1], prev: null };
        return { k, positions: t.path[k], prev: k > 0 ? t.path[k - 1] : (st.trace[i - 1] ? st.trace[i - 1].path[st.trace[i - 1].path.length - 1] : null) };
      }
    }
    return null;
  }

  // What a layer without grids played, as rows (the sequencer's), at most ~10 times a second.
  rowsOf(layer, beat, now) {
    const c = this.rowsCache.get(layer.id);
    if (c && now - c.at < 100) return c.rows;
    const rows = SequencerView.rows(layer, beat).slice(0, 8).map((r) => Object.assign(r, { long: GridView.isLong(layer, r.key, beat) }));
    this.rowsCache.set(layer.id, { at: now, rows });
    return rows;
  }

  // Long notes (pads, drones): a row whose recent notes last 2 beats or more.
  static isLong(layer, key, beat) {
    let n = 0, long = 0;
    for (const e of layer.played || []) {
      if (e.key !== key || e.beat < beat - 16 || e.beat > beat + 4) continue;
      n++;
      if ((e.dur || 0) >= 2) long++;
    }
    return n > 0 && long / n >= 0.5;
  }

  // The height of a layer's box at width w.
  boxHeight(layer, rows) {
    const H = GridView.CELL_H;
    const grids = GridView.gridsOf(layer);
    if (grids.length) return GridView.HEADER + grids.reduce((s, { g }) => s + 16 + g.h * H + 10, 0) + 4;
    return GridView.HEADER + Math.max(1, rows.length) * 15 + 12;
  }

  draw(p, x0, y0, w, h, m, layers, beat, now) {
    const T = Theme;
    this.area = { x: x0, y: y0, w, h };
    const cols = w > 1200 ? 3 : w > 760 ? 2 : 1;
    const gap = 10;
    const bw = (w - gap * (cols - 1)) / cols;
    const colY = new Array(cols).fill(0);
    const place = [];
    for (const layer of layers) {
      const rows = GridView.gridsOf(layer).length ? [] : this.rowsOf(layer, beat, now);
      const bh = this.boxHeight(layer, rows);
      let k = 0;
      for (let j = 1; j < cols; j++) if (colY[j] < colY[k]) k = j;
      place.push({ layer, rows, x: x0 + k * (bw + gap), top: colY[k], w: bw, h: bh });
      colY[k] += bh + gap;
    }
    this.contentH = Math.max(0, ...colY) - gap;
    this.scroll = Math.max(0, Math.min(this.scroll, this.contentH - h));
    const ctx = p.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 1, y0, w + 2, h);
    ctx.clip();
    this.boxes = [];
    const live = new Set();
    for (const b of place) {
      live.add(b.layer.id);
      const y = y0 + b.top - this.scroll;
      if (y > y0 + h || y + b.h < y0) continue;
      const pic = this.picture(p, b, m);
      const d = pic.d;
      const alpha = b.layer.muted || b.layer.silenced ? 0.4 : 1;
      ctx.globalAlpha = alpha;
      ctx.drawImage(pic.canvas, b.x, y, pic.canvas.width / d, pic.canvas.height / d);
      ctx.globalAlpha = 1;
      this.overlay(p, b, y, beat, pic, alpha);
      this.boxes.push({ layer: b.layer, x: b.x, y, w: b.w, h: b.h, parts: pic.parts });
    }
    ctx.restore();
    for (const id of this.pictures.keys()) if (!live.has(id)) this.pictures.delete(id);
    if (this.contentH > h) { // where you are: a thin bar on the right edge
      const bh = Math.max(24, (h * h) / this.contentH);
      const by = y0 + (h - bh) * (this.scroll / (this.contentH - h));
      p.noStroke();
      p.fill(T.faint);
      p.rect(x0 + w + 4, y0, 2, h);
      p.fill(T.dim);
      p.rect(x0 + w + 4, by, 2, bh);
    }
    if (!layers.length) { p.fill(T.dim); p.textSize(m.small); p.text('ainda nada a tocar', x0 + m.pad, y0 + 24); }
  }

  // The fixed part of a box, as a picture: the frame, the header, each grid's cells with
  // their text (or what the layer played). Redrawn only when its key changes.
  picture(p, b, m) {
    const T = Theme;
    const layer = b.layer;
    const grids = GridView.gridsOf(layer);
    const tags = (layer.locked ? ' · bloqueado' : '') + (layer.soloed ? ' · solo' : '') + (layer.muted ? ' · mudo' : '');
    const content = grids.length
      ? grids.map(({ name, g }) => name + ':' + g.rows.map((r) => r.map((c) => c.raw).join(' ')).join('|')).join('/')
      : b.rows.map((r) => `${r.key}:${r.steps}:${r.cells.map((v) => (v > 0 ? 1 : 0)).join('')}:${r.long}`).join('/');
    const d = p.pixelDensity();
    const key = `${b.w}|${b.h}|${d}|${layer.role}|${layer.patternId}|${tags}|${content}`;
    const old = this.pictures.get(layer.id);
    if (old && old.key === key) return old;
    const canvas = (old && old.canvas) || document.createElement('canvas');
    canvas.width = Math.ceil(b.w * d);
    canvas.height = Math.ceil(b.h * d);
    const g = canvas.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, b.w, b.h);
    const col = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
    const font = (size) => `${size}px ${Theme.font}`;
    g.textBaseline = 'alphabetic';
    // frame and header
    g.strokeStyle = col(T.faint);
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, b.w - 1, b.h - 1);
    g.font = font(m.small);
    g.fillStyle = col(T.bright);
    const role = PatternBank.roleLabel(layer.role).toUpperCase();
    g.fillText(role, m.pad, 16);
    g.fillStyle = col(T.dim);
    g.fillText(`${layer.patternId}${grids.length ? ' · grelha' : ''}${tags}`, m.pad + g.measureText(role + '  ').width, 16);
    const parts = [];
    let cy = GridView.HEADER;
    const H = GridView.CELL_H;
    if (grids.length) {
      for (const { name, g: gr } of grids) {
        g.fillStyle = col(T.dim);
        g.font = font(m.small - 1);
        g.fillText(`${name} · ${gr.opts.tipo}${gr.opts.tipo === 'instrumento' ? ` · ${gr.starts.length} cursor${gr.starts.length > 1 ? 'es' : ''}` : ''}`, m.pad, cy + 11);
        cy += 16;
        const cw = Math.max(12, Math.min(40, (b.w - 2 * m.pad) / gr.w));
        const part = { name, g: gr, x: m.pad, y: cy, cw, ch: H };
        parts.push(part);
        g.font = font(Math.min(m.small, Math.max(8, cw * 0.55)));
        for (let yy = 0; yy < gr.h; yy++) {
          for (let xx = 0; xx < gr.w; xx++) {
            const c = gr.rows[yy][xx];
            const px = part.x + xx * cw, py = cy + yy * H;
            g.strokeStyle = col(xx % 4 === 0 ? T.line || T.faint : T.faint);
            g.strokeRect(px + 0.5, py + 0.5, cw - 1, H - 1);
            if (c.raw === '.' || c.raw === '') continue;
            g.fillStyle = col(c.kind === 'play' ? T.text : T.dim);
            let t = c.raw;
            while (t.length > 1 && g.measureText(t).width > cw - 3) t = t.slice(0, -1);
            g.fillText(t, px + (cw - g.measureText(t).width) / 2, py + H - 5);
          }
        }
        cy += gr.h * H + 10;
      }
    } else {
      // what it played: one row per sound, the last cycle in cells; long notes as bars
      const steps = Math.max(1, ...b.rows.map((r) => r.steps));
      const labelW = Math.min(120, b.w * 0.3);
      const cw = (b.w - 2 * m.pad - labelW) / steps;
      const part = { name: null, rows: b.rows, x: m.pad + labelW, y: cy, cw, ch: 15 };
      parts.push(part);
      g.font = font(m.small - 1);
      if (!b.rows.length) { g.fillStyle = col(T.faint); g.fillText('(ainda sem sons)', m.pad, cy + 12); }
      b.rows.forEach((r, i) => {
        const ry = cy + i * 15;
        g.fillStyle = col(T.dim);
        let label = r.key;
        while (label.length > 3 && g.measureText(label).width > labelW - 6) label = label.slice(0, -1);
        g.fillText(label, m.pad, ry + 11);
        if (r.long) {
          // a long note: one bar over the row
          g.fillStyle = col(T.dim, 0.6);
          g.fillRect(part.x, ry + 5, r.steps * cw, 5);
          return;
        }
        for (let s = 0; s < r.steps; s++) {
          const v = r.cells[s];
          const px = part.x + s * cw;
          if (v > 0) { g.fillStyle = col(T.dim, 0.5 + 0.5 * v); g.fillRect(px + 1.5, ry + 3, cw - 3, 9); }
          else { g.strokeStyle = col(T.faint); g.strokeRect(px + 2, ry + 3.5, cw - 4, 8); }
        }
      });
    }
    const pic = { key, canvas, d, parts };
    this.pictures.set(layer.id, pic);
    return pic;
  }

  // What moves, over the picture: the cursors and the cells they just played; the playhead
  // for layers without grids.
  overlay(p, b, y, beat, pic, alpha) {
    const T = Theme;
    p.noFill();
    for (const part of pic.parts) {
      if (part.g) {
        const at = GridView.cursorsAt(b.layer, part.name, beat);
        if (!at || !at.positions) continue;
        const cell = (pos, a, solid) => {
          const [cx, cy] = pos;
          const px = b.x + part.x + cx * part.cw, py = y + part.y + cy * part.ch;
          const c = part.g.rows[cy] && part.g.rows[cy][cx];
          if (solid && c && c.kind === 'play') { p.noStroke(); p.fill(T.bright[0], T.bright[1], T.bright[2], 70 * a * alpha); p.rect(px + 1, py + 1, part.cw - 2, part.ch - 2); }
          p.noFill();
          p.stroke(T.bright[0], T.bright[1], T.bright[2], 255 * a * alpha);
          p.rect(px + 1, py + 1, part.cw - 2, part.ch - 2);
        };
        if (at.prev) for (const pos of at.prev) cell(pos, 0.3, false);
        for (const pos of at.positions) cell(pos, 1, true);
      } else if (part.rows && part.rows.length) {
        const r0 = part.rows[0];
        const head = MathUtil.mod(Math.floor((beat - SequencerView.window(b.layer, r0.loop, beat).start) * 4), r0.steps);
        p.noStroke();
        p.fill(T.bright[0], T.bright[1], T.bright[2], 60 * alpha);
        p.rect(b.x + part.x + head * part.cw, y + part.y, Math.max(1, part.cw), part.rows.length * part.ch);
      }
    }
    p.noStroke();
  }

  contains(mx, my) {
    const a = this.area;
    return !!a && mx >= a.x && mx <= a.x + a.w + 8 && my >= a.y && my <= a.y + a.h;
  }

  wheel(delta) { this.scroll = Math.max(0, this.scroll + delta); }

  // The cell under the mouse: { layer, name, g, x, y, cell } (a grid cell), or null.
  cellAt(mx, my) {
    if (!this.contains(mx, my)) return null;
    for (const b of this.boxes) {
      if (mx < b.x || mx > b.x + b.w || my < b.y || my > b.y + b.h) continue;
      for (const part of b.parts) {
        if (!part.g) continue;
        const cx = Math.floor((mx - b.x - part.x) / part.cw), cy = Math.floor((my - b.y - part.y) / part.ch);
        if (cx >= 0 && cy >= 0 && cx < part.g.w && cy < part.g.h) return { layer: b.layer, name: part.name, g: part.g, x: cx, y: cy, cell: part.g.rows[cy][cx] };
      }
      return { layer: b.layer, name: null };
    }
    return null;
  }
};
