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
//   chords(name, opts)  bassline(name, opts)  collage(name, opts)  drone(name, opts)  motif(name, opts)  tape(name)
//   KEY ROOT QUAL MODE ENERGY BAR BPM
//
// vary / walk / phrase keep their state per layer, so code can stay short and still never
// play the same bar twice in a row.
RA.LanguageApi = class LanguageApi {
  constructor({ coder, audio, harmony, clock, energy, section = null, mood = null, fx = null, instruments = null, rng = new RA.Rng() }) {
    this.mood = mood;       // () => the mood weights, for collage()'s default pool
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

  // A generator kept in the layer's store under `key`, made again when `fits` says the
  // stored one no longer matches the options.
  generator(key, fits, make) {
    const store = this.vars();
    let g = store.get(key);
    if (!g || !fits(g)) { g = make(); store.set(key, g); }
    return g;
  }

  // Hits at beat positions -> events in order with `dur` (beats to the next one), starting
  // with a rest if the first hit isn't on the downbeat. `len` defaults to the gap.
  timeline(hits, beats, rest) {
    const out = [];
    const sorted = hits.filter((h) => h.at < beats).sort((a, b) => a.at - b.at);
    let pos = 0;
    sorted.forEach((h, k) => {
      if (h.at > pos + 1e-9) out.push(Object.assign({}, rest, { dur: h.at - pos }));
      const end = k + 1 < sorted.length ? sorted[k + 1].at : beats;
      const e = Object.assign({}, h, { dur: end - h.at });
      delete e.at;
      if (e.len == null) e.len = e.dur;
      out.push(e);
      pos = end;
    });
    if (!sorted.length) out.push(Object.assign({}, rest, { dur: beats }));
    return out.filter((e) => e.dur > 1e-9);
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

      // Generators (see Generators.js). Each returns one bar of events to play in order,
      // waiting sleep(e.dur) after each; rests have nothing to play (notes/note/s null).

      // chords('c', { voicing, octave, rhythm, density }) -> [{ notes, len, vel, dur }]
      //   voicing: triad m7 add9 sus2 sus4 dub cluster wide quartal fifths
      //   rhythm: stab (offbeat dub techno hits) offbeat push long
      chords(name, { voicing = 'm7', octave = 1, rhythm = 'stab', density = 0.5 } = {}) {
        const g = self.generator('chords:' + name, (x) => x.rhythm === rhythm, () => new RA.ChordGen(self.rng, rhythm));
        const notes = RA.ChordGen.voice(harmony, coder.bar(), voicing, octave);
        const hits = g.next(density).map((at) => ({ at, notes, vel: self.rng.float(0.75, 1), len: rhythm === 'long' ? null : 0.25 }));
        return self.timeline(hits, 4, { notes: null, vel: 0, len: 0 });
      },

      // bassline('b', { style, octave }) -> [{ note, len, vel, accent, slide, dur }]
      //   style: dub sub 808 acid walk pedal
      bassline(name, { style = 'dub', octave = 0 } = {}) {
        const g = self.generator('bass:' + name, (x) => x.style === style, () => new RA.BassGen(self.rng, style));
        const root = harmony.degreeAt(coder.bar());
        const hits = g.next().map(([at, step, len, accent, slide]) => ({ at, note: harmony.degree(root + step, octave), len, accent: !!accent, slide: !!slide, vel: accent ? 1 : 0.8 }));
        return self.timeline(hits, 4, { note: null, len: 0, vel: 0 });
      },

      // collage('c', { pool, rate, beats }) -> [{ s, n, rate, begin, pan, amp, dur }]
      //   pool: sample folders (default: the mood's: voices, radio, field recordings)
      collage(name, { pool = null, rate = 0.5, beats = 4 } = {}) {
        const list = pool || RA.Families.collagePool(self.mood ? self.mood() : null);
        const g = self.generator('collage:' + name, (x) => !pool || x.pool.join() === pool.join(), () => new RA.CollageGen(self.rng, list));
        const hits = g.next(beats, rate).map(({ at, sound }) => Object.assign({ at, amp: self.rng.float(0.25, 0.5) }, sound));
        return self.timeline(hits, beats, { s: null, amp: 0 });
      },

      // drone('d', { voices, octave }) -> { notes, changed }: chord tones that drift slowly
      drone(name, { voices = 3, octave = 1 } = {}) {
        const g = self.generator('drone:' + name, (x) => x.steps.length === voices, () => new RA.DroneGen(self.rng, voices));
        const root = harmony.degreeAt(coder.bar());
        const { steps, changed } = g.next();
        return { notes: steps.map((k) => harmony.degree(root + k, octave)), changed };
      },

      // tape('t') -> { level, wow, crackles: [{ amp, dur }] }: an old tape and record under
      // the music. level (hiss, 0.3..1) drifts; wow is a flutter episode now and then (fades);
      // crackles are a few clicks scattered over the bar (play them with sleep(c.dur)).
      tape(name) {
        const g = self.generator('tape:' + name, () => true, () => ({ level: self.rng.float(0.5, 1), wow: 0 }));
        g.level = RA.MathUtil.clamp(g.level + self.rng.float(-0.08, 0.08), 0.3, 1);
        g.wow = self.rng.chance(0.08) ? self.rng.float(0.2, 0.6) : g.wow * 0.7;
        const hits = [];
        for (let at = 0; at < 4; at += 0.25) if (self.rng.chance(0.08)) hits.push({ at, amp: self.rng.float(0.2, 0.6) });
        return { level: g.level, wow: g.wow, crackles: self.timeline(hits, 4, { amp: 0 }) };
      },

      // motif('m', { beats, density, octave }) -> [{ note, dur, vel }]: a short melody that
      // repeats and changes one detail at a time
      motif(name, { beats = 4, density = 0.4, octave = 2 } = {}) {
        const g = self.generator('motif:' + name, (x) => x.opts.beats === beats, () => new RA.MotifGen(self.rng, self.melody, { beats, density }));
        const bar = coder.bar();
        let pos = 0;
        return g.next().map((n) => {
          const strong = pos % 1 === 0 && n.dur >= 1;
          pos += n.dur;
          const step = strong ? harmony.snapToChord(n.step, bar) : n.step;
          return { note: n.rest ? null : harmony.degree(step, octave), dur: n.dur, vel: n.vel };
        });
      },

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
