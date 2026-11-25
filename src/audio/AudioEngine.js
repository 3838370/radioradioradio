// AudioEngine: the master chain and the voice pool.
//   layer buses -> mix (dry) -> duck -> TapeFx -> master lowpass -> EQ -> compressor -> output
//   reverb / delay returns -> wet -> TapeFx          (so ducking the dry keeps the echoes)
//   mix -> throwSend -> delay, mix -> washSend -> reverb  (whole-mix sends for the FX pads)
// The FxRack drives the sends, returns, delay and master filter. A 'preview' bus plays
// auditions from the side panel. Effects and analysis are p5.sound objects; voices are
// native nodes on the same context.
RA.AudioEngine = class AudioEngine {
  constructor(ac, samples, instruments) {
    this.ac = ac;
    this.samples = samples;
    this.instruments = instruments;
    this.buses = new Map();
    this.voices = 0;
    this.maxVoices = 80;
    this.stats = { samples: 0, notes: 0, dropped: 0, missing: 0 };

    this.comp = new p5.Compressor();
    this.comp.set(0.01, 12, 2.5, -10, 0.3); // gentle glue, not squashing
    this.master = new p5.Filter('lowpass');
    this.master.biquad.frequency.value = 20000;
    this.master.biquad.Q.value = 0.7;
    this.eq = new RA.Equalizer(ac);
    this.master.disconnect();
    this.master.connect(this.eq.input);
    this.eq.output.connect(this.comp.input);

    this.tape = new RA.TapeFx(ac);
    this.tape.connect(this.master);
    // 0.6 = headroom: several layers at once shouldn't hit the soft clip hard
    this.mix = ac.createGain();
    this.mix.gain.value = 0.6;
    this.duck = ac.createGain();
    this.mix.connect(this.duck);
    this.duck.connect(this.tape.input);
    this.wet = ac.createGain();
    this.wet.gain.value = 0.6;
    this.wet.connect(this.tape.input);

    this.revReturn = ac.createGain();
    this.revReturn.connect(this.wet);
    this.reverb = new RA.Reverb(ac);
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
    const bus = new RA.Bus(this.ac, id, { dry: this.mix, reverb: this.reverb.input, delay: this.delayIn });
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
    const loaded = this.samples.get(name, opts.n || 0);
    if (!loaded) { this.stats.missing++; return false; }
    if (!this.claimVoice()) return false;
    const buffer = opts.reverse ? this.samples.reversed(loaded) : loaded;
    new RA.SampleVoice(this.ac, buffer, opts).start(time, bus.input, () => this.voices--);
    this.stats.samples++;
    return true;
  }

  playSynth(busId, presetName, midi, opts, time) {
    const bus = this.bus(busId);
    if (!bus) return false;
    const preset = this.instruments.get(presetName) || this.instruments.get('keys');
    if (!this.claimVoice()) return false;
    new RA.SynthVoice(this.ac, preset, midi, opts).start(time, bus.input, () => this.voices--);
    this.stats.notes++;
    return true;
  }

  claimVoice() {
    if (this.voices >= this.maxVoices) { this.stats.dropped++; return false; }
    this.voices++;
    return true;
  }
};
