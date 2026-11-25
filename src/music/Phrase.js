// Phrase: the state of one named melody inside a layer: its base motif, where it is in
// its form, and how many forms it has played.
export class Phrase {
  static FORM = ['A', "A'", 'B', "A''"];

  constructor(gen, opts) {
    this.gen = gen;
    this.opts = opts;
    this.base = gen.create(opts);
    this.b = gen.vary(this.base, 0.8);
    this.plays = 0;
  }

  // The motif to play this time, moving through the form and evolving over time.
  next() {
    const part = Phrase.FORM[this.plays % 4];
    if (this.plays > 0 && this.plays % (4 * (this.opts.evolve || 2)) === 0) {
      if (this.gen.rng.chance(0.3)) this.base = this.gen.create(this.opts);
      else this.base = this.gen.vary(this.base, 0.6);
      this.b = this.gen.vary(this.base, 0.8);
    }
    this.plays++;
    if (part === 'A') return this.base;
    if (part === 'B') return this.b;
    const m = this.gen.vary(this.base, part === "A'" ? 0.2 : 0.4);
    if (part === "A''") m.notes[m.notes.length - 1].step = this.gen.rng.pick([0, 4, 7]);
    return m;
  }
};
