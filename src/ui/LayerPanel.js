import { PatternBank } from '../music/PatternBank.js';
import { Bus } from '../audio/Bus.js';
import { CodeTools } from '../lang/CodeTools.js';
import { SliderRow } from './SliderRow.js';

// LayerPanel: the sound of one layer. Each slider rewrites the layer's top-level fx({...})
// line (so the code stays the source of truth) and is heard immediately. Also links to
// the instruments and samples the layer uses.
export class LayerPanel {
  static FX = [
    { key: 'amp', label: 'volume', min: 0, max: 1.5, def: 1 },
    { key: 'lpf', label: 'filtro', min: 100, max: 16000, log: true, def: 16000 },
    { key: 'res', label: 'ressonância', min: 0.1, max: 15, step: 0.1, def: 0.7 },
    { key: 'rev', label: 'reverb', min: 0, max: 0.8, def: 0 },
    { key: 'delay', label: 'delay', min: 0, max: 0.7, def: 0 },
    { key: 'wobble', label: 'wobble', min: 0, max: 1, def: 0 },
    { key: 'crush', label: 'crush', min: 0, max: 0.8, def: 0 },
  ];

  constructor(p, parent, app) {
    this.p = p;
    this.app = app;
    this.layerId = null;
    this.lastInput = 0;
    this.editing = false;
    const root = p.createDiv().addClass('panel').parent(parent);
    this.empty = p.createP('Carrega em ▶ Sintonizar. Depois escolhe uma camada aqui, ou carrega no ≈ de um cartão.').addClass('hint').parent(root);
    this.body = p.createDiv().parent(root);
    const head = p.createDiv().addClass('row').parent(this.body);
    p.createSpan('camada').addClass('label').parent(head);
    this.select = p.createSelect().parent(head);
    this.select.changed(() => this.show(this.select.value()));
    const autoRow = p.createDiv().addClass('row').parent(this.body);
    p.createSpan('auto').addClass('label').parent(autoRow);
    this.auto = p.createCheckbox('AUTO', true).addClass('check').parent(autoRow);
    this.auto.changed(() => {
      const layer = this.layer();
      if (layer) layer.fxAuto = this.auto.checked();
    });
    this.sliders = {};
    for (const f of LayerPanel.FX) {
      this.sliders[f.key] = new SliderRow(p, this.body, Object.assign({}, f, {
        value: f.def,
        onInput: (v) => this.edit(f.key, v, false),
        onChange: (v) => this.edit(f.key, v, true),
      }));
    }
    this.links = p.createDiv().addClass('links').parent(this.body);
    p.createP('Os sliders mostram o som a tocar agora: código + modo auto + pads (1–8). Arrastar um grava esse valor no código e bloqueia a camada (L). Também podes arrastar números no código.').addClass('hint').parent(this.body);
    this.refresh();
  }

  layers() { return this.app.composer ? [...this.app.composer.layers.values()] : []; }

  layer() { return this.app.composer ? this.app.composer.deck.find(this.layerId) : null; }

  // The list of layers changed.
  refresh() {
    const layers = this.layers();
    this.select.elt.innerHTML = '';
    for (const l of layers) this.select.option(`${PatternBank.roleLabel(l.role)} · ${l.patternId}`, l.id);
    if (!layers.some((l) => l.id === this.layerId)) this.layerId = layers.length ? layers[0].id : null;
    if (this.layerId) this.select.selected(this.layerId);
    this.sync();
  }

  show(id) {
    this.layerId = id;
    this.refresh();
  }

  // Sliders and links follow the layer's current code.
  sync() {
    const layer = this.layer();
    if (!layer) { this.empty.show(); this.body.hide(); return; }
    this.empty.hide();
    this.body.show();
    this.auto.checked(layer.fxAuto !== false);
    this.tick();
    this.links.html('');
    const lib = this.app.instruments;
    for (const name of CodeTools.synthsUsed(layer.code, lib.names())) {
      this.p.createButton(`synth:${name}`).addClass('chip').parent(this.links).mousePressed(() => this.app.openInstrument(name));
    }
    for (const name of CodeTools.samplesUsed(layer.code)) {
      this.p.createButton(`s:${name}`).addClass('chip').parent(this.links).mousePressed(() => this.app.openSamples(name));
      // the same sample rebuilt in code: edit it in INSTRUMENTOS
      const coded = lib.names().find((n) => ((lib.info(n) || {}).replaces || '').startsWith(name + ':'));
      if (coded) this.p.createButton(`código:${name}`).addClass('chip').parent(this.links).mousePressed(() => this.app.openInstrument(coded));
    }
  }

  // Live view: every slider shows what's playing now (code + auto + pads). Called each frame.
  tick() {
    const layer = this.layer();
    const bus = layer && this.app.audio && this.app.audio.bus(layer.id);
    if (!bus) return;
    const e = bus.effective();
    for (const f of LayerPanel.FX) {
      const s = this.sliders[f.key];
      if (!s.dragging) s.set(e[f.key]);
    }
    const auto = this.app.settings.get('layerAuto') && layer.fxAuto !== false;
    this.auto.elt.classList.toggle('dim', !this.app.settings.get('layerAuto'));
    if (this.auto.checked() !== (layer.fxAuto !== false)) this.auto.checked(layer.fxAuto !== false);
    this.body.elt.classList.toggle('automated', auto);
  }

  // The slider sets what you hear: the code gets the base value that, with the current
  // auto/pad modulation on top, gives exactly the value you chose.
  edit(key, value, final) {
    const layer = this.layer();
    if (!layer) return;
    const now = performance.now();
    if (!final && now - this.lastInput < 50) return;
    this.lastInput = now;
    const bus = this.app.audio.bus(layer.id);
    const m = bus ? bus.mod : Bus.NEUTRAL;
    const base = key === 'lpf' ? value / m.lpfMul : key === 'amp' ? value / m.ampMul
      : Math.max(0, value - (m[key + 'Add'] || 0));
    this.editing = true;
    this.app.composer.deck.liveEdit(layer.id, CodeTools.setFxParam(layer.code, key, base), { desc: `${key} → ${CodeTools.format(value)}`, final });
    if (bus) bus.pin(key, base);
    this.editing = false;
  }

  onLayerChange(layer) {
    if (layer.id !== this.layerId || this.editing) return;
    const opt = [...this.select.elt.options].find((o) => o.value === layer.id);
    if (opt) opt.textContent = `${layer.role} · ${layer.patternId}`;
    this.sync();
  }
};
