// Logger: the composer log shown on screen. kind: 'info' | 'event' (genre, section, harmony, settings) | 'err'
RA.Logger = class Logger {
  constructor(max = 60) {
    this.max = max;
    this.lines = [];
  }

  add(msg, kind = 'info') {
    this.lines.push({ msg, kind, at: performance.now() });
    if (this.lines.length > this.max) this.lines.shift();
    if (kind === 'err') console.warn(msg);
  }

  recent(n) { return this.lines.slice(-n); }
};
