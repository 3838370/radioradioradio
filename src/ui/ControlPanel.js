// ControlPanel: the HTML control strip (p5 DOM helpers). It only writes to Settings;
// the composer and app react to the change events.
RA.ControlPanel = class ControlPanel {
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

    let g = this.group('pace', 'how often the composer changes something');
    const pace = p.createSlider(0, S.length - 1, S.indexOf(settings.get('pace')), 1).parent(g);
    const paceVal = this.valueLabel(g);
    const showPace = () => paceVal.html(`every ${S[pace.value()]} bars`);
    pace.input(() => { settings.set('pace', S[pace.value()]); showPace(); });
    showPace();
    this.checkbox(g, 'freeze', settings.get('freeze'), (v) => settings.set('freeze', v));

    g = this.group('variation', 'how big each change is');
    const variation = p.createSlider(0, 100, settings.get('variation') * 100, 1).parent(g);
    const varVal = this.valueLabel(g);
    const showVar = () => varVal.html(`${variation.value()}%`);
    variation.input(() => { settings.set('variation', variation.value() / 100); showVar(); });
    showVar();

    // One layer per role, so at most PatternBank.ROLES.length (6).
    g = this.group('density', 'number of layers playing; auto: the arc moves between sparse and full. "2 → 5": 2 playing, heading for 5');
    this.density = p.createSlider(1, RA.PatternBank.ROLES.length, settings.get('density'), 1).parent(g);
    this.denVal = this.valueLabel(g);
    // Moving the slider takes over from auto and holds that many layers.
    this.density.input(() => {
      settings.set('density', this.density.value());
      if (settings.get('densityAuto')) { settings.set('densityAuto', false); this.denAuto.checked(false); }
    });
    this.denVal.html(settings.get('densityAuto') ? 'auto' : `${this.density.value()} layers`);
    // Turning auto off holds the count it had chosen.
    this.denAuto = this.checkbox(g, 'auto', settings.get('densityAuto'), (v) => {
      if (!v) settings.set('density', +this.density.value());
      settings.set('densityAuto', v);
    });

    g = this.group('tempo', 'BPM; auto follows the mood');
    this.tempo = p.createSlider(60, 180, settings.get('bpm'), 1).parent(g);
    this.tempoVal = this.valueLabel(g);
    // Like density: moving the slider takes over from auto.
    this.tempo.input(() => {
      settings.set('bpm', this.tempo.value());
      if (settings.get('bpmAuto')) { settings.set('bpmAuto', false); this.tempoAuto.checked(false); }
      this.tempoVal.html(`${this.tempo.value()} bpm`);
    });
    this.tempoAuto = this.checkbox(g, 'auto', settings.get('bpmAuto'), (v) => {
      if (!v) settings.set('bpm', +this.tempo.value());
      settings.set('bpmAuto', v);
    });

    // The loops' cycle in 16th steps: 16 is a bar (4, 8, 32 line up with it); the others
    // are the odd IDM cycles in the bank. Auto: whatever the patterns bring.
    g = this.group('steps', 'loop cycle in 16th steps; the radio prefers patterns with that cycle');
    const steps = p.createSelect().parent(g);
    steps.option('auto', 'auto');
    for (const n of ControlPanel.STEPS) steps.option(String(n), String(n));
    steps.selected(String(settings.get('steps')));
    steps.changed(() => settings.set('steps', steps.value() === 'auto' ? 'auto' : +steps.value()));

    g = this.group('key', 'auto changes key with the mood');
    const key = p.createSelect().parent(g);
    key.option('auto', 'auto');
    ControlPanel.KEYS.forEach((k, i) => key.option(k, String(i)));
    key.selected(String(settings.get('key')));
    key.changed(() => settings.set('key', key.value() === 'auto' ? 'auto' : +key.value()));
    const mode = p.createSelect().parent(g);
    mode.option('auto', 'auto');
    for (const m of RA.Harmony.MODES) mode.option(m, m);
    mode.selected(settings.get('mode'));
    mode.changed(() => settings.set('mode', mode.value()));

    g = this.group('volume', 'master volume');
    const vol = p.createSlider(0, 100, settings.get('volume') * 100, 1).parent(g);
    vol.input(() => settings.set('volume', vol.value() / 100));
  }

  addButton(label, onClick) {
    const b = this.p.createButton(label).addClass('btn').parent(this.root);
    b.mousePressed(onClick);
    return b;
  }

  // Keeps the sliders showing what's live. Density: on auto the slider sits on the number
  // of layers playing; the label shows where it's heading ("auto 2 → 5") until it gets there.
  sync(bpm, playing, target) {
    if (playing != null) {
      const auto = this.settings.get('densityAuto');
      const count = playing === target ? `${playing}` : `${playing} → ${target}`;
      const label = auto ? `auto ${count}` : `${count} layer${target === 1 ? '' : 's'}`;
      if (this.denVal.html() !== label) this.denVal.html(label);
      if (auto && +this.density.value() !== playing) this.density.value(playing);
    }
    if (!this.settings.get('bpmAuto')) return;
    this.tempo.value(Math.round(bpm));
    this.tempoVal.html(`${bpm.toFixed(1)} bpm`);
  }
};
