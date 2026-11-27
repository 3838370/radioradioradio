import { MathUtil } from '../core/MathUtil.js';

// Bus: one per layer. input (level) -> crush -> wobble -> lowpass -> mute -> out (fades)
// -> dry, plus reverb and delay sends.
export class Bus {
  static CRUSH_RANGE = 4;

  constructor(ac, id, { dry, reverb, delay }) {
    this.ac = ac;
    this.id = id;
    this.crushAmount = 0;
    this.code = { lpf: 20000, res: 0.7, rev: 0, delay: 0, amp: 1, wobble: 0, crush: 0 };
    this.mod = Object.assign({}, Bus.NEUTRAL);
    this.pinned = new Set();

    this.input = ac.createGain();
    // The crusher works on the signal scaled down by CRUSH_RANGE (and back up after), so
    // loud hits never reach the edge of the waveshaper curve and clip.
    this.crushIn = ac.createGain();
    this.crushIn.gain.value = 1 / Bus.CRUSH_RANGE;
    this.crusher = ac.createWaveShaper();
    this.crushOut = ac.createGain();
    this.crushOut.gain.value = Bus.CRUSH_RANGE;
    this.wobbleDelay = ac.createDelay(0.05);
    this.wobbleDelay.delayTime.value = 0.01;
    this.wobbleLfo = ac.createOscillator();
    this.wobbleLfo.frequency.value = 0.18 + Math.random() * 0.2;
    this.wobbleDepth = ac.createGain();
    this.wobbleDepth.gain.value = 0;
    this.wobbleLfo.connect(this.wobbleDepth);
    this.wobbleDepth.connect(this.wobbleDelay.delayTime);
    this.wobbleLfo.start();
    this.lpf = ac.createBiquadFilter();
    this.lpf.type = 'lowpass';
    this.lpf.frequency.value = 20000;
    this.lpf.Q.value = 0.7;
    this.mute = ac.createGain();
    this.out = ac.createGain();
    this.out.gain.value = 0;
    this.rev = ac.createGain();
    this.rev.gain.value = 0;
    this.del = ac.createGain();
    this.del.gain.value = 0;

    this.input.connect(this.crushIn);
    this.crushIn.connect(this.crusher);
    this.crusher.connect(this.crushOut);
    this.crushOut.connect(this.wobbleDelay);
    this.wobbleDelay.connect(this.lpf);
    this.lpf.connect(this.mute);
    this.mute.connect(this.out);
    this.out.connect(dry);
    this.out.connect(this.rev);
    this.out.connect(this.del);
    this.rev.connect(reverb);
    this.del.connect(delay);
  }

  // The value of each parameter is the code's value (top-level fx line or fx() inside a
  // loop) combined with a modulation from the Automation (auto mode and effect pads):
  //   lpf * lpfMul, amp * ampMul, res + resAdd, rev + revAdd, delay + delayAdd, ...
  static NEUTRAL = { lpfMul: 1, ampMul: 1, resAdd: 0, revAdd: 0, delayAdd: 0, wobbleAdd: 0, crushAdd: 0 };

  // fx: { lpf, res, rev, delay, amp, wobble (0..1 pitch drift), crush (0..1 bit reduction) }
  setFx(fx, time = this.ac.currentTime) {
    for (const k of Object.keys(this.code)) if (fx[k] != null && !this.pinned.has(k)) this.code[k] = +fx[k];
    this.apply(time);
  }

  // A value set by hand on the sound panel: from now on the code's own fx() calls (e.g. a
  // filter sweep inside a loop) no longer move this parameter.
  pin(key, value, time = this.ac.currentTime) {
    this.pinned.add(key);
    this.code[key] = +value;
    this.apply(time);
  }

  setMod(mod, time = this.ac.currentTime) {
    Object.assign(this.mod, mod);
    this.apply(time);
  }

  // What is actually playing (shown by the sound panel's sliders).
  effective() {
    const clamp = MathUtil.clamp, c = this.code, m = this.mod;
    return {
      lpf: clamp(c.lpf * m.lpfMul, 40, 20000),
      res: clamp(c.res + m.resAdd, 0.1, 20),
      rev: clamp(c.rev + m.revAdd, 0, 1),
      delay: clamp(c.delay + m.delayAdd, 0, 0.9),
      amp: clamp(c.amp * m.ampMul, 0, 2),
      wobble: clamp(c.wobble + m.wobbleAdd, 0, 1),
      crush: clamp(c.crush + m.crushAdd, 0, 1),
    };
  }

  apply(time) {
    const e = this.effective();
    this.lpf.frequency.setTargetAtTime(e.lpf, time, 0.05);
    this.lpf.Q.setTargetAtTime(e.res, time, 0.05);
    this.rev.gain.setTargetAtTime(e.rev, time, 0.1);
    this.del.gain.setTargetAtTime(e.delay, time, 0.1);
    this.input.gain.setTargetAtTime(e.amp, time, 0.1);
    this.wobbleDepth.gain.setTargetAtTime(e.wobble * 0.0045, time, 0.2);
    this.setCrush(e.crush);
  }

  // A subtle grit: crush 1 is 8-bit, 0.3 about 13.6-bit. (It used to go down to 4-bit.)
  setCrush(amount) {
    if (Math.abs(amount - this.crushAmount) < 0.02 && (amount > 0) === (this.crushAmount > 0)) return;
    this.crushAmount = amount;
    if (amount <= 0) { this.crusher.curve = null; return; }
    const levels = Math.pow(2, 16 - amount * 8);
    const curve = new Float32Array(8192);
    for (let k = 0; k < curve.length; k++) {
      const v = ((k / (curve.length - 1)) * 2 - 1) * Bus.CRUSH_RANGE;
      curve[k] = Math.round(v * levels) / levels / Bus.CRUSH_RANGE;
    }
    this.crusher.curve = curve;
  }

  fade(to, seconds, time = this.ac.currentTime) {
    const g = this.out.gain;
    g.cancelScheduledValues(time);
    g.setValueAtTime(g.value, time);
    g.linearRampToValueAtTime(to, time + Math.max(0.01, seconds));
  }

  setMuted(muted, time = this.ac.currentTime) {
    this.muted = !!muted; // (a muted kick doesn't duck the mix)
    this.mute.gain.setTargetAtTime(muted ? 0 : 1, time, 0.15);
  }

  dispose() {
    this.wobbleLfo.stop();
    for (const n of [this.input, this.crushIn, this.crusher, this.crushOut, this.wobbleDelay, this.wobbleLfo, this.wobbleDepth, this.lpf, this.mute, this.out, this.rev, this.del]) n.disconnect();
  }
};
