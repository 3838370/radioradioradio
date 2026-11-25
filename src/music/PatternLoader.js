// PatternLoader: the pattern bank lives in patterns/<genre>/<id>.rad, one file per pattern,
// listed in patterns/index.txt (made by Scripts/indexar_padroes.py; static hosts can't list
// folders). A .rad file is the layer's code as it shows on its card, under a short header:
//   // role: lead
//   // genres: saw 1, space 0.6
//   // energy: 0-1
//   // odd: true             (patterns with odd-meter loops)
//   params({ bell: 'dx_bell' })
//   loop('dx', (i) => { ... })
// The same format exports and imports your own patterns (SavePanel).
RA.PatternLoader = class PatternLoader {
  // A .rad text -> { id, role, genres, energy, odd?, code }. `id` comes from the file name.
  static parse(text, file = '') {
    const lines = text.replace(/\r/g, '').split('\n');
    const head = {};
    let k = 0;
    for (; k < lines.length; k++) {
      const m = /^\/\/\s*(\w+):\s*(.*)$/.exec(lines[k]);
      if (!m) break;
      head[m[1]] = m[2].trim();
    }
    const id = head.id || file.split('/').pop().replace(/\.rad$/, '');
    const genres = {};
    for (const [, g, v] of (head.genres || '').matchAll(/(\w+)\s+([0-9.]+)/g)) genres[g] = +v;
    const [lo, hi] = (head.energy || '0-1').split('-').map(Number);
    const p = { id, role: head.role, genres, energy: [lo, hi], code: lines.slice(k).join('\n').trim() };
    if (head.odd === 'true') p.odd = true;
    if (!p.role || !RA.PatternBank.ROLES.includes(p.role)) throw new Error(`${file || id}: no valid "// role:" line`);
    return p;
  }

  // A pattern -> .rad text (your patterns keep their id in the header).
  static format(p) {
    const num = (v) => String(Math.round(v * 100) / 100);
    const head = [`// role: ${p.role}`, `// genres: ${Object.entries(p.genres || {}).map(([g, v]) => `${g} ${num(v)}`).join(', ')}`, `// energy: ${num(p.energy[0])}-${num(p.energy[1])}`];
    if (p.odd) head.push('// odd: true');
    if (p.user) head.unshift(`// id: ${p.id}`);
    return head.join('\n') + '\n' + p.code.trim() + '\n';
  }

  // Loads every pattern in the index (several at a time). onProgress(loaded, total).
  // Sets RA.PATTERNS and returns the list. A file that fails is skipped and reported.
  static async load({ base = 'patterns/', onProgress = null, logger = null } = {}) {
    const index = await (await fetch(base + 'index.txt')).text();
    const files = index.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const out = new Array(files.length).fill(null);
    let done = 0, next = 0;
    const worker = async () => {
      while (next < files.length) {
        const k = next++;
        try {
          out[k] = PatternLoader.parse(await (await fetch(base + files[k])).text(), files[k]);
        } catch (e) {
          if (logger) logger.add(`pattern ${files[k]}: ${e.message}`, 'err'); else console.warn(files[k], e);
        }
        if (onProgress) onProgress(++done, files.length);
      }
    };
    await Promise.all(Array.from({ length: 12 }, worker));
    RA.PATTERNS = out.filter(Boolean);
    return RA.PATTERNS;
  }
};
