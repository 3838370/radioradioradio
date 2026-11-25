import { MathUtil } from '../core/MathUtil.js';
import { Genres } from './Genres.js';

// GenreDrift: the slow journey between the genres (see Genres), in a random order. Each leg
// lasts 8-20 minutes: the first ~60% stays on one genre, the rest crossfades into the next.
// The crossfade is in the weights: they decide which patterns fit, the dominant genre sets
// the tempo and the harmony. Also produces `intensity` (ENERGY in code).
export class GenreDrift {
  // The order is not fixed: at every leg the next genre is drawn at random from those not
  // heard recently, leaning on Genres' `tends`. Each leg has a random length, and each visit
  // its own tempo (±7%). The radio also starts at a random genre and a random point of its leg.
  // `allowed` limits which genres play (the listener's choice); null or empty = all of them.
  constructor(rng, { legMinutes = [8, 20], allowed = null } = {}) {
    this.rng = rng;
    this.legMinutes = legMinutes;
    this.history = [];
    this.allowed = GenreDrift.clean(allowed);
    this.from = rng.pick(this.allowed);
    this.to = this.pickNext();
    this.t = rng.float(0, 0.55); // progress through the current leg (crossfade after 0.6)
    this.legLength = this.newLegLength();
    this.tempoFactor = { [this.from]: this.newTempoFactor(), [this.to]: this.newTempoFactor() };
    this.wavePhase = rng.float(0, Math.PI * 2);
  }

  static clean(names) {
    const list = Genres.migrate(names);
    return list.length ? list : Genres.LIST.slice();
  }

  newLegLength() { return this.rng.float(this.legMinutes[0], this.legMinutes[1]); }

  newTempoFactor() { return this.rng.float(0.93, 1.07); }

  // Changes which genres may play. If the current one is no longer allowed, the radio jumps
  // most of the way into an allowed one (it takes over at once, the rest fades over the
  // remaining leg); a genre already on its way in is re-picked.
  setAllowed(names) {
    this.allowed = GenreDrift.clean(names);
    if (!this.allowed.includes(this.to) || this.to === this.from) {
      this.to = this.pickNext();
      this.tempoFactor[this.to] = this.tempoFactor[this.to] || this.newTempoFactor();
    }
    if (!this.allowed.includes(this.from)) this.t = Math.max(this.t, 0.85);
  }

  // Any allowed genre except the current one and the last three heard, weighted by `tends`.
  // With a single genre allowed, it stays on that one.
  pickNext() {
    const pool = this.allowed || Genres.LIST;
    const recent = new Set([this.from, ...this.history.slice(-3)]);
    let options = pool.filter((g) => !recent.has(g));
    if (!options.length) options = pool.filter((g) => g !== this.from);
    if (!options.length) return pool[0];
    const tends = (Genres.of(this.from) || {}).tends || {};
    return this.rng.weighted(options.map((g) => [g, (tends[g] || 1) * this.leanWeight(g)]));
  }

  // Re-draws the genre that comes next, if the crossfade into it hasn't started yet.
  rethinkNext() {
    if (this.t >= 0.6) return;
    this.to = this.pickNext();
    this.tempoFactor[this.to] = this.tempoFactor[this.to] || this.newTempoFactor();
  }

  // `lean` ({ energy, bpm, strength }, set by the composer) is the register the listener
  // left by hand: genres close to it in intensity and tempo are favoured.
  leanWeight(g) {
    const l = this.lean;
    if (!l) return 1;
    const G = Genres.of(g);
    const near = Math.exp(-(((G.intensity - l.energy) / 0.2) ** 2) - (((G.tempo - l.bpm) / 30) ** 2));
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
    this.t = Math.max(this.t, 0.6); // jump to the start of the crossfade into the next genre
  }

  // The genre being crossfaded into (for preloading).
  next() { return this.to; }

  // One weight per genre, summing to 1.
  weights() {
    const x = MathUtil.smoothstep((this.t - 0.6) / 0.4);
    const w = Genres.zeroWeights();
    w[this.from] += 1 - x;
    w[this.to] += x;
    return w;
  }

  dominant() {
    const w = this.weights();
    return Object.keys(w).reduce((a, b) => (w[a] >= w[b] ? a : b));
  }

  intensity() {
    return MathUtil.clamp(Genres.blend(this.weights(), (g) => g.intensity) + 0.18 * Math.sin(this.wavePhase), 0.05, 1);
  }

  // Tempos are too far apart to blend (76 vs 168), so follow the dominant genre, with this
  // visit's own variation.
  tempo() {
    const d = this.dominant();
    return Math.round(Genres.of(d).tempo * (this.tempoFactor[d] || 1));
  }
};
