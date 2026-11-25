// Arc: the shape of the music over minutes. It walks through sections with random lengths
// and a weighted choice of what comes next. Tension comes two ways, fast or slow:
//   sparse   1-2 layers, slower, no drums, long delays and lots of vibrato
//   drift    2-4, still slow and wet
//   build    3-4, the rhythm comes back
//   tension  4-5, slightly faster, drier and brighter
//   surge    5-6, fast tension: accelerating, drums and bass up front, dry
//   peak     everything in, euphoric
//   dread    4-6, slow tension: heavy and dark, half-time weight, sub, closed filters
//   suspense 1-3, slow and empty tension: drones and risers, no drums, filters opening
//   release  2-4, thinning out, delays opening up again
//   collapse 2-3, after a peak: slow, dark, wet and wobbly
// On auto this spends about a quarter of the time on 1-2 layers, 45% on 3-4 and 30% on 5-6,
// and over 40% in tense sections (tension, surge, peak, dread, suspense).
// Each section has a range of layers (the composer picks within it by energy), a tempo
// factor, effect colours, and roles it wants first or leaves out. Each genre prefers some
// sections and avoids others (Genres: sections), and caps the layer count.
// Values glide between sections, so changes are felt rather than heard as switches.
// While the listener steers by hand, the composer holds the arc in the section that matches
// what they're doing; back on auto, the arc carries on from there and keeps leaning towards
// that register (similar sections, similar tempo) for 5 minutes, fading out.
RA.Arc = class Arc {
  static SECTIONS = {
    sparse:   { layers: [1, 2], level: 0.05, tempo: 0.85, delay: 1.9, feedback: 0.2, wow: 3.5, space: 1.5, boost: -0.15, bars: [16, 32], no: ['drums'] },
    drift:    { layers: [2, 4], level: 0.4, tempo: 0.92, delay: 1.3, feedback: 0.1, wow: 2, space: 1.25, boost: -0.05, bars: [16, 32] },
    build:    { layers: [3, 4], level: 0.7, tempo: 1, delay: 1, feedback: 0, wow: 1, space: 1, boost: 0.05, bars: [8, 24] },
    tension:  { layers: [4, 5], level: 0.9, tempo: 1.04, delay: 0.75, feedback: -0.05, wow: 0.7, space: 0.8, boost: 0.15, bars: [12, 28] },
    surge:    { layers: [5, 6], level: 1, tempo: 1.1, delay: 0.6, feedback: -0.05, wow: 0.4, space: 0.7, boost: 0.25, bars: [8, 16], first: ['drums', 'bass'] },
    peak:     { layers: [6, 6], level: 1, tempo: 1.12, delay: 0.6, feedback: -0.05, wow: 0.5, space: 0.7, boost: 0.3, bars: [8, 16] },
    dread:    { layers: [4, 6], level: 0.85, tempo: 0.84, delay: 0.9, feedback: 0.05, wow: 1.2, space: 0.9, boost: 0.1, bars: [12, 28], first: ['bass', 'drums', 'keys'] },
    suspense: { layers: [1, 3], level: 0.25, tempo: 0.86, delay: 1.6, feedback: 0.15, wow: 1.5, space: 1.4, boost: 0.05, bars: [8, 24], no: ['drums', 'perc'], first: ['keys', 'texture'] },
    release:  { layers: [2, 4], level: 0.35, tempo: 0.95, delay: 1.5, feedback: 0.12, wow: 2, space: 1.35, boost: -0.05, bars: [8, 16] },
    collapse: { layers: [2, 3], level: 0.3, tempo: 0.84, delay: 1.7, feedback: 0.15, wow: 3, space: 1.6, boost: -0.25, bars: [8, 20] },
  };

  static NEXT = {
    sparse: [['drift', 3], ['build', 1.2], ['suspense', 1]],
    drift: [['build', 2.5], ['sparse', 0.8], ['tension', 1.2], ['suspense', 0.7], ['dread', 1]],
    build: [['tension', 2.5], ['drift', 1], ['peak', 0.8], ['dread', 1.2], ['surge', 1]],
    tension: [['release', 2.5], ['sparse', 0.8], ['peak', 1.5], ['surge', 1.5]],
    surge: [['peak', 2], ['collapse', 1], ['tension', 1]],
    peak: [['collapse', 3], ['release', 1], ['sparse', 1]],
    dread: [['collapse', 1.5], ['surge', 1], ['suspense', 1], ['release', 1]],
    suspense: [['dread', 1.5], ['surge', 1], ['drift', 1], ['build', 1]],
    release: [['sparse', 1.5], ['drift', 2], ['suspense', 0.6], ['build', 0.8]],
    collapse: [['sparse', 1.5], ['drift', 1.2], ['build', 1], ['suspense', 0.8]],
  };

  static TENSE = ['tension', 'surge', 'peak', 'dread', 'suspense'];
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

  get spec() { return Arc.SECTIONS[this.section]; }

  // How much the genres (weights { genre: 0..1 }) like a section: 1 = neutral. Preferred
  // sections (Genres: sections.prefer) weigh ×2.2, avoided ones ×0.25.
  static genreBias(name, weights) {
    if (!weights) return 1;
    const b = RA.Genres.blend(weights, (g) => (g.sections.prefer.includes(name) ? 2.2 : g.sections.avoid.includes(name) ? 0.25 : 1));
    return b || 1;
  }

  // The most layers the genres play on auto (blended by their weights).
  static cap(weights) {
    const c = RA.Genres.blend(weights, (g) => g.sections.cap);
    return c ? Math.round(c) : 5;
  }

  // The listener is steering (a control on manual): stay in the section that matches what
  // they're doing, and remember that register (`tempo`: their tempo against the genre's, when
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

  // The next section: the NEXT table weighted by the genres' preferences. With a register
  // left by the listener, sections close to it (in level and tempo) are favoured, staying in
  // the same one included.
  next(weights = null) {
    const base = Arc.NEXT[this.section].map(([n, w]) => [n, w * Arc.genreBias(n, weights)]);
    if (!this.lean) return this.rng.weighted(base);
    const { level, tempo, strength: s } = this.lean;
    return this.rng.weighted(Object.keys(Arc.SECTIONS).map((n) => {
      const S = Arc.SECTIONS[n];
      const b = (base.find(([m]) => m === n) || [n, 0])[1];
      const near = Math.exp(-(((S.level - level) / 0.25) ** 2) - (((S.tempo - tempo) / 0.08) ** 2));
      return [n, b * (1 - s) + 6 * s * near];
    }));
  }

  // Once per bar (`seconds`: the bar's length, for the lean's fade; `weights`: the genres
  // now). Returns the new section's name when it changes.
  advanceBar(bar, seconds = 0, weights = null) {
    let changed = null;
    if (!this.held && this.lean && (this.lean.strength -= seconds / Arc.LEAN_SECONDS) <= 0) this.lean = null;
    if (!this.held && bar >= this.start + this.length) {
      this.enter(this.next(weights), bar);
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
