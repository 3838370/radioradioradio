// Settings: the listener-facing knobs. Emits 'change' with { name, value }.
RA.Settings = class Settings extends RA.Emitter {
  static DEFAULTS = {
    pace: 32,          // bars between composer moves
    paceAuto: true,    // the composer alternates short and long paces by itself
    freeze: false,     // no moves at all
    variation: 0.3,    // 0 = tiny nudges only, 1 = big swings and swaps
    density: 5,        // max simultaneous layers
    densityAuto: true, // the arc shapes the layer count (sparse ... tension)
    delayBeats: 0.75,  // master delay time in beats (0.75 = dotted 1/8)
    delayAuto: true,   // the composer changes the delay time now and then, gliding
    feedback: 0.42,    // master delay feedback
    glide: 0.4,        // seconds a delay-time change takes (pitch-bending echoes)
    fxAuto: 0.4,       // how often the composer fires effect pads by itself
    layerAuto: true,   // master switch for the layers' automatic sound settings
    bpmAuto: true,
    bpm: 116,
    key: 'auto',       // 'auto' or a pitch class 0..11
    mode: 'auto',      // 'auto' or a mode name
    steps: 'auto',     // 'auto' or a loop cycle in 16th steps (16, 12, 20...) the patterns should have
    volume: 0.8,
    styles: null,      // the moods allowed to play (array of names); null = all
    eq: null,          // master EQ { low, lomid, himid, high: { f, g } }; null = flat
  };

  constructor(overrides = {}) {
    super();
    this.values = Object.assign({}, Settings.DEFAULTS, overrides);
  }

  get(name) { return this.values[name]; }

  set(name, value) {
    if (this.values[name] === value) return;
    this.values[name] = value;
    this.emit('change', { name, value });
  }
};
