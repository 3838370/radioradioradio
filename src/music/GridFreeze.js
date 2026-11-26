import { CodeTools } from '../lang/CodeTools.js';
import { MathUtil } from '../core/MathUtil.js';

// GridFreeze: turns what a layer played into a grid() (the GRELHA view's "congelar" button).
// It takes the layer's last whole cycle of sounds (the sequencer's window: 16 steps for a bar,
// 12, 20... for other loops, at most 32), one cell per step, one row, one cursor:
//   a drum or percussion sound    its letter (k bombo, s tarola, h hi-hat, ...), upper case
//                                 when played harder than usual
//   a note of a tonal sound       its letter and its degree from the chord playing then, with
//                                 ' or , for the octave; several notes at once as several items
//   a long note                   ~ in the cells it lasts (when nothing else plays there)
// A sample with no sound rebuilt in code can't go into a grid: it's left out, and said.
// A note outside the mode becomes the nearest note of the mode, and said.
export class GridFreeze {
  // the first letter tried for a sound, by its group in the Instrumentos panel
  static LETTERS = { bombos: 'k', tarolas: 's', claps: 'c', hihats: 'h', pratos: 'p', toms: 't', rims: 'r' };

  // ctx: { harmony, instruments, sampleCount(folder) }
  constructor(ctx) {
    this.h = ctx.harmony;
    this.lib = ctx.instruments;
    this.count = ctx.sampleCount || (() => 1);
  }

  // The instrument a recorded sound plays: a synth's name, or the sound rebuilt in code that
  // replaces a sample ('808bd:5' -> 'bombo_808bd_05'); null if there is none.
  instrumentOf(ev) {
    if (ev.kind === 'synth') return this.lib.has(ev.key) ? ev.key : null;
    const n = MathUtil.mod(Math.floor(ev.n) || 0, Math.max(1, this.count(ev.name)));
    return this.lib.replacing(`${ev.name}:${n}`) || null;
  }

  isDrum(name) {
    const m = this.lib.info(name);
    return !!m && (m.role === 'bateria' || m.role === 'percussao' || !!m.replaces);
  }

  // The degree (1-7) and octave a midi note has over the chord of `bar` in the grid's terms
  // (graus: 'acorde'): degree(root + d - 1, octave) === note. Out of the mode: the nearest
  // note of the mode (exact: false).
  degreeOf(note, bar) {
    const root = this.h.degreeAt(bar);
    let best = null;
    for (let oct = -3; oct <= 6; oct++) {
      for (let d = 1; d <= 7; d++) {
        const n = this.h.degree(root + d - 1, oct);
        const dist = Math.abs(n - note);
        if (!best || dist < best.dist) best = { d, oct, dist };
      }
    }
    return { degree: best.d, octave: best.oct, exact: best.dist === 0 };
  }

  // -> { code, sounds, steps, left: [names left out], offKey: notes moved into the mode }
  //   events: layer.played (beats, keys, notes, amps, durs); start: the window's first beat;
  //   steps: its length in sixteenths; fxLine: the layer's fx(...) line to keep (or '')
  freeze(events, start, steps, fxLine = '', name = 'congelada') {
    const inWin = events.filter((e) => !e.silent && e.beat >= start - 1e-6 && e.beat < start + steps / 4 - 1e-6);
    const letters = {}, used = new Set(['v']);
    const left = new Set();
    let offKey = 0;
    const letterFor = (inst) => {
      if (letters[inst]) return letters[inst];
      const m = this.lib.info(inst) || {};
      const wish = [GridFreeze.LETTERS[m.group], inst[0], ...'abcdefgijklmnopqrstuwxyz'].filter((c) => c && /^[a-uw-z]$/.test(c));
      const l = wish.find((c) => !used.has(c));
      used.add(l);
      letters[inst] = l;
      return l;
    };
    const amps = inWin.map((e) => (e.amp != null ? e.amp : 0.5)).sort((a, b) => a - b);
    const loud = amps.length ? amps[Math.floor(amps.length * 0.75)] * 1.05 : 1;
    const cells = Array.from({ length: steps }, () => []);
    const tonal = [];
    for (const e of inWin.sort((a, b) => a.beat - b.beat)) {
      const inst = this.instrumentOf(e);
      if (!inst) { left.add(e.key); continue; }
      const step = Math.min(steps - 1, Math.max(0, Math.round((e.beat - start) * 4)));
      const accent = (e.amp != null ? e.amp : 0.5) >= loud && amps.length > 3;
      let l = letterFor(inst);
      if (accent) l = l.toUpperCase();
      if (this.isDrum(inst)) {
        if (!cells[step].some((t) => t.toLowerCase() === l.toLowerCase())) cells[step].push(l);
        continue;
      }
      const bar = Math.floor(e.beat / 4 + 1e-6);
      for (const note of e.notes || []) {
        const r = this.degreeOf(note, bar);
        if (!r.exact) offKey++;
        tonal.push({ step, l, r, dur: e.dur || 0.25 });
      }
    }
    // the octave most tonal notes sit in: the grid's own; the others get ' or ,
    const octs = {};
    for (const t of tonal) octs[t.r.octave] = (octs[t.r.octave] || 0) + 1;
    const base = tonal.length ? +Object.entries(octs).sort((a, b) => b[1] - a[1])[0][0] : 1;
    for (const t of tonal) {
      const o = t.r.octave - base;
      cells[t.step].push(t.l + t.r.degree + (o > 0 ? "'".repeat(o) : ','.repeat(-o)));
    }
    // long notes: ~ in the empty cells they last
    for (const t of tonal) {
      const len = Math.round(t.dur * 4);
      for (let k = 1; k < len && t.step + k < steps; k++) {
        if (cells[t.step + k].length) break;
        cells[t.step + k].push('~');
      }
    }
    const tokens = cells.map((c) => (c.includes('~') ? '~' : c.join('') || '.'));
    tokens[0] = '@>' + tokens[0];
    const sounds = {};
    for (const [inst, l] of Object.entries(letters)) sounds[l] = inst;
    const tom = tonal.length ? tonal[0].l.toLowerCase() : null;
    const row = tokens.join(' ');
    const q = row.includes("'") ? '"' : "'";
    const opts = [`passo: 1/4`, `ciclo: ${steps}`];
    if (tom) opts.push(`tom: '${tom}'`, `oitava: ${base}`);
    const soundList = Object.entries(sounds).map(([l, s]) => `${l}: '${s}'`).join(', ');
    const code = (fxLine ? fxLine + '\n' : '') + `grid('${name}', [\n  ${q}${row}${q},\n], { ${soundList} }, { ${opts.join(', ')} })`;
    return { code, sounds, steps, left: [...left], offKey };
  }

  // The class (and letter) of a sound in a 4×4 grid: K kick, S snare / clap, H hat / cymbal,
  // P other percussion, C chord, A a note line.
  classOf(inst, notes) {
    const m = this.lib.info(inst) || {};
    if (this.isDrum(inst)) return { bombos: 'k', tarolas: 's', claps: 's', hihats: 'h', pratos: 'h' }[m.group] || 'p';
    return notes && notes.length >= 3 ? 'c' : 'a';
  }

  // The sounds a layer played between two beats, one per letter: { k: name, s: ..., a: ... }
  soundsOf(events, from, to) {
    const out = {};
    for (const e of events) {
      if (e.silent || e.beat < from || e.beat >= to) continue;
      const inst = this.instrumentOf(e);
      if (!inst) continue;
      const cls = this.classOf(inst, e.notes);
      if (!out[cls]) out[cls] = inst;
    }
    return out;
  }

  // The code of a grid() with these rows and sounds (the GRELHA view's "pôr em grelha").
  static gridCode(rows, sounds, fxLine = '', name = 'grelha') {
    const tom = sounds.c ? 'c' : sounds.a ? 'a' : null;
    const opts = ['passo: 1/4'];
    if (tom) opts.push(`tom: '${tom}'`);
    if (sounds.c && !sounds.a) opts.push('acorde: 3');
    const list = Object.entries(sounds).map(([l, s]) => `${l}: '${s}'`).join(', ');
    return (fxLine ? fxLine + '\n' : '') + `grid('${name}', [\n${rows.map((r) => `  '${r}',`).join('\n')}\n], { ${list} }, { ${opts.join(', ')} })`;
  }

  // A bar (16 steps from `start`) as a 4×4 grid, one symbol per cell (the GRELHA view and
  // the "congelar" button): where several sounds share a step, K before S before H before P
  // before C before A. -> { rows: ['k . s h', ...] (4), sounds: { k: name, ... }, legend,
  // code, empty }
  compact(events, start, fxLine = '', name = 'grelha') {
    const order = ['k', 's', 'h', 'p', 'c', 'a'];
    const cells = new Array(16).fill('.');
    const sounds = {};
    const amps = [];
    for (const e of events) {
      if (e.silent || e.beat < start - 1e-6 || e.beat >= start + 4 - 1e-6) continue;
      const inst = this.instrumentOf(e);
      if (!inst) continue;
      const cls = this.classOf(inst, e.notes);
      if (!sounds[cls]) sounds[cls] = inst;
      if (sounds[cls] !== inst) continue; // one sound per letter
      const k = Math.min(15, Math.max(0, Math.round((e.beat - start) * 4)));
      const cur = cells[k].toLowerCase();
      if (cur === '.' || order.indexOf(cls) < order.indexOf(cur)) cells[k] = cls;
      amps.push([k, e.amp != null ? e.amp : 0.5]);
    }
    // accents: the loudest quarter, upper case
    const sorted = amps.map((a) => a[1]).sort((a, b) => a - b);
    const loud = sorted.length > 3 ? sorted[Math.floor(sorted.length * 0.75)] : Infinity;
    for (const [k, a] of amps) if (a >= loud && cells[k] !== '.') cells[k] = cells[k].toUpperCase();
    const rows = [0, 1, 2, 3].map((r) => cells.slice(r * 4, r * 4 + 4).join(' '));
    const letters = Object.keys(sounds);
    const drums = letters.filter((l) => 'kshp'.includes(l)).map((l) => l.toUpperCase());
    const tonal = letters.filter((l) => 'ca'.includes(l)).map((l) => l.toUpperCase());
    const legend = [drums.length ? drums[0] + (drums.length > 1 ? ' + ' + drums.slice(1).join('/') : '') : '', tonal.join('/')].filter(Boolean).join(' · ');
    const tom = sounds.c ? 'c' : sounds.a ? 'a' : null;
    const opts = [`passo: 1/4`];
    if (tom) opts.push(`tom: '${tom}'`);
    if (sounds.c) opts.push('acorde: 3');
    const list = letters.map((l) => `${l}: '${sounds[l]}'`).join(', ');
    const code = (fxLine ? fxLine + '\n' : '') + `grid('${name}', [\n${rows.map((r) => `  '${r}',`).join('\n')}\n], { ${list} }, { ${opts.join(', ')} })`;
    return { rows, sounds, legend, code, empty: !letters.length };
  }

  // The fx(...) line at the head of a layer's code, to keep the sound's colour.
  static fxLine(code) {
    const m = /^fx\(\{[^\n]*\}\)\s*$/m.exec(CodeTools.withoutCoded(code));
    return m ? m[0].trim() : '';
  }
};
