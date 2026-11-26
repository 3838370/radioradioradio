import { MathUtil } from '../core/MathUtil.js';
import { Theory } from '../lang/Theory.js';
import { Genres } from './Genres.js';

// Harmony: key, mode and chord progression. Chords are stacked in thirds from the mode,
// so every chord is diatonic. Progressions are scale degrees (0 = tonic); each chord lasts
// `barsPerChord` bars (the genre's chordBars: slow in acid and ae, quicker in saw and boc).
// Changes are requested at any time and applied on the next 4-bar boundary; a key change
// can be held back until a calm moment (applyPending(false)).
export class Harmony {
  static MODES = ['dorian', 'aeolian', 'lydian', 'mixolydian', 'phrygian', 'locrian'];
  // what each mode is called on screen
  static MODE_LABELS = { dorian: 'dórico', aeolian: 'eólio', lydian: 'lídio', mixolydian: 'mixolídio', phrygian: 'frígio', locrian: 'lócrio' };

  static modeLabel(m) { return Harmony.MODE_LABELS[m] || m; }

  // Each genre's modes and progressions are in Genres. The composer changes progression now
  // and then within a genre (reharm()).

  // Key moves for a modulation: up a fourth or fifth, a tone, a minor third.
  static MODULATIONS = [5, 7, -5, 2, -2, 3, -3];

  // A change within the genre, never the same progression as now: a new progression, and
  // with chance `modulate` (0..1; true = 0.3) a key move as well.
  reharm(genre, rng, modulate = 0.3) {
    const current = this.prog.join();
    const all = Genres.of(genre).progressions;
    const others = all.filter((p) => p.join() !== current);
    const change = { prog: rng.pick(others.length ? others : all) };
    const chance = modulate === true ? 0.3 : +modulate || 0;
    if (chance > 0 && rng.chance(chance)) change.key = this.key + rng.pick(Harmony.MODULATIONS);
    change.bars = rng.pick(Genres.of(genre).chordBars || [4]);
    return change;
  }

  constructor() {
    this.key = 45;          // midi root in the bass register (40..51)
    this.mode = 'dorian';
    this.prog = [0, 3];
    this.barsPerChord = 4;
    this.pending = null;
  }

  request(change) { this.pending = Object.assign(this.pending || {}, change); }

  // Whether a key change is waiting.
  get keyPending() { return !!this.pending && this.pending.key != null && this.pending.key !== this.key; }

  // Called by the composer on bars divisible by 4 (and on a break). With `withKey` false a
  // waiting key change stays pending; everything else is applied. Returns a description if
  // something changed.
  applyPending(withKey = true) {
    if (!this.pending) return null;
    const p = this.pending;
    const holdKey = !withKey && p.key != null;
    this.pending = holdKey ? { key: p.key } : null;
    const before = this.describe();
    if (p.key != null && !holdKey) this.key = 40 + MathUtil.mod(p.key - 40, 12);
    if (p.mode) this.mode = p.mode;
    if (p.prog) this.prog = p.prog;
    if (p.bars) this.barsPerChord = p.bars;
    const after = this.describe();
    return after === before ? null : after;
  }

  describe() { return `${this.keyName()} · progressão ${this.prog.map((d) => d + 1).join('-')}${this.barsPerChord !== 4 ? ` (${this.barsPerChord} compassos cada)` : ''}`; }

  // Picks a mode, progression and chord length that suit a genre (keeps the current mode if
  // it fits).
  planFor(genre, rng) {
    const G = Genres.of(genre);
    return {
      mode: G.modes.includes(this.mode) ? this.mode : rng.pick(G.modes),
      prog: rng.pick(G.progressions),
      bars: rng.pick(G.chordBars || [4]),
    };
  }

  steps() { return Theory.SCALES[this.mode] || Theory.SCALES.aeolian; }

  degreeAt(bar) {
    return this.prog[MathUtil.mod(Math.floor(bar / this.barsPerChord), this.prog.length)];
  }

  // degree(0, 0) is KEY itself; degree(2, 1) is the mode's third, one octave up.
  degree(d, octave = 1) {
    const steps = this.steps();
    const o = Math.floor(d / steps.length);
    return this.key + 12 * (octave + o) + steps[MathUtil.mod(d, steps.length)];
  }

  root(bar) { return this.degree(this.degreeAt(bar), 0); }

  quality(bar) {
    const d = this.degreeAt(bar);
    return this.degree(d + 2, 0) - this.degree(d, 0) === 4 ? 'major' : 'minor';
  }

  chordNotes(bar, octave = 1, ext = '7') {
    const d = this.degreeAt(bar);
    const size = ext === '9' ? 5 : ext === '7' ? 4 : 3;
    const notes = [];
    for (let k = 0; k < size; k++) notes.push(this.degree(d + 2 * k, octave));
    // A flat ninth sounds harsh rather than hazy; drop it.
    if (size === 5 && notes[4] - notes[0] === 13) notes.pop();
    return notes;
  }

  // Moves a scale step to the nearest tone of the chord playing at `bar` (for strong beats).
  snapToChord(step, bar) {
    const r = this.degreeAt(bar);
    const tones = [0, 2, 4, 6].map((k) => MathUtil.mod(r + k, 7));
    for (const off of [0, -1, 1, -2, 2]) {
      if (tones.includes(MathUtil.mod(step + off, 7))) return step + off;
    }
    return step;
  }

  modeNotes(octave = 1, octaves = 1) {
    const out = [];
    for (let k = 0; k <= 7 * octaves; k++) out.push(this.degree(k, octave));
    return out;
  }

  keyName() { return `${Theory.name(this.key)} ${Harmony.modeLabel(this.mode)}`; }

  chordName(bar) {
    const r = this.root(bar);
    return Theory.name(r) + (this.quality(bar) === 'minor' ? 'm' : '');
  }
};
