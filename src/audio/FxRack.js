// FxRack: effects played like instruments. Eight pads that any of three sources can hold
// on at the same time: 'hold' (mouse/key held), 'latch' (right-click toggle) and 'auto'
// (the composer or pattern code), switched with engage()/release() (on() is the inherited
// event subscription). Every change recomputes all the master FX targets from what is
// active, so pads combine and always release cleanly.
//
// It also owns the master delay: its time in beats (note values, gliding like Aphex
// Twin's pitch-bending delay changes), feedback, and the arc's long-term colour.
// Emits 'change' when pads switch.
RA.FxRack = class FxRack extends RA.Emitter {
  static PADS = [
    { id: 'throw', label: 'DELAY THROW', key: '1', hint: 'sobe o delay de todas as camadas' },
    { id: 'dub', label: 'DUB ECHO', key: '2', hint: 'sobe o delay das camadas + feedback alto, ecos escuros' },
    { id: 'warp', label: 'WARP', key: '3', hint: 'o tempo do delay salta e desliza (à Aphex)' },
    { id: 'wash', label: 'REVERB WASH', key: '4', hint: 'sobe a reverb de todas as camadas, cauda longa' },
    { id: 'sweep', label: 'FILTER', key: '5', hint: 'fecha o filtro de todas as camadas' },
    { id: 'stutter', label: 'STUTTER', key: '6', hint: 'repete 1/16 em loop' },
    { id: 'wobble', label: 'VIBRATO', key: '7', hint: 'sobe o wobble das camadas + vibrato da fita' },
    { id: 'tapestop', label: 'TAPE STOP', key: '8', hint: 'a fita abranda e para' },
  ];

  static DELAY_NOTES = [
    ['1/16', 0.25], ['1/8', 0.5], ['1/4T', 2 / 3], ['3/16', 0.75], ['1/4', 1], ['3/8', 1.5], ['1/2', 2], ['3/4', 3],
  ];

  constructor(audio, clock, settings) {
    super();
    this.audio = audio;
    this.clock = clock;
    this.settings = settings;
    this.active = new Map(); // pad id -> Set of sources
    this.xy = { cutoff: 20000, space: 1 };
    this.arc = { delay: 1, feedback: 0, wow: 1, space: 1 };
    this.warpTimer = null;
    this.syncedBpm = 0;
    settings.on('change', ({ name }) => {
      if (['delayBeats', 'feedback', 'glide'].includes(name)) this.update();
    });
    this.update();
  }

  static noteName(beats) {
    const n = FxRack.DELAY_NOTES.find(([, b]) => Math.abs(b - beats) < 0.01);
    return n ? n[0] : `${beats.toFixed(2)} beats`;
  }

  isOn(id) { const s = this.active.get(id); return !!s && s.size > 0; }

  sources(id) { return this.active.get(id) || new Set(); }

  engage(id, source) {
    if (!this.active.has(id)) this.active.set(id, new Set());
    const s = this.active.get(id);
    if (s.has(source)) return;
    s.add(source);
    this.update();
    this.emit('change', { id });
  }

  release(id, source) {
    const s = this.active.get(id);
    if (!s || !s.delete(source)) return;
    this.update();
    this.emit('change', { id });
  }

  toggle(id, source = 'latch') {
    if (this.sources(id).has(source)) this.release(id, source); else this.engage(id, source);
  }

  // A timed gesture (composer or code): on for `seconds`, then off.
  pulse(id, seconds) {
    this.engage(id, 'auto');
    clearTimeout((this.pulseTimers || (this.pulseTimers = {}))[id]);
    this.pulseTimers[id] = setTimeout(() => this.release(id, 'auto'), seconds * 1000);
  }

  autoActive() { return FxRack.PADS.some((p) => this.sources(p.id).has('auto')); }

  setXY(v) { Object.assign(this.xy, v); this.update(); }

  setArc(v) { Object.assign(this.arc, { delay: v.delay, feedback: v.feedback, wow: v.wow, space: v.space }); this.update(); }

  // Aphex-style: jump the delay to another note value; the glide bends the echoes' pitch.
  setDelayBeats(beats) { this.settings.set('delayBeats', beats); }

  // Called every bar so the delay follows tempo changes.
  syncTempo(bpm) {
    if (Math.abs(bpm - this.syncedBpm) < 0.5) return;
    this.syncedBpm = bpm;
    this.update();
  }

  update() {
    const a = this.audio, t = a.ac.currentTime, on = (id) => this.isOn(id);
    const clamp = RA.MathUtil.clamp;
    const S = this.settings;
    const spb = this.clock.spb();
    const glide = Math.max(0.01, S.get('glide'));
    const target = (param, v, tc) => param.setTargetAtTime(v, t, tc);

    const stutter = on('stutter');
    const slice = spb / 4;

    // STUTTER captures one 1/16 slice into the delay, then cuts the input and lets the
    // delay repeat it with almost no loss: a real beat-repeat, not a smeared echo.
    if (stutter && !this.wasStutter) {
      for (const d of [a.delay.leftDelay, a.delay.rightDelay]) { d.delayTime.cancelScheduledValues(t); d.delayTime.setValueAtTime(slice, t); }
      const g = a.throwSend.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(1, t);
      g.setValueAtTime(0, t + slice);
    }
    this.wasStutter = stutter;

    if (!on('warp') && !stutter) {
      const dt = clamp(S.get('delayBeats') * spb, 0.01, 0.99);
      for (const d of [a.delay.leftDelay, a.delay.rightDelay]) target(d.delayTime, dt, glide / 3);
    }
    const fb = stutter ? 0.97 : on('dub') ? 0.88 : on('warp') ? 0.6 : clamp(S.get('feedback') + this.arc.feedback, 0, 0.85);
    for (const g of [a.delay._leftGain, a.delay._rightGain]) target(g.gain, fb, 0.03);
    const dfilt = stutter ? 14000 : on('dub') ? 1100 : 2400;
    for (const f of [a.delay._leftFilter, a.delay._rightFilter]) target(f.biquad.frequency, dfilt, stutter ? 0.01 : 0.2);

    // DELAY THROW, DUB ECHO, REVERB WASH, FILTER and VIBRATO move the layers' own sends,
    // filters and wobble (see Automation), so you can watch them on the sound panel.
    // Here only their master side: WARP needs something in the delay to bend.
    if (!stutter) target(a.throwSend.gain, on('warp') ? 0.5 : 0, 0.03);
    target(a.washSend.gain, 0, 0.15);
    a.reverb.setSize(on('wash') ? 0.95 : 0.9, t);
    target(a.revReturn.gain, this.xy.space * this.arc.space, 0.15);
    target(a.delReturn.gain, this.xy.space * this.arc.delay * (on('warp') || stutter ? 1.3 : 1), 0.1);
    target(a.master.biquad.frequency, clamp(this.xy.cutoff, 60, 20000), 0.05);
    const duck = on('tapestop') ? 0 : stutter ? 0.08 : 1;
    target(a.duck.gain, duck, on('tapestop') ? 0.35 : 0.03);
    a.tape.setWow(this.arc.wow, t, on('wobble'));
    a.tape.setStop(on('tapestop'), t);

    if (on('warp') && !this.warpTimer) this.warpTimer = setInterval(() => this.warpStep(), 220);
    if (!on('warp') && this.warpTimer) { clearInterval(this.warpTimer); this.warpTimer = null; }
  }

  // While WARP is on, the delay time keeps leaping to new values and sliding there.
  warpStep() {
    const a = this.audio, t = a.ac.currentTime;
    const dt = 0.04 + Math.random() * 0.5;
    for (const d of [a.delay.leftDelay, a.delay.rightDelay]) d.delayTime.setTargetAtTime(dt, t, 0.06 + Math.random() * 0.12);
  }
};
