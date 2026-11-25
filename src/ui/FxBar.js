import { FxRack } from '../audio/FxRack.js';

// FxBar: the strip at the bottom of the page. Eight effect pads and the delay controls.
//   left button  hold: the effect is on while the button is held
//   right button latch: toggles the effect on/off
//   keys 1-8     hold (Shift+number latches)
// Pads light up for any source, including the composer's automatic gestures.
export class FxBar {
  constructor(p, parent, settings) {
    this.p = p;
    this.settings = settings;
    this.fx = null;
    this.pads = new Map();
    const root = p.createDiv().addClass('fxbar').parent(parent);

    const padBox = p.createDiv().addClass('pads').parent(root);
    for (const pad of FxRack.PADS) {
      const b = p.createButton('').addClass('pad').parent(padBox).attribute('title', `${pad.hint} · esquerdo: segurar · direito: ligar/desligar · tecla ${pad.key}`);
      b.html(`<span class="k">${pad.key}</span>${pad.label}`);
      const el = b.elt;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !this.fx) return;
        el.setPointerCapture(e.pointerId);
        this.fx.engage(pad.id, 'hold');
      });
      const release = () => { if (this.fx) this.fx.release(pad.id, 'hold'); };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this.fx) this.fx.toggle(pad.id, 'latch');
      });
      this.pads.set(pad.id, el);
    }

    const ctl = p.createDiv().addClass('fxctl').parent(root);
    const group = (name) => {
      const g = p.createDiv().addClass('control').parent(ctl);
      p.createSpan(name).addClass('name').parent(g);
      return g;
    };

    let g = group('delay');
    this.time = p.createSelect().parent(g);
    for (const [name, beats] of FxRack.DELAY_NOTES) this.time.option(name, String(beats));
    this.time.changed(() => settings.set('delayBeats', +this.time.value()));
    const auto = p.createCheckbox('auto', settings.get('delayAuto')).addClass('check').parent(g);
    auto.changed(() => settings.set('delayAuto', auto.checked()));

    this.slider(group('feedback'), 0, 0.85, 'feedback', (v) => `${Math.round(v * 100)}%`);
    this.slider(group('glide'), 0, 2, 'glide', (v) => `${v.toFixed(2)}s`);
    this.slider(group('fx auto'), 0, 1, 'fxAuto', (v) => `${Math.round(v * 100)}%`);
    const layerAuto = p.createCheckbox('auto camadas', settings.get('layerAuto')).addClass('check').parent(group('som'));
    layerAuto.attribute('title', 'o rádio mexe progressivamente no filtro, reverb, delay, wobble… de cada camada');
    layerAuto.changed(() => settings.set('layerAuto', layerAuto.checked()));

    settings.on('change', ({ name }) => { if (name === 'delayBeats') this.syncTime(); });
    this.syncTime();
  }

  slider(g, min, max, key, format) {
    const s = this.p.createSlider(min, max, this.settings.get(key), (max - min) / 100).parent(g);
    const out = this.p.createSpan(format(this.settings.get(key))).addClass('value').parent(g);
    s.input(() => { this.settings.set(key, +s.value()); out.html(format(+s.value())); });
  }

  syncTime() {
    const beats = this.settings.get('delayBeats');
    const match = FxRack.DELAY_NOTES.find(([, b]) => Math.abs(b - beats) < 0.01);
    if (match) this.time.selected(String(match[1]));
  }

  attach(fx) {
    this.fx = fx;
    fx.on('change', () => this.render());
    this.render();
  }

  render() {
    for (const [id, el] of this.pads) {
      const src = this.fx.sources(id);
      el.classList.toggle('on', src.size > 0);
      el.classList.toggle('latched', src.has('latch'));
      el.classList.toggle('auto', src.has('auto'));
    }
  }
};
