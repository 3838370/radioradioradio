// Rng: random helpers. Seedable (mulberry32) for reproducible tests; Math.random otherwise.
export class Rng {
  constructor(seed = null) {
    if (seed == null) {
      this.next = Math.random;
    } else {
      let a = seed >>> 0;
      this.next = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
  }

  float(a = 0, b = 1) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }

  // items: [[value, weight], ...]
  weighted(items) {
    const total = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
    if (total <= 0) return items.length ? items[0][0] : null;
    let r = this.next() * total;
    for (const [v, w] of items) {
      r -= Math.max(0, w);
      if (r <= 0) return v;
    }
    return items[items.length - 1][0];
  }

  shuffle(arr) {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(this.next() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  }
};
