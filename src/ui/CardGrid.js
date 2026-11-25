import { CodeCard } from './CodeCard.js';
import { CodeHighlighter } from './CodeHighlighter.js';
import { Theme } from './Theme.js';

// CardGrid: keeps one CodeCard per layer in sync with composer events, lays them out in
// columns, schedules border flashes at the audio time each sound plays, and turns
// clicks into { action, layerId }.
export class CardGrid {
  constructor(emitter) {
    this.highlighter = new CodeHighlighter();
    this.cards = new Map(); // layer id -> CodeCard
    this.flashes = [];      // { time, layerId }
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
    const colY = new Array(cols).fill(y0);
    for (const card of this.cards.values()) {
      const ch = card.measure(m);
      let k = 0;
      for (let j = 1; j < cols; j++) if (colY[j] < colY[k]) k = j;
      const x = x0 + k * (cw + gap);
      const y = colY[k];
      colY[k] += ch + gap;
      // Cards whose header falls below the visible area are skipped (and not clickable).
      if (y + m.pad + m.header > y0 + h) { card.hits = []; continue; }
      card.draw(p, x, y, cw, ch, m, now);
    }
  }

  // { card, start, len } for a draggable number under the mouse.
  numberAt(mx, my) {
    for (const card of this.cards.values()) {
      const n = card.numberAt(mx, my);
      if (n) return Object.assign({ card }, n);
    }
    return null;
  }

  hit(mx, my) {
    for (const card of this.cards.values()) {
      const action = card.hit(mx, my);
      if (action) return { action, layerId: card.layer.id };
    }
    return null;
  }
};
