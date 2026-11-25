// Generators behind chords(), bassline(), collage(), drone() and motif() in pattern code.
// Like BeatGen and Phrase, each keeps its state per layer: it holds an idea for a few bars
// (so it can be heard and remembered), then varies it a little, now and then a lot.
// Each next() covers one bar (or `beats`) and returns events played in order with sleep(dur):
//   { ..., dur }  dur = beats until the next event (rests are events with nothing to play)

// Rhythm of chord hits in a bar, in beats. Dub techno lives on the offbeats.
RA.ChordGen = class ChordGen {
  static RHYTHMS = {
    stab: [[0.5], [0.75], [0, 1.5], [0.5, 2.5], [1.5, 3.5], [0.75, 2.75], [0.5, 1.75, 3], [0, 0.75, 2.5], [0.5, 2, 3.5]],
    offbeat: [[0.5, 1.5, 2.5, 3.5], [0.5, 2.5], [1.5, 3.5], [0.5, 1.5, 3.5], [0.75, 1.5, 2.75]],
    push: [[3.5], [0, 3.5], [1.75, 3.5], [0, 2.75], [0.75, 3.25]],
    long: [[0], [0, 2], [0, 3], [0, 2.5]],
  };

  // voicings: scale steps over the chord's root, or semitones (`semi`) for stacked 4ths/5ths
  static VOICINGS = {
    triad: [0, 2, 4], m7: [0, 2, 4, 6], add9: [0, 2, 4, 8], sus2: [0, 1, 4], sus4: [0, 3, 4],
    dub: [0, 4, 6, 9], cluster: [0, 1, 2], wide: [0, 4, 9, 13],
    quartal: { semi: [0, 5, 10, 15] }, fifths: { semi: [0, 7, 12] },
  };

  constructor(rng, rhythm = 'stab') {
    this.rng = rng;
    this.rhythm = rhythm;
    this.hits = rng.pick(ChordGen.RHYTHMS[rhythm] || ChordGen.RHYTHMS.stab).slice();
    this.hold = rng.int(4, 8);
    this.bars = 0;
  }

  // The hit positions for the next bar.
  next(density = 0.5) {
    if (++this.bars > this.hold) {
      this.bars = 0;
      this.hold = this.rng.int(4, 8);
      if (this.rng.chance(0.3)) this.hits = this.rng.pick(ChordGen.RHYTHMS[this.rhythm] || ChordGen.RHYTHMS.stab).slice();
      else {
        const k = this.rng.int(0, this.hits.length - 1);
        this.hits[k] = RA.MathUtil.clamp(this.hits[k] + this.rng.pick([-0.5, -0.25, 0.25, 0.5]), 0, 3.75);
        this.hits = [...new Set(this.hits)].sort((a, b) => a - b);
      }
    }
    return this.hits.filter((at, k) => k === 0 || this.rng.chance(0.55 + 0.45 * density));
  }

  // The notes of a voicing over the chord playing at `bar`.
  static voice(harmony, bar, voicing = 'm7', octave = 1) {
    const d = harmony.degreeAt(bar);
    const v = ChordGen.VOICINGS[voicing] || ChordGen.VOICINGS.m7;
    if (v.semi) { const r = harmony.degree(d, octave); return v.semi.map((s) => r + s); }
    return v.map((k) => harmony.degree(d + k, octave));
  }
};

// Basslines: templates of [beat, scale step over the chord root (7 = octave), length],
// held a few bars and then varied; 'acid' is drawn fresh on 16ths.
RA.BassGen = class BassGen {
  static STYLES = {
    dub: [[[0, 0, 1.5], [2, 0, 1], [3.5, 4, 0.5]], [[0, 0, 3], [3, 7, 0.5]], [[0, 0, 1], [1.5, 0, 1], [3, 4, 1]], [[0, 0, 2.5], [3, 0, 0.75]], [[0, 0, 1.75], [2.5, -3, 0.5], [3, 0, 1]]],
    sub: [[[0, 0, 4]], [[0, 0, 2], [2, 0, 2]], [[0, 0, 3.5]], [[0, 0, 2.5], [3, 4, 1]]],
    808: [[[0, 0, 1.25], [1.5, 0, 0.5], [2.75, 4, 0.5], [3.5, 7, 0.5]], [[0, 0, 0.75], [0.75, 0, 0.75], [2.5, 0, 1.5]], [[0, 0, 2], [2.5, -1, 1]], [[0, 0, 1.5], [2, 7, 0.25], [2.5, 4, 1.5]]],
    walk: [[[0, 0, 1], [1, 2, 1], [2, 4, 1], [3, 5, 1]], [[0, 0, 1], [1, 4, 1], [2, 5, 1], [3, 6, 1]], [[0, 7, 1], [1, 6, 1], [2, 4, 1], [3, 2, 1]]],
    pedal: [[[0, 0, 0.5], [0.5, 0, 0.5], [1, 0, 0.5], [1.5, 0, 0.5], [2, 0, 0.5], [2.5, 0, 0.5], [3, 0, 0.5], [3.5, 7, 0.5]]],
  };

  constructor(rng, style = 'dub') {
    this.rng = rng;
    this.style = style;
    this.hold = rng.int(2, 6);
    this.bars = 0;
    this.line = this.fresh();
  }

  fresh() {
    if (this.style === 'acid') {
      const out = [];
      for (let k = 0; k < 16; k++) {
        if (k > 0 && !this.rng.chance(0.62)) continue;
        out.push([k / 4, this.rng.pick([0, 0, 0, 2, 4, 6, 7, 7, -1]), 0.25, this.rng.chance(0.25), this.rng.chance(0.2)]);
      }
      return out;
    }
    return this.rng.pick(BassGen.STYLES[this.style] || BassGen.STYLES.dub).map((n) => n.slice());
  }

  // [[beat, step, length, accent, slide]] for the next bar.
  next() {
    if (++this.bars > this.hold) {
      this.bars = 0;
      this.hold = this.rng.int(2, 6);
      if (this.rng.chance(0.35)) this.line = this.fresh();
      else {
        const n = this.rng.pick(this.line);
        if (this.rng.chance(0.5)) n[1] = this.rng.pick([0, 2, 4, 5, 7, -1, -3]);
        else n[0] = RA.MathUtil.clamp(n[0] + this.rng.pick([-0.25, 0.25, 0.5]), 0, 3.75);
        this.line.sort((a, b) => a[0] - b[0]);
      }
    }
    return this.line;
  }
};

// Collage: a "scene" of two to four sounds from a pool (voices, radio, field recordings),
// each with its own pitch, start point and place in the stereo field, scattered over the
// bar; the scene changes every 8-16 bars, one sound at a time. FSOL-style.
RA.CollageGen = class CollageGen {
  constructor(rng, pool) {
    this.rng = rng;
    this.pool = pool;
    this.scene = [];
    for (let k = rng.int(2, 4); k > 0; k--) this.scene.push(this.sound());
    this.hold = rng.int(8, 16);
    this.bars = 0;
  }

  sound() {
    const r = this.rng;
    return { s: r.pick(this.pool), n: r.int(0, 11), rate: r.pick([0.5, 0.75, 1, 1, 1, 1.5]), begin: r.pick([0, 0, 0.1, 0.25, 0.4]), pan: r.float(-0.8, 0.8) };
  }

  // Hits for the next `beats`: [{ at, sound }], about `rate` per beat.
  next(beats = 4, rate = 0.5) {
    if (++this.bars > this.hold) {
      this.bars = 0;
      this.hold = this.rng.int(8, 16);
      this.scene[this.rng.int(0, this.scene.length - 1)] = this.sound();
    }
    const hits = [];
    for (let at = 0; at < beats; at += 0.5) if (this.rng.chance(rate * 0.5)) hits.push({ at, sound: this.rng.pick(this.scene) });
    return hits;
  }
};

// Drone: a few chord tones held for minutes; now and then one voice moves a step along the
// mode, so the chord drifts without ever jumping.
RA.DroneGen = class DroneGen {
  constructor(rng, voices = 3) {
    this.rng = rng;
    this.steps = [0, 2, 4, 6, 8].slice(0, RA.MathUtil.clamp(voices, 1, 5));
    this.hold = rng.int(2, 5);
    this.bars = 0;
  }

  // { steps (over the chord root), changed }
  next() {
    let changed = false;
    if (++this.bars > this.hold) {
      this.bars = 0;
      this.hold = this.rng.int(2, 5);
      const k = this.rng.int(0, this.steps.length - 1);
      const to = this.steps[k] + this.rng.pick([-1, 1]);
      if (!this.steps.includes(to) && to >= -2 && to <= 11) { this.steps[k] = to; changed = true; }
    }
    return { steps: this.steps.slice().sort((a, b) => a - b), changed };
  }
};

// Motif: a short melody that repeats and changes one detail at a time (a note, a rhythm, a
// rest), Selected Ambient Works-style: you hear the same few notes for a while, then notice
// one has moved.
RA.MotifGen = class MotifGen {
  constructor(rng, melody, { beats = 4, density = 0.4 } = {}) {
    this.rng = rng;
    this.melody = melody;
    this.opts = { beats, density, rest: 0.2 };
    this.motif = melody.create(this.opts);
    this.hold = rng.int(4, 8);
    this.bars = 0;
  }

  next() {
    if (++this.bars > this.hold) {
      this.bars = 0;
      this.hold = this.rng.int(4, 8);
      if (this.rng.chance(0.15)) this.motif = this.melody.create(this.opts);
      else {
        const notes = this.motif.notes;
        const n = this.rng.pick(notes);
        const r = this.rng.next();
        if (r < 0.55) n.step += this.rng.pick([-2, -1, 1, 2]);
        else if (r < 0.8) n.rest = !n.rest && notes.indexOf(n) > 0;
        else n.vel = RA.MathUtil.clamp(n.vel + this.rng.float(-0.2, 0.2), 0.4, 1);
      }
    }
    return this.motif.notes;
  }
};
