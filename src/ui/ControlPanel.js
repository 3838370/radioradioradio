import { Harmony } from '../music/Harmony.js';
import { PatternBank } from '../music/PatternBank.js';

// ControlPanel: the HTML control strip (p5 DOM helpers). It only writes to Settings;
// the composer and app react to the change events.
export class ControlPanel {
  static PACE_STEPS = [4, 8, 16, 32, 48, 64];
  // the cycles the bank's patterns have: straight ones, then the odd IDM ones
  static STEPS = [4, 8, 16, 32, 7, 11, 12, 14, 17, 18, 20, 22, 24, 28];
  static KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  constructor(p, settings, parent) {
    this.p = p;
    this.settings = settings;
    this.root = p.createDiv().addClass('controls').parent(parent);
    this.build();
  }

  group(name, hint) {
    const g = this.p.createDiv().addClass('control').parent(this.root);
    this.p.createSpan(name).addClass('name').parent(g).attribute('title', hint);
    return g;
  }

  valueLabel(g) { return this.p.createSpan('').addClass('value').parent(g); }

  checkbox(g, label, checked, onChange) {
    const c = this.p.createCheckbox(label, checked).addClass('check').parent(g);
    c.changed(() => onChange(c.checked()));
    return c;
  }

  build() {
    const { p, settings } = this;
    const S = ControlPanel.PACE_STEPS;

    // Like density: on auto the slider shows the pace the composer is using; moving it
    // takes over until auto is ticked again.
    let g = this.group('mudanças', 'de quanto em quanto tempo o compositor muda alguma coisa; auto: alterna períodos curtos e longos sozinho');
    this.pace = p.createSlider(0, S.length - 1, Math.max(0, S.indexOf(settings.get('pace'))), 1).parent(g);
    this.paceVal = this.valueLabel(g);
    this.pace.input(() => {
      settings.set('pace', S[this.pace.value()]);
      if (settings.get('paceAuto')) { settings.set('paceAuto', false); this.paceAuto.checked(false); }
      this.paceVal.html(`${S[this.pace.value()]} bars`);
    });
    this.paceVal.html(settings.get('paceAuto') ? 'auto' : `${settings.get('pace')} bars`);
    // Turning auto off holds the pace it was using.
    this.paceAuto = this.checkbox(g, 'auto', settings.get('paceAuto'), (v) => {
      if (!v) settings.set('pace', S[this.pace.value()]);
      settings.set('paceAuto', v);
      if (!v) this.paceVal.html(`${S[this.pace.value()]} bars`);
    });

    g = this.group('variação', 'o tamanho de cada mudança');
    const variation = p.createSlider(0, 100, settings.get('variation') * 100, 1).parent(g);
    const varVal = this.valueLabel(g);
    const showVar = () => varVal.html(`${variation.value()}%`);
    variation.input(() => { settings.set('variation', variation.value() / 100); showVar(); });
    showVar();

    // One layer per role, so at most PatternBank.ROLES.length (6).
    g = this.group('densidade', 'quantas camadas tocam; auto: o arco vai do esparso ao cheio. "2 → 5": 2 a tocar, a caminho de 5');
    this.density = p.createSlider(1, PatternBank.ROLES.length, settings.get('density'), 1).parent(g);
    this.denVal = this.valueLabel(g);
    // Moving the slider takes over from auto and holds that many layers.
    this.density.input(() => {
      settings.set('density', this.density.value());
      if (settings.get('densityAuto')) { settings.set('densityAuto', false); this.denAuto.checked(false); }
    });
    this.denVal.html(settings.get('densityAuto') ? 'auto' : `${this.density.value()} camadas`);
    // Turning auto off holds the count it had chosen.
    this.denAuto = this.checkbox(g, 'auto', settings.get('densityAuto'), (v) => {
      if (!v) settings.set('density', +this.density.value());
      settings.set('densityAuto', v);
    });

    g = this.group('tempo', 'BPM; auto segue o género');
    this.tempo = p.createSlider(60, 180, settings.get('bpm'), 1).parent(g);
    this.tempoVal = this.valueLabel(g);
    // Like density: moving the slider takes over from auto.
    this.tempo.input(() => {
      settings.set('bpm', this.tempo.value());
      if (settings.get('bpmAuto')) { settings.set('bpmAuto', false); this.tempoAuto.checked(false); }
      this.tempoVal.html(`${this.tempo.value()} bpm`);
      this.tempoShown = null; // (sync writes it again when auto comes back)
    });
    this.tempoAuto = this.checkbox(g, 'auto', settings.get('bpmAuto'), (v) => {
      if (!v) settings.set('bpm', +this.tempo.value());
      settings.set('bpmAuto', v);
    });

    // The loops' cycle in 16th steps: 16 is a bar (4, 8, 32 line up with it); the others
    // are the odd IDM cycles in the bank. Auto: whatever the patterns bring.
    g = this.group('passos', 'o ciclo dos loops em semicolcheias; a rádio prefere padrões com esse ciclo');
    const steps = p.createSelect().parent(g);
    steps.option('auto', 'auto');
    for (const n of ControlPanel.STEPS) steps.option(String(n), String(n));
    steps.selected(String(settings.get('steps')));
    steps.changed(() => settings.set('steps', steps.value() === 'auto' ? 'auto' : +steps.value()));

    g = this.group('tom', 'auto muda de tom com o género');
    const key = p.createSelect().parent(g);
    key.option('auto', 'auto');
    ControlPanel.KEYS.forEach((k, i) => key.option(k, String(i)));
    key.selected(String(settings.get('key')));
    key.changed(() => settings.set('key', key.value() === 'auto' ? 'auto' : +key.value()));
    const mode = p.createSelect().parent(g);
    mode.option('auto', 'auto');
    for (const m of Harmony.MODES) mode.option(Harmony.modeLabel(m), m);
    mode.selected(settings.get('mode'));
    mode.changed(() => settings.set('mode', mode.value()));

    g = this.group('volume', 'volume geral');
    const vol = p.createSlider(0, 100, settings.get('volume') * 100, 1).parent(g);
    vol.input(() => settings.set('volume', vol.value() / 100));

    // Right-aligned: LOCK (the `freeze` setting), then the buttons (the panel's) right against it.
    this.tail = p.createDiv().addClass('tail').parent(this.root);
    this.checkbox(this.tail, 'bloquear', settings.get('freeze'), (v) => settings.set('freeze', v))
      .attribute('title', 'bloqueia o código de todas as camadas: sem trocas nem variações (a densidade manual continua a funcionar)');
  }

  addButton(label, onClick) {
    const b = this.p.createButton(label).addClass('btn').parent(this.tail);
    b.mousePressed(onClick);
    return b;
  }

  // Keeps the sliders showing what's live. Density: on auto the slider sits on the number
  // of layers playing; the label shows where it's heading ("auto 2 → 5") until it gets there.
  // `muted`: how many of the layers are muted (M); shown apart. Pace: on auto, the slider
  // and label follow the pace the composer is using (`pace`).
  sync(bpm, playing, target, muted = 0, pace = null) {
    if (pace != null && this.settings.get('paceAuto')) {
      const label = `auto: ${pace} bars`;
      if (this.paceVal.html() !== label) {
        this.paceVal.html(label);
        const k = ControlPanel.PACE_STEPS.indexOf(pace);
        if (k >= 0) this.pace.value(k);
      }
    }
    if (playing != null) {
      const auto = this.settings.get('densityAuto');
      const count = (playing === target ? `${playing}` : `${playing} → ${target}`) + (muted ? ` (${muted} M)` : '');
      const label = auto ? `auto ${count}` : `${count} camada${target === 1 ? '' : 's'}`;
      if (this.denVal.html() !== label) this.denVal.html(label);
      if (auto && +this.density.value() !== playing) this.density.value(playing);
    }
    if (!this.settings.get('bpmAuto')) return;
    // only what changed: writing to the page every frame made the browser lay it out again
    // every frame (and the notes' scheduler waited)
    const label = `${bpm.toFixed(1)} bpm`;
    if (label === this.tempoShown) return;
    this.tempoShown = label;
    this.tempo.value(Math.round(bpm));
    this.tempoVal.html(label);
  }
};
