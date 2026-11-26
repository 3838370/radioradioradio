import { Emitter } from '../core/Emitter.js';
import { InstrumentLoader } from './InstrumentLoader.js';

// InstrumentLibrary: every sound the code can play, by name. A sound's source is its file
// (instrumentos/<papel>/<grupo>/<nome>.inst, see InstrumentLoader); `saved` holds what the
// files say. Changes made in the INSTRUMENTOS panel or by an inst(...) line are heard at
// once and kept in `edits` ("por guardar") until GUARDAR writes them to the file. Every note
// reads its sound when it starts, so edits are heard on the next note.
// Emits 'change' with { name } and 'loaded' when the files are in.
export class InstrumentLibrary extends Emitter {
  static clone(spec) { return JSON.parse(JSON.stringify(spec)); }

  constructor(sounds = []) {
    super();
    this.saved = {};    // name -> recipe, as in its file
    this.meta = {};     // name -> { file, role, group, label, family, replaces, origin }
    this.edits = {};    // name -> recipe not yet saved
    this.byReplace = {}; // 'folder:n' -> name: the sound that plays instead of that sample
    for (const s of sounds) this.add(s, true);
  }

  // A sound from its file. quiet: no event (loading many at once).
  add({ name, recipe, meta }, quiet = false) {
    this.saved[name] = InstrumentLibrary.clone(recipe);
    this.meta[name] = Object.assign({}, meta);
    if (meta && meta.replaces) this.byReplace[meta.replaces] = name;
    if (!quiet) this.emit('change', { name });
  }

  addAll(sounds) {
    for (const s of sounds) this.add(s, true);
    this.emit('loaded', {});
  }

  get(name) { return this.edits[name] || this.saved[name] || null; }

  has(name) { return !!this.get(name); }

  info(name) { return this.meta[name] || null; }

  names() { return [...new Set([...Object.keys(this.saved), ...Object.keys(this.edits)])]; }

  // The sound that plays instead of a sample ('808bd:5'), or null.
  replacing(key) { return this.byReplace[key] || null; }

  // A change, heard at once, "por guardar". `meta` (from inst()'s third argument) gives a new
  // sound its description, e.g. { substitui: '808bd:5' }.
  set(name, recipe, meta = null) {
    this.edits[name] = InstrumentLibrary.clone(recipe);
    if (meta && !this.meta[name]) {
      this.meta[name] = { label: name, role: 'novos', group: 'por_guardar', replaces: meta.substitui || meta.replaces || null };
      if (this.meta[name].replaces) this.byReplace[this.meta[name].replaces] = name;
    }
    this.emit('change', { name });
  }

  isFile(name) { return name in this.saved; }

  // Has a change that isn't in its file (or a new sound with no file yet).
  isDirty(name) {
    if (!(name in this.edits)) return false;
    return !this.isFile(name) || JSON.stringify(this.edits[name]) !== JSON.stringify(this.saved[name]);
  }

  dirtyNames() { return Object.keys(this.edits).filter((n) => this.isDirty(n)); }

  // Back to what the file says (a sound with no file is forgotten).
  discard(name) {
    delete this.edits[name];
    if (!this.isFile(name)) this.forget(name);
    this.emit('change', { name });
  }

  // GUARDAR worked: the file now says this.
  markSaved(name, recipe, meta) {
    this.saved[name] = InstrumentLibrary.clone(recipe);
    this.meta[name] = Object.assign({}, this.meta[name], meta);
    if (this.meta[name].replaces) this.byReplace[this.meta[name].replaces] = name;
    delete this.edits[name];
    this.emit('change', { name });
  }

  // The file was deleted.
  remove(name) {
    delete this.saved[name];
    delete this.edits[name];
    this.forget(name);
    this.emit('change', { name });
  }

  forget(name) {
    const m = this.meta[name];
    if (m && m.replaces && this.byReplace[m.replaces] === name) delete this.byReplace[m.replaces];
    delete this.meta[name];
  }

  // { papel: { grupo: [names] } }, in the order of InstrumentLoader.ROLES (sounds without a
  // file yet under 'novos').
  tree() {
    const out = {};
    for (const r of [...InstrumentLoader.ROLES, 'novos']) out[r] = {};
    for (const n of this.names().sort()) {
      const m = this.meta[n] || { role: 'novos', group: 'por_guardar' };
      ((out[m.role] || (out[m.role] = {}))[m.group] || (out[m.role][m.group] = [])).push(n);
    }
    const order = InstrumentLoader.GROUP_ORDER;
    const rank = (g) => (order.includes(g) ? order.indexOf(g) : order.length);
    for (const r of Object.keys(out)) {
      out[r] = Object.fromEntries(Object.entries(out[r]).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)));
    }
    return out;
  }

  // Unsaved changes survive a reload (stored in the browser, shown as "por guardar").
  serialize() {
    const out = {};
    for (const n of this.dirtyNames()) out[n] = { recipe: InstrumentLibrary.clone(this.edits[n]), meta: this.isFile(n) ? null : this.meta[n] || null };
    return out;
  }

  // Unsaved changes from the browser (older versions stored plain recipes).
  load(edits) {
    for (const [name, e] of Object.entries(edits || {})) {
      const recipe = e && e.recipe ? e.recipe : e;
      if (!InstrumentLoader.valid(recipe)) continue;
      this.edits[name] = InstrumentLibrary.clone(recipe);
      if (e && e.meta && !this.meta[name]) {
        this.meta[name] = e.meta;
        if (e.meta.replaces) this.byReplace[e.meta.replaces] = name;
      }
    }
  }
};
