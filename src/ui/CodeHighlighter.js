import { Theme } from './Theme.js';

// CodeHighlighter: tokenizes code lines for colouring and hard-wraps them to a column width.
export class CodeHighlighter {
  static KEYWORDS = new Set(['loop', 'sleep', 's', 'synth', 'fx', 'if', 'else', 'for', 'const', 'let']);
  static LIVE = new Set(['KEY', 'ROOT', 'QUAL', 'MODE', 'ENERGY', 'BAR', 'BPM']);

  constructor() {
    this.cache = new Map();
  }

  tokenize(line) {
    if (this.cache.has(line)) return this.cache.get(line);
    const T = Theme;
    const out = [];
    const re = /(\/\/.*$)|('[^']*'?)|(\b\d*\.?\d+\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d']+)/g;
    let m;
    while ((m = re.exec(line))) {
      let color = T.text;
      if (m[1]) color = T.comment;
      else if (m[2]) color = T.str;
      else if (m[3]) color = T.num;
      else if (m[4]) color = CodeHighlighter.KEYWORDS.has(m[4]) ? T.kw : CodeHighlighter.LIVE.has(m[4]) ? T.live : T.text;
      else if (m[6]) color = T.dim;
      out.push({ str: m[0], color });
    }
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(line, out);
    return out;
  }

  // -> { rows: [[{ str, col, color, tokStart, tokLen }]], cursor: { row, col } }
  // tokStart/tokLen locate the whole token in `text` (used to drag numbers).
  layout(text, maxCols, cursorIndex) {
    const rows = [];
    let cursor = { row: -1, col: 0 };
    let index = 0;
    for (const line of text.split('\n')) {
      let row = [];
      let col = 0;
      const lineStart = index;
      let pos = lineStart;
      for (const tk of this.tokenize(line)) {
        let s = tk.str;
        while (s.length) {
          if (col >= maxCols) { rows.push(row); row = []; col = 2; }
          const take = s.slice(0, maxCols - col);
          row.push({ str: take, col, color: tk.color, tokStart: pos, tokLen: tk.str.length });
          col += take.length;
          s = s.slice(take.length);
        }
        pos += tk.str.length;
      }
      if (cursorIndex >= lineStart && cursorIndex <= lineStart + line.length) {
        const off = cursorIndex - lineStart;
        cursor = { row: rows.length + Math.floor(off / maxCols), col: off % maxCols };
      }
      rows.push(row);
      index += line.length + 1;
    }
    return { rows, cursor };
  }
};
