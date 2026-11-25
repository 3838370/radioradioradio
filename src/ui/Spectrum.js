import { MathUtil } from '../core/MathUtil.js';
import { Theme } from './Theme.js';

// Spectrum: a phosphor bar graph from p5.FFT, drawn as stacked cells like an old VU display,
// with each column's frequency written above it. The number of columns follows the width,
// so every label fits over its own column.
export class Spectrum {
  static COL_W = 26; // px per column, room for a label like "12k"

  constructor(fft) {
    this.fft = fft;
  }

  // The FFT bin for each of n columns: log-spaced from 40 Hz to 16 kHz, as the ear hears,
  // each at least one bin above the last (the lowest bins are ~86 Hz apart).
  bins(n, bins, nyquist) {
    if (this.cache && this.cache.key === `${n}/${bins}/${nyquist}`) return this.cache.list;
    const list = [];
    for (let k = 0; k < n; k++) {
      const f = 40 * Math.pow(16000 / 40, k / (n - 1));
      const b = Math.min(bins - 1, Math.round((f / nyquist) * bins));
      list.push(k ? Math.max(b, list[k - 1] + 1) : b);
    }
    this.cache = { key: `${n}/${bins}/${nyquist}`, list };
    return list;
  }

  static label(f) {
    if (f < 1000) return String(Math.round(f / 10) * 10 || Math.round(f));
    return f < 10000 ? (f / 1000).toFixed(1).replace('.0', '') + 'k' : Math.round(f / 1000) + 'k';
  }

  draw(p, x, y, w, h) {
    const T = Theme;
    const spec = this.fft.analyze();
    const nyquist = this.fft.analyser.context.sampleRate / 2;
    const bars = MathUtil.clamp(Math.floor(w / Spectrum.COL_W), 6, 48);
    const cell = 4;
    const rows = Math.floor(h / cell);
    const bw = w / bars;
    p.noStroke();
    p.textSize(Theme.size.small - 2);
    p.textAlign(p.CENTER);
    const bins = this.bins(bars, spec.length, nyquist);
    for (let k = 0; k < bars; k++) {
      const i = bins[k];
      const v = spec[i] / 255;
      const lit = Math.round(v * rows);
      for (let r = 0; r < rows; r++) {
        p.fill(r < lit ? (r > rows * 0.8 ? T.bright : T.text) : T.faint);
        if (r >= lit && r % 2) continue; // sparse unlit grid
        p.rect(x + k * bw, y + h - (r + 1) * cell, Math.max(1, bw - 2), cell - 1);
      }
      // the column's centre frequency, above it
      p.fill(T.dim);
      p.text(Spectrum.label(((i + 0.5) * nyquist) / spec.length), x + k * bw + (bw - 2) / 2, y - 4);
    }
    p.textAlign(p.LEFT);
  }
};
