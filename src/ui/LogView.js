// LogView: the latest composer log lines, terminal style (newest at the bottom).
RA.LogView = class LogView {
  constructor(logger) {
    this.logger = logger;
  }

  draw(p, x, y, w, h) {
    const T = RA.Theme;
    p.textFont(T.font);
    p.textSize(T.size.small);
    const lh = 15;
    const maxChars = Math.floor((w - 8) / p.textWidth('M'));
    const lines = this.logger.recent(Math.floor((h - 8) / lh));
    lines.forEach((l, k) => {
      const newest = k === lines.length - 1;
      p.fill(l.kind === 'err' ? T.err : l.kind === 'event' ? T.text : newest ? T.text : T.dim);
      p.text(('> ' + l.msg).slice(0, maxChars), x, y + 16 + k * lh);
    });
  }
};
