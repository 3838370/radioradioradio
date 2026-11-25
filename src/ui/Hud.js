// Hud: two small terminal lines. Title, the mood drift (one meter per flavour) and
// [↻ REFRESH] on top; key, chord, tempo, bar, next change and energy below. Clicking a
// mood's name turns that style on or off (struck-through styles never play).
RA.Hud = class Hud {
  static HEIGHT = 50;

  constructor() {
    this.hits = []; // { type: 'style', f } | { type: 'refresh' }, with x, y, w, h
  }

  hit(mx, my) {
    return this.hits.find((h) => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) || null;
  }

  meter(p, x, y, value, cells = 8) {
    const T = RA.Theme;
    for (let k = 0; k < cells; k++) {
      const on = k < Math.round(value * cells);
      p.fill(on ? T.text : T.faint);
      p.rect(x + k * 6, y, 4, 8);
    }
    return x + cells * 6;
  }

  draw(p, w, s) {
    const T = RA.Theme;
    p.noStroke();
    p.fill(T.panel);
    p.rect(0, 0, w, Hud.HEIGHT);
    p.fill(T.faint);
    p.rect(0, Hud.HEIGHT - 1, w, 1);
    p.textFont(T.font);
    p.textSize(T.size.title);
    p.fill(T.bright);
    const titleW = RA.App.tracked(p, 'BROKEN-RADIO', 14, 21, 0.2, 'left');

    p.textSize(T.size.small);
    let x = 14 + titleW + 18;
    this.hits = [];
    for (const f of RA.Mood.CYCLE) {
      const wgt = s.weights[f];
      const on = s.styles.includes(f);
      const label = RA.Mood.LABELS[f].toUpperCase();
      const lw = p.textWidth(label);
      p.fill(!on ? T.faint : wgt > 0.5 ? T.bright : T.dim);
      p.text(label, x, 21);
      if (!on) p.rect(x - 1, 17, lw + 2, 1); // struck through: this style won't play
      this.hits.push({ type: 'style', f, x: x - 3, y: 6, w: lw + 6 + 30, h: 22 });
      x = this.meter(p, x + lw + 6, 13, on ? wgt : 0, 5) + 14;
    }
    // The arc section; MANUAL while the listener steers it (layers or tempo on manual).
    const sec = `· ${s.section.toUpperCase()}`;
    p.fill(T.text);
    p.text(sec, x, 21);
    let sectionEnd = x + p.textWidth(sec);
    if (s.steered) {
      p.fill(T.dim);
      p.text(' MANUAL', sectionEnd, 21);
      sectionEnd += p.textWidth(' MANUAL');
    }

    const refresh = '[↻ REFRESH]';
    const rw = p.textWidth(refresh);
    if (w - 14 - rw > sectionEnd + 18) {
      p.fill(s.hover === 'refresh' ? T.bright : T.dim);
      p.text(refresh, w - 14 - rw, 21);
      this.hits.push({ type: 'refresh', x: w - 14 - rw - 3, y: 6, w: rw + 6, h: 22 });
    }

    const parts = [
      `${s.keyName.toUpperCase()} · ${s.chord}`,
      `${s.bpm.toFixed(1)} BPM`,
      // the cycle lengths playing, in 16th steps: 16 = a bar; 12 · 16 · 20 = polyrhythm
      ...(s.steps && s.steps.length ? [`${s.steps.join(' · ')} STEPS`] : []),
      `BAR ${s.bar}`,
      // LOCK (the freeze setting) holds the code; the layer count still follows a manual density
      s.freeze ? 'CODE LOCKED' : `NEXT ${s.nextMove}`,
    ];
    x = 14;
    for (const part of parts) {
      p.fill(T.dim);
      p.text(part, x, 41);
      x += p.textWidth(part) + 18;
    }
    p.text('ENERGY', x, 41);
    const end = this.meter(p, x + p.textWidth('ENERGY') + 6, 33, s.energy, 10);
    if (w - 14 - p.textWidth(s.stats) > end + 18) {
      p.fill(T.dim);
      p.textAlign(p.RIGHT);
      p.text(s.stats, w - 14, 41);
      p.textAlign(p.LEFT);
    }
  }
};
