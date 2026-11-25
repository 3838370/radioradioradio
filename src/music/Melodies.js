// Melodies: the melody styles behind melody() in pattern code, one per family of genres,
// and a bank of short original cells to start from (scale steps over a root, durations in
// beats, null = rest). None of them closes phrases like a song; each holds its idea and
// changes it the way that music does:
//   ostinato     Aphex Twin (saw, acid, drill): a cell repeats, then rotates, transposes,
//                swaps an octave or a note. Cells of 1.5, 2.5 or 3 beats run against the bar.
//   drift        Boards of Canada, space: long modal notes and rests, each a little out of
//                tune (detune, in cents), the line moving one note at a time.
//   probability  Autechre: a step sequence of an odd length where every step has a chance
//                to play; notes leave the mode, slightly detuned; probabilities wander.
//   cells        Efdemin, dub: two or three tiny bell figures, each looping in its own cycle
//                length (3 against 4 against 5), so their sum keeps shifting.
RA.MelodyBank = {
  ostinato: [
    [[0, 0.5], [2, 0.5], [4, 0.5], [2, 0.5]],
    [[0, 0.5], [4, 0.5], [7, 0.5], [4, 0.5], [2, 0.5], [4, 0.5]],
    [[0, 0.25], [0, 0.25], [3, 0.5], [2, 0.5], [5, 0.5], [4, 1]],
    [[4, 0.5], [3, 0.5], [2, 0.5], [0, 0.5], [-1, 1], [0, 1]],
    [[0, 0.75], [2, 0.75], [4, 0.5]],
    [[0, 0.5], [7, 0.5], [6, 0.5], [4, 0.5], [2, 0.5]],
    [[2, 0.5], [0, 0.5], [4, 0.5], [0, 0.5], [5, 0.5], [0, 0.5]],
    [[0, 1], [1, 0.5], [0, 0.5], [-2, 1], [0, 1]],
    [[0, 0.25], [4, 0.25], [7, 0.25], [9, 0.25], [7, 0.25], [4, 0.25]],
    [[0, 0.5], [2, 0.25], [3, 0.25], [2, 0.5], [0, 0.5], [-3, 1], [-1, 1]],
    [[0, 1.5], [4, 0.5], [3, 1], [1, 1]],
    [[7, 0.5], [6, 0.5], [4, 0.5], [6, 0.5], [7, 0.5], [9, 0.5], [7, 1]],
    [[0, 0.5], [3, 0.5], [1, 0.5], [4, 0.5], [2, 0.5], [5, 0.5]],
    [[0, 0.5], [-1, 0.5], [0, 0.5], [3, 0.5]],
    [[0, 0.25], [7, 0.25], [0, 0.25], [6, 0.25], [0, 0.25], [4, 0.25], [2, 0.5]],
    [[4, 0.75], [2, 0.75], [0, 0.5], [2, 0.5], [4, 0.5], [6, 1]],
    [[0, 0.5], [0, 0.5], [7, 0.5], [5, 0.5], [3, 1]],
    [[2, 0.25], [4, 0.25], [2, 0.25], [0, 0.25], [-1, 0.5], [0, 0.5], [2, 1]],
    [[0, 2], [2, 1], [1, 1]],
    [[4, 1.5], [3, 0.5], [2, 2]],
    [[0, 1], [4, 1], [3, 1], [2, 1]],
    [[2, 3], [1, 1], [0, 4]],
    [[9, 0.5], [7, 0.5], [4, 0.5], [2, 0.5], [0, 1], [2, 1]],
    [[0, 0.5], [5, 0.5], [3, 0.5], [7, 0.5], [6, 1]],
  ],
  drift: [
    [[0, 2], [4, 1], [3, 1]],
    [[4, 3], [null, 1], [2, 2], [1, 2]],
    [[0, 1.5], [2, 0.5], [4, 2]],
    [[7, 2], [6, 1], [4, 1], [2, 4]],
    [[0, 4], [null, 2], [4, 2]],
    [[2, 1], [3, 1], [4, 2], [null, 2], [1, 2]],
    [[0, 0.5], [4, 1.5], [6, 2]],
    [[4, 2], [2, 2], [0, 2], [-1, 2]],
    [[0, 3], [6, 1], [4, 4]],
    [[2, 1], [null, 1], [2, 1], [4, 1], [3, 4]],
    [[9, 2], [7, 2], [4, 4]],
    [[0, 1], [1, 1], [2, 2], [null, 4]],
    [[5, 2], [4, 1], [2, 1], [0, 4]],
    [[0, 6], [2, 2]],
    [[4, 1], [6, 1], [7, 2], [null, 2], [6, 2]],
    [[2, 2], [0, 2], [null, 1], [4, 3]],
  ],
  cells: [
    [0, 4], [2, null, 4], [0, null, null, 7], [4, 2, null], [0, null, 3, null, 5], [7, null, 4],
    [0, 2, null, null], [9, null, null, 4, null], [2, null], [0, null, null], [4, null, 6, null, null, 3, null],
    [0, 7, null, null, 5], [5, null, 4], [7, 9, null, null], [null, 2, null, 0, null],
  ],
  // pitch-class sets (semitones) for Autechre-style lines that leave the mode
  sets: [[0, 1, 6], [0, 3, 4, 7], [0, 5, 6, 11], [0, 2, 7, 8], [0, 1, 5, 8], [0, 4, 6, 10], [0, 3, 6, 9], [0, 2, 3, 8]],
};

// A cell that repeats and changes one thing at a time.
RA.OstinatoGen = class OstinatoGen {
  constructor(rng, cell = null) {
    this.rng = rng;
    this.cell = (cell || rng.pick(RA.MelodyBank.ostinato)).map((n) => n.slice());
    this.shift = 0;    // transposition in scale steps
    this.pos = 0;      // where in the cell the next note starts (cells run across bars)
    this.hold = rng.int(4, 8);
    this.bars = 0;
  }

  change() {
    const r = this.rng.next();
    const c = this.cell;
    if (r < 0.25) c.push(c.shift());                                            // rotate
    else if (r < 0.45) this.shift = this.rng.pick([-2, -1, 0, 1, 2, 3]);         // transpose
    else if (r < 0.65) { const n = this.rng.pick(c); if (n[0] != null) n[0] += this.rng.pick([-7, 7]); } // octave
    else if (r < 0.85) { const n = this.rng.pick(c); if (n[0] != null) n[0] += this.rng.pick([-2, -1, 1, 2]); } // a note
    else this.cell = this.rng.pick(RA.MelodyBank.ostinato).map((n) => n.slice()); // a new cell, now and then
  }

  // [{ step, dur, vel }] filling `beats`
  next(beats = 4) {
    if (++this.bars > this.hold) { this.bars = 0; this.hold = this.rng.int(4, 8); this.change(); }
    const out = [];
    let t = 0;
    while (t < beats - 1e-9) {
      const [step, dur] = this.cell[this.pos % this.cell.length];
      const d = Math.min(dur, beats - t);
      out.push({ step: step == null ? null : step + this.shift, dur: d, vel: this.pos % this.cell.length === 0 ? 1 : this.rng.float(0.65, 0.9) });
      t += d;
      this.pos++;
    }
    return out;
  }
};

// Long notes that wander and are never quite in tune.
RA.DriftGen = class DriftGen {
  constructor(rng) {
    this.rng = rng;
    this.line = rng.pick(RA.MelodyBank.drift).map((n) => n.slice());
    this.pos = 0;
    this.left = 0; // beats still to play of the current note (notes run across bars)
    this.hold = rng.int(2, 5);
    this.rounds = 0;
  }

  next(beats = 4) {
    const out = [];
    let t = 0;
    while (t < beats - 1e-9) {
      if (this.left <= 1e-9) {
        if (this.pos > 0 && this.pos % this.line.length === 0 && ++this.rounds >= this.hold) {
          this.rounds = 0;
          this.hold = this.rng.int(2, 5);
          if (this.rng.chance(0.3)) this.line = this.rng.pick(RA.MelodyBank.drift).map((n) => n.slice());
          else { const n = this.rng.pick(this.line); if (n[0] != null) n[0] += this.rng.pick([-2, -1, 1, 2]); }
        }
        this.cur = this.line[this.pos % this.line.length];
        this.left = this.cur[1];
        this.fresh = true;
        this.pos++;
      }
      const d = Math.min(this.left, beats - t);
      // a note carried over from the last bar is a rest here (it is still ringing)
      out.push({ step: this.fresh ? this.cur[0] : null, len: this.left, dur: d, vel: this.rng.float(0.6, 0.85), detune: this.rng.float(-18, 18) });
      this.fresh = false;
      this.left -= d;
      t += d;
    }
    return out;
  }
};

// An odd-length step sequence where each step plays with its own probability.
RA.ProbabilityGen = class ProbabilityGen {
  constructor(rng) {
    this.rng = rng;
    this.make();
  }

  make() {
    const r = this.rng;
    this.len = r.pick([5, 7, 9, 11, 13]);
    this.unit = r.pick([0.25, 0.25, 1 / 3, 0.5]);
    this.set = r.pick(RA.MelodyBank.sets);
    this.steps = Array.from({ length: this.len }, () => ({ semi: r.pick(this.set) + 12 * r.pick([0, 0, 1, -1]), p: r.float(0.2, 0.95), detune: r.float(-35, 35) }));
    this.pos = 0;
    this.bars = 0;
  }

  next(beats = 4) {
    if (++this.bars > this.rng.int(8, 16)) this.make();
    for (const s of this.steps) s.p = RA.MathUtil.clamp(s.p + this.rng.float(-0.12, 0.12), 0.1, 1);
    const out = [];
    let t = 0;
    while (t < beats - 1e-9) {
      const s = this.steps[this.pos % this.len];
      const d = Math.min(this.unit, beats - t);
      const play = this.rng.chance(s.p);
      out.push({ semi: play ? s.semi : null, dur: d, vel: this.rng.float(0.5, 1), detune: s.detune, ratchet: play && this.rng.chance(0.08) });
      this.pos++;
      t += d;
    }
    return out;
  }
};

// Two or three little figures, each in its own cycle length, on half beats.
RA.CellsGen = class CellsGen {
  constructor(rng) {
    this.rng = rng;
    this.pick();
    this.t = 0;
    this.bars = 0;
  }

  pick() {
    const lens = new Set();
    this.voices = [];
    for (let k = this.rng.int(2, 3); k > 0; k--) {
      let c = this.rng.pick(RA.MelodyBank.cells);
      for (let tries = 0; tries < 6 && lens.has(c.length); tries++) c = this.rng.pick(RA.MelodyBank.cells);
      lens.add(c.length);
      this.voices.push({ cell: c.slice(), oct: this.rng.pick([0, 0, 1]) });
    }
    this.hold = this.rng.int(16, 32);
  }

  // [{ steps: [..] (or empty), dur }] on half beats
  next(beats = 4) {
    if (++this.bars > this.hold) { this.bars = 0; this.pick(); }
    const out = [];
    for (let h = 0; h < beats * 2; h++, this.t++) {
      const steps = [];
      for (const v of this.voices) {
        const s = v.cell[this.t % v.cell.length];
        if (s != null) steps.push(s + 7 * v.oct);
      }
      out.push({ steps, dur: 0.5, vel: this.rng.float(0.6, 0.95) });
    }
    return out;
  }
};
