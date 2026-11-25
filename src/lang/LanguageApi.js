// LanguageApi: everything pattern code can see.
//
//   loop(name, (i) => {...})  sleep(beats)
//   s(folder, { n, amp, rate, pan, cut, begin, attack, release })          times in beats
//   synth(preset, note | [notes], { dur, amp, cutoff, res, attack, release, pan })
//   fx({ lpf, res, rev, delay, amp, wobble, crush })
//   mute('folder:n', 'synth')  hits('folder:n' | 'synth', 'x...x...', opts)   (the sequencer's)
//   ring tick look spread rrand rrand_i choose one_in dice
//   note pitch key_rate chord scale harm degree modal
//   vary(name, options, bars)  walk(name, lo, hi, speed)  phrase(name, opts)  pad(id, beats)
//   beat(name, { style, density })  swing(step, k, amount)
//   KEY ROOT QUAL MODE ENERGY BAR BPM
//
// vary / walk / phrase keep their state per layer, so code can stay short and still never
// play the same bar twice in a row.
RA.LanguageApi = class LanguageApi {
  constructor({ coder, audio, harmony, clock, energy, section = null, fx = null, instruments = null, rng = new RA.Rng() }) {
    this.instruments = instruments; // InstrumentLibrary, for inst()
    this.coder = coder;
    this.audio = audio;
    this.harmony = harmony;
    this.clock = clock;
    this.energy = energy; // () => 0..1
    this.section = section; // () => the arc section name, for SECTION
    this.fx = fx;         // FxRack, for pad()
    this.rng = rng;
    this.melody = new RA.MelodyGen(rng);
    this.globalVars = new Map();
    this.env = this.buildEnv();
  }

  // Per-layer variable store (layers keep it across iterations and hot-swaps).
  vars() {
    const layer = this.coder.cur && this.coder.cur.layer;
    if (!layer) return this.globalVars;
    return layer.vars || (layer.vars = new Map());
  }

  // Whether a sound stays quiet: 'mute' (the mute line), 'hand' (it has hits() rows and
  // this isn't one of them), or false.
  silenced(layer, key) {
    if (layer.mutes && layer.mutes.has(key)) return 'mute';
    if (!this.inHits && layer.hand && layer.hand.has(key)) return 'hand';
    return false;
  }

  // Events [{ note, dur, vel }] for one chunk of a named, evolving melody.
  phrase(name, { beats = 4, density = 0.5, octave = 2, rest = 0.15, evolve = 2 } = {}) {
    const store = this.vars();
    const key = 'phrase:' + name;
    let ph = store.get(key);
    if (!ph || ph.opts.beats !== beats) {
      ph = new RA.Phrase(this.melody, { beats, density, rest, evolve });
      store.set(key, ph);
    }
    ph.opts.density = density;
    const motif = ph.next();
    const bar = this.coder.bar();
    const rng = this.rng;
    let pos = 0;
    // Each event: note (midi or null), dur, vel, nudge (a little late, more at the ends of
    // the phrase: rubato), grace (a neighbour note to flick into first, or null) and
    // last (the phrase's final note, for longer releases).
    return motif.notes.map((n, k, all) => {
      const strong = pos % 1 === 0 && n.dur >= 1;
      const step = strong ? this.harmony.snapToChord(n.step, bar + Math.floor(pos / 4)) : n.step;
      const edge = k === 0 || k === all.length - 1 ? 2 : 1;
      pos += n.dur;
      const note = n.rest ? null : this.harmony.degree(step, octave);
      return {
        note,
        dur: n.dur,
        vel: RA.MathUtil.clamp(n.vel * rng.float(0.9, 1.08), 0.2, 1.1),
        nudge: rng.float(0, 0.03) * edge,
        grace: note != null && n.grace ? this.harmony.degree(step + n.grace, octave) : null,
        last: k === all.length - 1,
      };
    });
  }

  buildEnv() {
    const { coder, audio, harmony, clock } = this;
    const self = this;
    const T = RA.Theory;
    const mod = RA.MathUtil.mod;
    const timed = (o, spb, keys) => { for (const k of keys) if (o[k] != null) o[k] *= spb; return o; };

    return {
      loop(name, fn) {
        if (typeof name === 'function') { fn = name; name = 'main'; }
        if (!coder.compiling) throw new Error('loop() can only be defined at the top level');
        coder.compiling.defined[name] = fn;
      },

      sleep(beats) { if (coder.cur) coder.cur.sleep(beats); },

      // inst('name', { osc: [...], attack, release, cutoff, ... }): defines or changes a synth
      // instrument (the same thing the Instrumentos panel edits). Top level only.
      inst(name, spec) {
        if (!coder.compiling || coder.inProbe || !self.instruments) return;
        if (!spec || !Array.isArray(spec.osc) || !spec.osc.length) throw new Error(`inst('${name}'): needs osc: [...]`);
        const cur = self.instruments.get(name);
        if (!cur || JSON.stringify(cur) !== JSON.stringify(spec)) self.instruments.set(name, spec);
      },

      s(name, opts = {}) {
        coder.noteSample(name, opts.n);
        const it = coder.cur;
        if (!it) return;
        const id = it.layer.id;
        const key = `${name}:${opts.n || 0}`;
        const meta = { kind: 's', key, name, n: opts.n || 0, amp: opts.amp, silent: self.silenced(it.layer, key) };
        coder.emit((t, spb) => audio.playSample(id, name, timed(Object.assign({}, opts), spb, ['cut', 'attack', 'release']), t + Math.max(0, opts.nudge || 0) * spb), meta);
      },

      synth(preset, notes, opts = {}) {
        const it = coder.cur;
        if (!it) return;
        const id = it.layer.id;
        const list = (Array.isArray(notes) ? notes : [notes]).map((n) => T.note(n));
        const meta = { kind: 'synth', key: preset, notes: list, dur: opts.dur, amp: opts.amp, silent: self.silenced(it.layer, preset) };
        // nudge: play late by this many beats (feel, rubato); strum: spread a chord's notes
        coder.emit((t, spb) => {
          const o = timed(Object.assign({}, opts), spb, ['dur', 'attack', 'release']);
          const t0 = t + Math.max(0, opts.nudge || 0) * spb;
          const strum = (opts.strum || 0) * spb;
          list.forEach((n, k) => audio.playSynth(id, preset, n, o, t0 + Math.abs(strum) * (strum < 0 ? list.length - 1 - k : k)));
        }, meta);
      },

      // mute('drumtraks:6', 'sub'): top level, silences those sounds in this layer
      // (samples as 'folder:n', synths by instrument name). The sequencer writes this line.
      mute(...keys) {
        if (coder.compiling) coder.compiling.mute = keys.map(String);
      },

      // hits('drumtraks:6', 'x...x...', { amp }) plays a sound on 16th steps from the cursor
      // without moving it ('X' = accent, anything else = rest). A synth row is
      // hits('sub', 'x.......', { note: 36, dur: 1 }). The sound then plays only from its
      // hits() lines: the rest of the code's uses of it go quiet. The sequencer writes these.
      hits(key, pattern, opts = {}) {
        const it = coder.cur;
        if (!it) return;
        const k = String(key);
        const colon = k.lastIndexOf(':');
        const sample = colon > 0;
        const base = it.cursor;
        self.inHits = true;
        try {
          [...String(pattern)].forEach((c, step) => {
            if (c !== 'x' && c !== 'X') return;
            it.cursor = base + step / 4;
            const amp = (opts.amp != null ? opts.amp : sample ? 0.5 : 0.3) * (c === 'X' ? 1.3 : 1);
            if (sample) self.env.s(k.slice(0, colon), Object.assign({}, opts, { n: +k.slice(colon + 1) || 0, amp }));
            else self.env.synth(k, opts.note != null ? opts.note : harmony.root(coder.bar()), Object.assign({}, opts, { amp }));
          });
        } finally {
          it.cursor = base;
          self.inHits = false;
        }
      },

      fx(params) {
        if (coder.compiling) { coder.compiling.fx = Object.assign(coder.compiling.fx || {}, params); return; }
        const it = coder.cur;
        if (!it) return;
        const id = it.layer.id;
        const p = Object.assign({}, params);
        coder.emit((t) => { const bus = audio.bus(id); if (bus) bus.setFx(p, t); });
      },

      ring(...xs) { return RA.Ring.from(xs.length === 1 && Array.isArray(xs[0]) ? xs[0] : xs, coder.counters()); },
      tick(key = '_') { const c = coder.counters(); c[key] = (c[key] == null ? -1 : c[key]) + 1; return c[key]; },
      look(key = '_') { return coder.counters()[key] || 0; },

      // Euclidean rhythm: spread(3, 8) -> x . . x . . x .
      spread(hits, steps, rot = 0) {
        const base = [];
        for (let k = 0; k < steps; k++) base.push(((k * hits) % steps) < hits);
        return RA.Ring.from(base.map((_, k) => base[mod(k + rot, steps)]), coder.counters());
      },

      rrand: (a, b) => a + Math.random() * (b - a),
      rrand_i: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
      choose: (arr) => arr[Math.floor(Math.random() * arr.length)],
      one_in: (n) => Math.random() * n < 1,
      dice: (n) => 1 + Math.floor(Math.random() * n),

      note: (n) => T.note(n),
      pitch: (semitones) => Math.pow(2, semitones / 12),
      key_rate: (from, to) => T.keyRate(from, to == null ? harmony.key : to),
      chord: (root, type) => T.chord(root, type),
      scale: (root, name, octaves) => T.scale(root, name, octaves),

      // The radio's current chord, stacked in thirds from the mode: '' triad, '7', '9'
      harm: (octave = 1, ext = '7') => harmony.chordNotes(coder.bar(), octave, ext),
      // A note of the current mode: degree(0, 1) is the key's root one octave up
      degree: (d, octave = 1) => harmony.degree(d, octave),
      // The current mode's notes from KEY
      modal: (octave = 1, octaves = 1) => harmony.modeNotes(octave, octaves),

      // A value picked from `options` and held for about `bars` bars, then re-picked.
      vary(name, options, bars = 4) {
        const store = self.vars();
        const key = 'vary:' + name;
        const bar = coder.bar();
        let st = store.get(key);
        if (!st || bar >= st.until || bar < st.since) {
          const others = st && options.length > 1 ? options.filter((o) => o !== st.value) : options;
          st = { value: self.rng.pick(others), since: bar, until: bar + Math.max(1, Math.round(bars * self.rng.float(0.5, 1.5))) };
          store.set(key, st);
        }
        return st.value;
      },

      // A value that wanders smoothly between lo and hi (each call moves it a little).
      walk(name, lo, hi, speed = 0.1) {
        const store = self.vars();
        const key = 'walk:' + name;
        let st = store.get(key);
        if (!st) { st = { v: self.rng.float(lo, hi), vel: 0 }; store.set(key, st); }
        st.vel = st.vel * 0.8 + self.rng.float(-1, 1) * speed * (hi - lo) * 0.5;
        st.v += st.vel;
        if (st.v < lo || st.v > hi) { st.v = RA.MathUtil.clamp(st.v, lo, hi); st.vel = -st.vel; }
        return st.v;
      },

      phrase: (name, opts) => self.phrase(name, opts),

      // An evolving drum beat: 16 steps [{ k, s, h, p, v }] for this bar.
      // styles: four, break, halftime, dnb, broken, ae
      beat(name, { style = 'four', density = 0.5 } = {}) {
        const store = self.vars();
        const key = 'beat:' + name;
        let b = store.get(key);
        if (!b || b.style !== style) { b = new RA.BeatGen(self.rng, style, density); store.set(key, b); }
        return b.next(density);
      },

      // Swung step length: longer on even steps, shorter on odd ones (pairs keep the bar).
      swing: (step, k, amount = 0.12) => step * (k % 2 === 0 ? 1 + amount : 1 - amount),

      // Fires an effect pad (see FxRack.PADS) for `beats` beats, from the cursor.
      pad(id, beats = 4) {
        const it = coder.cur;
        if (!it || !self.fx) return;
        coder.emit((t, spb) => self.fx.pulse(id, beats * spb));
      },

      get KEY() { return harmony.key; },
      get ROOT() { return harmony.root(coder.bar()); },
      get QUAL() { return harmony.quality(coder.bar()); },
      get MODE() { return harmony.mode; },
      get ENERGY() { return self.energy(); },
      get SECTION() { return self.section ? self.section() : 'build'; },
      get BAR() { return coder.bar(); },
      get BPM() { return clock.bpm; },
    };
  }
};
