// BeatGen: drum patterns that evolve instead of looping. Each style is a table of
// probabilities per 16th step for kick (k), snare (s), hat (h) and extra percussion (p).
// A beat is sampled from the table, then every bar a step or two is re-sampled, ghost
// notes come and go, and every 4th bar may end in a fill. Accents follow the grid.
//
// next() returns one bar of 16th steps: [{ k, s, h, p, v }] (booleans + velocity 0..1).
// Most styles are 16 steps (4/4); odd meters are longer or shorter (seven = 7/8 is 14,
// five = 5/4 is 20, eleven = 11/8 is 22, ritual = 12/8 is 24), so loop over b.length, not 16.
// Styles marked `nofill` (dubtechno, pulse_sparse, drift_free) never play fills.
RA.BeatGen = class BeatGen {
  static STYLES = {
    // steady four-on-the-floor (dub, industrial, fog)
    four: {
      k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.1],
      s: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0.15],
      h: [0, 0.15, 0.9, 0.15, 0, 0.15, 0.9, 0.15, 0, 0.15, 0.9, 0.15, 0, 0.15, 0.9, 0.3],
      p: [0, 0, 0, 0.2, 0, 0, 0.15, 0, 0, 0.2, 0, 0, 0, 0, 0.25, 0],
    },
    // breakbeat / rave (amen-like placements)
    break: {
      k: [1, 0, 0.35, 0, 0, 0, 0.2, 0.1, 0, 0, 0.9, 0.25, 0, 0.1, 0, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0.3, 0, 0.25, 0, 0, 1, 0, 0.25, 0.35],
      h: [0.9, 0.35, 0.9, 0.35, 0.9, 0.35, 0.9, 0.35, 0.9, 0.35, 0.9, 0.35, 0.9, 0.35, 0.9, 0.5],
      p: [0, 0, 0, 0.15, 0, 0, 0, 0, 0.15, 0, 0, 0, 0, 0, 0, 0.2],
    },
    // half-time (dark, slow and heavy)
    halftime: {
      k: [1, 0, 0, 0.25, 0, 0, 0.3, 0, 0, 0, 0.5, 0, 0, 0, 0.1, 0],
      s: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.1, 0.2],
      h: [0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0.2, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0.3],
      p: [0, 0, 0.1, 0, 0, 0.15, 0, 0, 0, 0, 0.1, 0, 0, 0.2, 0, 0],
    },
    // drum & bass two-step (16 steps = one bar at ~170)
    dnb: {
      k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.2, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0.2, 0, 0.15, 0, 0, 1, 0, 0, 0.3],
      h: [0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.4],
      p: [0, 0, 0.1, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.1, 0, 0, 0, 0],
    },
    // broken beat: off-grid kicks, swung hats
    broken: {
      k: [1, 0, 0, 0.45, 0, 0, 0.5, 0, 0.2, 0, 0.6, 0, 0, 0.35, 0, 0.2],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.3, 1, 0, 0.2, 0],
      h: [0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4],
      p: [0, 0.15, 0, 0, 0, 0.2, 0, 0.15, 0, 0, 0.2, 0, 0, 0, 0, 0.2],
    },
    // jungle: chopped amen, ghost snares everywhere, kicks that skip
    jungle: {
      k: [1, 0, 0.5, 0, 0, 0, 0, 0.3, 0, 0.4, 0.8, 0, 0, 0.2, 0, 0],
      s: [0, 0, 0, 0.2, 1, 0, 0.3, 0.45, 0, 0.5, 0, 0.35, 1, 0.3, 0.4, 0.5],
      h: [0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5],
      p: [0, 0.1, 0, 0, 0, 0.1, 0, 0, 0.2, 0, 0, 0, 0, 0.15, 0, 0.25],
    },
    // electro: 808 funk, syncopated kick, claps on 2 and 4
    electro: {
      k: [1, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 1, 0, 0, 0.3, 0, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.2],
      h: [0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6, 0.9, 0.6],
      p: [0, 0, 0.3, 0, 0, 0.25, 0, 0, 0, 0, 0, 0.3, 0, 0, 0.3, 0],
    },
    // footwork / juke (~160): kicks in threes against the bar, sparse claps
    footwork: {
      k: [1, 0, 0, 0.9, 0, 0, 0.9, 0, 0, 0.8, 0, 0, 0.9, 0, 0.6, 0],
      s: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.2],
      h: [0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3],
      p: [0, 0.25, 0, 0, 0.3, 0, 0, 0.25, 0, 0, 0.3, 0, 0, 0.25, 0, 0],
    },
    // two-step garage: a skipping kick, snares on 2 and 4, shuffled hats
    garage: {
      k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.3, 0, 0, 0, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.15],
      h: [0, 0, 0.9, 0.3, 0, 0, 0.9, 0.4, 0, 0, 0.9, 0.3, 0, 0, 0.9, 0.4],
      p: [0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0.3],
    },
    // gabber / hardcore: a kick on every beat, offbeat hats, nothing gentle
    gabber: {
      k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0.3, 0.2],
      s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
      h: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      p: [0, 0, 0, 0.2, 0, 0, 0, 0.2, 0, 0, 0, 0.2, 0, 0, 0, 0.3],
    },
    // 7/8 (2+2+3 eighths)
    seven: {
      groups: [4, 4, 6],
      k: [1, 0, 0, 0, 0, 0, 0.4, 0, 1, 0, 0, 0, 0.3, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.9, 0],
      h: [0.8, 0.3, 0.8, 0.3, 0.8, 0.3, 0.8, 0.3, 0.8, 0.3, 0.8, 0.3, 0.8, 0.3],
      p: [0, 0, 0.2, 0, 0, 0, 0, 0.2, 0, 0, 0.25, 0, 0, 0.2],
    },
    // 5/4 (3+2 beats)
    five: {
      groups: [12, 8],
      k: [1, 0, 0, 0, 0, 0, 0.3, 0, 0.6, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.3, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.3],
      h: [0.8, 0.3, 0.7, 0.3, 0.8, 0.3, 0.7, 0.3, 0.8, 0.3, 0.7, 0.3, 0.8, 0.3, 0.7, 0.3, 0.8, 0.3, 0.7, 0.4],
      p: [0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0.2],
    },
    // 11/8 (2+2+3+2+2 eighths)
    eleven: {
      groups: [4, 4, 6, 4, 4],
      k: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.4, 0, 0.8, 0, 0, 0, 0, 0, 0.3, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.3],
      h: Array.from({ length: 22 }, (_, i) => (i % 2 ? 0.3 : 0.8)),
      p: Array.from({ length: 22 }, (_, i) => (i % 5 === 3 ? 0.25 : 0)),
    },
    // dub techno: a soft 4/4 kick, offbeat hats, ghost shaker 16ths, rare rims; no fills
    dubtechno: {
      nofill: true,
      k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.1],
      s: [0, 0, 0, 0, 0.35, 0, 0, 0.2, 0, 0, 0.15, 0, 0.35, 0, 0.15, 0],
      h: [0, 0.1, 0.85, 0.25, 0, 0.1, 0.85, 0.25, 0, 0.1, 0.85, 0.25, 0, 0.1, 0.85, 0.35],
      p: [0.35, 0.2, 0, 0.25, 0.35, 0.2, 0, 0.25, 0.35, 0.2, 0, 0.25, 0.35, 0.2, 0, 0.3],
    },
    // Selected Ambient Works-style 808: loose kicks, busy hats with rolls
    saw808: {
      k: [1, 0, 0, 0.3, 0, 0, 0.5, 0, 0, 0.2, 0.8, 0, 0, 0, 0.2, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.2],
      h: [0.9, 0.3, 0.9, 0.5, 0.9, 0.3, 0.9, 0.6, 0.9, 0.3, 0.9, 0.5, 0.9, 0.4, 0.9, 0.7],
      p: [0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.2, 0, 0],
    },
    // dread: heavy half-time, snare on 3, the kick barely moves
    halftime_dread: {
      k: [1, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0.6, 0, 0, 0, 0, 0],
      s: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.1],
      h: [0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0, 0.5, 0, 0.3, 0.2],
      p: [0, 0, 0, 0.15, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0],
    },
    // FSOL-style chopped break, with gaps
    fsol_break: {
      k: [1, 0, 0, 0, 0, 0, 0.4, 0, 0, 0.7, 0, 0, 0, 0, 0.2, 0],
      s: [0, 0, 0, 0, 1, 0, 0, 0.2, 0, 0, 0, 0.3, 1, 0, 0, 0.3],
      h: [0.7, 0.2, 0.6, 0.2, 0.7, 0.2, 0.6, 0.3, 0.7, 0.2, 0.6, 0.2, 0.7, 0.2, 0.6, 0.4],
      p: [0, 0.2, 0, 0, 0, 0.2, 0, 0, 0.25, 0, 0, 0, 0, 0.2, 0, 0],
    },
    // only a pulse: a kick or a sub hit now and then (suspense, space)
    pulse_sparse: {
      nofill: true,
      k: [1, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0, 0, 0, 0, 0, 0.1, 0],
      s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.15, 0, 0, 0],
      h: [0, 0.1, 0.25, 0.1, 0, 0.1, 0.25, 0.1, 0, 0.1, 0.25, 0.1, 0, 0.1, 0.25, 0.15],
      p: [0, 0, 0.1, 0, 0, 0.15, 0, 0, 0.1, 0, 0, 0.1, 0, 0.15, 0, 0],
    },
    // 12/8 hand drums (24 steps: four groups of six 16ths)
    ritual: {
      groups: [6, 6, 6, 6],
      k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0.8, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0, 0],
      s: [0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0.2],
      h: Array.from({ length: 24 }, (_, i) => (i % 2 ? 0.15 : 0.6)),
      p: [0.6, 0, 0.4, 0.5, 0, 0.4, 0, 0.5, 0.4, 0, 0.5, 0.3, 0.6, 0, 0.4, 0.5, 0, 0.4, 0, 0.5, 0.4, 0, 0.5, 0.3],
    },
    // downtempo / trip-hop: lazy kick, snare on 2 and 4, swung hats
    downtempo: {
      k: [1, 0, 0, 0.2, 0, 0, 0, 0.4, 0, 0, 0.9, 0, 0, 0, 0, 0.2],
      s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.15, 1, 0, 0, 0],
      h: [0.8, 0, 0.6, 0.3, 0.8, 0, 0.6, 0.3, 0.8, 0, 0.6, 0.3, 0.8, 0, 0.6, 0.4],
      p: [0, 0.15, 0, 0, 0, 0, 0.1, 0, 0, 0.15, 0, 0, 0, 0, 0.1, 0],
    },
    // drifting, almost without a pulse: a few soft hits that float
    drift_free: {
      nofill: true,
      k: [1, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0.3, 0, 0, 0, 0, 0],
      s: [0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0.2, 0, 0],
      h: [0.3, 0, 0.15, 0, 0.3, 0, 0.15, 0, 0.3, 0, 0.15, 0, 0.3, 0, 0.15, 0],
      p: [0, 0.1, 0, 0.1, 0, 0, 0.15, 0, 0, 0.1, 0, 0, 0.15, 0, 0, 0.1],
    },
    // Autechre-ish: no fixed grid; probabilities are drawn fresh for every new beat
    ae: null,
    // ae with a bar of 11 to 19 steps that changes when the table does
    ae_odd: null,
  };

  static ACCENT = [1, 0.55, 0.75, 0.55, 0.9, 0.55, 0.75, 0.6, 0.95, 0.55, 0.75, 0.55, 0.9, 0.6, 0.75, 0.65];

  // Accents for a bar made of groups (in 16ths): group starts loudest, then 8ths, then 16ths.
  static accents(groups) {
    const out = [];
    groups.forEach((g, gi) => {
      for (let i = 0; i < g; i++) out.push(i === 0 ? (gi === 0 ? 1 : 0.92) : i % 4 === 0 ? 0.8 : i % 2 === 0 ? 0.7 : 0.55);
    });
    return out;
  }

  constructor(rng, style = 'four', density = 0.5) {
    this.rng = rng;
    this.style = style;
    this.density = density;
    this.table = this.makeTable();
    this.grid = this.sample();
    this.bars = 0;
  }

  makeTable() {
    const t = BeatGen.STYLES[this.style];
    if (t) {
      this.accent = t.groups ? BeatGen.accents(t.groups) : BeatGen.ACCENT;
      return t;
    }
    const n = this.style === 'ae_odd' ? this.rng.int(11, 19) : 16;
    const rand = (lo, hi) => Array.from({ length: n }, () => (this.rng.chance(0.45) ? this.rng.float(lo, hi) : 0));
    const k = rand(0.3, 0.9);
    k[0] = 1;
    this.accent = n === 16 ? BeatGen.ACCENT : BeatGen.accents(n % 2 ? [n - 7, 7] : [n / 2, n / 2]);
    return { k, s: rand(0.2, 0.8), h: rand(0.2, 0.9), p: rand(0.2, 0.7) };
  }

  get length() { return this.table.k.length; }

  // Density scales everything except the main kick and snare hits.
  prob(inst, i) {
    const p = this.table[inst][i];
    if (p >= 0.9) return p;
    return Math.min(1, p * (0.4 + 1.2 * this.density));
  }

  sampleStep(i) {
    const st = {};
    for (const inst of ['k', 's', 'h', 'p']) st[inst] = this.rng.chance(this.prob(inst, i));
    st.v = this.accent[i] * this.rng.float(0.85, 1);
    return st;
  }

  sample() { return Array.from({ length: this.length }, (_, i) => this.sampleStep(i)); }

  // The beat for the next bar.
  next(density = this.density) {
    this.density = density;
    this.bars++;
    // evolve: re-sample a couple of steps; now and then a fresh beat (or, for 'ae', a fresh table)
    const changes = this.rng.int(0, 2);
    for (let c = 0; c < changes; c++) {
      const i = this.rng.int(1, this.length - 1);
      this.grid[i] = this.sampleStep(i);
    }
    if (this.bars % 16 === 0 && this.rng.chance(0.4)) {
      if (this.style === 'ae' || this.style === 'ae_odd') this.table = this.makeTable();
      this.grid = this.sample();
    }
    const bar = this.grid.map((s) => Object.assign({}, s));
    // styles marked nofill (dub techno, sparse pulses) never break their steady flow
    if (!this.table.nofill && this.bars % 4 === 0 && this.rng.chance(0.55)) this.fill(bar, this.bars % 16 === 0 ? 8 : 4);
    return bar;
  }

  // Ends the bar with one of several fills over its last `len` steps.
  fill(bar, len) {
    const n = bar.length, from = n - len;
    const kind = this.rng.pick(['roll', 'roll', 'kicks', 'drop', 'perc', 'stutter', 'flam']);
    for (let i = from; i < n; i++) {
      const t = (i - from) / len, st = bar[i];
      if (kind === 'roll') Object.assign(st, { s: this.rng.chance(0.85), v: 0.45 + t * 0.6 });
      else if (kind === 'kicks') Object.assign(st, { k: i % 2 === 0 || this.rng.chance(0.4), s: false, v: 0.6 + t * 0.4 });
      else if (kind === 'drop') Object.assign(st, { k: false, s: false, h: i === n - 1, p: false });  // a hole before the one
      else if (kind === 'perc') Object.assign(st, { p: true, h: false, v: 0.5 + t * 0.5 });
      else if (kind === 'stutter') Object.assign(st, bar[from + ((i - from) % 2)], { v: 0.7 + t * 0.3 }); // repeat two steps
      else if (kind === 'flam') Object.assign(st, { s: i % 3 === 0, k: i % 3 === 2, v: 0.8 });
    }
  }
};
