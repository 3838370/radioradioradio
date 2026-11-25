// TapeFx: the always-on "old cassette" master colour: wow and flutter (a modulated short
// delay), gentle saturation, an "age" lowpass and a whisper of hiss.
// The saturation is a unity-gain tanh soft clip: transparent at normal levels, only
// rounding off peaks. (p5.Distortion's curve boosts quiet signals ~6x even at tiny
// amounts, which crushed the whole mix.)
RA.TapeFx = class TapeFx {
  static BASE_DELAY = 0.012;
  static WOW = 0.0014;
  static FLUTTER = 0.00011;
  static VIBRATO = 0.0011;   // delay swing at 4.2 Hz: about ±0.5 semitone
  static STOP_TIME = 1.1;    // seconds for the tape to come to a halt

  static softClipCurve(n = 2048) {
    const curve = new Float32Array(n);
    for (let k = 0; k < n; k++) curve[k] = Math.tanh((k / (n - 1)) * 2 - 1);
    return curve;
  }

  constructor(ac) {
    this.ac = ac;
    this.input = ac.createGain();
    this.output = ac.createGain();

    this.delay = ac.createDelay(1.5); // long enough for the tape-stop slowdown
    this.delay.delayTime.value = TapeFx.BASE_DELAY;
    this.base = TapeFx.BASE_DELAY;
    this.stopped = false;
    this.wow = this.lfo(0.31, TapeFx.WOW);
    this.flutter = this.lfo(6.3, TapeFx.FLUTTER);
    this.wow.gain.connect(this.delay.delayTime);
    this.flutter.gain.connect(this.delay.delayTime);

    this.saturation = ac.createWaveShaper();
    this.saturation.curve = TapeFx.softClipCurve();
    this.saturation.oversample = '4x';

    this.age = ac.createBiquadFilter();
    this.age.type = 'lowpass';
    this.age.frequency.value = 10500;
    this.age.Q.value = 0.5;

    this.input.connect(this.delay);
    this.delay.connect(this.saturation);
    this.saturation.connect(this.age);
    this.age.connect(this.output);
    this.hiss = this.createHiss(0.0035);
    this.hiss.connect(this.output);
  }

  // Vibrato amount: 1 = normal tape, higher = seasick (the arc's sparse sections, the
  // VIBRATO pad). The base delay grows with the swing, so the modulated delay time never
  // dips below zero (that clipping is heard as crackles).
  // `vibrato` (the VIBRATO pad) speeds the wow up to a real ~4 Hz vibrato of about half a
  // semitone instead of just deepening the slow drift.
  setWow(mult, time = this.ac.currentTime, vibrato = false) {
    const wow = vibrato ? TapeFx.VIBRATO : TapeFx.WOW * mult;
    const flutter = TapeFx.FLUTTER * Math.sqrt(mult);
    this.wow.osc.frequency.setTargetAtTime(vibrato ? 4.2 : 0.31, time, 0.15);
    this.wow.gain.gain.setTargetAtTime(wow, time, vibrato ? 0.1 : 0.3);
    this.flutter.gain.gain.setTargetAtTime(flutter, time, 0.3);
    this.base = Math.max(TapeFx.BASE_DELAY, 0.004 + 1.25 * (wow + flutter));
    if (!this.stopped) this.delay.delayTime.setTargetAtTime(this.base, time, 0.3);
  }

  // Tape stop: the delay grows as d(t) = t²/2T, so playback speed falls smoothly from 1 to
  // 0 over T (it never goes past 0, which would play backwards). Releasing snaps it back.
  setStop(on, time = this.ac.currentTime) {
    if (on === this.stopped) return;
    this.stopped = on;
    const p = this.delay.delayTime;
    p.cancelScheduledValues(time);
    if (on) {
      const T = TapeFx.STOP_TIME, n = 64, curve = new Float32Array(n);
      for (let k = 0; k < n; k++) { const s = (k / (n - 1)) * T; curve[k] = this.base + (s * s) / (2 * T); }
      p.setValueCurveAtTime(curve, time, T);
    } else {
      p.setTargetAtTime(this.base, time, 0.03);
    }
  }

  lfo(freq, depth) {
    const osc = this.ac.createOscillator();
    osc.frequency.value = freq;
    const gain = this.ac.createGain();
    gain.gain.value = depth;
    osc.connect(gain);
    osc.start();
    return { osc, gain };
  }

  createHiss(level) {
    const len = this.ac.sampleRate * 2;
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let k = 0; k < len; k++) data[k] = Math.random() * 2 - 1;
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = this.ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    const gain = this.ac.createGain();
    gain.gain.value = level;
    src.connect(hp);
    hp.connect(gain);
    src.start();
    return gain;
  }

  connect(node) { this.output.connect(node.input || node); }
};
