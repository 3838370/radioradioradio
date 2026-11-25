// Mood: a slow drift between the IDM genres, in a random order (CYCLE is just the list):
//   saw      Aphex Twin's ambient side (Selected Ambient Works 85-92 and II, the Drukqs
//            prepared pianos): FM pads, loose 808, ostinatos, tape
//   acid     Aphex Twin's acid and braindance (Analord, the Richard D. James Album): raw 303,
//            808/909, odd-interval motifs
//   drill    drill'n'bass (Drukqs, Come to Daddy): amen chopped at speed under slow, sad melodies
//   boc      Boards of Canada: slow hip-hop breaks, detuned drifting synths, tape, voices
//   minimal  Efdemin: dry 4/4, shuffled hats, bell and organ cells in different cycle lengths
//   dub      dub techno and Gas: chord stabs into long delays, muffled kick, hiss
//   space    drifting space ambient (Aethereon) and FSOL collage
//   dark     slow tension: half-time weight, drones, low brass, detuned pianos
//   ae       Autechre (AE_LIVE 2016-2018): generated, shifting rhythms, harsh FM, no tonic
// Each leg lasts 8-20 minutes: the first ~60% stays on one genre, the rest crossfades into
// the next. Each has its own tempo. Also produces `intensity` (ENERGY in code).
RA.Mood = class Mood {
  static CYCLE = ['saw', 'acid', 'drill', 'boc', 'minimal', 'dub', 'space', 'dark', 'ae'];
  static LABELS = { saw: 'saw', acid: 'acid', drill: 'drill', boc: 'boc', minimal: 'minimal', dub: 'dub', space: 'space', dark: 'dark', ae: 'ae' };
  static BASE_INTENSITY = { saw: 0.35, acid: 0.75, drill: 0.85, boc: 0.45, minimal: 0.6, dub: 0.5, space: 0.3, dark: 0.35, ae: 0.65 };
  static TEMPO = { saw: 96, acid: 132, drill: 168, boc: 90, minimal: 122, dub: 120, space: 84, dark: 76, ae: 118 };

  // The genres of earlier versions, and where they went (saved choices and your patterns).
  static OLD = { fog: ['dub'], deep: ['saw', 'boc'], atmos: ['boc', 'drill'], rave: ['acid'], industrial: ['ae', 'dark'] };

  static migrate(names) {
    return [...new Set((names || []).flatMap((f) => Mood.OLD[f] || [f]).filter((f) => Mood.CYCLE.includes(f)))];
  }

  // Flavour weights of an older pattern ({ fog: 1, deep: 0.3 }) in today's genres.
  static migrateFlavours(flavours) {
    const out = {};
    for (const [f, v] of Object.entries(flavours || {})) {
      for (const g of Mood.OLD[f] || [f]) if (Mood.CYCLE.includes(g)) out[g] = Math.max(out[g] || 0, v);
    }
    return out;
  }

  // The order is not fixed: at every leg the next mood is drawn at random from those not
  // heard recently. Each leg has a random length, and each visit its own tempo (±7%).
  // The radio also starts at a random mood and a random point of its leg.
  // `styles` limits which moods play (the listener's choice); null or empty = all of them.
  constructor(rng, { legMinutes = [8, 20], styles = null } = {}) {
    this.rng = rng;
    this.legMinutes = legMinutes;
    this.history = [];
    this.allowed = Mood.cleanStyles(styles);
    this.from = rng.pick(this.allowed);
    this.to = this.pickNext();
    this.t = rng.float(0, 0.55); // progress through the current leg (crossfade after 0.6)
    this.legLength = this.newLegLength();
    this.tempoFactor = { [this.from]: this.newTempoFactor(), [this.to]: this.newTempoFactor() };
    this.wavePhase = rng.float(0, Math.PI * 2);
  }

  static zeroWeights() {
    const w = {};
    for (const f of Mood.CYCLE) w[f] = 0;
    return w;
  }

  newLegLength() { return this.rng.float(this.legMinutes[0], this.legMinutes[1]); }

  newTempoFactor() { return this.rng.float(0.93, 1.07); }

  // Where the journey tends to go next: Aphex's sides lead into each other (ambient into
  // acid, acid into drill), drill falls into darkness or Autechre, the dark surfaces in
  // space or Boards of Canada, minimal and dub hand over to each other.
  // Weights only: any genre can still follow any other.
  static TENDS = {
    saw: { acid: 2, boc: 2, space: 1.5 },
    acid: { drill: 2.5, ae: 2, minimal: 1.5 },
    drill: { dark: 2.5, ae: 2, saw: 1.5 },
    boc: { saw: 2, dub: 1.5, space: 1.5 },
    minimal: { dub: 2.5, acid: 1.5, ae: 1.5 },
    dub: { minimal: 2, boc: 1.5, space: 1.5 },
    space: { saw: 2, dark: 1.5, boc: 1.5 },
    dark: { ae: 2, space: 2, saw: 1.5 },
    ae: { dark: 2, drill: 2, minimal: 1.5 },
  };

  static cleanStyles(styles) {
    const list = Mood.migrate(styles);
    return list.length ? list : Mood.CYCLE.slice();
  }

  // Changes which moods may play. If the current one is no longer allowed, the radio jumps
  // most of the way into an allowed one (it takes over at once, the rest fades over the
  // remaining leg); a mood already on its way in is re-picked.
  setStyles(styles) {
    this.allowed = Mood.cleanStyles(styles);
    if (!this.allowed.includes(this.to) || this.to === this.from) {
      this.to = this.pickNext();
      this.tempoFactor[this.to] = this.tempoFactor[this.to] || this.newTempoFactor();
    }
    if (!this.allowed.includes(this.from)) this.t = Math.max(this.t, 0.85);
  }

  // Any allowed mood except the current one and the last three heard, weighted by TENDS.
  // With a single style allowed, it stays on that one.
  pickNext() {
    const pool = this.allowed || Mood.CYCLE;
    const recent = new Set([this.from, ...this.history.slice(-3)]);
    let options = pool.filter((f) => !recent.has(f));
    if (!options.length) options = pool.filter((f) => f !== this.from);
    if (!options.length) return pool[0];
    const tends = Mood.TENDS[this.from] || {};
    return this.rng.weighted(options.map((f) => [f, (tends[f] || 1) * this.leanWeight(f)]));
  }

  // Re-draws the mood that comes next, if the crossfade into it hasn't started yet.
  rethinkNext() {
    if (this.t >= 0.6) return;
    this.to = this.pickNext();
    this.tempoFactor[this.to] = this.tempoFactor[this.to] || this.newTempoFactor();
  }

  // `lean` ({ energy, bpm, strength }, set by the composer) is the register the listener
  // left by hand: moods close to it in intensity and tempo are favoured.
  leanWeight(f) {
    const l = this.lean;
    if (!l) return 1;
    const near = Math.exp(-(((Mood.BASE_INTENSITY[f] - l.energy) / 0.2) ** 2) - (((Mood.TEMPO[f] - l.bpm) / 30) ** 2));
    return 1 + 6 * l.strength * near;
  }

  // Advance by one bar at the given tempo. Returns true when a new leg begins.
  advanceBar(bpm) {
    this.t += 4 / bpm / this.legLength;
    this.wavePhase += (Math.PI * 2) / 48; // intensity wave: one cycle per 48 bars
    if (this.t < 1) return false;
    this.t -= 1;
    this.history.push(this.from);
    if (this.history.length > 8) this.history.shift();
    this.from = this.to;
    this.to = this.pickNext();
    this.tempoFactor[this.to] = this.newTempoFactor();
    this.legLength = this.newLegLength();
    return true;
  }

  skip() {
    this.t = Math.max(this.t, 0.6); // jump to the start of the crossfade into the next mood
  }

  // The mood being crossfaded into (for preloading).
  next() { return this.to; }

  // One weight per flavour, summing to 1.
  weights() {
    const x = RA.MathUtil.smoothstep((this.t - 0.6) / 0.4);
    const w = Mood.zeroWeights();
    w[this.from] += 1 - x;
    w[this.to] += x;
    return w;
  }

  dominant() {
    const w = this.weights();
    return Object.keys(w).reduce((a, b) => (w[a] >= w[b] ? a : b));
  }

  blend(table) {
    const w = this.weights();
    return Object.keys(w).reduce((s, f) => s + w[f] * table[f], 0);
  }

  intensity() {
    return RA.MathUtil.clamp(this.blend(Mood.BASE_INTENSITY) + 0.18 * Math.sin(this.wavePhase), 0.05, 1);
  }

  // Tempos are too far apart to blend (76 vs 170), so follow the dominant mood, with this
  // visit's own variation.
  tempo() {
    const d = this.dominant();
    return Math.round(Mood.TEMPO[d] * (this.tempoFactor[d] || 1));
  }
};
