// ParamsBar: the PARAMS row under the top bar, opened by [PARAMS ▾]. Everything in it is
// generated from Settings.SCHEMA (the `ui: 'params'` entries) and Settings.GENRE_SCHEMA, so a
// new parameter only needs a line there. Two blocks:
//   general   one group per `group` (variation, feel, harmony, transitions): sliders and
//             switches, each with ↺ (back to default) when changed
//   genre     a genre to tune (the one playing, until you pick another): its tempo, energy,
//             max layers, tape wow, and its modes and bars per chord as chips to tick
// EXPORT / IMPORT write and read the PARAMS as .json; RESET puts them all back.
RA.ParamsBar = class ParamsBar {
  static GROUPS = { variation: 'variation', feel: 'feel', harmony: 'harmony', transitions: 'transitions' };

  // opts: { playing: () => genre name, onResize, onExport, onImport(file) }
  constructor(p, settings, parent, opts) {
    this.p = p;
    this.settings = settings;
    this.opts = opts;
    this.root = p.createDiv().addClass('params').parent(parent).style('display', 'none');
    this.open = false;
    this.genre = null;     // the genre being tuned
    this.pinned = false;   // the listener picked it (else it follows the one playing)
    this.busy = false;     // our own change: don't rebuild under the slider
    settings.on('change', ({ name }) => {
      if (this.busy || !this.open) return;
      if (name === 'genreTune' || RA.Settings.spec(name)?.ui === 'params') this.render();
    });
  }

  toggle() {
    this.open = !this.open;
    if (this.open) this.render();
    this.root.style('display', this.open ? 'flex' : 'none');
    if (this.opts.onResize) this.opts.onResize();
    return this.open;
  }

  // Called every frame: follow the genre playing unless one was picked.
  sync() {
    if (!this.open || this.pinned) return;
    const g = this.opts.playing();
    if (g && g !== this.genre) { this.genre = g; this.render(); }
  }

  set(fn) {
    this.busy = true;
    try { fn(); } finally { this.busy = false; }
  }

  render() {
    const { p, settings } = this;
    this.genre = this.genre || this.opts.playing() || RA.Genres.LIST[0];
    this.root.html('');
    const S = RA.Settings;
    for (const [group, title] of Object.entries(ParamsBar.GROUPS)) {
      const g = this.group(title);
      for (const s of S.SCHEMA.filter((x) => x.ui === 'params' && x.group === group)) {
        this.item(g, s, () => settings.get(s.id), (v) => settings.set(s.id, v), () => settings.isDefault(s.id), () => settings.reset(s.id));
      }
    }
    // the genre block
    const g = this.group('genre');
    const sel = p.createSelect().parent(g);
    for (const name of RA.Genres.LIST) sel.option(RA.Genres.label(name).toUpperCase(), name);
    sel.selected(this.genre);
    sel.changed(() => { this.genre = sel.value(); this.pinned = true; this.render(); });
    const G = this.genre;
    for (const s of S.GENRE_SCHEMA) {
      const get = () => settings.genre(G, s.id);
      const isDef = () => settings.isGenreDefault(G, s.id);
      const reset = () => settings.resetGenre(G, s.id);
      if (s.options) this.chips(g, s, get, (v) => settings.setGenre(G, s.id, v), isDef, reset);
      else this.item(g, s, get, (v) => settings.setGenre(G, s.id, v), isDef, reset);
    }
    // files and reset
    const a = this.group('');
    p.createButton('export').addClass('btn small').parent(a).mousePressed(() => this.opts.onExport());
    const file = p.createFileInput((f) => this.opts.onImport(f.file), false).parent(a).hide();
    p.createButton('import').addClass('btn small').parent(a).mousePressed(() => file.elt.click());
    p.createButton('reset all').addClass('btn small').parent(a).mousePressed(() => {
      if (confirm('Put every parameter back to its default?')) { settings.resetParams(); this.render(); }
    });
  }

  group(title) {
    const g = this.p.createDiv().addClass('control').parent(this.root);
    if (title) this.p.createSpan(title).addClass('name').parent(g);
    return g;
  }

  // ↺ after a value that differs from its default.
  resetButton(parent, isDefault, reset) {
    const b = this.p.createSpan('↺').addClass('reset').parent(parent).attribute('title', 'back to default');
    b.mousePressed(() => { reset(); this.render(); });
    if (isDefault()) b.hide();
    return b;
  }

  // a slider (or a switch, for kind: 'bool') with its value and ↺
  item(parent, s, get, set, isDefault, reset) {
    const { p } = this;
    const box = p.createSpan('').addClass('param').parent(parent).attribute('title', s.hint);
    p.createSpan(s.label).addClass('plabel').parent(box);
    if (s.kind === 'bool') {
      const c = p.createCheckbox('', !!get()).addClass('check').parent(box);
      const r = this.resetButton(box, isDefault, reset);
      c.changed(() => { this.set(() => set(c.checked())); if (isDefault()) r.hide(); else r.show(); });
      return;
    }
    const slider = p.createSlider(s.min, s.max, get(), s.step).parent(box);
    const out = p.createSpan(this.format(get(), s)).addClass('value').parent(box);
    const r = this.resetButton(box, isDefault, reset);
    slider.input(() => {
      const v = +slider.value();
      out.html(this.format(v, s));
      this.set(() => set(v));
      if (isDefault()) r.hide(); else r.show();
    });
  }

  // options to tick (modes, bars per chord); at least one stays on
  chips(parent, s, get, set, isDefault, reset) {
    const { p } = this;
    const box = p.createSpan('').addClass('param').parent(parent).attribute('title', s.hint);
    p.createSpan(s.label).addClass('plabel').parent(box);
    const on = new Set(get());
    for (const o of s.options) {
      const chip = p.createButton(String(o).slice(0, 4)).addClass('chip' + (on.has(o) ? ' active' : '')).parent(box).attribute('title', String(o));
      chip.mousePressed(() => {
        const next = new Set(get());
        if (next.has(o)) { if (next.size === 1) return; next.delete(o); } else next.add(o);
        set(s.options.filter((x) => next.has(x)));
        this.render();
      });
    }
    this.resetButton(box, isDefault, reset);
  }

  format(v, s) {
    if (s.step >= 1) return String(Math.round(v));
    return String(Math.round(v * 100) / 100);
  }
};
