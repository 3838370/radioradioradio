// PatternBank: the AI-written patterns, with lookup by role and fit to the current mood.
// Pattern: { id, role, flavours: { fog?, deep?, atmos? }, energy: [min, max], code }
RA.PatternBank = class PatternBank {
  static ROLES = ['drums', 'perc', 'bass', 'keys', 'lead', 'texture'];

  constructor(patterns) {
    this.patterns = patterns.map((p) => Object.assign({}, p, { code: p.code.trim() }));
  }

  get(id) { return this.patterns.find((p) => p.id === id) || null; }

  // Adds or replaces a pattern (the listener's edits are saved as 'user_' patterns).
  upsert(pattern) {
    const p = Object.assign({}, pattern, { code: pattern.code.trim() });
    const i = this.patterns.findIndex((x) => x.id === p.id);
    if (i >= 0) this.patterns[i] = p; else this.patterns.push(p);
  }

  remove(id) { this.patterns = this.patterns.filter((p) => p.id !== id); }

  userPatterns() { return this.patterns.filter((p) => p.user); }

  byRole(role) { return this.patterns.filter((p) => p.role === role); }

  // 0..1: how well a pattern matches the mood weights.
  fit(pattern, weights) {
    let s = 0;
    for (const f of Object.keys(weights)) s += (pattern.flavours[f] || 0) * weights[f];
    return s;
  }

  energyFit(pattern, intensity) {
    const [lo, hi] = pattern.energy;
    if (intensity < lo) return Math.max(0.1, 1 - (lo - intensity) * 3);
    if (intensity > hi) return Math.max(0.1, 1 - (intensity - hi) * 3);
    return 1;
  }

  // ───── meter: the loops' cycle lengths in 16th steps ─────

  static STRAIGHT = [4, 8, 16, 32]; // these all line up with a bar of 16

  // The short cycles (2-32 steps) of a pattern's loops, measured with `probe` (code ->
  // { lengths: { loop: [beats...] } }), a few times since some patterns pick their meter
  // at random (vary('meter', ...)). Longer loops (pads, drones) set no meter.
  cycles(p, probe) {
    this.cycleCache = this.cycleCache || new Map();
    if (this.cycleCache.size > 400) this.cycleCache.clear(); // live code keeps changing
    if (!this.cycleCache.has(p.code)) {
      const set = new Set();
      for (let run = 0; run < 5; run++) {
        const r = probe(p.code);
        for (const ls of Object.values((r && r.lengths) || {})) for (const l of ls) {
          const n = Math.round(l * 4);
          if (n >= 2 && n <= 32) set.add(n);
        }
      }
      this.cycleCache.set(p.code, [...set].sort((a, b) => a - b));
    }
    return this.cycleCache.get(p.code);
  }

  // Whether cycles suit a chosen step count. Straight (4/8/16/32): only straight cycles, the
  // longest being that count (so 4 = loops that repeat every beat, 16 = a bar). Odd (12,
  // 20...): one of its loops has that length. No short loops (pads, drones): fits any.
  static fits(cycles, steps) {
    if (!cycles.length) return true;
    const S = PatternBank.STRAIGHT;
    if (S.includes(steps)) return cycles.every((c) => S.includes(c)) && Math.max(...cycles) === steps;
    return cycles.includes(steps);
  }

  // Weighted pick among the best six, so good fits are likelier but it's rarely predictable.
  // meter ({ steps, probe }): the listener chose a step count; only patterns that fit it,
  // from any mood (the mood still weighs in). null when none fit.
  pick(role, weights, intensity, rng, exclude = [], meter = null) {
    if (meter) {
      const fitting = this.byRole(role)
        .filter((p) => !exclude.includes(p.id) && PatternBank.fits(this.cycles(p, meter.probe), meter.steps))
        .map((p) => [p, (this.fit(p, weights) + 0.15) * this.energyFit(p, intensity)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      return fitting.length ? rng.weighted(fitting) : null;
    }
    const scored = this.byRole(role)
      .filter((p) => !exclude.includes(p.id))
      .map((p) => [p, this.fit(p, weights) * this.energyFit(p, intensity)])
      .filter(([, s]) => s > 0.05)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    if (!scored.length) return null;
    return rng.weighted(scored.map(([p, s]) => [p, s]));
  }
};
