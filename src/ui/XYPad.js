// XYPad: a performance pad drawn on the canvas. X opens/closes the master filter,
// Y adds or removes space (reverb/delay returns). Double-click resets.
RA.XYPad = class XYPad {
  constructor(onChange) {
    this.onChange = onChange;
    this.x = 1;
    this.y = 0.5;
    this.rect = null;
  }

  values() { return { cutoff: 120 * Math.pow(20000 / 120, this.x), space: this.y * 2 }; }

  contains(mx, my) {
    const r = this.rect;
    return !!r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }

  set(mx, my) {
    const r = this.rect;
    this.x = RA.MathUtil.clamp((mx - r.x) / r.w, 0, 1);
    this.y = RA.MathUtil.clamp(1 - (my - r.y) / r.h, 0, 1);
    this.onChange(this.values());
  }

  reset() {
    this.x = 1;
    this.y = 0.5;
    this.onChange(this.values());
  }

  draw(p, x, y, w, h) {
    const T = RA.Theme;
    this.rect = { x, y, w, h };
    p.noFill();
    p.stroke(T.faint);
    p.strokeWeight(1);
    p.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    p.noStroke();
    p.fill(T.faint);
    for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) p.rect(x + (w * i) / 6, y + (h * j) / 6, 1, 1);
    const px = x + this.x * w, py = y + (1 - this.y) * h;
    // crosshair
    p.fill(T.dim);
    p.rect(px, y + 1, 1, h - 2);
    p.rect(x + 1, py, w - 2, 1);
    p.fill(T.bright);
    p.rect(px - 2, py - 2, 5, 5);
    p.fill(T.dim);
    p.textSize(RA.Theme.size.small - 1);
    p.text('FILTRO', x + 4, y + h - 4);
    p.push();
    p.translate(x + w - 4, y + h - 4);
    p.rotate(-Math.PI / 2);
    p.text('ESPAÇO', 0, 0);
    p.pop();
  }
};
