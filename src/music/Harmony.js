// Harmony: key, mode and chord progression. Chords are stacked in thirds from the mode,
// so every chord is diatonic. Progressions are scale degrees (0 = tonic), 4 bars each.
// Changes are requested at any time and applied on the next 4-bar boundary.
RA.Harmony = class Harmony {
  static MODES = ['dorian', 'aeolian', 'lydian', 'mixolydian', 'phrygian', 'locrian'];

  static MODES_FOR = {
    saw: ['aeolian', 'lydian', 'dorian'],
    acid: ['phrygian', 'aeolian', 'dorian'],
    drill: ['aeolian', 'dorian', 'lydian'],
    boc: ['mixolydian', 'dorian', 'lydian', 'aeolian'],
    minimal: ['dorian', 'aeolian', 'mixolydian'],
    dub: ['dorian', 'aeolian'],
    space: ['lydian', 'dorian', 'aeolian'],
    dark: ['phrygian', 'locrian', 'aeolian'],
    ae: ['phrygian', 'locrian', 'dorian'],
  };

  // dub and minimal barely move (one chord for minutes); acid sits on one or two chords;
  // saw and drill have slow, melancholy turns; boc leans on the flat seventh (mixolydian).
  // The composer changes progression now and then within a genre (reharm()).
  static PROGRESSIONS = {
    saw: [[0, 4], [0, 5, 3, 4], [0, 3, 4, 3], [0, 0, 5, 4], [0, 1, 4, 0], [0, 3], [5, 3, 0, 4], [0, 2, 5, 4], [0, 5, 1, 4], [3, 4, 0, 0], [0, 6, 5, 4], [0, 2]],
    acid: [[0], [0, 1], [0, 0, 0, 6], [0, 6], [0, 0, 1, 0], [0, 4], [0, 0, 5, 1], [0, 3]],
    drill: [[0, 5, 3, 4], [0, 3], [5, 3, 0, 4], [0, 2, 5, 4], [0, 5], [3, 4, 0, 0], [0, 6, 5, 4], [5, 4, 3, 4], [0, 1, 5, 4]],
    boc: [[0, 4], [0, 6], [0, 3, 4], [0, 6, 5, 4], [0, 0, 6, 6], [3, 0], [0, 4, 3, 6], [5, 4, 0, 0], [0, 2, 6, 4], [0, 6, 3, 4]],
    minimal: [[0], [0, 3], [0, 0, 0, 5], [0, 0, 6, 0], [0, 5], [0, 0, 3, 0], [3, 0], [0, 4, 0, 0]],
    dub: [[0], [0, 0, 0, 3], [0, 0, 5, 0], [0, 3], [0, 0, 0, 6], [0, 5], [0, 0, 3, 5], [3, 0], [0, 6, 0, 0], [0, 4, 0, 0], [0, 0, 5, 5], [0, 0, 3, 3]],
    space: [[0, 4], [0, 1, 0, 4], [0, 5, 3, 4], [0, 2, 3, 1], [0, 3], [0, 1], [3, 0], [0, 5, 4, 3], [0, 2], [0, 4, 5, 3], [1, 0, 3, 0], [0, 6]],
    dark: [[0, 1], [0, 0, 1, 0], [0, 5, 1, 0], [0], [0, 6], [0, 1, 6, 0], [0, 0, 4, 1], [0, 3, 1, 0], [0, 5, 4, 1]],
    ae: [[0], [0, 1], [0, 4, 1], [0, 3, 6], [0, 6, 1, 5], [1, 0, 5], [0, 2, 1], [0, 5, 2, 6], [0, 0, 1, 0], [0, 6, 0, 1]],
  };

  // Key moves for a modulation: up a fourth or fifth, a tone, a minor third.
  static MODULATIONS = [5, 7, -5, 2, -2, 3, -3];

  // A change within the mood, never the same progression as now: usually a new
  // progression, sometimes (`canModulate`) a key move as well.
  reharm(flavour, rng, canModulate = true) {
    const current = this.prog.join();
    const others = Harmony.PROGRESSIONS[flavour].filter((p) => p.join() !== current);
    const change = { prog: rng.pick(others.length ? others : Harmony.PROGRESSIONS[flavour]) };
    if (canModulate && rng.chance(0.3)) change.key = this.key + rng.pick(Harmony.MODULATIONS);
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

  // Called by the composer on bars divisible by 4. Returns a description if something changed.
  applyPending() {
    if (!this.pending) return null;
    const p = this.pending;
    this.pending = null;
    if (p.key != null) this.key = 40 + RA.MathUtil.mod(p.key - 40, 12);
    if (p.mode) this.mode = p.mode;
    if (p.prog) this.prog = p.prog;
    return `${this.keyName()} · progression ${this.prog.map((d) => d + 1).join('-')}`;
  }

  // Picks a mode and progression that suit a flavour (keeps the current mode if it fits).
  planFor(flavour, rng) {
    const modes = Harmony.MODES_FOR[flavour];
    return {
      mode: modes.includes(this.mode) ? this.mode : rng.pick(modes),
      prog: rng.pick(Harmony.PROGRESSIONS[flavour]),
    };
  }

  steps() { return RA.Theory.SCALES[this.mode] || RA.Theory.SCALES.aeolian; }

  degreeAt(bar) {
    return this.prog[RA.MathUtil.mod(Math.floor(bar / this.barsPerChord), this.prog.length)];
  }

  // degree(0, 0) is KEY itself; degree(2, 1) is the mode's third, one octave up.
  degree(d, octave = 1) {
    const steps = this.steps();
    const o = Math.floor(d / steps.length);
    return this.key + 12 * (octave + o) + steps[RA.MathUtil.mod(d, steps.length)];
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
    const tones = [0, 2, 4, 6].map((k) => RA.MathUtil.mod(r + k, 7));
    for (const off of [0, -1, 1, -2, 2]) {
      if (tones.includes(RA.MathUtil.mod(step + off, 7))) return step + off;
    }
    return step;
  }

  modeNotes(octave = 1, octaves = 1) {
    const out = [];
    for (let k = 0; k <= 7 * octaves; k++) out.push(this.degree(k, octave));
    return out;
  }

  keyName() { return `${RA.Theory.name(this.key)} ${this.mode}`; }

  chordName(bar) {
    const r = this.root(bar);
    return RA.Theory.name(r) + (this.quality(bar) === 'minor' ? 'm' : '');
  }
};
