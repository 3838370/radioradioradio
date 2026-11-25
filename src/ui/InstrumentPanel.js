// InstrumentPanel: designs synth instruments. Every change is live (the next note of every
// layer using the instrument hears it). Built-ins can be tweaked and reset; "guardar como"
// creates a new instrument usable in code as synth('name', ...).
RA.InstrumentPanel = class InstrumentPanel {
  static TYPES = ['off', 'sine', 'triangle', 'sawtooth', 'square', 'noise'];
  static FILTERS = ['lowpass', 'bandpass', 'highpass'];

  static FIELDS = [
    { path: 'gain', label: 'volume', min: 0, max: 1, def: 0.3 },
    { path: 'attack', label: 'attack (s)', min: 0.001, max: 4, log: true, def: 0.01 },
    { path: 'dur', label: 'sustain (s)', min: 0, max: 4, def: 0.2 },
    { path: 'release', label: 'release (s)', min: 0.01, max: 6, log: true, def: 0.3 },
    { path: 'cutoff', label: 'filtro', min: 60, max: 12000, log: true, def: 2000 },
    { path: 'res', label: 'ressonância', min: 0.1, max: 15, step: 0.1, def: 0.7 },
    { path: 'fenv', label: 'env. filtro', min: 0, max: 8, step: 0.1, def: 0 },
    { path: 'fdecay', label: 'decay filtro', min: 0.01, max: 1, def: 0.2 },
    { path: 'vibrato.rate', label: 'vibrato Hz', min: 0, max: 8, step: 0.1, def: 0 },
    { path: 'vibrato.depth', label: 'vibrato cents', min: 0, max: 40, step: 1, def: 0 },
    { path: 'drift', label: 'drift (cents)', min: 0, max: 40, step: 1, def: 0 },
    { path: 'drive', label: 'drive', min: 0, max: 1, def: 0 },
    { path: 'pitch.from', label: 'pitch env (st)', min: -24, max: 36, step: 1, def: 0 },
    { path: 'pitch.time', label: 'pitch env (s)', min: 0.01, max: 1, def: 0.1 },
    { path: 'flfo.rate', label: 'LFO filtro Hz', min: 0, max: 12, step: 0.05, def: 0 },
    { path: 'flfo.depth', label: 'LFO filtro cents', min: 0, max: 2400, step: 10, def: 0 },
    { path: 'trem.rate', label: 'tremolo Hz', min: 0, max: 12, step: 0.05, def: 0 },
    { path: 'trem.depth', label: 'tremolo', min: 0, max: 1, def: 0 },
  ];

  constructor(p, parent, app) {
    this.p = p;
    this.app = app;
    this.name = 'haze';
    const root = p.createDiv().addClass('panel').parent(parent);

    const head = p.createDiv().addClass('row').parent(root);
    p.createSpan('instrumento').addClass('label').parent(head);
    this.select = p.createSelect().parent(head);
    this.select.changed(() => this.select_(this.select.value()));

    const actions = p.createDiv().addClass('buttons').parent(root);
    p.createButton('▶ testar').addClass('btn').parent(actions).mousePressed(() => this.test());
    this.resetButton = p.createButton('repor').addClass('btn').parent(actions);
    this.resetButton.mousePressed(() => this.reset());
    p.createButton('copiar código').addClass('btn').parent(actions).mousePressed(() => this.copyCode());
    this.autoTest = p.createCheckbox('testar ao mexer', true).addClass('check').parent(actions);

    this.fields = p.createDiv().parent(root);

    const saveRow = p.createDiv().addClass('row').parent(root);
    this.newName = p.createInput('').attribute('placeholder', 'nome_novo').parent(saveRow);
    p.createButton('guardar como').addClass('btn').parent(saveRow).mousePressed(() => this.saveAs());
    this.status = p.createP('').addClass('hint').parent(root);
    this.refreshList();
    this.render();
  }

  refreshList() {
    const lib = this.app.instruments;
    this.select.elt.innerHTML = '';
    for (const n of lib.names()) this.select.option(n + (lib.isModified(n) ? ' *' : lib.isBuiltin(n) ? '' : ' (teu)'), n);
    this.select.selected(this.name);
  }

  select_(name) {
    if (!this.app.instruments.has(name)) return;
    this.name = name;
    this.refreshList();
    this.render();
  }

  spec() { return RA.InstrumentLibrary.clone(this.app.instruments.get(this.name)); }

  static getPath(spec, path) {
    const [a, b] = path.split('.');
    return b ? (spec[a] ? spec[a][b] : undefined) : spec[a];
  }

  static setPath(spec, path, value) {
    const [a, b] = path.split('.');
    if (!b) { spec[a] = value; return; }
    const defaults = { vibrato: { rate: 0, depth: 0, delay: 0 }, pitch: { from: 0, time: 0.1 }, flfo: { rate: 0, depth: 0 }, trem: { rate: 0, depth: 0 } };
    if (!spec[a]) spec[a] = Object.assign({}, defaults[a]);
    spec[a][b] = value;
  }

  // Applies a change to the current instrument; `final` = gesture ended.
  update(fn, final) {
    const s = this.spec();
    fn(s);
    this.app.instruments.set(this.name, s);
    if (final) {
      this.refreshList();
      if (this.autoTest.checked()) this.test();
    }
  }

  slider(parent, label, min, max, value, step, log, apply) {
    return new RA.SliderRow(this.p, parent, {
      label, min, max, step, log, value,
      onInput: (v) => this.update((s) => apply(s, v), false),
      onChange: (v) => this.update((s) => apply(s, v), true),
    });
  }

  render() {
    const { p } = this;
    const spec = this.spec();
    this.fields.html('');
    this.resetButton.html(this.app.instruments.isBuiltin(this.name) ? 'repor original' : 'apagar');

    p.createDiv('som').addClass('section').parent(this.fields);
    const frow = p.createDiv().addClass('row').parent(this.fields);
    p.createSpan('filtro').addClass('label').parent(frow);
    const ftype = p.createSelect().parent(frow);
    for (const f of InstrumentPanel.FILTERS) ftype.option(f);
    ftype.selected(spec.ftype || 'lowpass');
    ftype.changed(() => this.update((s) => { s.ftype = ftype.value(); }, true));
    for (const f of InstrumentPanel.FIELDS) {
      const v = InstrumentPanel.getPath(spec, f.path);
      this.slider(this.fields, f.label, f.min, f.max, v == null ? f.def : v, f.step || 0.01, f.log, (s, val) => InstrumentPanel.setPath(s, f.path, val));
    }

    for (let i = 0; i < 3; i++) {
      const osc = spec.osc[i];
      p.createDiv(`oscilador ${i + 1}`).addClass('section').parent(this.fields);
      const row = p.createDiv().addClass('row').parent(this.fields);
      p.createSpan('onda').addClass('label').parent(row);
      const type = p.createSelect().parent(row);
      for (const t of InstrumentPanel.TYPES) type.option(t);
      type.selected(osc ? osc.type : 'off');
      type.changed(() => {
        this.update((s) => {
          if (type.value() === 'off') { if (s.osc.length > 1 && s.osc[i]) s.osc.splice(i, 1); } else if (s.osc[i]) s.osc[i].type = type.value(); else s.osc.push({ type: type.value() });
        }, true);
        this.render();
      });
      if (!osc) continue;
      this.slider(this.fields, 'oitava', -2, 2, osc.octave || 0, 1, false, (s, v) => { s.osc[i].octave = v; });
      this.slider(this.fields, 'detune', -50, 50, osc.detune || 0, 1, false, (s, v) => { s.osc[i].detune = v; });
      this.slider(this.fields, 'nível', 0, 1, osc.level == null ? 1 : osc.level, 0.01, false, (s, v) => { s.osc[i].level = v; });
      if (osc.type !== 'noise') {
        const u = osc.unison || { voices: 1, spread: 0 };
        this.slider(this.fields, 'unison vozes', 1, 7, u.voices, 1, false, (s, v) => { s.osc[i].unison = Object.assign({ spread: 20 }, s.osc[i].unison, { voices: v }); });
        this.slider(this.fields, 'unison cents', 0, 60, u.spread, 1, false, (s, v) => { s.osc[i].unison = Object.assign({ voices: 1 }, s.osc[i].unison, { spread: v }); });
      }
      if (i === 0) {
        const fmOn = p.createCheckbox('FM (sino / metal)', !!osc.fm).addClass('check').parent(this.fields);
        fmOn.changed(() => {
          this.update((s) => { if (fmOn.checked()) s.osc[0].fm = { ratio: 3.5, index: 2, decay: 0.5 }; else delete s.osc[0].fm; }, true);
          this.render();
        });
        if (osc.fm) {
          this.slider(this.fields, 'FM rácio', 0.5, 12, osc.fm.ratio, 0.01, false, (s, v) => { s.osc[0].fm.ratio = v; });
          this.slider(this.fields, 'FM índice', 0, 6, osc.fm.index, 0.01, false, (s, v) => { s.osc[0].fm.index = v; });
          this.slider(this.fields, 'FM decay', 0.01, 2, osc.fm.decay, 0.01, false, (s, v) => { s.osc[0].fm.decay = v; });
        }
      }
    }
  }

  notes() {
    const { harmony, composer } = this.app;
    return composer ? harmony.chordNotes(composer.bar, 1, '7') : [48, 55, 60, 63];
  }

  test() {
    if (!this.app.audio) { this.status.html('Carrega em ▶ Tune in para ouvir.'); return; }
    this.app.audio.auditionSynth(this.name, this.notes(), { dur: 0.6, amp: 0.5 });
  }

  reset() {
    const builtin = this.app.instruments.isBuiltin(this.name);
    this.app.instruments.reset(this.name);
    if (!builtin) this.name = 'haze';
    this.status.html(builtin ? 'Original reposto.' : 'Instrumento apagado.');
    this.refreshList();
    this.render();
  }

  saveAs() {
    const name = this.newName.value().trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) { this.status.html('Nome inválido: usa letras, números e _ .'); return; }
    this.app.instruments.set(name, this.spec());
    this.newName.value('');
    this.status.html(`Guardado. Usa no código: synth('${name}', harm(1, '7'), { dur: 2 })`);
    this.select_(name);
  }

  copyCode() {
    this.app.insertCode(`synth('${this.name}', harm(1, '7'), { dur: 2, amp: 0.4 })`, this.status);
  }
};
