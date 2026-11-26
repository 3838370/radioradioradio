// Grid: the grid() piece of the language, without the sound. It reads a grid (rows of
// cells separated by spaces) and walks its cursors one step at a time. The language
// (LanguageApi.grid) plays what the cursors land on; the GRELHA view draws the same grid.
// The full description of the symbols is in Entregas\grelha-especificacao.md.
//
//   @          a cursor starts here (with no direction it goes right); 4 at most
//   > < ^ v    the cursor that passes turns that way      ?  a direction by chance
//   .          rest       #  skipped (no time)    =  wait for the next bar    ~  hold
//   a-z        a sound (v is the down arrow)       A-Z  the same, accented
//   1-7        a degree for the grid's tonal sound;  b3  sound b on degree 3
//   ' ,        octave up / down after a degree      *  ratchet (2, ** 3)   %  half the time
//
// Chance (? and %) comes from a fixed draw on (seed, step, cursor): the same code walks the
// same way when probed and when heard, and after copy and paste.
export class Grid {
  static MAX_COLS = 32;
  static MAX_ROWS = 16;
  static MAX_CURSORS = 4;
  static MOVES = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], v: [0, 1] };
  static TYPES = ['instrumento', 'maestro', 'efeitos'];
  // what each row of an effects grid can move: the layer's settings (the CAMADA tab's ranges;
  // lpf on a log scale) or the effect pads
  static CURVES = {
    filtro: { key: 'lpf', lo: 100, hi: 16000, log: true },
    reverb: { key: 'rev', lo: 0, hi: 0.8 },
    crush: { key: 'crush', lo: 0, hi: 0.8 },
    volume: { key: 'amp', lo: 0, hi: 1.5 },
    delay: { key: 'delay', lo: 0, hi: 0.7 },
    wobble: { key: 'wobble', lo: 0, hi: 1 },
  };
  // a maestro grid's section letters
  static SECTIONS = { s: 'sparse', d: 'drift', b: 'build', t: 'tension', u: 'surge', p: 'peak', r: 'dread', x: 'suspense', l: 'release', c: 'collapse' };

  // A curve cell's value (0-9) in its setting's range.
  static curveValue(curve, digit) {
    const t = Math.max(0, Math.min(9, digit)) / 9;
    return curve.log ? curve.lo * Math.pow(curve.hi / curve.lo, t) : curve.lo + (curve.hi - curve.lo) * t;
  }

  // A number from a name: the seed when the code gives none.
  static seedOf(text) {
    let h = 2166136261;
    for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h % 100000;
  }

  // A fixed draw in [0, 1) from whole numbers.
  static draw(...xs) {
    let h = 0x9e3779b9;
    for (const x of xs) {
      h = Math.imul(h ^ (Math.floor(x) | 0), 0x85ebca6b) >>> 0;
      h = (h ^ (h >>> 13)) >>> 0;
      h = Math.imul(h, 0xc2b2ae35) >>> 0;
      h = (h ^ (h >>> 16)) >>> 0;
    }
    return h / 4294967296;
  }

  // One cell's text -> { raw, start, dir, kind, hits, ratchet, chance }
  //   kind: rest | skip | wait | hold | play;  hits: [{ letter, accent, degree, octave }]
  static cell(raw, where) {
    const out = { raw, start: false, dir: null, kind: 'rest', hits: [], ratchet: 1, chance: 1 };
    let s = raw;
    if (s[0] === '@') { out.start = true; s = s.slice(1); }
    if (s && '><^v?'.includes(s[0])) {
      // a 'v' at the start is always the down arrow (v is never a sound)
      out.dir = s[0];
      s = s.slice(1);
    }
    const mods = /[*%]+$/.exec(s);
    if (mods) {
      out.ratchet = 1 + (mods[0].match(/\*/g) || []).length;
      out.chance = Math.pow(0.5, (mods[0].match(/%/g) || []).length);
      s = s.slice(0, mods.index);
    }
    if (s === '' || s === '.') out.kind = 'rest';
    else if (s === '#') out.kind = 'skip';
    else if (s === '=') out.kind = 'wait';
    else if (s === '~') out.kind = 'hold';
    else {
      out.kind = 'play';
      const re = /([a-uw-zA-UW-Z])?([1-7])?(['’,]*)/y;
      let k = 0;
      while (k < s.length) {
        re.lastIndex = k;
        const m = re.exec(s);
        if (!m || m[0] === '') throw new Error(`${where}: não percebo '${raw}' (no '${s.slice(k)}')`);
        if (!m[1] && !m[2]) throw new Error(`${where}: '${raw}' tem uma oitava sem grau`);
        const octave = (m[3].match(/['’]/g) || []).length - (m[3].match(/,/g) || []).length;
        out.hits.push({ letter: m[1] ? m[1].toLowerCase() : null, accent: !!m[1] && m[1] !== m[1].toLowerCase(), degree: m[2] ? +m[2] : null, octave });
        k = re.lastIndex;
      }
    }
    return out;
  }

  // rows: ['@>K . h .', ...]; sounds: { k: name or { som, vol } }; opts: see the spec.
  // -> { rows: [[cell]], w, h, starts: [{ x, y, dir }], sounds, opts, sig }
  static parse(name, rows, sounds = {}, opts = {}) {
    const where = `grid('${name}')`;
    if (!Array.isArray(rows) || !rows.length) throw new Error(`${where}: as linhas vão numa lista: ['...', '...']`);
    if (rows.length > Grid.MAX_ROWS) throw new Error(`${where}: ${rows.length} linhas (máximo ${Grid.MAX_ROWS})`);
    const type = opts.tipo || 'instrumento';
    if (!Grid.TYPES.includes(type)) throw new Error(`${where}: tipo '${type}' (instrumento, maestro ou efeitos)`);
    const texts = rows.map((r) => String(r).trim().split(/\s+/).filter(Boolean));
    const w = Math.max(...texts.map((r) => r.length));
    if (w > Grid.MAX_COLS) throw new Error(`${where}: ${w} colunas (máximo ${Grid.MAX_COLS})`);
    const kinds = {}; // letter -> { som, vol }
    for (const [k, v] of Object.entries(sounds || {})) {
      if (!/^[a-uw-z]$/.test(k)) throw new Error(`${where}: a letra '${k}' não serve (a-z, sem v)`);
      kinds[k] = typeof v === 'string' ? { som: v, vol: 1 } : { som: v && v.som, vol: v && v.vol != null ? +v.vol : 1 };
      if (!kinds[k].som) throw new Error(`${where}: o som de '${k}' está vazio`);
    }
    const tom = opts.tom || Object.keys(kinds)[0] || null;
    const cells = texts.map((r, y) => {
      const row = r.map((t, x) => (type === 'instrumento' ? Grid.cell(t, `${where}, linha ${y + 1}`) : { raw: t, kind: t === '.' ? 'rest' : 'play', hits: [] }));
      while (row.length < w) row.push(Grid.cell('.', where));
      return row;
    });
    const starts = [];
    if (type === 'instrumento') {
      cells.forEach((row, y) => row.forEach((c, x) => {
        if (c.start) starts.push({ x, y, dir: c.dir && c.dir !== '?' ? c.dir : '>' });
        for (const h of c.hits) {
          if (h.letter && !kinds[h.letter]) throw new Error(`${where}: a letra '${h.letter}' não está nos sons`);
          if (!h.letter && h.degree != null && !tom) throw new Error(`${where}: um grau sem som (falta a opção tom)`);
        }
      }));
      // no @: one cursor starts at the top left, going the way its cell points (or right)
      if (!starts.length) { const c0 = cells[0][0]; starts.push({ x: 0, y: 0, dir: c0.dir && c0.dir !== '?' ? c0.dir : '>' }); }
      if (starts.length > Grid.MAX_CURSORS) throw new Error(`${where}: ${starts.length} cursores (máximo ${Grid.MAX_CURSORS})`);
    } else if (type === 'efeitos') {
      const names = opts.linhas || [];
      if (names.length !== cells.length) throw new Error(`${where}: diz o que cada linha mexe, com linhas: [...] (${cells.length} linhas, ${names.length} nomes)`);
      for (const n of names) if (!Grid.CURVES[n] && n !== 'pads') throw new Error(`${where}: linha '${n}' (filtro, reverb, crush, volume, delay, wobble ou pads)`);
    } else if (cells.length > 2) {
      throw new Error(`${where}: o maestro tem 1 ou 2 linhas (acordes, secções)`);
    }
    const o = Object.assign({ tipo: type, passo: type === 'maestro' ? 4 : 0.25, ciclo: type === 'maestro' ? 1 : 16, oitava: 1, graus: 'acorde', fixo: false, acorde: 0, dur: 1, vol: 1 }, opts, { tom });
    o.passo = Math.max(1 / 16, +o.passo || 0.25);
    o.ciclo = Math.max(1, Math.min(64, Math.round(+o.ciclo || 16)));
    o.semente = o.semente != null ? Math.floor(+o.semente) : Grid.seedOf(name);
    const sig = `${w}x${cells.length}|${starts.map((s) => `${s.x},${s.y},${s.dir}`).join(';')}`;
    return { name, rows: cells, w, h: cells.length, starts, sounds: kinds, opts: o, sig };
  }

  static at(g, c) { return g.rows[c.y][c.x]; }

  // As in Befunge: the cursor keeps to its row (or column) and wraps around it, off the right
  // edge back in at the left of the same row; only an arrow or ? sends it another way.
  static move(g, c) {
    const [dx, dy] = Grid.MOVES[c.dir] || Grid.MOVES['>'];
    return { x: (c.x + dx + g.w) % g.w, y: (c.y + dy + g.h) % g.h, dir: c.dir };
  }

  // A fresh state: the cursors on their @, step 0.
  static init(g) {
    return { sig: g.sig, step: 0, cursors: g.starts.map((s) => ({ x: s.x, y: s.y, dir: s.dir })), trace: [] };
  }

  // The state kept for this grid: the old one if the grid still fits it (an edit keeps the
  // cursors where they are), else a fresh one.
  static keep(g, state) {
    if (!state || state.sig !== g.sig) return Grid.init(g);
    for (const c of state.cursors) { c.x = Math.min(c.x, g.w - 1); c.y = Math.min(c.y, g.h - 1); }
    return state;
  }

  // One step of one cursor (cursor number `ci`, global step `step`):
  // -> { cursor: where it goes next, cell (what it plays, or null), x, y }
  static stepCursor(g, cur, step, ci) {
    let c = { x: cur.x, y: cur.y, dir: cur.dir };
    let cell = Grid.at(g, c);
    // # is Befunge's bridge: the cursor jumps over the next cell (no time spent on either)
    for (let guard = 0; cell.kind === 'skip' && guard < g.w * g.h; guard++) { c = Grid.move(g, Grid.move(g, c)); cell = Grid.at(g, c); }
    if (cell.kind === 'wait') {
      const perBar = 4 / g.opts.passo;
      if (Number.isInteger(perBar) && step % perBar !== 0) return { cursor: c, cell: null, x: c.x, y: c.y };
      // a new bar: go on to the next cell and play it now
      c = Grid.move(g, c);
      cell = Grid.at(g, c);
      for (let guard = 0; cell.kind === 'skip' && guard < g.w * g.h; guard++) { c = Grid.move(g, Grid.move(g, c)); cell = Grid.at(g, c); }
      if (cell.kind === 'wait') return { cursor: c, cell: null, x: c.x, y: c.y };
    }
    if (cell.dir === '?') c.dir = '><^v'[Math.floor(Grid.draw(g.opts.semente, step, ci, 3) * 4)];
    else if (cell.dir) c.dir = cell.dir;
    const played = cell.kind === 'play' && (cell.chance >= 1 || Grid.draw(g.opts.semente, step, ci, 7) < cell.chance) ? cell : null;
    const at = { x: c.x, y: c.y };
    return { cursor: Grid.move(g, c), cell: played, x: at.x, y: at.y, hold: cell.kind === 'hold' };
  }

  // How many steps after `step` this cursor holds (~) before something else: for note length.
  static holdAfter(g, cur, step, ci, max = 32) {
    let c = cur, n = 0;
    for (let k = 1; k <= max; k++) {
      const r = Grid.stepCursor(g, c, step + k, ci);
      if (!r.hold) break;
      n++;
      c = r.cursor;
    }
    return n;
  }

  // Walks `count` steps from the state (changing it). Returns what plays and where each
  // cursor was at each step (for the GRELHA view):
  //   hits: [{ k (step within these), step, ci, x, y, cell, hold (steps held after) }]
  //   path: [[[x, y] per cursor] per step]
  static walk(g, state, count) {
    const hits = [], path = [];
    for (let k = 0; k < count; k++) {
      const step = state.step;
      const seen = new Set();
      const at = [];
      state.cursors = state.cursors.map((cur, ci) => {
        const r = Grid.stepCursor(g, cur, step, ci);
        at.push([r.x, r.y]);
        const key = `${r.x},${r.y}`;
        if (r.cell && !seen.has(key)) {
          seen.add(key);
          hits.push({ k, step, ci, x: r.x, y: r.y, cell: r.cell, hold: Grid.holdAfter(g, r.cursor, step, ci) });
        }
        return r.cursor;
      });
      path.push(at);
      state.step++;
    }
    return { hits, path };
  }
};
