import { MathUtil } from '../core/MathUtil.js';

// Equalizer: four bands on the master, between the master filter and the compressor.
//   low     shelf (40..400 Hz)            lomid  peak, Q 0.7 (100..1500 Hz)
//   himid   peak, Q 0.7 (800..8000 Hz)    high   shelf (2..14 kHz)
// The mids are wide (Q 0.7) so neighbouring bands blend into one smooth curve.
// Gains are in dB, -12..+12. Changes glide over 40 ms so dragging the curve doesn't click.
export class Equalizer {
  static BANDS = [
    { id: 'low', label: 'LOW', type: 'lowshelf', f: 100, range: [40, 400] },
    { id: 'lomid', label: 'LO-MID', type: 'peaking', f: 400, range: [100, 1500], q: 0.7 },
    { id: 'himid', label: 'HI-MID', type: 'peaking', f: 2500, range: [800, 8000], q: 0.7 },
    { id: 'high', label: 'HIGH', type: 'highshelf', f: 8000, range: [2000, 14000] },
  ];

  static GAIN = 12;

  // The flat EQ: { low: { f, g }, lomid: { f, g }, himid: { f, g }, high: { f, g } }
  static flat() {
    const out = {};
    for (const b of Equalizer.BANDS) out[b.id] = { f: b.f, g: 0 };
    return out;
  }

  constructor(ac) {
    this.ac = ac;
    this.filters = Equalizer.BANDS.map((b) => {
      const f = ac.createBiquadFilter();
      f.type = b.type;
      f.frequency.value = b.f;
      if (b.q) f.Q.value = b.q;
      f.gain.value = 0;
      return f;
    });
    for (let k = 1; k < this.filters.length; k++) this.filters[k - 1].connect(this.filters[k]);
    this.input = this.filters[0];
    this.output = this.filters[this.filters.length - 1];
    this.values = Equalizer.flat();
  }

  set(values) {
    const t = this.ac.currentTime;
    Equalizer.BANDS.forEach((b, k) => {
      const v = values[b.id];
      if (!v) return;
      const f = MathUtil.clamp(+v.f, b.range[0], b.range[1]);
      const g = MathUtil.clamp(+v.g, -Equalizer.GAIN, Equalizer.GAIN);
      this.values[b.id] = { f, g };
      this.filters[k].frequency.setTargetAtTime(f, t, 0.04);
      this.filters[k].gain.setTargetAtTime(g, t, 0.04);
    });
  }

  // The combined response in dB at each frequency in `freqs` (a Float32Array), computed from
  // the target values (not the gliding ones) so the curve follows the mouse at once.
  response(freqs) {
    const db = new Float32Array(freqs.length);
    const mag = new Float32Array(freqs.length), phase = new Float32Array(freqs.length);
    if (!this.probe) {
      // Probe filters on a tiny offline context, so reading never touches the live ones.
      const off = new OfflineAudioContext(1, 1, this.ac.sampleRate);
      this.probe = Equalizer.BANDS.map((b) => { const f = off.createBiquadFilter(); f.type = b.type; if (b.q) f.Q.value = b.q; return f; });
    }
    Equalizer.BANDS.forEach((b, k) => {
      const f = this.probe[k];
      f.frequency.value = this.values[b.id].f;
      f.gain.value = this.values[b.id].g;
      f.getFrequencyResponse(freqs, mag, phase);
      for (let i = 0; i < freqs.length; i++) db[i] += 20 * Math.log10(Math.max(1e-6, mag[i]));
    });
    return db;
  }

  // The combined response in dB at one frequency.
  responseAt(f) { return this.response(new Float32Array([f]))[0]; }

  // Where a band's handle sits on the curve. A peak's at its own frequency; a shelf only
  // reaches half its gain at its corner, so its handle sits ~1.3 octaves into the shelf.
  static SHELF = 2.5;
  static band(id) { return Equalizer.BANDS.find((b) => b.id === id); }
  handleFreq(id) {
    const b = Equalizer.band(id), f = this.values[id].f;
    return b.type === 'lowshelf' ? f / Equalizer.SHELF : b.type === 'highshelf' ? f * Equalizer.SHELF : f;
  }
  static bandFreq(id, hf) {
    const b = Equalizer.band(id);
    return b.type === 'lowshelf' ? hf * Equalizer.SHELF : b.type === 'highshelf' ? hf / Equalizer.SHELF : hf;
  }

  // Moves band `id` so its handle sits at frequency hf and the whole curve reads `target`
  // dB there (the neighbouring bands add to it). Two corrections are plenty.
  setAt(id, hf, target) {
    const G = Equalizer.GAIN;
    const f = Equalizer.bandFreq(id, hf);
    let g = this.values[id].g;
    this.set({ [id]: { f, g } });
    for (let k = 0; k < 2; k++) {
      g = MathUtil.clamp(g + target - this.responseAt(this.handleFreq(id)), -G, G);
      this.set({ [id]: { f, g } });
    }
  }
};
