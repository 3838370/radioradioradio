// Mixer: the clean mix (grid mode, phase 3). Native Web Audio only, so it can be tested
// offline.
//
//   layer buses -> group (drums | bass | music) -> low cut -> kick sidechain -> sum
//   ... (the engine: FX duck, tape motion, master filter, EQ, glue compressor) ...
//   -> input -> low cut 30 Hz -> limiter -> ceiling (-1 dB) -> meter -> out
//
// Groups: drums and perc together; bass; keys, lead and texture as "music" (cut under
// 120 Hz, the bass and kick's room). Each kick ducks the music a little and the bass a
// touch (the engine knows when every kick plays, so the dip is exact and costs nothing).
// The ceiling is a smooth curve that never goes over -1 dB, after a fast limiter that keeps
// it from working hard.
export class Mixer {
  static GROUPS = { drums: ['drums', 'perc'], bass: ['bass'], music: ['keys', 'lead', 'texture', 'preview'] };
  static CEILING = 0.891; // -1 dBFS
  static KICK_DUCK = { music: 0.56, bass: 0.75 }; // gain at the dip (-5 dB, -2.5 dB)
  // sample folders that are kicks (when a kick plays from a file, not from code)
  static KICK_FOLDERS = new Set(['808bd', 'bd', 'clubkick', 'kicklinn', '909']);

  static ceilingCurve(n = 4096) {
    const c = Mixer.CEILING, curve = new Float32Array(n);
    for (let k = 0; k < n; k++) { const x = ((k / (n - 1)) * 2 - 1) * 4; curve[k] = c * Math.tanh(x / c); }
    return curve;
  }

  constructor(ac, out) {
    this.ac = ac;
    this.sum = ac.createGain();
    this.groups = {};
    for (const name of Object.keys(Mixer.GROUPS)) {
      const input = ac.createGain();
      const cut = ac.createBiquadFilter();
      cut.type = 'highpass';
      cut.frequency.value = name === 'music' ? 120 : 30;
      cut.Q.value = 0.707;
      const duck = ac.createGain();
      input.connect(cut);
      cut.connect(duck);
      duck.connect(this.sum);
      this.groups[name] = { input, cut, duck };
    }
    this.input = ac.createGain();
    this.cut = ac.createBiquadFilter();
    this.cut.type = 'highpass';
    this.cut.frequency.value = 30;
    this.cut.Q.value = 0.707;
    this.limiter = ac.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.1;
    this.ceiling = ac.createWaveShaper();
    this.ceiling.curve = Mixer.ceilingCurve();
    this.ceiling.oversample = '4x';
    // the shaper's input runs -4..4 over the curve: scale in by 1/4, the curve is built over 4
    this.pre = ac.createGain();
    this.pre.gain.value = 0.25;
    this.meter = ac.createAnalyser();
    this.meter.fftSize = 1024;
    this.buf = new Float32Array(this.meter.fftSize);
    this.input.connect(this.cut);
    this.cut.connect(this.limiter);
    this.limiter.connect(this.pre);
    this.pre.connect(this.ceiling);
    this.ceiling.connect(this.meter);
    this.ceiling.connect(out);
    this.peakHold = -96;
    this.peakAt = 0;
  }

  // The group a bus plays into: 'drums-3' -> drums, 'bass-1' -> bass, others -> music.
  groupOf(busId) {
    const role = String(busId).split('-')[0];
    for (const [g, roles] of Object.entries(Mixer.GROUPS)) if (roles.includes(role)) return g;
    return 'music';
  }

  inputFor(busId) { return this.groups[this.groupOf(busId)].input; }

  // A kick at `time`: the music and the bass dip and come back over ~0.15 s.
  kick(time) {
    for (const [g, depth] of Object.entries(Mixer.KICK_DUCK)) {
      const p = this.groups[g].duck.gain;
      p.setTargetAtTime(depth, time, 0.004);
      p.setTargetAtTime(1, time + 0.035, 0.07);
    }
  }

  // The output level now: { peak, rms, hold } in dBFS (peak held for 1.5 s).
  level(now = performance.now()) {
    this.meter.getFloatTimeDomainData(this.buf);
    let pk = 0, sq = 0;
    for (const v of this.buf) { const a = Math.abs(v); if (a > pk) pk = a; sq += v * v; }
    const db = (x) => (x > 1e-6 ? 20 * Math.log10(x) : -96);
    const peak = db(pk), rms = db(Math.sqrt(sq / this.buf.length));
    if (peak >= this.peakHold || now - this.peakAt > 1500) { this.peakHold = peak; this.peakAt = now; }
    return { peak, rms, hold: this.peakHold };
  }
};

// TapeMotion: what is left of the old tape colour: the movement only (wow and flutter, the
// VIBRATO pad's wobble and the TAPE STOP pad). No hiss, no saturation, no "age" filter.
export class TapeMotion {
  static BASE_DELAY = 0.012;
  static WOW = 0.0014;
  static FLUTTER = 0.00011;
  static VIBRATO = 0.0011;   // delay swing at 4.2 Hz: about ±0.5 semitone
  static STOP_TIME = 1.1;    // seconds for the tape to come to a halt

  constructor(ac) {
    this.ac = ac;
    this.input = ac.createGain();
    this.output = ac.createGain();
    this.delay = ac.createDelay(1.5); // long enough for the tape-stop slowdown
    this.delay.delayTime.value = TapeMotion.BASE_DELAY;
    this.base = TapeMotion.BASE_DELAY;
    this.stopped = false;
    this.wow = this.lfo(0.31, TapeMotion.WOW);
    this.flutter = this.lfo(6.3, TapeMotion.FLUTTER);
    this.wow.gain.connect(this.delay.delayTime);
    this.flutter.gain.connect(this.delay.delayTime);
    this.input.connect(this.delay);
    this.delay.connect(this.output);
  }

  // How much the tape moves: 1 = normal, higher = seasick (sparse sections, genre wow).
  // vibrato (the VIBRATO pad): a real ~4 Hz vibrato of about half a semitone. The base delay
  // grows with the swing, so the modulated delay never dips below zero (heard as crackles).
  setWow(mult, time = this.ac.currentTime, vibrato = false) {
    const wow = vibrato ? TapeMotion.VIBRATO : TapeMotion.WOW * mult;
    const flutter = TapeMotion.FLUTTER * Math.sqrt(mult);
    this.wow.osc.frequency.setTargetAtTime(vibrato ? 4.2 : 0.31, time, 0.15);
    this.wow.gain.gain.setTargetAtTime(wow, time, vibrato ? 0.1 : 0.3);
    this.flutter.gain.gain.setTargetAtTime(flutter, time, 0.3);
    this.base = Math.max(TapeMotion.BASE_DELAY, 0.004 + 1.25 * (wow + flutter));
    if (!this.stopped) this.delay.delayTime.setTargetAtTime(this.base, time, 0.3);
  }

  // Tape stop: the delay grows as d(t) = t²/2T, so playback speed falls smoothly from 1 to
  // 0 over T (never past 0, which would play backwards). Releasing snaps it back.
  setStop(on, time = this.ac.currentTime) {
    if (on === this.stopped) return;
    this.stopped = on;
    const p = this.delay.delayTime;
    p.cancelScheduledValues(time);
    if (on) {
      const T = TapeMotion.STOP_TIME, n = 64, curve = new Float32Array(n);
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

  connect(node) { this.output.connect(node.input || node); }
};
