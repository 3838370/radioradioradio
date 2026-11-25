import { Loop } from './Loop.js';

// Layer: one running piece of code (from a pattern) with its loops and its own bus.
export class Layer {
  constructor({ id, role, pattern }) {
    this.id = id;
    this.role = role;
    this.pattern = pattern;   // the bank entry it came from
    this.code = '';
    this.prevGood = null;     // last code that ran without errors, for rollback
    this.loops = new Map();
    this.muted = false;
    this.locked = false;
    this.lockedBeforeEdit = null; // lock state to restore when an unused editor closes
    this.vars = new Map();        // vary / walk / phrase state, kept across hot-swaps
    this.params = {};             // its params({ ... }) values, read as P in the code
    this.fxAuto = true;           // let the Automation move this layer's sound settings
    this.mutes = new Set();       // sounds silenced by the code's mute(...) line
    this.hand = new Set();        // sounds played by hits(...) lines (the sequencer's rows)
    this.played = [];             // recent sounds { beat, loop, key, kind, ... }, for the sequencer
    this.iterations = new Map();  // loop name -> its last few iterations [{ start, len }]
  }

  noteIteration(name, start, len) {
    const list = this.iterations.get(name) || [];
    list.push({ start, len });
    if (list.length > 6) list.shift();
    this.iterations.set(name, list);
  }

  // The iteration of a loop that's sounding at `beat` (iterations are scheduled ahead).
  iterationAt(name, beat) {
    const list = this.iterations.get(name) || [];
    for (let k = list.length - 1; k >= 0; k--) if (list[k].start <= beat + 1e-6) return list[k];
    return list[0] || null;
  }

  // Keeps about the last 16 bars of sounds.
  record(ev) {
    this.played.push(ev);
    if (this.played.length > 600 || (this.played.length > 64 && this.played[0].beat < ev.beat - 64)) {
      const from = ev.beat - 64;
      this.played = this.played.filter((e) => e.beat >= from).slice(-400);
    }
  }

  get patternId() { return this.pattern.id; }

  // Hot-swap: loops with the same name keep their timing and counters and pick up the
  // new body at their next iteration; new loops start at startBeat; missing ones stop.
  define(defined, startBeat) {
    for (const [name, fn] of Object.entries(defined)) {
      const loop = this.loops.get(name);
      if (loop) loop.fn = fn;
      else this.loops.set(name, new Loop(name, fn, startBeat));
    }
    for (const [name, loop] of this.loops) {
      if (!(name in defined)) { loop.stopped = true; this.loops.delete(name); }
    }
  }

  stop() {
    for (const loop of this.loops.values()) loop.stopped = true;
  }
};
