// Ring: an array that wraps around, with Sonic Pi-style tick()/look() counters.
// Counters belong to the loop that is running, so they persist between iterations.
RA.Ring = class Ring extends Array {
  static get [Symbol.species]() { return Array; } // map/filter return plain arrays

  static from(items, counters) {
    const r = new Ring();
    for (const x of items) r.push(x);
    r.counters = counters;
    return r;
  }

  get(k) { return this[RA.MathUtil.mod(k, this.length)]; }

  tick(key = '_') {
    const c = this.counters;
    c[key] = (c[key] == null ? -1 : c[key]) + 1;
    return this.get(c[key]);
  }

  look(key = '_') { return this.get(this.counters[key] || 0); }

  choose() { return this[Math.floor(Math.random() * this.length)]; }
};
