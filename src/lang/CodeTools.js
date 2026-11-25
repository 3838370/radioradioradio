import { SynthPresets } from '../audio/SynthPresets.js';
import { Families } from '../music/Families.js';

// CodeTools: small, safe text edits on pattern code used by the editing UI.
export class CodeTools {
  static FX_LINE = /^fx\(\{([^\n]*)\}\)[ \t]*$/m; // top-level only (lines inside loops are indented)

  static splice(code, start, len, str) { return code.slice(0, start) + str + code.slice(start + len); }

  // Numeric params of the top-level fx({ ... }) line: { lpf: 3000, rev: 0.2 }
  static fxParams(code) {
    const m = CodeTools.FX_LINE.exec(code);
    const out = {};
    if (!m) return out;
    for (const [, k, v] of m[1].matchAll(/(\w+):\s*(-?\d*\.?\d+)\b/g)) out[k] = parseFloat(v);
    return out;
  }

  // Sets one numeric param in the top-level fx line, adding the param or the line if needed.
  static setFxParam(code, key, value) {
    const str = CodeTools.format(value);
    const m = CodeTools.FX_LINE.exec(code);
    if (!m) return `fx({ ${key}: ${str} })\n` + code;
    const inner = m[1];
    const re = new RegExp(`(\\b${key}:\\s*)(-?\\d*\\.?\\d+)`);
    const newInner = re.test(inner)
      ? inner.replace(re, `$1${str}`)
      : inner.trim() ? `${inner.replace(/\s+$/, '')}, ${key}: ${str} ` : ` ${key}: ${str} `;
    const start = m.index + 'fx({'.length;
    return CodeTools.splice(code, start, inner.length, newInner);
  }

  static format(v) {
    if (Math.abs(v) >= 100) return String(Math.round(v));
    if (Math.abs(v) >= 10) return String(Math.round(v * 10) / 10);
    return String(Math.round(v * 100) / 100);
  }

  // New text for a number dragged by dy pixels (up = positive). Keeps its decimals;
  // big numbers (frequencies) move exponentially, small integers step every 8 px.
  static scrub(str, dy) {
    const v0 = parseFloat(str);
    const dec = (str.split('.')[1] || '').length;
    let v;
    if (Math.abs(v0) >= 20) v = v0 * Math.pow(2, dy / 80);
    else if (dec === 0) v = v0 + Math.round(dy / 8);
    else v = v0 + dy * Math.pow(10, -dec) * (dec === 1 ? 0.2 : 1);
    v = Math.max(0, v);
    return dec ? v.toFixed(dec) : String(Math.round(v));
  }

  // ───── the params line: what may vary in a pattern ─────
  // params({ pad: 'boc_pad', kick: '808bd', odds: 4 }) at the top; the code reads P.pad,
  // P.kick, P.odds. The composer only rewrites this line (see Variation).

  static PARAMS_LINE = /^params\(\{([^\n]*)\}\)[ \t]*$/m;

  // The values of the params line: strings and numbers ({} if there's none).
  static paramsOf(code) {
    const m = CodeTools.PARAMS_LINE.exec(code);
    const out = {};
    if (!m) return out;
    for (const [, k, s, n] of m[1].matchAll(/(\w+):\s*(?:'([^']*)'|(-?\d*\.?\d+))/g)) out[k] = s != null ? s : parseFloat(n);
    return out;
  }

  // Writes the params line (replacing it, or adding it after the inst lines).
  static setParams(code, params) {
    const line = `params(${CodeTools.toCode(params)})`;
    const m = CodeTools.PARAMS_LINE.exec(code);
    if (m) return CodeTools.splice(code, m.index, m[0].length, line);
    const lines = code.split('\n');
    let i = 0;
    while (i < lines.length && CodeTools.isInstLine(lines[i])) i++;
    lines.splice(i, 0, line);
    return lines.join('\n');
  }

  // Instruments a layer plays: synth('name', ...), the instruments in its params line, and
  // names chosen in code on synth lines, e.g. synth(vary('v', ['bell', 'glass'], 8), ...).
  // `known` (instrument names) filters the quoted words; without it, the built-in presets.
  static synthsUsed(code, known = null) {
    const set = new Set(known || Object.keys(SynthPresets));
    const names = [...code.matchAll(/synth\('(\w+)'/g)].map((m) => m[1]);
    for (const v of Object.values(CodeTools.paramsOf(code))) if (set.has(v)) names.push(v);
    if (known) {
      for (const line of code.split('\n')) {
        if (!line.includes('synth(')) continue;
        for (const [, w] of line.matchAll(/'(\w+)'/g)) if (set.has(w)) names.push(w);
      }
    }
    return [...new Set(names)];
  }

  // ───── the code "head": instrument definitions and the top-level fx line ─────

  static FX_KEYS = ['amp', 'lpf', 'res', 'rev', 'delay', 'wobble', 'crush'];

  static setFxParams(code, values) {
    for (const k of CodeTools.FX_KEYS) if (values[k] != null) code = CodeTools.setFxParam(code, k, values[k]);
    return code;
  }

  // A JS literal for a preset: { osc: [{ type: 'sine' }], attack: 0.01, ... }
  static toCode(v) {
    if (Array.isArray(v)) return '[' + v.map(CodeTools.toCode).join(', ') + ']';
    if (v && typeof v === 'object') return '{ ' + Object.entries(v).map(([k, x]) => `${k}: ${CodeTools.toCode(x)}`).join(', ') + ' }';
    if (typeof v === 'string') return `'${v}'`;
    return String(v);
  }

  static instLine(name, spec) { return `inst('${name}', ${CodeTools.toCode(spec)})`; }

  static isInstLine(line) { return /^inst\('/.test(line); }

  // Leading inst(...) lines, the params line, the top-level fx line and the mute line are
  // the head; the rest is the body.
  static split(code) {
    const lines = code.split('\n');
    let i = 0;
    while (i < lines.length && (CodeTools.isInstLine(lines[i]) || /^(params|fx)\(\{[^\n]*\}\)\s*$/.test(lines[i]) || /^mute\([^\n]*\)\s*$/.test(lines[i]))) i++;
    return { head: lines.slice(0, i).join('\n'), body: lines.slice(i).join('\n') };
  }

  static join(head, body) { return head ? head + '\n' + body : body; }

  // The code with one inst(...) line per instrument it plays, at the top, from the library.
  static withInstruments(code, library) {
    const plain = code.split('\n').filter((l) => !CodeTools.isInstLine(l)).join('\n').replace(/^\s*\n/, '');
    const lines = CodeTools.synthsUsed(plain, library.names())
      .filter((n) => library.has(n))
      .map((n) => CodeTools.instLine(n, library.get(n)));
    return lines.length ? lines.join('\n') + '\n' + plain : plain;
  }

  // Replaces the inst line for `name` (if present) with the library's current definition.
  static updateInstrument(code, name, spec) {
    return code.split('\n').map((l) => (l.startsWith(`inst('${name}',`) ? CodeTools.instLine(name, spec) : l)).join('\n');
  }

  // Sample folders a layer plays: s('folder', ...) and the folders in its params line.
  static samplesUsed(code) {
    const names = [...code.matchAll(/\bs\('(\w+)'/g)].map((m) => m[1]);
    for (const v of Object.values(CodeTools.paramsOf(code))) if (typeof v === 'string' && Families.kitFamily(v)) names.push(v);
    return [...new Set(names)];
  }

  // ───── the sequencer's lines ─────
  // mute('a:1', 'sub') in the head, and the hand-made rows at the end, one loop per cycle
  // length (16 steps = a bar: 'hand'; others, e.g. 12 or 20 steps: 'hand_12', 'hand_20'):
  //   loop('hand', (i) => {
  //     hits('drumtraks:6', 'x...x...........', { amp: 0.75 })
  //     sleep(4)
  //   })

  static MUTE_LINE = /^mute\(([^\n]*)\)[ \t]*$/m;
  static HAND_BLOCK = /\n*^loop\('(hand(?:_\d+)?)', \(i\) => \{\n((?:  hits\([^\n]*\)\n)*)  sleep\(([\d.]+)\)\n\}\)[ \t]*$/gm;
  static HITS_ROW = /^  hits\('([^']*)', '([^']*)'(?:, (\{[^\n]*\}))?\)$/;

  static handLoopName(steps) { return steps === 16 ? 'hand' : `hand_${steps}`; }

  static muteKeys(code) {
    const m = CodeTools.MUTE_LINE.exec(code);
    return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
  }

  // Writes the mute line (in the head), or removes it when `keys` is empty.
  static setMutes(code, keys) {
    const line = keys.length ? `mute(${keys.map((k) => `'${k}'`).join(', ')})` : null;
    const m = CodeTools.MUTE_LINE.exec(code);
    if (m) {
      if (line) return CodeTools.splice(code, m.index, m[0].length, line);
      const end = m.index + m[0].length;
      return code.slice(0, m.index) + code.slice(code[end] === '\n' ? end + 1 : end);
    }
    if (!line) return code;
    const { head, body } = CodeTools.split(code);
    return CodeTools.join(head ? head + '\n' + line : line, body);
  }

  static hitsKeys(code) { return [...code.matchAll(/\bhits\('([^']*)'/g)].map((m) => m[1]); }

  // The rows of the hand loops: [{ key, pattern, opts, loop }] (opts: the literal's text or '').
  static hitsRows(code) {
    const out = [];
    for (const m of code.matchAll(CodeTools.HAND_BLOCK)) {
      for (const l of m[2].split('\n')) {
        const r = CodeTools.HITS_ROW.exec(l);
        if (r) out.push({ key: r[1], pattern: r[2], opts: r[3] || '', loop: m[1] });
      }
    }
    return out;
  }

  // Sets (or with pattern null removes) the row for `key`; `opts` is an object or a
  // literal's text. The pattern's length picks the loop (16 steps → 'hand', a bar); loops
  // are added at the end, and removed when their last row goes.
  static setHits(code, key, pattern, opts = '') {
    const rows = CodeTools.hitsRows(code);
    const optsText = typeof opts === 'string' ? opts : Object.keys(opts).length ? CodeTools.toCode(opts) : '';
    const k = rows.findIndex((r) => r.key === key);
    if (pattern == null) { if (k >= 0) rows.splice(k, 1); }
    else if (k >= 0) rows[k] = { key, pattern, opts: optsText || rows[k].opts };
    else rows.push({ key, pattern, opts: optsText });
    const without = code.replace(CodeTools.HAND_BLOCK, '').replace(/\s+$/, '');
    if (!rows.length) return without;
    const byLen = new Map();
    for (const r of rows) {
      if (!byLen.has(r.pattern.length)) byLen.set(r.pattern.length, []);
      byLen.get(r.pattern.length).push(`  hits('${r.key}', '${r.pattern}'${r.opts ? ', ' + r.opts : ''})`);
    }
    const blocks = [...byLen].map(([len, lines]) =>
      [`loop('${CodeTools.handLoopName(len)}', (i) => {`, ...lines, `  sleep(${len / 4})`, '})'].join('\n'));
    return `${without}\n${blocks.join('\n')}`;
  }
};
