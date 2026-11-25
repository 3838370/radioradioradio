import { MathUtil } from '../core/MathUtil.js';

// MelodyGen: generates melodies that develop instead of looping.
//
// A motif is a few notes (scale steps relative to the key, durations in beats, velocities)
// with a contour and a rhythm. A Phrase plays motifs in a small form, A A' B A'', varying
// them each time (transpose, invert, ornament, displace, change a note), and every few
// forms the motif itself evolves or is replaced. Notes on strong beats snap to the current
// chord, so lines stay consonant while they wander.
export class MelodyGen {
  // 4-beat rhythms from sparse to busy (each sums to 4).
  static RHYTHMS = [
    [4], [3, 1], [2, 2], [1.5, 2.5], [2, 1, 1], [1, 1, 2], [1.5, 1.5, 1], [0.5, 1.5, 2],
    [1, 1, 1, 1], [1.5, 0.5, 1, 1], [0.75, 0.75, 0.5, 2], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2],
    [1, 0.5, 0.5, 1, 1], [0.5, 1, 0.5, 1, 1], [0.75, 0.75, 1, 0.5, 1],
    [0.5, 0.5, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1],
  ];

  // Off-grid rhythms picked now and then: triplets, dotted figures, a long held note.
  static ODD = [
    [4 / 3, 4 / 3, 4 / 3], [2 / 3, 2 / 3, 2 / 3, 2], [1, 1, 2 / 3, 2 / 3, 2 / 3], [0.25, 0.75, 3],
    [0.75, 0.25, 0.75, 0.25, 2], [1.5, 1.5, 0.5, 0.5], [1 / 3, 1 / 3, 1 / 3, 1, 2],
  ];

  static CONTOURS = ['arch', 'rise', 'fall', 'wave', 'valley', 'still', 'zigzag', 'leap', 'pedal', 'spiral'];

  constructor(rng) {
    this.rng = rng;
  }

  // A rhythm for `beats` beats; density 0..1 favours longer or shorter notes.
  rhythm(beats, density) {
    const out = [];
    for (let b = 0; b < beats; b += 4) {
      const left = beats - b;
      if (left < 4) { // odd lengths (3, 5, 6, 7 beats): fill the remainder simply
        out.push(...this.rng.pick([[left], [left / 2, left / 2], left > 1 ? [left - 1, 1] : [left]]));
        break;
      }
      const R = MelodyGen.RHYTHMS;
      const centre = density * (R.length - 1);
      const items = R.map((r, k) => [r, Math.exp(-Math.pow((k - centre) / 3, 2))]);
      out.push(...(this.rng.chance(0.18) ? this.rng.pick(MelodyGen.ODD) : this.rng.weighted(items)));
    }
    return out;
  }

  contourStep(contour, k, n) {
    const t = n <= 1 ? 0 : k / (n - 1);
    switch (contour) {
      case 'rise': return Math.round(t * 4);
      case 'fall': return Math.round((1 - t) * 4);
      case 'arch': return Math.round(Math.sin(t * Math.PI) * 4);
      case 'valley': return Math.round((1 - Math.sin(t * Math.PI)) * 3);
      case 'wave': return Math.round(2 + Math.sin(t * Math.PI * 2) * 2);
      case 'zigzag': return k % 2 ? 4 - Math.round(t * 2) : Math.round(t * 2);
      case 'leap': return k === 0 ? 0 : k === 1 ? 7 : 7 - Math.round(t * 5);   // jump, then fall back
      case 'pedal': return k % 2 ? 2 + Math.round(t * 5) : 0;                    // a held note under a rising line
      case 'spiral': return Math.round(t * 5) + (k % 3 === 1 ? -2 : 0);
      default: return 2;
    }
  }

  // { notes: [{ step, dur, vel, rest }], beats }
  create({ beats = 4, density = 0.5, rest = 0.15 } = {}) {
    const durs = this.rhythm(beats, density);
    const contour = this.rng.pick(MelodyGen.CONTOURS);
    const start = this.rng.pick([-2, 0, 2, 4, 5]);
    const span = this.rng.pick([0.5, 1, 1, 1.5, 2]); // narrow murmurs to wide leaps
    let pos = 0;
    const notes = durs.map((dur, k) => {
      const strong = pos % 2 === 0;
      const jitter = this.rng.chance(0.3) ? this.rng.pick([-1, 1]) : 0;
      const n = {
        step: start + Math.round(this.contourStep(contour, k, durs.length) * span) + jitter,
        grace: dur >= 1 && this.rng.chance(0.12) ? this.rng.pick([-1, 1]) : 0,
        dur,
        vel: strong ? this.rng.float(0.85, 1) : this.rng.float(0.55, 0.85),
        rest: k > 0 && !strong && this.rng.chance(rest),
      };
      pos += dur;
      return n;
    });
    return { notes, beats };
  }

  static clone(m) { return { beats: m.beats, notes: m.notes.map((n) => Object.assign({}, n)) }; }

  // One variation. amount 0..1: small touches to bigger rewrites.
  vary(motif, amount = 0.3) {
    const m = MelodyGen.clone(motif);
    const notes = m.notes;
    const ops = [
      () => { const d = this.rng.pick([-2, -1, 1, 2]); notes.forEach((n) => { n.step += d; }); },          // transpose
      () => { const k = this.rng.int(0, notes.length - 1); notes[k].step += this.rng.pick([-2, -1, 1, 2]); }, // one note
      () => { const a = notes[0].step; notes.forEach((n) => { n.step = 2 * a - n.step; }); },                // invert
      () => { // ornament: split a long note into two
        const k = notes.findIndex((n) => n.dur >= 1);
        if (k < 0) return;
        const n = notes[k];
        notes.splice(k, 1, Object.assign({}, n, { dur: n.dur / 2 }), Object.assign({}, n, { dur: n.dur / 2, step: n.step + this.rng.pick([-1, 1]), vel: n.vel * 0.8 }));
      },
      () => { // merge two short notes (simplify)
        const k = notes.findIndex((n, i) => i < notes.length - 1 && n.dur + notes[i + 1].dur <= 2);
        if (k < 0) return;
        notes[k].dur += notes[k + 1].dur;
        notes.splice(k + 1, 1);
      },
      () => { const k = this.rng.int(1, Math.max(1, notes.length - 1)); if (notes[k]) notes[k].rest = !notes[k].rest; }, // breathe
      () => { const durs = notes.map((n) => n.dur).reverse(); notes.forEach((n, k) => { n.dur = durs[k]; }); },          // retrograde rhythm
      () => { notes[notes.length - 1].step = this.rng.pick([0, 2, 4, 7]); },                                             // new cadence
      () => { const k = this.rng.int(0, notes.length - 1); notes[k].step += this.rng.pick([-7, 7]); },                   // octave leap
      () => { const k = this.rng.int(0, notes.length - 1); notes[k].grace = notes[k].grace ? 0 : this.rng.pick([-1, 1]); }, // grace note
      () => { // passing note: fill a leap of 3+ steps with the note between
        const k = notes.findIndex((n, i) => i < notes.length - 1 && n.dur >= 1 && Math.abs(notes[i + 1].step - n.step) >= 3);
        if (k < 0) return;
        const n = notes[k];
        const mid = Math.round((n.step + notes[k + 1].step) / 2);
        notes.splice(k, 1, Object.assign({}, n, { dur: n.dur / 2 }), Object.assign({}, n, { dur: n.dur / 2, step: mid, vel: n.vel * 0.75, grace: 0 }));
      },
      () => { // sequence: the first half again, a step or two higher or lower
        const h = Math.floor(notes.length / 2);
        if (h < 1) return;
        const d = this.rng.pick([-2, -1, 1, 2, 3]);
        for (let k = h; k < notes.length && k - h < h; k++) notes[k].step = notes[k - h].step + d;
      },
      () => { // accents move: a loud weak beat, a soft strong one
        notes.forEach((n) => { n.vel = MathUtil.clamp(1.4 - n.vel + this.rng.float(-0.1, 0.1), 0.4, 1); });
      },
    ];
    const count = 1 + Math.round(amount * 2.5);
    for (let k = 0; k < count; k++) this.rng.pick(ops)();
    for (const n of notes) n.step = MathUtil.clamp(n.step, -5, 13);
    return m;
  }
};
