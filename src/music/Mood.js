// Mood: a slow drift between flavours, in a random order (CYCLE is just the list):
//   fog    submerged ambient techno (Gas): muffled 4/4 kick under looping strings and horns
//   dub    dub techno: chord stabs dissolving into long delays, rolling filters
//   deep   deep ambient / downtempo (late-90s ambient electronica): pads, drones, soft grooves
//   space  drifting space ambient with Selected Ambient Works-style melodies, pianos and
//          Future Sound of London-style collage
//   atmos  atmospheric / intelligent drum & bass: rolling breaks, reese bass, jazzy chords
//   rave   excited: breakbeats, hoovers, supersaw stabs, rave voices
//   dark   slow, scary: horror pads, half-time weight, noise and drones
//   industrial  machines, metal, distorted bass, people and city sounds, a synthesized metro
//   ae     Autechre-like (AE_LIVE): shifting polyrhythms, harsh FM, rhythms that fall apart
// Each leg lasts 8-20 minutes: the first ~60% stays on one flavour, the rest crossfades
// into the next. Each mood has its own tempo. Also produces `intensity` (ENERGY in code).
RA.Mood = class Mood {
  static CYCLE = ['deep', 'space', 'atmos', 'rave', 'dark', 'industrial', 'ae', 'fog', 'dub'];
  static LABELS = { fog: 'fog', dub: 'dub', deep: 'deep', space: 'space', atmos: 'atmos', rave: 'rave', dark: 'dark', industrial: 'indust', ae: 'ae' };
  static BASE_INTENSITY = { fog: 0.45, dub: 0.5, deep: 0.4, space: 0.3, atmos: 0.75, rave: 0.85, dark: 0.35, industrial: 0.7, ae: 0.6 };
  static TEMPO = { fog: 116, dub: 122, deep: 100, space: 86, atmos: 170, rave: 148, dark: 76, industrial: 128, ae: 112 };

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

  // Where the journey tends to go next: after the excited moods it falls into darkness and
  // machines; after the dark it surfaces somewhere calm, or straight back into a rave.
  // Weights only: any mood can still follow any other.
  static TENDS = {
    rave: { dark: 3, industrial: 3, ae: 2 },
    atmos: { rave: 2, dark: 2, industrial: 2 },
    dark: { industrial: 2, space: 2, rave: 2, deep: 1.5 },
    industrial: { ae: 2.5, dark: 2, rave: 1.5 },
    ae: { dark: 2, industrial: 2, space: 1.5 },
    deep: { atmos: 2, dub: 1.5, rave: 1.5 },
    space: { deep: 1.5, atmos: 1.5, ae: 1.5 },
    fog: { dub: 2, industrial: 1.5, dark: 1.5 },
    dub: { fog: 1.5, deep: 1.5, rave: 1.5 },
  };

  static cleanStyles(styles) {
    const list = (styles || []).filter((f) => Mood.CYCLE.includes(f));
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
