import { Bus } from './Bus.js';
import { Equalizer } from './Equalizer.js';
import { Reverb } from './Reverb.js';
import { SampleVoice } from './SampleVoice.js';
import { SynthVoice } from './SynthVoice.js';
import { SoundFields } from './SoundFields.js';
import { Mixer, TapeMotion } from './Mixer.js';
import { MathUtil } from '../core/MathUtil.js';

// AudioEngine: the master chain and the voice pool.
//   layer buses -> Mixer groups (drums | bass | music: low cut, kick sidechain) -> mix
//   mix -> duck -> tape motion -> master lowpass -> EQ -> glue compressor
//       -> Mixer end (low cut 30 Hz, limiter, ceiling -1 dB, meter) -> output
//   reverb / delay returns -> wet -> tape motion       (so ducking the dry keeps the echoes)
//   mix -> throwSend -> delay, mix -> washSend -> reverb  (whole-mix sends for the FX pads)
// No tape hiss: the old TapeFx left with the clean mix; its movement (wow, vibrato, tape
// stop) stays as TapeMotion.
// The FxRack drives the sends, returns, delay and master filter. A 'preview' bus plays
// auditions from the side panel. Effects and analysis are p5.sound objects; voices are
// native nodes on the same context.
export class AudioEngine {
  constructor(ac, samples, instruments) {
    this.ac = ac;
    this.samples = samples;
    this.instruments = instruments;
    this.buses = new Map();
    this.voices = 0;
    this.maxVoices = 80;
    this.stats = { samples: 0, notes: 0, dropped: 0, missing: 0 };

    // the end of the chain goes to p5's master (its volume and mute), or straight out
    const out = (typeof p5 !== 'undefined' && p5.soundOut && p5.soundOut.input) || ac.destination;
    this.mixer = new Mixer(ac, out);
    this.comp = new p5.Compressor();
    this.comp.set(0.01, 12, 2.5, -10, 0.3); // gentle glue, not squashing
    this.comp.disconnect();
    this.comp.connect(this.mixer.input);
    this.master = new p5.Filter('lowpass');
    this.master.biquad.frequency.value = 20000;
    this.master.biquad.Q.value = 0.7;
    this.eq = new Equalizer(ac);
    this.master.disconnect();
    this.master.connect(this.eq.input);
    this.eq.output.connect(this.comp.input);

    this.tape = new TapeMotion(ac);
    this.tape.connect(this.master);
    // 0.6 = headroom: several layers at once shouldn't drive the limiter hard
    this.mix = this.mixer.sum;
    this.mix.gain.value = 0.6;
    this.duck = ac.createGain();
    this.mix.connect(this.duck);
    this.duck.connect(this.tape.input);
    this.wet = ac.createGain();
    this.wet.gain.value = 0.6;
    this.wet.connect(this.tape.input);

    this.revReturn = ac.createGain();
    this.revReturn.connect(this.wet);
    this.reverb = new Reverb(ac);
    this.reverb.output.connect(this.revReturn);

    this.delReturn = ac.createGain();
    this.delReturn.connect(this.wet);
    this.delayIn = ac.createGain();
    this.delay = new p5.Delay();
    this.delay.process(this.delayIn, 0.4, 0.42, 2200);
    this.delay.drywet(1);
    this.delay.disconnect();
    this.delay.connect(this.delReturn);

    this.throwSend = ac.createGain();
    this.throwSend.gain.value = 0;
    this.mix.connect(this.throwSend);
    this.throwSend.connect(this.delayIn);
    this.washSend = ac.createGain();
    this.washSend.gain.value = 0;
    this.mix.connect(this.washSend);
    this.washSend.connect(this.reverb.input);

    this.fft = new p5.FFT(0.85, 256);
    this.createBus('preview').fade(1, 0.01);
  }

  // Plays a sample now on the preview bus, loading it first if needed.
  async audition(name, n, opts = {}) {
    const buffer = await this.samples.ensure(name, n);
    if (!buffer) return false;
    return this.playSample('preview', name, Object.assign({ n }, opts), this.ac.currentTime + 0.03);
  }

  auditionSynth(presetName, notes, opts = {}) {
    const t = this.ac.currentTime + 0.03;
    for (const n of notes) this.playSynth('preview', presetName, n, opts, t);
  }

  createBus(id) {
    const bus = new Bus(this.ac, id, { dry: this.mixer.inputFor(id), reverb: this.reverb.input, delay: this.delayIn });
    this.buses.set(id, bus);
    return bus;
  }

  bus(id) { return this.buses.get(id) || null; }

  dropBus(id) {
    const bus = this.buses.get(id);
    if (!bus) return;
    bus.dispose();
    this.buses.delete(id);
  }

  // Late events of a removed layer find no bus and are ignored.
  playSample(busId, name, opts, time) {
    const bus = this.bus(busId);
    if (!bus) return false;
    if (Mixer.KICK_FOLDERS.has(name)) this.kick(bus, time);
    // A sample rebuilt in code (a sound that says "substitui: folder:n") always plays as code;
    // its file is never loaded. Only the INSTRUMENTOS panel's ▶ original / A/B ask for the
    // file (original: true), to compare. Samples with no sound in code play their file.
    if (!opts.original) {
      const coded = this.codedFor(name, opts.n);
      if (coded) return this.playCoded(bus, coded, opts, time);
    }
    const loaded = this.samples.get(name, opts.n || 0);
    if (!loaded) { this.stats.missing++; return false; }
    if (!this.claimVoice()) return false;
    const buffer = opts.reverse ? this.samples.reversed(loaded) : loaded;
    new SampleVoice(this.ac, buffer, opts).start(time, bus.input, () => this.voices--);
    this.stats.samples++;
    return true;
  }

  playSynth(busId, presetName, midi, opts, time) {
    const bus = this.bus(busId);
    if (!bus) return false;
    const preset = this.instruments.get(presetName) || this.instruments.get('keys');
    if (!this.claimVoice()) return false;
    const info = this.instruments.info && this.instruments.info(presetName);
    if (info && info.group === 'bombos') this.kick(bus, time);
    this.startPreset(preset, midi, opts, time, bus.input);
    this.stats.notes++;
    return true;
  }

  // A kick that is heard (not muted, not on the preview bus) ducks the music and the bass.
  kick(bus, time) {
    if (bus.id !== 'preview' && !bus.muted) this.mixer.kick(time);
  }

  // A preset may be one voice or layers of voices (drums: a body, noise bands...), each
  // layer at its own `transpose` and starting `at` seconds in. One pool voice for the whole.
  startPreset(preset, midi, opts, time, destination) {
    const layers = preset.layers || [preset];
    let left = layers.length;
    const done = () => { if (--left === 0) this.voices--; };
    for (const l of layers) new SynthVoice(this.ac, l, midi + (l.transpose || 0), opts).start(time + (l.at || 0), destination, done);
  }

  // The sound (its recipe) that plays instead of sample folder:n, or null. A sound says
  // which sample it rebuilds in its file ("// substitui: 808bd:5").
  codedFor(name, n) {
    const k = MathUtil.mod(Math.floor(n) || 0, Math.max(1, this.samples.count(name)));
    const sound = this.instruments.replacing(`${name}:${k}`);
    return sound ? this.instruments.get(sound) : null;
  }

  // A coded sample with the sample's options, played as the file would be:
  //   rate     faster and higher together (SoundFields.atRate: times shorter, filters and
  //            noise bands up, the notes up 12·log2(rate) semitones)
  //   amp/pan  as given; the recipes carry the original's loudness (played at amp 0.5 they
  //            peak as the file does)
  //   cut      stops it there; attack / release: the fade in and out, as on the file
  playCoded(bus, recipe, o, time) {
    if (!this.claimVoice()) return false;
    const { preset, midi, opts } = AudioEngine.codedNote(recipe, o);
    this.startPreset(preset, midi, opts, time, bus.input);
    this.stats.samples++;
    return true;
  }

  // What playCoded plays: { preset, midi, opts } (also used by the sound review in Scripts).
  static codedNote(recipe, o = {}) {
    const rate = Math.abs(o.rate == null ? 1 : +o.rate) || 1;
    const opts = { amp: 0.5 * (o.amp == null ? 1 : +o.amp), pan: o.pan };
    if (o.attack) opts.attack = +o.attack;
    if (o.cut) Object.assign(opts, { dur: Math.max(0.005, +o.cut - 0.02), release: Math.min(o.release == null ? 0.02 : +o.release, +o.cut / 2) });
    const cache = AudioEngine.rated.get(recipe) || new Map();
    AudioEngine.rated.set(recipe, cache);
    if (!cache.has(rate)) cache.set(rate, SoundFields.atRate(recipe, rate));
    return { preset: cache.get(rate), midi: 60 + 12 * Math.log2(rate), opts };
  }

  static rated = new WeakMap(); // recipe -> rate -> the recipe at that rate

  claimVoice() {
    if (this.voices >= this.maxVoices) { this.stats.dropped++; return false; }
    this.voices++;
    return true;
  }
};
