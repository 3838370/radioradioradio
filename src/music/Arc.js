// Arc: the shape of the music over minutes, independent of the mood. It walks through
// sections with random lengths and a weighted choice of what comes next:
//   sparse   few layers, slower, long delays and lots of vibrato
//   drift    a little more, still slow and wet
//   build    layers come back
//   tension  full, slightly faster, drier and brighter
//   release  thinning out, delays opening up again
//   peak     euphoric: everything in, accelerating, energy pushed up
//   collapse after the peak: it slows down and goes dark, wet and wobbly
// Values glide between sections, so changes are felt rather than heard as switches.
// While the listener steers by hand, the composer holds the arc in the section that matches
// what they're doing; back on auto, the arc carries on from there and keeps leaning towards
// that register (similar sections, similar tempo) for 5 minutes, fading out.
RA.Arc = class Arc {
  static SECTIONS = {
    sparse:   { level: 0.05, tempo: 0.82, delay: 1.9, feedback: 0.2, wow: 3.5, space: 1.5, boost: -0.15, bars: [16, 40] },
    drift:    { level: 0.4, tempo: 0.92, delay: 1.3, feedback: 0.1, wow: 2, space: 1.25, boost: -0.05, bars: [16, 32] },
    build:    { level: 0.75, tempo: 1, delay: 1, feedback: 0, wow: 1, space: 1, boost: 0.05, bars: [8, 24] },
    tension:  { level: 1, tempo: 1.06, delay: 0.75, feedback: -0.05, wow: 0.7, space: 0.8, boost: 0.15, bars: [16, 32] },
    release:  { level: 0.35, tempo: 0.95, delay: 1.5, feedback: 0.12, wow: 2, space: 1.35, boost: -0.05, bars: [8, 16] },
    peak:     { level: 1, tempo: 1.12, delay: 0.6, feedback: -0.05, wow: 0.5, space: 0.7, boost: 0.3, bars: [8, 16] },
    collapse: { level: 0.3, tempo: 0.84, delay: 1.7, feedback: 0.15, wow: 3, space: 1.6, boost: -0.25, bars: [8, 24] },
  };

  static NEXT = {
    sparse: [['drift', 3], ['build', 1]],
    drift: [['build', 2], ['sparse', 1], ['tension', 1]],
    build: [['tension', 3], ['drift', 1], ['peak', 1]],
    tension: [['release', 3], ['sparse', 1], ['peak', 2]],
    release: [['sparse', 2], ['drift', 2]],
    peak: [['collapse', 3], ['release', 1], ['sparse', 1]],
    collapse: [['sparse', 2], ['drift', 1], ['build', 1]],
  };

  static KEYS = ['level', 'tempo', 'delay', 'feedback', 'wow', 'space', 'boost'];

  constructor(rng, { scale = 1 } = {}) {
    this.rng = rng;
    this.scale = scale; // fast mode shortens sections
    this.held = false;  // true while the listener steers
    this.lean = null;   // { level, tempo, strength }: the register the listener left
    // Start in a random section, somewhere in the middle of it.
    const first = rng.pick(Object.keys(Arc.SECTIONS));
    this.value = Object.assign({}, Arc.SECTIONS[first]);
    this.enter(first, 0);
    this.start -= rng.int(0, Math.max(0, this.length - 2));
  }

  enter(name, bar) {
    const s = Arc.SECTIONS[name];
    this.section = name;
    this.start = bar;
    this.length = Math.max(2, Math.round(this.rng.int(s.bars[0], s.bars[1]) * this.scale));
  }

  // The listener is steering (a control on manual): stay in the section that matches what
  // they're doing, and remember that register (`tempo`: their tempo against the mood's, when
  // they set it). Returns the name when it changes.
  hold(name, bar, tempo = null) {
    this.held = true;
    const S = Arc.SECTIONS[name];
    this.lean = { level: S.level, tempo: tempo || S.tempo, strength: 1 };
    if (name === this.section) return null;
    this.enter(name, bar);
    return name;
  }

  // Back on auto: carry on from where the listener left it, a full section from now. The
  // register they left keeps pulling (see next()) and fades out over LEAN_SECONDS.
  letGo(bar) {
    if (!this.held) return;
    this.held = false;
    this.enter(this.section, bar);
  }

  static LEAN_SECONDS = 300; // the listener's register fades out evenly over 5 minutes

  // The next section. With a register left by the listener, sections close to it (in level
  // and tempo) are favoured, staying in the same one included; otherwise the usual NEXT table.
  next() {
    const base = Arc.NEXT[this.section];
    if (!this.lean) return this.rng.weighted(base);
    const { level, tempo, strength: s } = this.lean;
    return this.rng.weighted(Object.keys(Arc.SECTIONS).map((n) => {
      const S = Arc.SECTIONS[n];
      const b = (base.find(([m]) => m === n) || [n, 0])[1];
      const near = Math.exp(-(((S.level - level) / 0.25) ** 2) - (((S.tempo - tempo) / 0.08) ** 2));
      return [n, b * (1 - s) + 6 * s * near];
    }));
  }

  // Once per bar (`seconds`: the bar's length, for the lean's fade). Returns the new
  // section's name when it changes.
  advanceBar(bar, seconds = 0) {
    let changed = null;
    if (!this.held && this.lean && (this.lean.strength -= seconds / Arc.LEAN_SECONDS) <= 0) this.lean = null;
    if (!this.held && bar >= this.start + this.length) {
      this.enter(this.next(), bar);
      changed = this.section;
    }
    const target = Arc.SECTIONS[this.section];
    for (const k of Arc.KEYS) this.value[k] += (target[k] - this.value[k]) * 0.2;
    return changed;
  }

  skip(bar) { if (!this.held) this.length = bar - this.start; }

  get level() { return this.value.level; }
  // With a register left by the listener, the tempo stays near theirs while it fades.
  get tempo() {
    const l = this.lean;
    return l ? this.value.tempo * (1 - l.strength) + l.tempo * l.strength : this.value.tempo;
  }
  get boost() { return this.value.boost; }
};
