import { InstrumentLibrary } from '../audio/InstrumentLibrary.js';
import { InstrumentLoader } from '../audio/InstrumentLoader.js';
import { SoundFields as F } from '../audio/SoundFields.js';
import { CodeTools } from '../lang/CodeTools.js';
import { SliderRow } from './SliderRow.js';

// InstrumentPanel: every sound, organised as the files are (instrumentos/<papel>/<grupo>/):
// pick the instrument (bateria, percussão, baixo...), then a sound in its groups (bombos,
// tarolas, hihats...), and edit it. The controls are built from SoundFields, the list of
// every field the sound engine (SynthVoice) reads, so each one is a real value of the sound;
// a missing field shows as "desligado" or "(padrão)", never an invented number. A change is
// heard at once and shows in the sound's code below (and in the inst(...) line of every
// layer playing it); it stays "por guardar" until GUARDAR writes it to the sound's file
// through the local server (Scripts/serve.py). GUARDAR COMO makes a new file in the same
// folder. Sounds made of parts ({ layers }, the drums rebuilt in code) edit one part at a time.
export class InstrumentPanel {
  constructor(p, parent, app) {
    this.p = p;
    this.app = app;
    this.role = 'bateria';
    this.group = null;
    this.name = null;
    this.part = 0;          // which part, for sounds made of parts
    this.chips = new Map(); // name -> its button in the tree
    this.canSave = false;
    const root = p.createDiv().addClass('panel').parent(parent);

    const head = p.createDiv().addClass('row').parent(root);
    p.createSpan('instrumento').addClass('label').parent(head);
    this.roleSelect = p.createSelect().parent(head);
    this.roleSelect.changed(() => { this.role = this.roleSelect.value(); this.pickFirst(); });
    this.tree = p.createDiv().parent(root);

    this.title = p.createDiv('').addClass('section').parent(root);
    this.about = p.createDiv('').addClass('hint').parent(root);
    const actions = p.createDiv().addClass('buttons').parent(root);
    p.createButton('▶ testar').addClass('btn').parent(actions).mousePressed(() => this.test());
    this.origButton = p.createButton('▶ original').addClass('btn').parent(actions).mousePressed(() => this.original());
    this.abButton = p.createButton('▶ A/B').addClass('btn').parent(actions)
      .attribute('title', 'toca a sample original e logo a seguir o som em código').mousePressed(() => this.ab());
    p.createButton('copiar código').addClass('btn').parent(actions).mousePressed(() => this.copyCode());
    // off: an edit is heard in what is playing (the layers that play this sound), not alone
    this.autoTest = p.createCheckbox('testar ao mexer', false).addClass('check').parent(actions)
      .attribute('title', 'tocar o som sozinho a cada mexida (sem isto, ouve-se a mudança no que está a tocar)');

    this.fields = p.createDiv().parent(root);

    p.createDiv('código do som').addClass('section').parent(root);
    this.code = p.createDiv('').addClass('snippet').parent(root);

    p.createDiv('guardar').addClass('section').parent(root);
    this.state = p.createDiv('').addClass('hint').parent(root);
    this.destRow = p.createDiv().addClass('row').parent(root);
    p.createSpan('guardar em').addClass('label').parent(this.destRow);
    this.dest = p.createSelect().parent(this.destRow);
    const saveRow = p.createDiv().addClass('buttons').parent(root);
    this.saveButton = p.createButton('guardar').addClass('btn').parent(saveRow).mousePressed(() => this.save());
    this.undoButton = p.createButton('desfazer').addClass('btn').parent(saveRow)
      .attribute('title', 'volta ao que está no ficheiro').mousePressed(() => this.undo());
    this.deleteButton = p.createButton('apagar').addClass('btn danger').parent(saveRow).mousePressed(() => this.remove());
    const asRow = p.createDiv().addClass('row').parent(root);
    this.newName = p.createInput('').attribute('placeholder', 'nome_novo').parent(asRow);
    this.saveAsButton = p.createButton('guardar como').addClass('btn').parent(asRow).mousePressed(() => this.saveAs());
    this.status = p.createP('').addClass('hint').parent(root);

    InstrumentLoader.canSave().then((ok) => { this.canSave = ok; this.showState(); });
    this.reload();
  }

  get lib() { return this.app.instruments; }

  // ───── the tree: instrument → groups → sounds ─────

  // The files are in (or changed a lot): rebuild the instrument list and the tree.
  reload() {
    this.known = new Set(this.lib.names()); // a sound not in here is new: the menus are rebuilt
    const tree = this.lib.tree();
    this.roleSelect.elt.innerHTML = '';
    for (const [role, groups] of Object.entries(tree)) {
      const n = Object.values(groups).reduce((a, l) => a + l.length, 0);
      if (!n) continue;
      this.roleSelect.option(`${InstrumentLoader.ROLE_LABELS[role] || role} (${n})`, role);
    }
    if (!tree[this.role] || !Object.keys(tree[this.role]).length) this.role = 'bateria';
    this.roleSelect.selected(this.role);
    this.renderTree();
    if (!this.name || !this.lib.has(this.name)) this.pickFirst(); else this.render();
  }

  pickFirst() {
    const groups = this.lib.tree()[this.role] || {};
    const first = Object.values(groups)[0];
    this.renderTree();
    if (first && first.length) this.select_(first[0]); else { this.name = null; this.render(); }
  }

  // A short name for a sound in its group: '808bd 5' for a rebuilt sample, else its name.
  static chipLabel(name, meta) {
    if (meta && meta.replaces) return meta.replaces.replace(':', ' ');
    return name;
  }

  // Two compact menus under the instrument: the group (bombos, tarolas…) and the sound in it,
  // with ◀ ▶ to step through the sounds (handy when tuning them one after another).
  renderTree() {
    const { p } = this;
    this.tree.html('');
    this.chips.clear();
    const groups = this.lib.tree()[this.role] || {};
    if (!Object.keys(groups).length) {
      p.createDiv(this.lib.names().length ? 'sem sons aqui' : 'a carregar os sons…').addClass('hint').parent(this.tree);
      return;
    }
    const meta = (this.name && this.lib.info(this.name)) || {};
    const group = groups[meta.group] && meta.role === this.role ? meta.group : Object.keys(groups)[0];
    this.group = group;

    const grow = p.createDiv().addClass('row').parent(this.tree);
    p.createSpan('grupo').addClass('label').parent(grow);
    const gsel = p.createSelect().parent(grow);
    for (const [g, names] of Object.entries(groups)) gsel.option(`${g.replace(/_/g, ' ')} (${names.length})`, g);
    gsel.selected(group);
    gsel.changed(() => this.select_(groups[gsel.value()][0]));

    const srow = p.createDiv().addClass('row').parent(this.tree);
    p.createSpan('som').addClass('label').parent(srow);
    this.soundSelect = p.createSelect().parent(srow);
    for (const n of groups[group]) {
      this.soundSelect.option('', n);
      this.chips.set(n, this.soundSelect.elt.options[this.soundSelect.elt.options.length - 1]);
      this.markChip(n);
    }
    this.soundSelect.changed(() => this.select_(this.soundSelect.value()));
    if (this.name && groups[group].includes(this.name)) this.soundSelect.selected(this.name);
  }

  // a sound's line in the menu: its short name, * when it has changes not saved
  markChip(name) {
    const opt = this.chips.get(name);
    if (!opt) return;
    opt.textContent = InstrumentPanel.chipLabel(name, this.lib.info(name)) + (this.lib.isDirty(name) ? ' *' : '');
    if (name === this.name && this.soundSelect) this.soundSelect.elt.value = name;
  }

  // Opens a sound: its instrument and group in the tree, its controls below.
  select_(name) {
    if (!this.lib.has(name)) return;
    const meta = this.lib.info(name) || { role: 'novos' };
    const old = this.name;
    this.name = name;
    this.part = 0;
    if (meta.role !== this.role || meta.group !== this.group) {
      this.role = meta.role;
      this.roleSelect.selected(this.role);
      this.renderTree();
    } else {
      this.markChip(old);
      this.markChip(name);
    }
    this.render();
  }

  // The library changed (this panel, an inst() line, a save): keep the marks up to date.
  onLibraryChange(name) {
    if (this.known && this.lib.has(name) !== this.known.has(name)) { this.reload(); return; } // a sound came or went
    this.markChip(name);
    if (name !== this.name || this.codeQueued) return;
    // the sound's code and state: once per frame at most (a slider sends many changes, and
    // re-laying out the panel each time held the page up)
    this.codeQueued = true;
    requestAnimationFrame(() => { this.codeQueued = false; this.showCode(); this.showState(); });
  }

  // ───── editing ─────

  spec() { return InstrumentLibrary.clone(this.lib.get(this.name)); }

  // the voice being edited inside a recipe: the recipe itself, or one of its parts
  voiceOf(spec) { return spec.layers ? spec.layers[Math.min(this.part, spec.layers.length - 1)] : spec; }

  // Applies a change to the voice being edited; `final` = the gesture ended (re-test, and
  // re-draw when the controls themselves change).
  edit(fn, final, redraw = false) {
    if (!this.name) return;
    const s = this.spec();
    fn(this.voiceOf(s), s);
    this.lib.set(this.name, s);
    if (final && this.autoTest.checked()) this.test();
    if (redraw) this.render();
  }

  section(title) { this.p.createDiv(title).addClass('section').parent(this.fields); }

  // One field of `obj` (got/set through `at`, a function from the voice to obj).
  field(f, obj, at) {
    const { p } = this;
    const value = F.get(obj, f.path);
    if (f.options) {
      const row = p.createDiv().addClass('row').parent(this.fields);
      p.createSpan(f.label).addClass('label').parent(row).attribute('title', f.hint || '');
      const sel = p.createSelect().parent(row);
      for (const o of F[f.options]) sel.option(o);
      sel.selected(value == null ? f.def : value);
      sel.changed(() => this.edit((v) => F.set(at(v), f.path, sel.value()), true, f.path === 'type'));
      return;
    }
    const missing = value == null;
    const shown = missing ? (f.def == null ? f.min : f.def) : value;
    const row = new SliderRow(p, this.fields, {
      label: f.label, min: f.min, max: f.max, step: f.step || 0.001, log: f.log, value: shown,
      onInput: (x) => this.edit((v) => F.set(at(v), f.path, x), false),
      onChange: (x) => this.edit((v) => F.set(at(v), f.path, x), true, missing),
    });
    row.row.attribute('title', f.hint || '');
    if (missing) row.out.html(f.def == null ? 'desligado' : `${CodeTools.format(f.def)} (padrão)`);
    else if (!f.required) {
      // back to the engine's own behaviour (off, or its default)
      p.createSpan('×').addClass('reset').attribute('title', f.def == null ? 'desligar' : 'voltar ao padrão').parent(row.row)
        .mousePressed(() => this.edit((v) => F.remove(at(v), f.path), true, true));
    }
  }

  // A module (pitch, vibrato, fm…): switched on and off as a whole.
  module(m, obj, at) {
    const on = obj[m.module] != null;
    const box = this.p.createCheckbox(m.label, on).addClass('check').parent(this.fields);
    box.changed(() => this.edit((v) => { const o = at(v); if (box.checked()) o[m.module] = Object.assign({}, m.on); else delete o[m.module]; }, true, true));
    if (on) for (const f of m.fields) this.field(f, obj, at);
  }

  list(fields, obj, at, skip = () => false) {
    for (const f of fields) {
      if (skip(f)) continue;
      if (f.module) this.module(f, obj, at); else this.field(f, obj, at);
    }
  }

  render() {
    const { p } = this;
    this.fields.html('');
    if (!this.name) { this.title.html(''); this.about.html(''); this.code.html(''); this.showState(); return; }
    const spec = this.spec();
    const meta = this.lib.info(this.name) || {};
    this.title.html(meta.label || this.name);
    this.about.html([
      meta.file ? `ficheiro: instrumentos/${meta.file}` : 'ainda sem ficheiro',
      `no código: synth('${this.name}', …)`,
      meta.replaces ? `toca sempre em vez da sample ${meta.replaces} (▶ original toca a sample, só para comparar)` : '',
      meta.origin || '',
    ].filter(Boolean).join('<br>'));
    if (meta.replaces) { this.origButton.show(); this.abButton.show(); } else { this.origButton.hide(); this.abButton.hide(); }

    // a sound made of parts: pick the part, and its own placement
    if (spec.layers) {
      this.section(`partes (${spec.layers.length})`);
      const row = p.createDiv().addClass('row').parent(this.fields);
      p.createSpan('parte').addClass('label').parent(row);
      const sel = p.createSelect().parent(row);
      spec.layers.forEach((l, i) => sel.option(`${i + 1} · ${InstrumentPanel.describe(l)}`, String(i)));
      sel.selected(String(Math.min(this.part, spec.layers.length - 1)));
      sel.changed(() => { this.part = +sel.value(); this.render(); });
      this.list(F.part, this.voiceOf(spec), (v) => v);
      const parts = p.createDiv().addClass('buttons').parent(this.fields);
      p.createButton('+ parte').addClass('btn small').parent(parts).mousePressed(() => {
        this.edit((v, s) => { s.layers.push(InstrumentLibrary.clone(v)); this.part = s.layers.length - 1; }, true, true);
      });
      if (spec.layers.length > 1) {
        p.createButton('remover parte').addClass('btn small').parent(parts).mousePressed(() => {
          this.edit((v, s) => { s.layers.splice(Math.min(this.part, s.layers.length - 1), 1); this.part = 0; }, true, true);
        });
      }
    }

    const voice = this.voiceOf(spec);
    for (const group of ['som', 'filtro', 'modulação']) {
      this.section(group);
      this.list(F.voice.filter((f) => f.group === group), voice, (v) => v);
    }

    voice.osc.forEach((osc, i) => {
      this.section(`oscilador ${i + 1}`);
      const noise = osc.type === 'noise';
      this.list(F.osc, osc, (v) => v.osc[i], (f) => noise && f.tonal);
      if (voice.osc.length > 1) {
        p.createButton('remover oscilador').addClass('btn small').parent(this.fields)
          .mousePressed(() => this.edit((v) => v.osc.splice(i, 1), true, true));
      }
    });
    p.createButton('+ oscilador').addClass('btn small').parent(this.fields)
      .mousePressed(() => this.edit((v) => v.osc.push({ type: 'sine', level: 0.5 }), true, true));
    this.showCode();
    this.showState();
  }

  // the sound's code, exactly as the layers and the full code carry it
  showCode() {
    if (!this.name) return;
    const meta = this.lib.info(this.name) || {};
    const extra = meta.replaces ? `, { substitui: '${meta.replaces}' }` : '';
    this.code.html(`inst('${this.name}', ${CodeTools.toCode(this.lib.get(this.name))}${extra})`.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  }

  // whether the sound is saved, and what can be done
  showState() {
    const lib = this.lib, name = this.name;
    if (!name) { this.state.html(''); return; }
    const meta = lib.info(name) || {};
    const dirty = lib.isDirty(name);
    const where = meta.file ? `instrumentos/${meta.file}` : 'sem ficheiro';
    this.state.html(!this.canSave
      ? 'edição só com o servidor local (Scripts\\serve.py): aqui as alterações ouvem-se mas não se gravam nos ficheiros'
      : dirty ? `● alterações por guardar (${where})` : `guardado em ${where}`);
    for (const b of [this.saveButton, this.saveAsButton]) b.elt.disabled = !this.canSave;
    this.undoButton.elt.disabled = !dirty;
    this.deleteButton.elt.disabled = !this.canSave || !meta.file;
    // a sound with no file yet (made by an inst() line) chooses where it goes
    if (meta.file) this.destRow.hide();
    else {
      this.destRow.show();
      this.dest.elt.innerHTML = '';
      for (const [role, groups] of Object.entries(lib.tree())) {
        if (role === 'novos') continue;
        for (const g of Object.keys(groups)) this.dest.option(`${role}/${g}`);
      }
    }
  }

  // a part in a few words: "sine 172 Hz", "ruído 4000 Hz"
  static describe(l) {
    const o = l.osc[0];
    if (o.type === 'noise') return `ruído ${l.ftype === 'bandpass' ? Math.round(l.cutoff) + ' Hz' : 'largo'}`;
    const hz = 440 * Math.pow(2, (60 + (l.transpose || 0) - 69) / 12);
    return `${o.type} ${Math.round(hz)} Hz`;
  }

  // ───── listening ─────

  // drums, percussion and rebuilt samples are hits (one note, as the sample plays);
  // the rest a chord of the harmony playing
  isHit() {
    const meta = this.lib.info(this.name) || {};
    return !!meta.replaces || meta.role === 'bateria' || meta.role === 'percussao';
  }

  notes() {
    if (this.isHit()) return [60];
    const { harmony, composer } = this.app;
    return composer ? harmony.chordNotes(composer.bar, 1, '7') : [48, 55, 60, 63];
  }

  test() {
    if (!this.name) return;
    if (!this.app.audio) { this.status.html('Carrega em ▶ SINTONIZAR para ouvir.'); return; }
    this.app.audio.auditionSynth(this.name, this.notes(), this.isHit() ? { amp: 0.5 } : { dur: 0.6, amp: 0.5 });
  }

  // the sample this sound rebuilds
  original() {
    const meta = this.lib.info(this.name) || {};
    if (!meta.replaces) return null;
    if (!this.app.audio) { this.status.html('Carrega em ▶ SINTONIZAR para ouvir.'); return null; }
    const [folder, n] = meta.replaces.split(':');
    return this.app.audio.audition(folder, +n, { original: true });
  }

  async ab() {
    const started = this.original();
    if (!started) return;
    await started;
    setTimeout(() => this.test(), 900);
  }

  // ───── saving (to the sound's own file) ─────

  async write(name, recipe, meta) {
    await InstrumentLoader.save(meta.file, InstrumentLoader.format(recipe, meta));
    this.lib.markSaved(name, recipe, meta);
  }

  async save() {
    const name = this.name;
    if (!name) return;
    const meta = Object.assign({}, this.lib.info(name));
    if (!meta.file) {
      const [role, group] = (this.dest.value() || 'textura/outros').split('/');
      Object.assign(meta, { role, group, file: `${role}/${group}/${name}.inst`, label: meta.label || name });
    }
    try {
      await this.write(name, this.lib.get(name), meta);
      this.status.html(`Guardado às ${new Date().toLocaleTimeString().slice(0, 5)} em instrumentos/${meta.file}.`);
      if (meta.role !== this.role) this.select_(name);
    } catch (e) {
      this.status.html('Não consegui guardar: ' + e.message);
    }
    this.showState();
  }

  async saveAs() {
    const name = this.newName.value().trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) { this.status.html('Nome inválido: usa letras minúsculas, números e _ .'); return; }
    if (this.lib.has(name)) { this.status.html(`Já existe um som "${name}": escolhe outro nome (ou GUARDAR para gravar por cima deste).`); return; }
    const from = this.lib.info(this.name) || {};
    const role = from.file ? from.role : (this.dest.value() || 'textura/outros').split('/')[0];
    const group = from.file ? from.group : (this.dest.value() || 'textura/outros').split('/')[1];
    const meta = { role, group, file: `${role}/${group}/${name}.inst`, label: name, family: from.family, origin: `copiado de ${this.name}` };
    const recipe = this.lib.get(this.name);
    try {
      await this.write(name, recipe, meta);
      if (from.file) this.lib.discard(this.name); // the original stays as its file says
      this.newName.value('');
      this.status.html(`Guardado como "${name}" em instrumentos/${meta.file}. No código: synth('${name}', …). "${this.name}" ficou como estava no ficheiro.`);
      this.reload();
      this.select_(name);
    } catch (e) {
      this.status.html('Não consegui guardar: ' + e.message);
    }
  }

  undo() {
    if (!this.name) return;
    const had = this.lib.isFile(this.name);
    this.lib.discard(this.name);
    this.status.html(had ? 'De volta ao que está no ficheiro.' : 'Som sem ficheiro esquecido.');
    if (!had) this.reload(); else this.render();
  }

  async remove() {
    const meta = this.lib.info(this.name) || {};
    if (!meta.file) return;
    if (!confirm(`Apagar o ficheiro instrumentos/${meta.file}?\nOs padrões que usam "${this.name}" passam a tocar outro som.`)) return;
    try {
      await InstrumentLoader.remove(meta.file);
      this.lib.remove(this.name);
      this.status.html(`Apagado: instrumentos/${meta.file}.`);
      this.name = null;
      this.reload();
    } catch (e) {
      this.status.html('Não consegui apagar: ' + e.message);
    }
  }

  copyCode() {
    if (!this.name) return;
    const code = this.isHit() ? `synth('${this.name}', 60, { amp: 0.5 })` : `synth('${this.name}', harm(1, '7'), { dur: 2, amp: 0.4 })`;
    this.app.insertCode(code, this.status);
  }
};
