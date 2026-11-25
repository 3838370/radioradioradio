// Clock: maps beats to audio time. The tempo can glide, so the mapping is integrated
// step by step by the Scheduler rather than computed from a fixed BPM.
RA.Clock = class Clock {
  constructor(bpm = 90) {
    this.bpm = bpm;
    this.target = bpm;
    this.rate = 0.25; // max bpm change per beat while gliding
    this.beat = 0;    // scheduling frontier...
    this.time = 0;    // ...and its audio time
  }

  spb() { return 60 / this.bpm; }

  bar() { return Math.floor(this.beat / 4); }

  // Glide to a new tempo over roughly `beats` beats.
  glideTo(bpm, beats = 16) {
    this.target = bpm;
    this.rate = Math.max(0.02, Math.abs(bpm - this.bpm) / Math.max(1, beats));
  }

  advance(step) {
    this.beat += step;
    this.time += step * this.spb();
    const d = this.target - this.bpm;
    const maxd = this.rate * step;
    this.bpm += RA.MathUtil.clamp(d, -maxd, maxd);
  }

  timeOf(beat) { return this.time + (beat - this.beat) * this.spb(); }

  // The beat heard at audio time t (behind the scheduling frontier).
  beatAt(t) { return this.beat + (t - this.time) / this.spb(); }
};
