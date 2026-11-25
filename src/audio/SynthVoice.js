// SynthVoice: one note, built from native nodes on p5.sound's AudioContext.
//   oscillators (+unison, FM, vibrato, drift, pitch envelope) -> drive -> filter (+envelope,
//   LFO) -> tremolo -> amp envelope -> pan -> destination
//
// Preset fields (all optional except osc, gain):
//   osc: [{ type: sine|triangle|sawtooth|square|noise, octave, detune, level, fm, unison }]
//     fm: { ratio, index, decay }       unison: { voices, spread (cents) }
//   attack, dur, release (s), gain, drift (cents)
//   cutoff, res, ftype (lowpass|bandpass|highpass), fenv (start multiplier), fdecay (s)
//   flfo: { rate, depth (cents) }       filter wobble
//   trem: { rate, depth (0..1) }        amplitude wobble
//   vibrato: { rate, depth (cents), delay }
//   pitch: { from (semitones), time (s) }   pitch envelope: + drops into the note (kicks,
//                                           lasers), - rises into it (hoover)
//   drive: 0..1                         saturation before the filter: fat, loud synths
//   decay (s), sustain (0..1)           amp falls from the peak to sustain*peak while held
//                                       (sustain 0 + long decay = a struck string)
//   veltrack: 0..1                      opts.vel opens the filter (soft notes are darker)
//   keytrack: 0..1                      the filter follows the pitch (1 = fully)
//   per osc: ratio (frequency multiple, inharmonic partials), decay (s) the partial fades
// Note options: amp, vel (0..1, also scales amp), dur, attack, release, cutoff, res, pan
RA.SynthVoice = class SynthVoice {
  static noiseBuffers = new WeakMap();
  static driveCurves = new Map();
  // Scales every note's random drift and its own detune (Settings: detune; 0 = in tune).
  static detuneScale = 1;

  static noise(ac) {
    let b = SynthVoice.noiseBuffers.get(ac);
    if (!b) {
      b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = b.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      SynthVoice.noiseBuffers.set(ac, b);
    }
    return b;
  }

  // tanh drive, normalised so a full-scale input stays full scale.
  static driveCurve(amount) {
    const key = Math.round(amount * 20);
    let c = SynthVoice.driveCurves.get(key);
    if (!c) {
      const k = 1 + key * 1.2, n = 1024;
      c = new Float32Array(n);
      for (let i = 0; i < n; i++) c[i] = Math.tanh(k * ((i / (n - 1)) * 2 - 1)) / Math.tanh(k);
      SynthVoice.driveCurves.set(key, c);
    }
    return c;
  }

  constructor(ac, preset, midi, opts = {}) {
    this.ac = ac;
    this.P = preset;
    this.midi = midi;
    this.o = opts;
    this.nodes = [];
  }

  start(time, destination, onEnd) {
    const { ac, P, o } = this;
    const clamp = RA.MathUtil.clamp;
    const drift = (Math.random() * 2 - 1) * (P.drift || 0) * SynthVoice.detuneScale;
    const freq = 440 * Math.pow(2, (this.midi - 69) / 12);
    const vel = o.vel == null ? 1 : clamp(+o.vel, 0, 1.5);
    const amp = clamp(o.amp == null ? 0.5 : +o.amp, 0, 2) * P.gain * vel;
    const atk = Math.max(0.001, o.attack == null ? P.attack : o.attack);
    const rel = Math.max(0.01, o.release == null ? P.release : o.release);
    const hold = Math.max(0, o.dur == null ? (P.dur == null ? 0.2 : P.dur) : o.dur);
    const releaseAt = time + atk + hold;
    const end = releaseAt + rel * 1.5;

    const env = this.node(ac.createGain());
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(amp, time + atk);
    let held = amp;
    if (P.decay) {
      const sus = amp * clamp(P.sustain == null ? 0 : P.sustain, 0, 1);
      env.gain.setTargetAtTime(sus, time + atk, P.decay / 3);
      held = sus + (amp - sus) * Math.exp(-hold / (P.decay / 3));
    }
    env.gain.setValueAtTime(held, releaseAt);
    env.gain.setTargetAtTime(0, releaseAt, rel / 4);

    const filt = this.node(ac.createBiquadFilter());
    filt.type = P.ftype || 'lowpass';
    filt.Q.value = o.res == null ? P.res : clamp(+o.res, 0.1, 25);
    let cutoff = o.cutoff == null ? P.cutoff : +o.cutoff;
    if (P.veltrack) cutoff *= Math.pow(2, P.veltrack * 2.5 * (vel - 0.8));
    if (P.keytrack) cutoff *= Math.pow(2, P.keytrack * (this.midi - 60) / 12);
    cutoff = clamp(cutoff, 40, 18000);
    if (P.fenv) {
      filt.frequency.setValueAtTime(clamp(cutoff * P.fenv, 40, 18000), time);
      filt.frequency.setTargetAtTime(cutoff, time + 0.002, P.fdecay / 3);
    } else {
      filt.frequency.value = cutoff;
    }
    if (P.flfo) this.lfo(P.flfo.rate, P.flfo.depth, time, end).connect(filt.detune);

    let post = filt;
    if (P.trem) {
      const trem = this.node(ac.createGain());
      trem.gain.value = 1 - P.trem.depth / 2;
      this.lfo(P.trem.rate, P.trem.depth / 2, time, end).connect(trem.gain);
      filt.connect(trem);
      post = trem;
    }
    const pan = this.node(ac.createStereoPanner());
    pan.pan.value = clamp(+o.pan || 0, -1, 1);
    post.connect(env);
    env.connect(pan);
    pan.connect(destination);

    let input = filt;
    if (P.drive) {
      const shaper = this.node(ac.createWaveShaper());
      shaper.curve = SynthVoice.driveCurve(P.drive);
      shaper.connect(filt);
      input = shaper;
    }

    const vib = P.vibrato ? this.vibrato(P.vibrato, time, end) : null;
    // Partials that fade (spec.decay) stop once inaudible; cleanup waits for the last one.
    let last = null;
    for (const spec of P.osc) {
      const stop = spec.decay ? Math.min(end, time + spec.decay * 2.5) : end;
      for (const src of this.sources(spec, freq, drift, vib, time, stop)) {
        src.connect(input);
        if (!last || stop > last.stop) last = { node: src.node, stop };
      }
    }
    last.node.onended = () => {
      for (const n of this.nodes) n.disconnect();
      onEnd();
    };
  }

  // One oscillator spec -> one or more running sources (unison), each behind a level gain.
  sources(spec, freq, drift, vib, time, end) {
    const { ac, P } = this;
    const out = [];
    const level = spec.level == null ? 1 : spec.level;
    if (spec.type === 'noise') {
      const src = this.node(ac.createBufferSource());
      src.buffer = SynthVoice.noise(ac);
      src.loop = true;
      const g = this.node(ac.createGain());
      this.level(g, level, spec, time);
      src.connect(g);
      src.start(time, Math.random() * 1.5);
      src.stop(end);
      return [{ node: src, connect: (n) => g.connect(n) }];
    }
    const voices = spec.unison ? spec.unison.voices : 1;
    const spread = spec.unison ? spec.unison.spread : 0;
    for (let v = 0; v < voices; v++) {
      const osc = this.node(ac.createOscillator());
      osc.type = spec.type;
      osc.frequency.value = freq * Math.pow(2, spec.octave || 0) * (spec.ratio || 1);
      const offset = voices > 1 ? (v / (voices - 1) - 0.5) * 2 * spread : 0;
      // o.detune: this note's own detune in cents (melody() drift and probability styles)
      const base = (spec.detune || 0) + drift + offset + (+this.o.detune || 0) * SynthVoice.detuneScale;
      if (P.pitch) {
        osc.detune.setValueAtTime(base + P.pitch.from * 100, time);
        osc.detune.setTargetAtTime(base, time, P.pitch.time / 3);
      } else {
        osc.detune.value = base;
      }
      if (vib) vib.connect(osc.detune);
      const g = this.node(ac.createGain());
      this.level(g, level / Math.sqrt(voices), spec, time);
      osc.connect(g);
      if (spec.fm) this.fm(spec.fm, freq, osc, time, end);
      osc.start(time);
      osc.stop(end);
      out.push({ node: osc, connect: (n) => g.connect(n) });
    }
    return out;
  }

  // A partial's level, fading out over spec.decay when given (hammer noise, bright overtones).
  level(g, value, spec, time) {
    if (!spec.decay) { g.gain.value = value; return; }
    g.gain.setValueAtTime(value, time);
    g.gain.setTargetAtTime(0, time, spec.decay / 3);
  }

  node(n) {
    this.nodes.push(n);
    return n;
  }

  lfo(rate, depth, time, end) {
    const osc = this.node(this.ac.createOscillator());
    osc.frequency.value = rate * (0.9 + Math.random() * 0.2);
    const gain = this.node(this.ac.createGain());
    gain.gain.value = depth;
    osc.connect(gain);
    osc.start(time);
    osc.stop(end);
    return gain;
  }

  vibrato({ rate, depth, delay = 0 }, time, end) {
    const lfo = this.node(this.ac.createOscillator());
    lfo.frequency.value = rate * (0.9 + Math.random() * 0.2);
    const gain = this.node(this.ac.createGain());
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(depth, time + delay + 0.01);
    lfo.connect(gain);
    lfo.start(time);
    lfo.stop(end);
    return gain;
  }

  fm({ ratio, index, decay }, freq, carrier, time, end) {
    const mod = this.node(this.ac.createOscillator());
    mod.frequency.value = freq * ratio;
    const depth = this.node(this.ac.createGain());
    depth.gain.setValueAtTime(freq * index, time);
    // with a decay the brightness fades to a tenth; without, it stays (FM pads, drones)
    if (decay) depth.gain.setTargetAtTime(freq * index * 0.1, time, decay / 3);
    mod.connect(depth);
    depth.connect(carrier.frequency);
    mod.start(time);
    mod.stop(end);
  }
};
