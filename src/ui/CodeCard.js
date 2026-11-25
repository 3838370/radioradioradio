import { MathUtil } from '../core/MathUtil.js';
import { Theme } from './Theme.js';

// CodeCard: shows one layer's code. Edits are typed in character by character (delete the
// differing middle, then type the new text), the border flashes when the layer sounds,
// four buttons (sound panel, mute, lock, regenerate) sit in the bottom-right corner, and numbers in the
// code can be found under the mouse so they can be dragged.
export class CodeCard {
  static BUTTONS = [
    { action: 'sound', label: '≈', title: 'sound panel' },
    { action: 'mute', label: 'M', title: 'mute' },
    { action: 'lock', label: 'L', title: 'lock' },
    { action: 'regen', label: '↻', title: 'regenerate' },
  ];

  constructor(layer, highlighter) {
    this.layer = layer;
    this.highlighter = highlighter;
    this.shown = '';
    this.target = layer.code;
    this.rate = Math.max(90, layer.code.length / 1.6); // chars per second
    this.acc = 0;
    this.cursor = 0;
    this.removing = false;
    this.editAt = 0;
    this.label = 'new layer';
    this.labelAt = performance.now();
    this.flashAt = 0;
    this.hits = [];
    this.rect = null;
  }

  setCode(code, desc) {
    if (this.removing) return;
    this.target = code;
    // Small edits are typed slowly enough to watch; a card still typing in keeps its pace.
    this.rate = Math.max(14, Math.abs(code.length - this.shown.length) / 1.5);
    this.label = desc;
    this.labelAt = performance.now();
  }

  // For live edits (dragged numbers, sliders): show the new code at once.
  setCodeInstant(code, desc) {
    if (this.removing) return;
    this.shown = this.target = code;
    if (desc) { this.label = desc; this.labelAt = performance.now(); }
  }

  remove() {
    this.removing = true;
    this.target = '';
    this.rate = Math.max(160, this.shown.length / 1.2);
    this.label = 'leaving';
    this.labelAt = performance.now();
  }

  get done() { return this.removing && this.shown === ''; }

  get typing() { return this.shown !== this.target; }

  update(dt) {
    if (!this.typing) return;
    this.acc += this.rate * dt;
    while (this.acc >= 1 && this.typing) {
      this.acc -= 1;
      this.typeOne();
    }
  }

  typeOne() {
    const a = this.shown, b = this.target;
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let q = 0;
    while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
    if (a.length - p - q > 0) {
      this.shown = a.slice(0, a.length - q - 1) + a.slice(a.length - q);
      this.cursor = a.length - q - 1;
    } else {
      this.shown = a.slice(0, p) + b[p] + a.slice(p);
      this.cursor = p + 1;
    }
    this.editAt = performance.now();
  }

  measure(m) {
    this.view = this.highlighter.layout(this.shown, m.maxCols, this.cursor);
    const extra = m.padLine && !this.removing ? Math.ceil(m.padLine.length / m.maxCols) : 0;
    return m.pad * 2 + m.header + (Math.max(1, this.view.rows.length) + extra) * m.lh + m.small + 8; // + button row
  }

  draw(p, x, y, w, h, m, now) {
    const T = Theme;
    const f = Math.exp(-(now - this.flashAt) / 160);
    const alpha = this.removing ? 0.45 : this.layer.muted ? 0.35 : 1;
    const fill = (c, a = 1) => p.fill(c[0], c[1], c[2], 255 * a * alpha);
    this.rect = { x, y, w, h };

    // frame: a hairline that brightens when the layer sounds
    p.noFill();
    p.stroke(T.faint[0] + (T.bright[0] - T.faint[0]) * f, T.faint[1] + (T.bright[1] - T.faint[1]) * f, T.faint[2] + (T.bright[2] - T.faint[2]) * f, 255 * alpha);
    p.strokeWeight(1);
    p.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    p.noStroke();

    // header: ROLE  pattern-id [edited] [locked]          last edit
    // bottom-right corner: [≈][M][L][↻]
    const hy = y + m.pad + m.ts;
    p.textSize(m.small);
    fill(T.bright);
    const role = this.layer.role.toUpperCase();
    p.text(role, x + m.pad, hy);
    const roleW = p.textWidth(role + '  ');
    fill(T.dim);
    const tags = (this.layer.pattern.edited ? ' · edited' : '') + (this.layer.locked ? ' · locked' : '') + (this.layer.muted ? ' · muted' : '');
    p.text(this.layer.patternId + tags, x + m.pad + roleW, hy);

    this.hits = [];
    const bw = p.textWidth('[M]');
    let bx = x + w - m.pad - bw;
    const bb = y + h - m.pad + 2; // the buttons' text baseline
    for (const b of CodeCard.BUTTONS.slice().reverse()) {
      const active = (b.action === 'mute' && this.layer.muted) || (b.action === 'lock' && this.layer.locked);
      const by = bb - m.small;
      if (active) {
        p.fill(T.bright);
        p.rect(bx - 1, by - 1, bw + 2, m.small + 5);
        p.fill(T.bg);
      } else {
        fill(T.dim);
      }
      p.text(`[${b.label}]`, bx, bb);
      if (!this.removing) this.hits.push({ action: b.action, x: bx - 2, y: by - 2, w: bw + 4, h: m.small + 7 });
      bx -= bw + 4;
    }
    const la = MathUtil.clamp(1 - (now - this.labelAt) / 6000, 0, 1);
    if (la > 0) {
      fill(T.text, 0.9 * la);
      p.textAlign(p.RIGHT);
      p.text(this.label, x + w - m.pad, hy);
      p.textAlign(p.LEFT);
    }

    // code
    p.textSize(m.ts);
    const ty = y + m.pad + m.header;
    this.textOrigin = { x: x + m.pad, y: ty, m };
    const { rows, cursor } = this.view;
    const recent = now - this.editAt < 1500;
    if ((this.typing || recent) && cursor.row >= 0) {
      p.fill(T.text[0], T.text[1], T.text[2], this.typing ? 22 : 22 * (1 - (now - this.editAt) / 1500));
      p.rect(x + 1, ty + cursor.row * m.lh + 2, w - 2, m.lh);
    }
    for (let r = 0; r < rows.length; r++) {
      for (const seg of rows[r]) {
        p.fill(seg.color[0], seg.color[1], seg.color[2], 255 * alpha);
        p.text(seg.str, x + m.pad + seg.col * m.charW, ty + r * m.lh + m.ts);
      }
    }
    // live effect-pad modulation, as a comment under the code
    if (m.padLine && !this.removing) {
      p.fill(T.accent[0], T.accent[1], T.accent[2], 255 * alpha);
      for (let k = 0; k * m.maxCols < m.padLine.length; k++) {
        p.text(m.padLine.slice(k * m.maxCols, (k + 1) * m.maxCols), x + m.pad, ty + (rows.length + k) * m.lh + m.ts);
      }
    }
    if (this.typing && cursor.row >= 0 && (now >> 8) % 2 === 0) {
      p.fill(T.accent);
      p.rect(x + m.pad + cursor.col * m.charW, ty + cursor.row * m.lh + 3, m.charW * 0.9, m.lh - 2);
    }
  }

  // The number token under the mouse: { start, len } in the layer's code, or null.
  numberAt(mx, my) {
    if (!this.textOrigin || !this.view || this.typing || this.removing) return null;
    const { x, y, m } = this.textOrigin;
    const row = this.view.rows[Math.floor((my - y) / m.lh)];
    if (!row || my < y) return null;
    const col = Math.floor((mx - x) / m.charW);
    const seg = row.find((s) => col >= s.col && col < s.col + s.str.length);
    if (!seg || seg.color !== Theme.num) return null;
    return { start: seg.tokStart, len: seg.tokLen };
  }

  // A header button, or 'edit' anywhere else on the card.
  hit(mx, my) {
    const b = this.hits.find((h) => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
    if (b) return b.action;
    const r = this.rect;
    const inside = r && !this.removing && this.hits.length && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    return inside ? 'edit' : null;
  }
};
