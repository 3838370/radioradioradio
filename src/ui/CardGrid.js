import { CodeCard } from './CodeCard.js';
import { CodeHighlighter } from './CodeHighlighter.js';
import { Theme } from './Theme.js';

// CardGrid: keeps one CodeCard per layer in sync with composer events, lays them out in
// columns, schedules border flashes at the audio time each sound plays, and turns
// clicks into { action, layerId }. When the cards are taller than the area, the mouse wheel
// scrolls them (a thin bar on the right shows where you are).
export class CardGrid {
  constructor(emitter) {
    this.highlighter = new CodeHighlighter();
    this.cards = new Map(); // layer id -> CodeCard
    this.flashes = [];      // { time, layerId }
    this.scroll = 0;        // px scrolled down
    this.area = null;       // { x, y, w, h } where the cards were last drawn
    this.contentH = 0;      // how tall all the columns are
    emitter.on('layer:add', ({ layer }) => this.cards.set(layer.id, new CodeCard(layer, this.highlighter)));
    emitter.on('layer:change', ({ layer, desc, instant }) => {
      const c = this.cards.get(layer.id);
      if (!c) return;
      if (instant) c.setCodeInstant(layer.code, desc);
      else c.setCode(layer.code, desc);
    });
    emitter.on('layer:remove', ({ layer }) => { const c = this.cards.get(layer.id); if (c) c.remove(); });
    emitter.on('sound', ({ layerId, time }) => {
      if (this.flashes.length > 400) this.flashes.splice(0, 200); // draw() pauses in background tabs
      this.flashes.push({ time, layerId });
    });
  }

  update(dt, audioTime, now) {
    const keep = [];
    for (const f of this.flashes) {
      if (f.time > audioTime) { keep.push(f); continue; }
      const c = this.cards.get(f.layerId);
      if (c) c.flashAt = now;
    }
    this.flashes = keep;
    for (const [id, card] of this.cards) {
      card.update(dt);
      if (card.done) this.cards.delete(id);
    }
  }

  metrics(p, colWidth) {
    const ts = colWidth < 360 ? Theme.size.small : Theme.size.code;
    p.textFont(Theme.font);
    p.textSize(ts);
    const charW = p.textWidth('M');
    const pad = 10;
    return { ts, small: Theme.size.small, charW, lh: ts * 1.45, pad, header: 23, maxCols: Math.max(20, Math.floor((colWidth - pad * 2) / charW)) };
  }

  draw(p, x0, y0, w, h, now) {
    const cols = w > 1200 ? 3 : w > 760 ? 2 : 1;
    const gap = 10;
    const cw = (w - gap * (cols - 1)) / cols;
    const m = this.metrics(p, cw);
    m.padLine = this.padLine || ''; // what the effect pads add right now, shown on every card
    this.area = { x: x0, y: y0, w, h };
    const colY = new Array(cols).fill(0);
    const place = [];
    for (const card of this.cards.values()) {
      const ch = card.measure(m);
      let k = 0;
      for (let j = 1; j < cols; j++) if (colY[j] < colY[k]) k = j;
      place.push([card, x0 + k * (cw + gap), colY[k], ch]);
      colY[k] += ch + gap;
    }
    this.contentH = Math.max(0, ...colY) - gap;
    this.scroll = Math.max(0, Math.min(this.scroll, this.contentH - h));
    // the cards are drawn inside the area only (scrolled ones are cut at its edges)
    const ctx = p.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 1, y0, w + 2, h);
    ctx.clip();
    for (const [card, x, top, ch] of place) {
      const y = y0 + top - this.scroll;
      // a card out of sight isn't drawn, nor clickable
      if (y > y0 + h || y + ch < y0) { card.hits = []; card.rect = null; card.textOrigin = null; continue; }
      card.draw(p, x, y, cw, ch, m, now);
    }
    ctx.restore();
    if (this.contentH > h) { // where you are: a thin bar on the right edge
      const bh = Math.max(24, h * h / this.contentH);
      const by = y0 + (h - bh) * (this.scroll / (this.contentH - h));
      p.noStroke();
      p.fill(Theme.faint);
      p.rect(x0 + w + 4, y0, 2, h);
      p.fill(Theme.dim);
      p.rect(x0 + w + 4, by, 2, bh);
    }
  }

  contains(mx, my) {
    const a = this.area;
    return !!a && mx >= a.x && mx <= a.x + a.w + 8 && my >= a.y && my <= a.y + a.h;
  }

  // The mouse wheel: scroll the cards (when they don't all fit).
  wheel(delta) { this.scroll = Math.max(0, this.scroll + delta); }

  // { card, start, len } for a draggable number under the mouse.
  numberAt(mx, my) {
    if (!this.contains(mx, my)) return null; // (a card's cut-off part, above or below)
    for (const card of this.cards.values()) {
      const n = card.numberAt(mx, my);
      if (n) return Object.assign({ card }, n);
    }
    return null;
  }

  hit(mx, my) {
    if (!this.contains(mx, my)) return null;
    for (const card of this.cards.values()) {
      const action = card.hit(mx, my);
      if (action) return { action, layerId: card.layer.id };
    }
    return null;
  }
};
