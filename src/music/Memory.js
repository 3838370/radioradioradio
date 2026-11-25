// Memory: what this session has already heard. Patterns heard recently or often weigh less
// when the composer picks (fatigue that wears off: half back after HALF_LIFE bars), and
// recipe versions (signatures) already heard are avoided.
export class Memory {
  static HALF_LIFE = 160; // bars: about 5 minutes at 120 BPM

  constructor() {
    this.patterns = new Map(); // id -> { count, bar }
    this.sigs = new Map();     // recipe signature -> bar last heard
  }

  note(id, sig, bar) {
    const p = this.patterns.get(id) || { count: 0, bar };
    p.count++;
    p.bar = bar;
    this.patterns.set(id, p);
    if (sig) this.sigs.set(sig, bar);
    if (this.sigs.size > 2000) this.sigs.delete(this.sigs.keys().next().value);
  }

  // 0.05..1: low for a pattern heard a moment ago, back towards 1 over time, a little lower
  // the more often it has played.
  weight(id, bar) {
    const p = this.patterns.get(id);
    if (!p) return 1;
    const fresh = 1 - Math.pow(0.5, Math.max(0, bar - p.bar) / Memory.HALF_LIFE);
    return Math.max(0.05, fresh / (1 + 0.08 * (p.count - 1)));
  }

  heard(sig) { return this.sigs.has(sig); }

  get size() { return this.patterns.size; }
};
