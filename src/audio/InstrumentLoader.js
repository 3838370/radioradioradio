// InstrumentLoader: every sound lives in its own file, instrumentos/<papel>/<grupo>/<nome>.inst,
// listed in instrumentos/index.txt (static hosts can't list folders; the local server and
// Scripts/criar_instrumentos.py keep it up to date). The folder is the instrument (bateria,
// baixo...), the subfolder the group (bombos, subs...), the file the sound. A file:
//   // nome: bombo 808bd · 5
//   // família: bombos
//   // substitui: 808bd:5        (a sample this sound rebuilds in code; it always plays instead)
//   // origem: ...
//   { "layers": [ ... ] }       (the recipe SynthVoice plays: see SoundFields)
export class InstrumentLoader {
  static ROLES = ['bateria', 'percussao', 'baixo', 'teclas', 'melodia', 'textura'];
  static ROLE_LABELS = { bateria: 'bateria', percussao: 'percussão', baixo: 'baixo', teclas: 'teclas', melodia: 'melodia', textura: 'textura' };
  // the drum kit's groups in a drummer's order; other groups alphabetically
  static GROUP_ORDER = ['bombos', 'tarolas', 'claps', 'hihats', 'pratos', 'toms', 'rims'];
  static HEAD = { nome: 'label', 'família': 'family', substitui: 'replaces', origem: 'origin' };

  // .inst text -> { name, recipe, meta: { file, role, group, label, family, replaces, origin } }
  static parse(text, file) {
    const lines = text.replace(/\r/g, '').split('\n');
    const meta = { file };
    let k = 0;
    for (; k < lines.length; k++) {
      const m = /^\/\/\s*([^:]+):\s*(.*)$/.exec(lines[k]);
      if (!m) break;
      const key = InstrumentLoader.HEAD[m[1].trim()];
      if (key) meta[key] = m[2].trim();
    }
    const parts = file.split('/');
    meta.role = parts.length >= 3 ? parts[0] : 'textura';
    meta.group = parts.length >= 3 ? parts[1] : 'outros';
    const name = parts[parts.length - 1].replace(/\.inst$/, '');
    const recipe = JSON.parse(lines.slice(k).join('\n'));
    if (!InstrumentLoader.valid(recipe)) throw new Error(`${file}: a receita precisa de osc: [...] ou layers: [...]`);
    meta.label = meta.label || name;
    return { name, recipe, meta };
  }

  static valid(r) {
    if (!r || typeof r !== 'object') return false;
    if (Array.isArray(r.layers)) return r.layers.length > 0 && r.layers.every((l) => Array.isArray(l.osc) && l.osc.length);
    return Array.isArray(r.osc) && r.osc.length > 0;
  }

  // a sound -> .inst text
  static format(recipe, meta = {}) {
    const head = Object.entries(InstrumentLoader.HEAD)
      .filter(([, k]) => meta[k] != null && meta[k] !== '')
      .map(([word, k]) => `// ${word}: ${meta[k]}`);
    return head.join('\n') + (head.length ? '\n' : '') + JSON.stringify(recipe, null, 2) + '\n';
  }

  // Loads every sound in the index (several at a time). onProgress(loaded, total).
  static async load({ base = 'instrumentos/', onProgress = null, logger = null } = {}) {
    const index = await (await fetch(base + 'index.txt', { cache: 'no-store' })).text();
    const files = index.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const out = new Array(files.length).fill(null);
    let done = 0, next = 0;
    const worker = async () => {
      while (next < files.length) {
        const k = next++;
        try {
          out[k] = InstrumentLoader.parse(await (await fetch(base + files[k], { cache: 'no-store' })).text(), files[k]);
        } catch (e) {
          if (logger) logger.add(`som ${files[k]}: ${e.message}`, 'err'); else console.warn(files[k], e);
        }
        if (onProgress) onProgress(++done, files.length);
      }
    };
    await Promise.all(Array.from({ length: 12 }, worker));
    return out.filter(Boolean);
  }

  // Asks the local server (Scripts/serve.py) to write or delete a sound's file. Online
  // (a static host) there is no such server: canSave() says so.
  static async canSave() {
    try {
      const r = await fetch('__gravar', { cache: 'no-store' });
      return r.ok && (await r.text()).trim() === 'ok';
    } catch (e) {
      return false;
    }
  }

  static async save(file, text) {
    const r = await fetch('instrumentos/' + file, { method: 'PUT', body: text, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    if (!r.ok) throw new Error((await r.text()) || r.statusText);
  }

  static async remove(file) {
    const r = await fetch('instrumentos/' + file, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.text()) || r.statusText);
  }
};
