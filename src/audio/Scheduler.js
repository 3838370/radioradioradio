// Scheduler: a lookahead event queue in beats. A 25 ms timer advances the clock in small
// steps up to ~120 ms ahead of the audio clock and fires everything due in each step,
// so sounds are scheduled sample-accurately no matter how the page is rendering.
RA.Scheduler = class Scheduler {
  constructor(ac, clock, logger) {
    this.ac = ac;
    this.clock = clock;
    this.logger = logger;
    this.step = 1 / 32;
    this.events = []; // { beat, fn(time, spb) } sorted by beat
    this.hooks = [];  // fn(fromBeat, toBeat) run before each step's events fire
    this.timer = null;
    this.late = 0;
  }

  start() {
    this.clock.time = this.ac.currentTime + 0.15;
    this.clock.beat = 0;
    this.timer = setInterval(() => this.tick(), 25);
  }

  stop() { clearInterval(this.timer); }

  addHook(fn) { this.hooks.push(fn); }

  // `tag` lets a group of events be cancelled later (e.g. a layer's queued notes).
  at(beat, fn, tag = null) {
    const a = this.events;
    let lo = 0, hi = a.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (a[mid].beat <= beat) lo = mid + 1; else hi = mid;
    }
    a.splice(lo, 0, { beat, fn, tag });
  }

  cancel(tag, fromBeat) {
    this.events = this.events.filter((e) => e.tag !== tag || e.beat < fromBeat);
  }

  fireDue(end) {
    let fired = 0;
    const clock = this.clock;
    const spb = clock.spb();
    while (this.events.length && this.events[0].beat < end) {
      const e = this.events.shift();
      if (e.beat < clock.beat - 0.01) this.late++;
      const t = clock.time + Math.max(0, e.beat - clock.beat) * spb;
      try { e.fn(t, spb); } catch (err) { this.logger.add('event error: ' + err.message, 'err'); }
      fired++;
    }
    return fired;
  }

  tick() {
    const clock = this.clock;
    const now = this.ac.currentTime;
    // After a sleeping timer (background tab), resume from now instead of flooding late notes.
    if (clock.time < now - 0.05) clock.time = now + 0.02;
    const horizon = now + (document.hidden ? 1.5 : 0.12);
    while (clock.time < horizon) {
      const end = clock.beat + this.step;
      // Repeat while something new lands in this window (e.g. a loop that was just started).
      let guard = 0;
      do { for (const h of this.hooks) h(clock.beat, end); } while (this.fireDue(end) && guard++ < 4);
      clock.advance(this.step);
    }
  }
};
