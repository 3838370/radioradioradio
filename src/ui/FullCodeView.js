import { PatternBank } from '../music/PatternBank.js';
import { Theme } from './Theme.js';

// FullCodeView: every playing layer's code as one program, in full and live: it follows
// each change the radio makes (with freeze on, nothing changes). Scrolls with the wheel;
// [COPY] puts the whole text on the clipboard. Each layer's header line lights up when
// that layer sounds.
export class FullCodeView {
  constructor(highlighter) {
    this.highlighter = highlighter;
    this.scroll = 0;     // in rows
    this.cache = null;   // { text, cols, view }
    this.hits = [];
    this.copiedAt = -1e9;
    this.rect = null;
  }

  // The program: everything needed to play this track again (paste it back with [COLAR]):
  //   a header with setup({ bpm, key, mode, progression, chordBars }),
  //   then one section per layer: the sounds it plays (inst lines, the drums rebuilt in code
  //   included, from info.sounds(layer)) and its code.
  static text(layers, info) {
    const out = [`// BROKEN-RADIO · ${info.genre} · ${info.section} · ${info.bpm} bpm · ${info.key}`];
    if (info.setup) out.push(info.setup);
    out.push('');
    for (const l of layers) {
      const title = `// ── ${PatternBank.roleLabel(l.role).toUpperCase()} · ${l.patternId}${l.muted ? ' · mudo' : ''}${l.locked ? ' · bloqueado' : ''} `;
      out.push(title + '─'.repeat(Math.max(4, 60 - title.length)));
      const extra = info.sounds ? info.sounds(l) : [];
      if (extra.length) out.push(...extra);
      out.push(l.code.replace(/\s+$/, ''), '');
    }
    return out.join('\n');
  }

  // A pasted program -> { setup: '{...}' | null, sections: [{ role label, id, code }] }
  static parse(text) {
    const parts = text.replace(/\r/g, '').split(/^(?=\/\/ ── )/m);
    const head = parts[0].startsWith('// ── ') ? '' : parts[0];
    const m = /^setup\((\{[^\n]*\})\)\s*$/m.exec(head);
    const sections = parts.filter((s) => s.startsWith('// ── ')).map((s) => {
      const t = /^\/\/ ── (.+?) · (\S+)/.exec(s);
      return { label: t ? t[1].trim() : '', id: t ? t[2] : 'colado', code: s.split('\n').slice(1).join('\n').trim() };
    });
    return { setup: m ? m[1] : null, sections };
  }

  layout(text, cols) {
    if (!this.cache || this.cache.text !== text || this.cache.cols !== cols) {
      const view = this.highlighter.layout(text, cols, -1);
      // rows that start a layer section (for the flash), in order
      const heads = [];
      view.rows.forEach((row, r) => { if (row.length && row[0].col === 0 && /^\/\/ ── /.test(row.map((s) => s.str).join(''))) heads.push(r); });
      this.cache = { text, cols, view, heads };
    }
    return this.cache;
  }

  wheel(dy) { this.scroll = Math.max(0, this.scroll + Math.sign(dy) * 3); }

  // flashes: one flash time per layer, in the same order as the sections
  draw(p, x, y, w, h, m, text, flashes, now) {
    const T = Theme;
    this.rect = { x, y, w, h };
    this.hits = [];
    p.noFill();
    p.stroke(T.faint);
    p.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    p.noStroke();

    // header: title, and [COPY] on the right
    p.textSize(m.small);
    p.fill(T.bright);
    p.text('CÓDIGO COMPLETO', x + m.pad, y + m.pad + m.ts);
    p.fill(T.dim);
    p.text(`${flashes.length} camadas · ao vivo`, x + m.pad + p.textWidth('CÓDIGO COMPLETO  '), y + m.pad + m.ts);
    const copied = now - this.copiedAt < 1800;
    const pasted = now - (this.pastedAt || -1e9) < 1800;
    const by = y + m.pad + m.ts;
    let bx = x + w - m.pad;
    // [COLAR] loads a whole program (copied from here) back into the radio; [COPIAR] copies it
    for (const [type, label, lit] of [['paste', pasted ? '[COLADO]' : '[COLAR]', pasted], ['copy', copied ? '[COPIADO]' : '[COPIAR]', copied]]) {
      const bw = p.textWidth(label);
      bx -= bw;
      p.fill(lit ? T.bright : T.dim);
      p.text(label, bx, by);
      this.hits.push({ type, x: bx - 3, y: by - m.small - 2, w: bw + 6, h: m.small + 7 });
      bx -= p.textWidth('  ');
    }

    const cols = Math.max(20, Math.floor((w - m.pad * 2 - 8) / m.charW));
    const { view, heads } = this.layout(text, cols);
    const top = y + m.pad + m.header;
    const visible = Math.max(1, Math.floor((y + h - m.pad - top) / m.lh));
    const maxScroll = Math.max(0, view.rows.length - visible);
    this.scroll = Math.min(this.scroll, maxScroll);
    p.textSize(m.ts);
    for (let k = 0; k < visible; k++) {
      const r = this.scroll + k;
      const row = view.rows[r];
      if (!row) break;
      const head = heads.indexOf(r);
      const ty = top + k * m.lh;
      if (head >= 0) {
        const f = Math.exp(-(now - (flashes[head] || 0)) / 160);
        if (f > 0.02) { p.fill(T.text[0], T.text[1], T.text[2], 40 * f); p.rect(x + 1, ty + 2, w - 2, m.lh); }
      }
      for (const seg of row) {
        p.fill(seg.color);
        p.text(seg.str, x + m.pad + seg.col * m.charW, ty + m.ts);
      }
    }
    // scroll bar
    if (maxScroll > 0) {
      const trackH = h - m.header - m.pad * 2;
      const barH = Math.max(16, trackH * visible / view.rows.length);
      const barY = top + (trackH - barH) * (this.scroll / maxScroll);
      p.fill(T.faint);
      p.rect(x + w - 5, top, 1, trackH);
      p.fill(T.dim);
      p.rect(x + w - 6, barY, 3, barH);
    }
  }

  contains(mx, my) { const r = this.rect; return !!r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h; }

  hit(mx, my) { return this.hits.find((b) => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null; }
};
