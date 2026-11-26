import { PatternBank } from '../music/PatternBank.js';
import { GridGen } from '../music/GridGen.js';
import { Rng } from '../core/Rng.js';
import { Theme } from './Theme.js';

// GridView: the GRELHA view. Every layer is a box with a small grid, like a little 2D
// program (a Befunge-ish circuit): one symbol per cell, the cursor is the lit cell.
//
//   [1] BATERIA (K + S/H)                          ON
//   ┌───┬───┬───┬───┐
//   │ > │ K │ S │ H │     K S H P  drums (kick, snare/clap, hat, other)   A C  notes, chords
//   │ K │ ? │ . │ S │     > < ^ v  turn   ?  any way   .  rest
//   ...
//   MUTA: A CADA 8 C   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ (the time to the next change)
//
// A layer written with grid() shows its own grid (click a cell to edit it). Any other layer
// shows its last bar as a 4×4 grid (GridFreeze.compact), the cursor on the step playing;
// [congelar] turns it into a real grid(). Each box is drawn once into a picture and redrawn
// only when its cells change; each frame draws only the cursor and the bar.
export class GridView {
  static RULER = ['.', '>', '<', '^', 'v', '?', '#', '=', '~', '*', '%'];
  static HEADER = 26;
  static FOOTER = 34;
  static RULER_H = 44;

  constructor() {
    this.scroll = 0;
    this.area = null;
    this.contentH = 0;
    this.boxes = [];
    this.hits = [];
    this.pictures = new Map();  // layer id -> { key, canvas, d }
    this.derived = new Map();   // layer id -> { bar, grid } (a layer's last bar as a 4×4 grid)
    this.sel = null;            // the selected cell: { layerId, name, x, y, draft, error }
    this.freezer = null;        // GridFreeze (set by the App)
  }

  static gridsOf(layer) {
    return Object.entries(layer.grids || {}).map(([name, g]) => ({ name, g }));
  }

  // Where a grid's cursors are at `beat`: { positions: [[x, y]] } or null.
  static cursorsAt(layer, name, beat) {
    const st = layer.vars && layer.vars.get('grid:' + name);
    if (!st || !st.trace || !st.trace.length) return null;
    for (let i = st.trace.length - 1; i >= 0; i--) {
      const t = st.trace[i];
      if (beat + 1e-6 >= t.start) {
        const k = Math.min(t.path.length - 1, Math.floor((beat - t.start) / t.passo + 1e-6));
        return { positions: t.path[k] };
      }
    }
    return null;
  }

  // What a box shows: { name, g (grid), own (a grid() of the layer) } or a derived 4×4 grid.
  shown(layer, beat) {
    const own = GridView.gridsOf(layer).find((x) => x.g.opts.tipo === 'instrumento') || GridView.gridsOf(layer)[0];
    if (own) return { name: own.name, rows: own.g.rows.map((r) => r.map((c) => c.raw)), g: own.g, own: true, legend: GridView.legendOf(own.g) };
    // any other layer: the program it would get with its own sounds (a preview; [pôr em
    // grelha] installs exactly this), made again only when its sounds change
    const bar = Math.floor(beat / 4);
    const d = this.derived.get(layer.id);
    if (d && d.bar === bar) return d.view;
    const prof = this.freezer ? this.freezer.profileOf(layer.played || [], beat - 16, beat) : { sounds: {}, counts: {}, steps: 64 };
    const sounds = prof.sounds;
    // how often it played (hits per step, with chords and kicks counted once a step) and how
    // much each sound: the grid keeps both
    const target = { density: (prof.onsets || 0) / Math.max(1, prof.steps), weights: prof.counts };
    const [w, h] = this.sizeOf(layer.id);
    // (made again when its sounds, the size or how dense it plays change)
    const key = `${w}x${h}|${Math.round(target.density * 10)}|` + Object.entries(sounds).map(([l, s]) => l + (s.som || `${s.s}:${s.n}`)).sort().join('|');
    if (d && d.key === key) { d.bar = bar; return d.view; }
    const letters = Object.keys(sounds);
    let seed = 7;
    for (const c of layer.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rows = letters.length ? new GridGen(new Rng(seed)).make(letters, layer.role, this.genre, w, h, target) : Array.from({ length: h }, () => new Array(w).fill('.').join(' '));
    const view = { name: null, rows: rows.map((r) => r.split(' ')), own: false, legend: GridView.legendOf({ sounds }), empty: !letters.length, sounds, preview: true };
    this.derived.set(layer.id, { bar, key, view });
    return view;
  }

  // The grid sizes a box goes through, clicking its size in the footer.
  static SIZES = [[2, 2], [3, 3], [4, 4], [6, 4], [8, 4], [8, 8]];

  sizeOf(layerId) { return (this.sizes && this.sizes.get(layerId)) || [4, 4]; }

  // The next size after [w, h].
  static nextSize(w, h) {
    const k = GridView.SIZES.findIndex(([a, b]) => a === w && b === h);
    return GridView.SIZES[(k + 1) % GridView.SIZES.length];
  }

  // "K + S/H" from a grid's sounds
  static legendOf(g) {
    const ls = Object.keys(g.sounds).map((l) => l.toUpperCase());
    return ls.length > 1 ? ls[0] + ' + ' + ls.slice(1).join('/') : ls.join('');
  }

  // status: { bpm, bar, nextMove, interval }
  draw(p, x0, y0, w, h, m, layers, beat, now, status = {}) {
    const T = Theme;
    this.m = m;
    // the status line: BPM · BAR · GRELHAS n/total
    const own = layers.filter((l) => GridView.gridsOf(l).length).length;
    p.noStroke();
    p.textSize(m.small);
    p.fill(T.dim);
    const line = `BPM ${Math.round(status.bpm || 0)}   |   COMPASSO ${status.bar || 0}   |   GRELHAS ${own}/${layers.length}`;
    p.text(line, x0 + w - p.textWidth(line), y0 + 11);
    const top = y0 + 20;
    const vh = h - 20;
    this.area = { x: x0, y: top, w, h: vh };
    // the boxes always fill the space: 1-3 side by side, 4 as 2×2, 5-6 as 3×2 (more: 3 a row)
    const n = Math.max(1, layers.length);
    const cols = w < 560 ? 1 : n <= 3 ? n : n === 4 ? 2 : 3;
    const rowsN = Math.ceil(n / cols);
    const gap = 12;
    const bw = (w - gap * (cols - 1)) / cols;
    const bh = Math.max(GridView.HEADER + GridView.FOOTER + 80, (vh - gap * (rowsN - 1)) / Math.min(rowsN, 2));
    const views = layers.map((l) => this.shown(l, beat));
    const place = [];
    layers.forEach((l, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      place.push({ layer: l, v: views[i], i, col, row, x: x0 + col * (bw + gap), w: bw, h: bh });
    });
    const rowTop = Array.from({ length: rowsN }, (_, r) => r * (bh + gap));
    const rowH = rowTop.map(() => bh);
    this.contentH = rowsN * bh + (rowsN - 1) * gap;
    this.scroll = Math.max(0, Math.min(this.scroll, this.contentH - vh));
    const ctx = p.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 2, top, w + 4, vh);
    ctx.clip();
    this.boxes = [];
    this.hits = [];
    const live = new Set();
    for (const b of place) {
      live.add(b.layer.id);
      b.y = top + rowTop[b.row] - this.scroll;
      b.h = rowH[b.row];
      if (b.y > top + vh || b.y + b.h < top) continue;
      const pic = this.picture(p, b, m);
      ctx.globalAlpha = b.layer.muted || b.layer.silenced ? 0.45 : b.v.own ? 1 : 0.55; // a preview is dimmer
      ctx.drawImage(pic.canvas, b.x, b.y, pic.canvas.width / pic.d, pic.canvas.height / pic.d);
      ctx.globalAlpha = 1;
      this.overlay(p, b, pic, beat, status);
      this.boxes.push({ layer: b.layer, x: b.x, y: b.y, w: b.w, h: b.h, part: pic.part, v: b.v });
    }
    ctx.restore();
    for (const id of this.pictures.keys()) if (!live.has(id)) { this.pictures.delete(id); this.derived.delete(id); }
    if (this.sel && !live.has(this.sel.layerId)) this.sel = null;
    if (!layers.length) { p.fill(T.dim); p.text('ainda nada a tocar', x0 + m.pad, top + 24); }
  }

  // The fixed part of a box: frame, header, the cells and their symbols.
  picture(p, b, m) {
    const T = Theme;
    const { layer, v } = b;
    const d = p.pixelDensity();
    const label = `[${b.i + 1}] ${PatternBank.roleLabel(layer.role).toUpperCase()}${v.legend ? ` (${v.legend})` : ''}`;
    const key = `${b.w}|${b.h}|${d}|${label}|${v.own}|${v.rows.map((r) => r.join(' ')).join('/')}`;
    const old = this.pictures.get(layer.id);
    if (old && old.key === key) return old;
    const canvas = (old && old.canvas) || document.createElement('canvas');
    canvas.width = Math.ceil(b.w * d);
    canvas.height = Math.ceil(b.h * d);
    const g = canvas.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, b.w, b.h);
    const col = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
    // no fills: thin white lines on black, white letters
    g.strokeStyle = col(T.text, 0.8);
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, b.w - 1, b.h - 1);
    g.font = `${m.small}px ${Theme.font}`;
    g.fillStyle = col(T.bright);
    g.textBaseline = 'alphabetic';
    let t = label;
    while (t.length > 4 && g.measureText(t).width > b.w - 2 * m.pad - 170) t = t.slice(0, -1); // room for [≈] [S] [M] [L] [↻]
    g.fillText(t, m.pad, 17);
    // the cells stretch to fill the box (they needn't be square)
    const wcells = Math.max(...v.rows.map((r) => r.length));
    const cw = (b.w - 2 * m.pad) / wcells;
    const ch = (b.h - GridView.HEADER - GridView.FOOTER) / v.rows.length;
    const part = { x: m.pad, y: GridView.HEADER, cw, ch, w: wcells, h: v.rows.length };
    const fs = Math.max(9, Math.min(16, Math.min(cw, ch) * 0.22));
    part.fs = fs;
    g.font = `${fs}px ${Theme.font}`;
    g.strokeStyle = col(T.text, 0.45);
    v.rows.forEach((row, yy) => row.forEach((raw, xx) => {
      const px = part.x + xx * cw, py = part.y + yy * ch;
      g.strokeRect(px + 0.5, py + 0.5, cw, ch);
      const s = GridView.symbol(raw);
      g.fillStyle = col(T.bright, s === '.' ? 0.45 : 1);
      g.fillText(s, px + (cw - g.measureText(s).width) / 2, py + ch / 2 + fs * 0.35);
    }));
    const pic = { key, canvas, d, part };
    this.pictures.set(layer.id, pic);
    return pic;
  }

  // A cell's text as shown: upper case, at most 3 characters (v stays the down arrow).
  static symbol(raw) {
    const s = raw === '.' ? '.' : raw.length > 3 ? raw.slice(0, 3) : raw;
    return s === 'v' ? 'v' : s.toUpperCase();
  }

  // What moves: the cursor (a lit cell), ON/OFF, the footer's bar, buttons, the selection.
  overlay(p, b, pic, beat, status) {
    const T = Theme, m = this.m;
    const { layer, v } = b;
    const part = pic.part;
    // the cursor(s)
    let positions = null;
    if (v.own) { const at = GridView.cursorsAt(layer, v.name, beat); positions = at && at.positions; }
    // the cell playing, inverted: white square, black letter
    p.textSize(part.fs);
    for (const [cx, cy] of positions || []) {
      const px = b.x + part.x + cx * part.cw, py = b.y + part.y + cy * part.ch;
      p.noStroke();
      p.fill(T.bright);
      p.rect(px + 1, py + 1, part.cw - 1, part.ch - 1);
      const s = GridView.symbol((v.rows[cy] || [])[cx] || '.');
      p.fill(T.bg);
      p.text(s, px + (part.cw - p.textWidth(s)) / 2, py + part.ch / 2 + part.fs * 0.35);
    }
    p.noStroke();
    // the card's buttons, top right: [≈] sound panel, [S] solo, [M] mute, [L] lock, [↻] another pattern
    p.textSize(m.small);
    let hx = b.x + b.w - m.pad;
    for (const [type, label, on] of [['regen', '[↻]', false], ['layer-lock', '[L]', layer.locked], ['layer-mute', '[M]', layer.muted], ['layer-solo', '[S]', layer.soloed], ['sound', '[≈]', false]]) {
      const bw = p.textWidth(label);
      hx -= bw;
      if (on) { p.fill(T.bright); p.rect(hx - 1, b.y + 17 - m.small - 1, bw + 2, m.small + 5); p.fill(T.bg); } else p.fill(T.dim);
      p.text(label, hx, b.y + 17);
      this.hits.push({ type, layerId: layer.id, x: hx - 2, y: b.y + 2, w: bw + 4, h: 20 });
      hx -= 6;
    }
    // the footer: when the grid changes next (they change at the start of each 4-bar
    // phrase, one cell at a time), with a bar filling up to it
    const fy = b.y + b.h - GridView.FOOTER + 6;
    const bar = status.bar || 0;
    const left = 4 - (bar % 4);
    const still = layer.locked || status.freeze;
    p.fill(T.dim);
    p.textSize(m.small - 1);
    p.text(!v.own ? 'ainda é código: esta grelha é só uma ideia'
      : still ? (layer.locked ? 'bloqueada: não muda' : 'BLOQUEAR ligado: não muda')
      : `muda daqui a ${left} compasso${left > 1 ? 's' : ''}`, b.x + m.pad, fy + 8);
    const act = layer.frozenFrom ? ['unfreeze', '[↺ original]'] : !v.own && !v.empty ? ['freeze', '[pôr em grelha]'] : null;
    let ax = b.x + b.w - m.pad;
    if (act) {
      const aw = p.textWidth(act[1]);
      ax -= aw;
      p.fill(T.text);
      p.text(act[1], ax, fy + 8);
      this.hits.push({ type: act[0], layerId: layer.id, x: ax - 3, y: fy - 4, w: aw + 6, h: 16 });
      ax -= 12;
    }
    // the grid's size: click for the next one (2×2 … 8×8)
    const size = `[${v.own ? `${v.g.w}×${v.g.h}` : this.sizeOf(layer.id).join('×')}]`;
    const sw = p.textWidth(size);
    ax -= sw;
    p.fill(T.bright);
    p.text(size, ax, fy + 8);
    this.hits.push({ type: 'size', layerId: layer.id, x: ax - 3, y: fy - 4, w: sw + 6, h: 16 });
    if (v.own && !still) {
      const bwid = b.w - 2 * m.pad;
      p.fill(T.faint);
      p.rect(b.x + m.pad, fy + 14, bwid, 4);
      p.fill(T.bright);
      p.rect(b.x + m.pad, fy + 14, bwid * ((bar % 4) / 4), 4);
    }
    const s = this.sel;
    if (s && s.layerId === layer.id && v.own) this.drawSelection(p, b, part);
  }

  drawSelection(p, b, part) {
    const T = Theme, m = this.m, s = this.sel;
    const px = b.x + part.x + s.x * part.cw, py = b.y + part.y + s.y * part.ch;
    p.noFill();
    p.stroke(T.accent);
    p.strokeWeight(3);
    p.rect(px + 1, py + 1, part.cw - 2, part.ch - 2);
    p.strokeWeight(1);
    p.noStroke();
    if (s.draft != null) {
      p.fill(T.bg);
      p.rect(px + 4, py + 4, part.cw - 8, part.ch - 8);
      p.fill(T.accent);
      const fs = Math.max(10, Math.min(30, part.cw * 0.36));
      p.textSize(fs);
      const t = (s.draft || '·').toUpperCase();
      p.text(t, px + (part.cw - p.textWidth(t)) / 2, py + part.ch / 2 + fs * 0.35);
    }
    const g = b.layer.grids[s.name];
    const keys = GridView.RULER.concat(Object.keys(g.sounds).map((k) => k.toUpperCase()), ['⌫', 'OK', '×']);
    const ry = b.y + b.h - GridView.FOOTER - GridView.RULER_H;
    p.noStroke();
    p.fill(T.bg);
    p.rect(b.x + 1, ry - 4, b.w - 2, GridView.RULER_H + 2);
    p.textSize(m.small);
    let rx = b.x + m.pad, row = 0;
    for (const k of keys) {
      const bw = Math.max(20, p.textWidth(k) + 10);
      if (rx + bw > b.x + b.w - m.pad) { rx = b.x + m.pad; row++; }
      const by = ry + row * 21;
      p.noFill();
      p.stroke(T.faint);
      p.rect(rx + 0.5, by + 0.5, bw - 1, 18);
      p.noStroke();
      p.fill(k === 'OK' ? T.bright : T.text);
      p.text(k, rx + (bw - p.textWidth(k)) / 2, by + 14);
      this.hits.push({ type: 'ruler', key: k === k.toUpperCase() && /^[A-Z]$/.test(k) ? k.toLowerCase() : k, x: rx, y: by, w: bw, h: 19 });
      rx += bw + 3;
    }
    if (s.error) { p.fill(T.err); p.textSize(m.small - 1); p.text(s.error.slice(0, 80), b.x + m.pad, b.y + b.h + 12); }
  }

  hit(mx, my) {
    if (!this.contains(mx, my)) return null;
    return this.hits.find((h) => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) || null;
  }

  // The cell under the mouse of a layer's own grid(): { layer, name, g, x, y, cell }.
  cellAt(mx, my) {
    if (!this.contains(mx, my)) return null;
    for (const b of this.boxes) {
      if (mx < b.x || mx > b.x + b.w || my < b.y || my > b.y + b.h) continue;
      if (!b.v.own) return { layer: b.layer, name: null };
      const part = b.part;
      const cx = Math.floor((mx - b.x - part.x) / part.cw), cy = Math.floor((my - b.y - part.y) / part.ch);
      if (cx >= 0 && cy >= 0 && cx < b.v.g.w && cy < b.v.g.h) return { layer: b.layer, name: b.v.name, g: b.v.g, x: cx, y: cy, cell: b.v.g.rows[cy][cx] };
      return { layer: b.layer, name: null };
    }
    return null;
  }

  // ───── editing (a cell's text, written into the grid() in the layer's code) ─────

  select(layerId, name, x, y) { this.sel = { layerId, name, x, y, draft: null, error: null }; }

  static cellText(layer, name, x, y) {
    const g = layer.grids && layer.grids[name];
    const c = g && g.rows[y] && g.rows[y][x];
    return c ? c.raw : '.';
  }

  type(ch) {
    if (!this.sel) return;
    this.sel.draft = (this.sel.draft == null ? '' : this.sel.draft) + ch;
    this.sel.error = null;
  }

  backspace(layer) {
    if (!this.sel) return;
    const cur = this.sel.draft != null ? this.sel.draft : GridView.cellText(layer, this.sel.name, this.sel.x, this.sel.y);
    this.sel.draft = cur.slice(0, -1);
  }

  move(layer, dx, dy) {
    const s = this.sel;
    const g = s && layer && layer.grids && layer.grids[s.name];
    if (!g) return;
    s.x = (s.x + dx + g.w) % g.w;
    s.y = (s.y + dy + g.h) % g.h;
    s.draft = null;
    s.error = null;
  }

  contains(mx, my) {
    const a = this.area;
    return !!a && mx >= a.x && mx <= a.x + a.w + 8 && my >= a.y && my <= a.y + a.h;
  }

  wheel(delta) { this.scroll = Math.max(0, this.scroll + delta); }
};
