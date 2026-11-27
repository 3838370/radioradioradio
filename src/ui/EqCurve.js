import { Equalizer } from '../audio/Equalizer.js';
import { MathUtil } from '../core/MathUtil.js';
import { Theme } from './Theme.js';

// EqCurve: the master EQ drawn as one response curve (20 Hz..20 kHz, ±12 dB), with a
// handle per band. Drag a handle: left/right moves its frequency, up/down its gain.
// [RESET] (top right) or a double-click sets it flat again. onChange(values) gets the new
// values on release and on reset.
export class EqCurve {
  static POINTS = 96;

  constructor(eq, onChange) {
    this.eq = eq;
    this.onChange = onChange;
    this.rect = null;
    this.drag = null;  // band id while dragging
    this.hover = null;
    this.freqs = new Float32Array(EqCurve.POINTS);
    for (let i = 0; i < EqCurve.POINTS; i++) this.freqs[i] = this.freqAt(i / (EqCurve.POINTS - 1));
    this.curve = null;
  }

  freqAt(u) { return 20 * Math.pow(1000, u); }          // 0..1 -> 20 Hz..20 kHz (log)
  uOf(f) { return Math.log(f / 20) / Math.log(1000); }

  contains(mx, my) {
    const r = this.rect;
    return !!r && mx >= r.x - 4 && mx <= r.x + r.w + 4 && my >= r.y - 4 && my <= r.y + r.h + 4;
  }

  // Screen y for a level in dB (the same scale for the curve and the handles).
  yOf(db) {
    const r = this.rect, G = Equalizer.GAIN;
    return r.y + r.h / 2 - (MathUtil.clamp(db, -G, G) / G) * (r.h / 2 - 2);
  }

  // The handles sit on the curve itself: at each band's handle frequency, at the level the
  // whole EQ has there, so the curve always passes through every point.
  handles() {
    const r = this.rect;
    const key = `${r.x},${r.y},${r.w},${r.h}`;
    if (this.points && this.points.key === key) return this.points.list;
    const list = Equalizer.BANDS.map((b) => {
      const hf = this.eq.handleFreq(b.id);
      return { id: b.id, x: r.x + this.uOf(hf) * r.w, y: this.yOf(this.eq.responseAt(hf)) };
    });
    this.points = { key, list };
    return list;
  }

  nearest(mx, my) {
    let best = null, bd = Infinity;
    for (const h of this.handles()) {
      const d = Math.hypot(h.x - mx, h.y - my);
      if (d < bd) { bd = d; best = h.id; }
    }
    return best;
  }

  onReset(mx, my) {
    const b = this.resetRect;
    return !!b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  }

  press(mx, my) {
    if (this.onReset(mx, my)) { this.reset(); return; }
    this.drag = this.nearest(mx, my);
    this.move(mx, my);
  }

  move(mx, my) {
    if (!this.drag) {
      this.hoverReset = this.onReset(mx, my);
      this.hover = this.contains(mx, my) && !this.hoverReset ? this.nearest(mx, my) : null;
      return;
    }
    const r = this.rect, G = Equalizer.GAIN;
    const u = MathUtil.clamp((mx - r.x) / r.w, 0, 1);
    const db = MathUtil.clamp(((r.y + r.h / 2 - my) / (r.h / 2 - 2)) * G, -G, G);
    this.eq.setAt(this.drag, this.freqAt(u), Math.abs(db) < 0.6 ? 0 : db); // snaps to 0 dB
    this.invalidate();
  }

  invalidate() { this.curve = null; this.points = null; }

  release() {
    if (!this.drag) return;
    this.drag = null;
    this.onChange(JSON.parse(JSON.stringify(this.eq.values)));
  }

  reset() {
    this.eq.set(Equalizer.flat());
    this.invalidate();
    this.onChange(Equalizer.flat());
  }

  draw(p, x, y, w, h) {
    const T = Theme;
    this.rect = { x, y, w, h };
    if (!this.curve) this.curve = this.eq.response(this.freqs);
    p.noFill();
    p.strokeWeight(1);
    p.stroke(T.faint);
    p.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    // grid: 0 dB line, ±6 dB dots, 100 Hz / 1 kHz / 10 kHz ticks
    p.line(x + 1, y + h / 2, x + w - 1, y + h / 2);
    p.noStroke();
    p.fill(T.faint);
    for (const f of [100, 1000, 10000]) {
      const fx = x + this.uOf(f) * w;
      for (let gy = y + 3; gy < y + h - 2; gy += 4) p.rect(fx, gy, 1, 1);
    }
    // the curve
    p.noFill();
    p.stroke(T.text);
    p.strokeWeight(1.5);
    p.beginShape();
    for (let i = 0; i < this.freqs.length; i++) p.vertex(x + (i / (this.freqs.length - 1)) * w, this.yOf(this.curve[i]));
    p.endShape();
    // handles
    p.noStroke();
    for (const hd of this.handles()) {
      const on = hd.id === this.drag || hd.id === this.hover;
      p.fill(on ? T.bright : T.dim);
      p.rect(hd.x - 2.5, hd.y - 2.5, 6, 6);
    }
    p.fill(T.dim);
    p.textSize(Theme.size.small - 1);
    p.text('EQ', x + 4, y + 11);
    // [RESET], brighter when the curve isn't flat
    const flat = Equalizer.BANDS.every((b) => this.eq.values[b.id].g === 0);
    const rw = p.textWidth('[REPOR]');
    this.resetRect = { x: x + w - rw - 6, y: y + 2, w: rw + 4, h: 12 };
    p.fill(this.hoverReset ? T.bright : flat ? T.faint : T.dim);
    p.text('[REPOR]', x + w - rw - 4, y + 11);
    p.fill(T.dim);
    if (this.drag || this.hover) {
      const id = this.drag || this.hover;
      const v = this.eq.values[id];
      const f = v.f >= 1000 ? (v.f / 1000).toFixed(1) + 'k' : Math.round(v.f);
      const label = `${Equalizer.BANDS.find((b) => b.id === id).label} ${f}Hz ${v.g >= 0 ? '+' : ''}${v.g.toFixed(1)}dB`;
      p.textAlign(p.RIGHT);
      p.text(label, x + w - 4, y + h - 4);
      p.textAlign(p.LEFT);
    }
  }
};
