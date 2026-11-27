import { Theme } from './Theme.js';

// LevelMeter: the output level, a thin vertical bar drawn on the canvas (no page writes):
// the average (dim fill), the peak (bright line), the peak held for 1.5 s, and a mark at
// the ceiling, -1 dB. -48 dB at the bottom, 0 dB at the top.
export class LevelMeter {
  static FLOOR = -48;

  static y(db, y, h) {
    const t = Math.max(0, Math.min(1, (db - LevelMeter.FLOOR) / -LevelMeter.FLOOR));
    return y + h - t * h;
  }

  draw(p, x, y, w, h, lvl) {
    const T = Theme;
    p.noStroke();
    p.fill(T.faint);
    p.rect(x, y, w, h);
    if (!lvl) return;
    const Y = (db) => LevelMeter.y(db, y, h);
    p.fill(T.dim);
    const r = Y(lvl.rms);
    p.rect(x, r, w, y + h - r);
    p.fill(T.bright);
    p.rect(x, Y(lvl.peak), w, 1.5);
    p.rect(x, Y(lvl.hold), w, 1);
    // the ceiling
    p.fill(T.text);
    p.rect(x - 2, Y(-1), w + 4, 1);
  }
};
