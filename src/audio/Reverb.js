// Reverb: an algorithmic (Freeverb-style) stereo reverb built from native nodes:
// 8 damped feedback combs in parallel, then 4 allpass diffusers, per channel (the right
// channel's delays are slightly longer for width).
//
// It replaces p5.Reverb, whose 6-second ConvolverNode caused ~20% audio underruns
// (crackling) in real time: Chrome computes long convolution tails on a background thread
// that couldn't keep up here. This runs entirely on the audio thread at ~4% of one core,
// with a ~3 s tail.
RA.Reverb = class Reverb {
  static COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]; // samples at 44.1 kHz
  static ALLPASS = [556, 441, 341, 225];
  static SPREAD = 23;
  static SCALE = 1.6;   // longer than classic Freeverb, for ambient tails
  static ALLPASS_GAIN = 0.5;
  static LEVEL = 0.37;  // matches the loudness of the old p5.Reverb(6, 2.2), measured

  constructor(ac, { size = 0.9, damp = 3200 } = {}) {
    this.ac = ac;
    this.input = ac.createGain();
    this.output = ac.createGain();
    this.output.gain.value = Reverb.LEVEL;
    this.feedbacks = [];
    this.dampers = [];
    const merger = ac.createChannelMerger(2);
    for (let side = 0; side < 2; side++) this.channel(side).connect(merger, 0, side);
    merger.connect(this.output);
    this.setSize(size);
    this.setDamp(damp);
  }

  seconds(samples, side) {
    return ((samples + side * Reverb.SPREAD) / 44100) * Reverb.SCALE;
  }

  // One channel: parallel combs summed, then the allpass chain. Returns its output node.
  channel(side) {
    const ac = this.ac;
    const sum = ac.createGain();
    sum.gain.value = 1 / Reverb.COMBS.length;
    for (const c of Reverb.COMBS) {
      const delay = ac.createDelay(1);
      delay.delayTime.value = this.seconds(c, side);
      const damp = ac.createBiquadFilter();
      damp.type = 'lowpass';
      // Q is in dB for lowpass; anything near 0 dB peaks above unity gain and, inside a
      // 0.9 feedback loop, makes the comb grow instead of decay. -6 dB has no peak.
      damp.Q.value = -6;
      const fb = ac.createGain();
      this.input.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      delay.connect(sum);
      this.feedbacks.push(fb);
      this.dampers.push(damp);
    }
    let node = sum;
    for (const a of Reverb.ALLPASS) node = this.allpass(node, this.seconds(a, side));
    return node;
  }

  // Schroeder allpass: y = -g*x + d,  d = delay(x + g*y)
  allpass(source, seconds) {
    const ac = this.ac, g = Reverb.ALLPASS_GAIN;
    const into = ac.createGain();
    const delay = ac.createDelay(1);
    delay.delayTime.value = seconds;
    const out = ac.createGain();
    const direct = ac.createGain();
    direct.gain.value = -g;
    const back = ac.createGain();
    back.gain.value = g;
    source.connect(into);
    source.connect(direct);
    into.connect(delay);
    delay.connect(out);
    direct.connect(out);
    out.connect(back);
    back.connect(into);
    return out;
  }

  // 0..0.97: tail length (comb feedback).
  setSize(size, time = this.ac.currentTime) {
    const g = RA.MathUtil.clamp(size, 0, 0.97);
    for (const fb of this.feedbacks) fb.gain.setTargetAtTime(g, time, 0.1);
  }

  // Lowpass inside the loop: lower = darker tail.
  setDamp(freq, time = this.ac.currentTime) {
    for (const d of this.dampers) d.frequency.setTargetAtTime(freq, time, 0.1);
  }
};
