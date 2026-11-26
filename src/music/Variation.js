import { MathUtil } from '../core/MathUtil.js';
import { Families } from './Families.js';
import { Genres } from './Genres.js';

// Variation: how the composer changes a layer without touching its code. A pattern declares
// what may vary in its head line, params({ ... }), and its body reads them (P.pad, P.kick,
// P.odds). Variation only picks new values; CodeTools.setParams writes the line back.
//   a string value is an instrument or a sample folder: it swaps for another of its family
//     (Families) that the genre playing allows (Genres: palette, kits)
//   a number varies within a range around the pattern's own value (RANGES by name)
export class Variation {
  // Numbers by parameter name (`odds` is the n of one_in(n)): whole numbers, absolute limits,
  // and how far from the pattern's own value they may go.
  static RANGES = {
    odds: { lo: 2, hi: 12, around: 3 },
  };

  // ctx: { rng, synthExists(name), sampleCount(folder) }
  constructor({ rng, synthExists = (n) => !!Families.synthFamily(n), sampleCount = () => 1 }) {
    this.rng = rng;
    this.synthExists = synthExists;
    this.sampleCount = sampleCount;
  }

  // The parameter name without a trailing number: pad2 → pad.
  static base(key) { return key.replace(/\d+$/, ''); }

  // Other values a string parameter may take in this genre: the members of its family that
  // the genre's palette (instruments) or kits (sample folders) list. [] if none.
  options(value, genre) {
    const G = Genres.of(genre) || {};
    const F = Families;
    const synthFam = F.synthFamily(value);
    if (synthFam) {
      return ((G.palette || {})[synthFam] || []).filter((n) => n !== value && F.SYNTHS[synthFam].includes(n) && this.synthExists(n));
    }
    const kitFam = F.kitFamily(value);
    if (kitFam) {
      return ((G.kits || {})[kitFam] || []).filter((f) => f !== value && F.KITS[kitFam].includes(f) && this.sampleCount(f) > 0);
    }
    return [];
  }

  isInstrument(value) { return typeof value === 'string' && !!Families.synthFamily(value); }

  // A new version: some instruments and kits swapped within their family (more with a
  // higher `strength`, 0..1). Returns { params, changes: ['pad: haze → dx_pad'], sig }.
  version(params, genre, strength = 0.5) {
    const out = Object.assign({}, params);
    const changes = [];
    for (const [k, v] of Object.entries(params)) {
      if (typeof v !== 'string') continue;
      const chance = this.isInstrument(v) ? 0.1 + 0.45 * strength : 0.05 + 0.35 * strength;
      if (!this.rng.chance(chance)) continue;
      const opts = this.options(v, genre);
      if (!opts.length) continue;
      out[k] = this.rng.pick(opts);
      changes.push(`${k}: ${v} → ${out[k]}`);
    }
    return { params: out, changes, sig: Variation.sig(out) };
  }

  // One instrument swapped for another of its family (same notes): { params, change } or null.
  timbre(params, genre) {
    const keys = Object.keys(params).filter((k) => this.isInstrument(params[k]) && this.options(params[k], genre).length);
    if (!keys.length) return null;
    const k = this.rng.pick(keys);
    const to = this.rng.pick(this.options(params[k], genre));
    return { params: Object.assign({}, params, { [k]: to }), change: `${k}: ${params[k]} → ${to}` };
  }

  // Can this layer's timbre change in this genre?
  canTimbre(params, genre) { return Object.values(params).some((v) => this.isInstrument(v) && this.options(v, genre).length); }

  // A small move of one number (`variation` 0..1 sets how far), kept near the pattern's own
  // value (`original`): { params, change } or null.
  tweak(params, original, variation) {
    const keys = Object.keys(params).filter((k) => typeof params[k] === 'number');
    if (!keys.length) return null;
    const k = this.rng.pick(keys);
    const cur = params[k];
    const base = typeof original[k] === 'number' ? original[k] : cur;
    const R = Variation.RANGES[Variation.base(k)];
    let v;
    if (R) {
      const step = Math.max(1, Math.round(this.rng.float(0.5, 1 + variation)));
      v = cur + (this.rng.chance(0.5) ? step : -step);
      v = MathUtil.clamp(v, Math.max(R.lo, base - R.around), Math.min(R.hi, base + R.around));
    } else {
      // any other number: ±15..50% (with the variation), within ±40..100% of the original
      v = cur * (1 + this.rng.float(-1, 1) * (0.15 + 0.35 * variation));
      v = MathUtil.clamp(v, base * (0.6 - 0.2 * variation), base * (1.4 + 0.6 * variation));
      v = Math.round(v * 100) / 100;
    }
    if (v === cur) return null;
    return { params: Object.assign({}, params, { [k]: v }), change: `${k} ${cur} → ${v}` };
  }

  static sig(params) { return JSON.stringify(params); }
};
