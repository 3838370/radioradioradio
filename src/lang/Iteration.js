// Iteration: one run of a loop body in virtual time. sleep() moves the cursor; sounds are
// collected as events at the cursor and scheduled when the body returns.
export class Iteration {
  constructor(layer, loop, start) {
    this.layer = layer;
    this.loop = loop;
    this.start = start;
    this.cursor = 0;
    this.events = []; // { offset, fn(time, spb), meta }
  }

  sleep(beats) { this.cursor += Math.max(0, +beats || 0); }

  // meta describes the sound ({ key, kind, ... }) for the sequencer view.
  emit(fn, meta = null) { this.events.push({ offset: this.cursor, fn, meta }); }
};
