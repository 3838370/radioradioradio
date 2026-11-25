// Composer: the radio's DJ. Once per bar it follows the genre (harmony, tempo) and the arc
// (sections: layer count, tempo, colour), sometimes plays an effect pad or moves the delay
// time, plays a break or fill before a section changes, and every `pace` bars makes one
// move: add or drop layers toward the target, replace a layer that no longer fits the genre,
// or one move chosen by score (see candidates()): swap a pattern, play a new version of it,
// change a synth for another of its family, mutate, reset, drop a layer out for a few bars,
// reharmonise, scatter a collage phrase, push or drag the tempo.
// Every pattern comes in as a fresh version of itself (Recipe), and the session memory
// makes what was heard lately less likely. Locked layers are never touched.
// Emits layer:add / layer:change / layer:remove.
RA.Composer = class Composer {
  static CALM = ['sparse', 'drift', 'release', 'collapse', 'suspense'];

  constructor({ bank, coder, audio, samples, harmony, drift, arc, fx = null, instruments = null, mutator, settings, clock, scheduler, rng, emitter, logger, fast }) {
    Object.assign(this, { bank, coder, audio, samples, harmony, drift, arc, fx, instruments, mutator, settings, clock, scheduler, rng, emitter, logger, fast });
    this.layers = new Map(); // role -> Layer
    this.bar = 0;
    this.nextMove = 0;
    this.energy = drift.intensity();
    this.genre = drift.dominant();
    this.serial = 0;
    this.recent = [];        // last pattern ids heard, avoided when choosing
    this.memory = new RA.Memory(); // everything heard this session (fatigue, versions)
    this.lastHarmBar = 0;    // when the progression last changed
    this.push = null;        // { factor, until }: a short tempo push or pull
    this.autoPace = settings.get('pace'); // the pace chosen on auto (see rollPace), and until when
    this.paceUntil = 0;
  }

  // ───── lifecycle ─────

  start() {
    this.harmony.key = 40 + this.rng.int(0, 11);
    const plan = this.harmony.planFor(this.genre, this.rng);
    this.harmony.mode = this.settings.get('mode') !== 'auto' ? this.settings.get('mode') : plan.mode;
    this.harmony.prog = plan.prog;
    if (this.settings.get('key') !== 'auto') this.harmony.key = 40 + RA.MathUtil.mod(this.settings.get('key') - 40, 12);
    const bpm = this.settings.get('bpmAuto') ? this.drift.tempo() : this.settings.get('bpm');
    this.clock.bpm = this.clock.target = bpm;
    this.settings.on('change', (e) => this.onSetting(e));
    this.logger.add(`genre: ${RA.Genres.label(this.genre)} · ${this.harmony.keyName()} · ${bpm} BPM`, 'event');
    this.scheduler.at(0, () => this.onBar(0));
  }

  preloadFor(weights) {
    for (const p of this.bank.patterns) {
      if (this.bank.fit(p, weights) < 0.3) continue;
      const r = this.coder.probe(p.code, 4);
      if (r.ok) this.samples.preload(r.samples);
    }
  }

  onBar(bar) {
    this.bar = bar;
    if (this.drift.advanceBar(this.clock.bpm)) this.preloadNextGenre();
    this.steer(bar);
    const section = this.arc.advanceBar(bar, 240 / this.clock.bpm, this.drift.weights());
    this.leanGenre();
    this.energy = RA.MathUtil.clamp(this.drift.intensity() + this.arc.boost, 0.03, 1);
    if (section) {
      this.logger.add(`bar ${bar}: section → ${section.toUpperCase()}`, 'event');
      if (this.settings.get('densityAuto')) this.nextMove = Math.min(this.nextMove, bar + 1);
    }
    if (this.settings.get('paceAuto') && (section || bar >= this.paceUntil)) this.rollPace(bar);
    if (this.fx) this.fx.setArc(this.arc.value);
    if (this.push && bar >= this.push.until) this.push = null;
    if (bar % 4 === 0 || this.push) {
      if (bar % 4 === 0) {
        this.followGenre(bar);
        const change = this.harmony.applyPending();
        if (change) this.logger.add(`bar ${bar}: harmony → ${change}`, 'event');
      }
      if (this.settings.get('bpmAuto')) {
        const t = Math.round(this.drift.tempo() * this.arc.tempo * (this.push ? this.push.factor : 1));
        if (Math.abs(t - this.clock.target) >= 1) this.clock.glideTo(t, this.push ? 8 : 32);
      }
    }
    // the last bar of a section: a break or a fill (not while frozen or steered by hand)
    const lastBar = !this.arc.held && bar === this.arc.start + this.arc.length - 1;
    if (lastBar && !this.settings.get('freeze') && this.layers.size >= 2 && this.rng.chance(0.6)) this.fill(bar);
    if (this.fx) {
      this.fx.syncTempo(this.clock.bpm);
      this.autoFx(bar);
      this.autoDelay(bar);
    }
    // Off the layer target (the listener's count, or the arc moved): don't wait a whole pace.
    if (this.layers.size !== this.target()) this.nextMove = Math.min(this.nextMove, bar + this.interval());
    if (bar >= this.nextMove) {
      // Freeze holds the code: no swaps, resets or mutations. The layer count still follows
      // the listener's density (on auto it stays as it is), and the first two layers always
      // come in so it's never silent.
      const freeze = this.settings.get('freeze') && this.layers.size >= 2;
      if (!freeze) this.move(bar);
      else if (!this.settings.get('densityAuto')) this.moveCount(bar);
      this.nextMove = bar + this.interval();
    }
    this.scheduler.at((bar + 1) * 4, () => this.onBar(bar + 1));
  }

  preloadNextGenre() {
    this.preloadFor(Object.assign(RA.Genres.zeroWeights(), { [this.drift.next()]: 1 }));
  }

  followGenre(bar) {
    const dom = this.drift.dominant();
    if (dom === this.genre) return;
    this.genre = dom;
    const change = this.harmony.planFor(dom, this.rng);
    // The listener's key and mode choices always win over the genre's.
    if (this.settings.get('mode') !== 'auto') change.mode = this.settings.get('mode');
    if (this.settings.get('key') === 'auto') change.key = this.harmony.key + this.rng.pick([0, 5, 7, -3]);
    this.harmony.request(change);
    this.nextMove = Math.min(this.nextMove, bar + (this.fast ? 1 : 4)); // start handing over soon
    this.logger.add(`bar ${bar}: genre → ${RA.Genres.label(dom)}`, 'event');
  }

  // ───── effects ─────

  // Now and then, fire an effect pad that suits the section, for one to four bars.
  autoFx(bar) {
    const p = this.settings.get('fxAuto');
    if (!p || this.fx.autoActive() || !this.rng.chance(p * 0.08)) return;
    const sec = this.arc.section;
    const calm = Composer.CALM.includes(sec);
    const id = this.rng.weighted(calm
      ? [['dub', 3], ['warp', 2], ['wash', 3], ['wobble', 2], ['throw', 2]]
      : sec === 'dread'
        ? [['sweep', 3], ['wobble', 2], ['warp', 2], ['dub', 1], ['tapestop', 0.5]]
        : [['throw', 3], ['sweep', 2], ['stutter', sec === 'surge' ? 3 : 2], ['dub', 1], ['tapestop', sec === 'tension' ? 0.6 : sec === 'peak' || sec === 'surge' ? 1.2 : 0]]);
    const bars = id === 'stutter' || id === 'tapestop' ? 1 : this.rng.int(1, 4);
    this.fx.pulse(id, bars * 4 * this.clock.spb());
    const pad = RA.FxRack.PADS.find((x) => x.id === id);
    this.logger.add(`bar ${bar}: fx ${pad.label.toLowerCase()} (${bars} bar${bars > 1 ? 's' : ''})`);
  }

  // Aphex-style: sometimes jump the delay to another note value; the glide bends the echoes.
  autoDelay(bar) {
    if (!this.settings.get('delayAuto') || !this.rng.chance(this.fast ? 0.2 : 0.05)) return;
    const current = this.settings.get('delayBeats');
    const [name, beats] = this.rng.pick(RA.FxRack.DELAY_NOTES.filter(([, b]) => Math.abs(b - current) > 0.01));
    this.fx.setDelayBeats(beats);
    this.logger.add(`bar ${bar}: delay → ${name}`);
  }

  // ───── pacing ─────

  // Bars between moves: the listener's, or on auto the one the composer chose (autoPace).
  basePace() { return this.settings.get('paceAuto') ? this.autoPace : this.settings.get('pace'); }

  pace() { return this.fast ? Math.max(1, Math.round(this.basePace() / 8)) : this.basePace(); }

  // Pace on auto alternates periods of short and long paces: busy sections (build, tension,
  // surge, peak) lean to short ones (4-16 bars, lots happening), calm ones (sparse, drift,
  // suspense, release, collapse) to long ones (32-64, letting things breathe), dread in
  // between. A period lasts 32-96 bars, or until the section changes.
  static AUTO_PACE = {
    busy: [[4, 1], [8, 2], [16, 2], [32, 0.5]],
    middle: [[8, 1], [16, 2], [32, 1.5]],
    calm: [[16, 1], [32, 2], [48, 1.5], [64, 1]],
  };

  rollPace(bar) {
    const sec = this.arc.section;
    const kind = ['build', 'tension', 'surge', 'peak'].includes(sec) ? 'busy' : sec === 'dread' ? 'middle' : 'calm';
    const options = Composer.AUTO_PACE[kind].filter(([p]) => p !== this.autoPace);
    const first = this.paceUntil === 0;
    this.autoPace = this.rng.weighted(options);
    this.paceUntil = bar + this.rng.int(32, 96);
    this.nextMove = Math.min(this.nextMove, bar + this.pace());
    if (!first) this.logger.add(`bar ${bar}: pace → every ${this.autoPace} bars (${kind})`);
  }

  // How many layers to aim for. With density on auto the arc section gives a range (sparse
  // 1-2 ... surge 5-6), capped by the genre (space 4, drill 6...), and the energy picks within
  // it; otherwise exactly the number the listener set.
  target() {
    if (this.settings.get('densityAuto')) {
      const cap = RA.Arc.cap(this.drift.weights());
      const [lo0, hi0] = this.arc.spec.layers;
      const hi = Math.min(hi0, cap), lo = Math.min(lo0, hi);
      const f = RA.MathUtil.clamp((this.energy - 0.15) / 0.7, 0, 1);
      return lo + Math.round((hi - lo) * f);
    }
    return RA.MathUtil.clamp(this.settings.get('density'), 1, RA.PatternBank.ROLES.length);
  }

  // Build up quickly at the start, follow the target quickly when it thins out or fills up,
  // and hand over quickly when the genre has moved on; otherwise follow the pace knob.
  interval() {
    const target = this.target();
    const building = this.layers.size < target && this.bar < 64;
    const offTarget = Math.abs(this.layers.size - target) >= 1;
    const w = this.drift.weights();
    const outOfGenre = [...this.layers.values()].some((l) => !l.locked && this.misfit(l, w));
    if (offTarget) return Math.min(this.pace(), this.fast ? 1 : 2);
    return building || outOfGenre ? Math.min(this.pace(), this.fast ? 1 : 4) : this.pace();
  }

  // A pattern for a role, avoiding what was heard recently when there's a choice.
  pickPattern(role, exclude = []) {
    const w = this.drift.weights();
    const meter = this.meter();
    // With STEPS chosen, a fitting pattern (even one heard recently) beats any other;
    // roles with none that fit fall back to the usual choice.
    // Patterns heard lately or often weigh less (the session memory).
    const tired = (p) => this.memory.weight(p.id, this.bar);
    const tries = [[exclude.concat(this.recent), meter], [exclude, meter], [exclude.concat(this.recent), null], [exclude, null]];
    for (const [ex, m] of meter ? tries : tries.slice(2)) {
      const p = this.bank.pick(role, w, this.energy, this.rng, ex, m, tired);
      if (p) return p;
    }
    return null;
  }

  // A new version of a pattern (Recipe): its synths, kits and sample variants partly swapped
  // within their families. Tries a few times for a version not heard this session.
  roll(pattern) {
    const ctx = {
      rng: this.rng,
      strength: 0.3 + 0.7 * this.settings.get('variation'),
      synthExists: (n) => (this.instruments ? this.instruments.has(n) : !!RA.SynthPresets[n]),
      sampleCount: (f) => this.samples.count(f),
    };
    let r = null;
    for (let k = 0; k < 4; k++) {
      r = RA.Recipe.roll(pattern, ctx);
      if (!this.memory.heard(r.sig)) break;
    }
    return r;
  }

  // The step count the listener chose (STEPS), or null on auto.
  meter() {
    const steps = this.settings.get('steps');
    return steps === 'auto' || steps == null ? null : { steps: +steps, probe: (code) => this.coder.probe(code, 8) };
  }

  // A layer that no longer suits the genre, unless it's there for the listener's STEPS.
  misfit(layer, w) {
    if (this.bank.fit(layer.pattern, w) >= 0.4) return false;
    const meter = this.meter();
    return !(meter && RA.PatternBank.fits(this.bank.cycles({ code: layer.code }, meter.probe), meter.steps));
  }

  // After STEPS changes: free layers whose loops don't fit it are swapped at the next phrase.
  followMeter() {
    const meter = this.meter();
    if (!meter) return;
    const start = this.phraseStart(this.bar + 1);
    let n = 0;
    for (const layer of [...this.layers.values()]) {
      if (layer.locked || layer.editing) continue;
      if (RA.PatternBank.fits(this.bank.cycles({ code: layer.code }, meter.probe), meter.steps)) continue;
      this.swap(layer, this.bar, `${meter.steps} steps`, start);
      n++;
    }
    this.logger.add(`steps → ${meter.steps}${n ? ` (${n} layer${n > 1 ? 's' : ''} swapped)` : ''}`, 'event');
  }

  remember(id) {
    this.recent.push(id);
    if (this.recent.length > 12) this.recent.shift();
  }

  // Layers enter on 4-bar boundaries, where the chords change.
  phraseStart(bar) { return Math.ceil(bar / 4) * 4; }

  // ───── moves ─────

  // Adds or drops layers toward the target. Far from it, two enter or leave at once, so
  // the count catches up quickly. Returns whether it did anything.
  moveCount(bar) {
    const target = this.target();
    if (this.layers.size < target) {
      for (let k = Math.min(2, target - this.layers.size); k > 0; k--) this.add(bar);
      return true;
    }
    if (this.layers.size > target && [...this.layers.values()].some((l) => !l.locked)) {
      for (let k = Math.min(2, this.layers.size - target); k > 0; k--) {
        const left = [...this.layers.values()].filter((l) => !l.locked);
        if (left.length) this.drop(bar, left);
      }
      return true;
    }
    return false;
  }

  move(bar) {
    const w = this.drift.weights();
    const free = [...this.layers.values()].filter((l) => !l.locked);
    if (this.moveCount(bar)) return;
    if (!free.length) return;
    // a role the section leaves out (no drums in sparse or suspense) goes; another comes in
    const banned = this.settings.get('densityAuto') && free.find((l) => (this.arc.spec.no || []).includes(l.role));
    if (banned) {
      this.logger.add(`bar ${bar}: − ${banned.role} (${banned.patternId}, ${this.arc.section})`);
      this.exit(banned, this.phraseStart(bar));
      return;
    }

    const worst = free.slice().sort((a, b) => this.bank.fit(a.pattern, w) - this.bank.fit(b.pattern, w))[0];
    const misfit = this.misfit(worst, w) ? worst : free.find((l) => this.misfit(l, w));
    if (misfit) return this.swap(misfit, bar, 'genre');

    // Everything else is chosen by score (see candidates()).
    const options = this.candidates(bar, free, w);
    const pick = this.rng.weighted(options.map((o) => [o, o.score]));
    if (pick) pick.run();
  }

  // ───── the decision scheme ─────
  //
  // Each possible move gets a score from the variation knob, the arc section, the genre and
  // the layer's age (bars since it came in), and one is drawn by weight. So in a dub drift
  // layers drop out for a few bars and the progression shifts; in a build patterns swap; in
  // space the radio scatters collage phrases; in a surge or dread the tempo pushes or drags.

  // How much each section asks for a kind of move (1 = neutral, 0 = never).
  static INTENT = {
    swap: { build: 1.4, tension: 1.2, surge: 1.2, peak: 0.6, sparse: 0.7, suspense: 0.7 },
    reroll: { drift: 1.3, release: 1.2, dread: 1.1 },
    timbre: { drift: 1.2, sparse: 1.3, suspense: 1.2, peak: 0.6 },
    dropout: { drift: 1.5, build: 1.4, dread: 1.4, tension: 1.1, sparse: 0.3, suspense: 0.3, peak: 0.5 },
    reharm: { sparse: 1.3, drift: 1.4, release: 1.5, suspense: 1.2, peak: 0.4, surge: 0.4 },
    collage: { sparse: 1.6, suspense: 1.7, drift: 1.4, collapse: 1.4, surge: 0.3, peak: 0.3 },
    tempo: { surge: 1, dread: 1, peak: 0.6, collapse: 0.6 },
  };

  static intent(kind, section) {
    const t = Composer.INTENT[kind] || {};
    return t[section] == null ? (kind === 'tempo' ? 0 : 1) : t[section];
  }

  // [{ score, run }] for this move.
  candidates(bar, free, w) {
    const v = this.settings.get('variation');
    const sec = this.arc.section;
    const I = (kind) => Composer.intent(kind, sec);
    const age = (l) => bar - (l.enteredBar == null ? bar : l.enteredBar);
    const dubby = (w.dub || 0) + 0.8 * (w.minimal || 0) + 0.4 * (w.boc || 0);
    const collagey = (w.space || 0) + (w.boc || 0) + 0.6 * (w.saw || 0) + 0.5 * (w.dark || 0) + 0.3 * (w.ae || 0);
    const out = [];
    for (const l of free) {
      out.push({ score: (0.08 + 0.3 * v) * RA.MathUtil.clamp(age(l) / 48, 0.2, 2) * I('swap') / free.length, run: () => this.swap(l, bar, 'variety') });
      out.push({ score: 0.2 * (0.5 + v) * RA.MathUtil.clamp(age(l) / 24, 0.3, 1.5) * I('reroll') / free.length, run: () => this.reroll(l, bar) });
      if (RA.CodeTools.synthsUsed(l.code).some((n) => RA.Families.synthFamily(n))) {
        out.push({ score: 0.12 * (0.5 + v) * I('timbre') / free.length, run: () => this.timbre(l, bar) });
      }
      out.push({ score: 0.35 / free.length, run: () => this.mutate(l, bar) });
      if (l.code !== this.fullCode(l.base || l.pattern.code)) out.push({ score: 0.15 * (1 - v) / free.length, run: () => this.reset(l, bar) });
      if (free.length >= 2 && !l.muted) out.push({ score: (0.04 + 0.25 * dubby) * I('dropout') / free.length, run: () => this.dropout(l, bar) });
    }
    if (this.settings.get('key') === 'auto' || this.settings.get('mode') === 'auto') {
      out.push({ score: (0.04 + 0.2 * RA.MathUtil.clamp((bar - this.lastHarmBar) / 48, 0, 1.5)) * I('reharm'), run: () => this.reharmonize(bar) });
    }
    if (this.layers.size) out.push({ score: (0.03 + 0.25 * collagey) * I('collage'), run: () => this.collageEvent(bar) });
    if (this.settings.get('bpmAuto')) out.push({ score: 0.15 * I('tempo'), run: () => this.tempoPush(bar) });
    return out.filter((o) => o.score > 0);
  }

  // The same pattern, another version (Recipe), from the next phrase.
  reroll(layer, bar) {
    const r = this.roll(layer.pattern);
    if (!r.changes.length) return this.mutate(layer, bar);
    const code = this.fullCode(r.code);
    const probe = this.coder.probe(code);
    if (!probe.ok) return this.mutate(layer, bar);
    this.samples.preload(probe.samples);
    if (!this.coder.load(layer, code).ok) return;
    layer.base = r.code;
    this.memory.note(layer.patternId, r.sig, bar);
    const desc = r.changes.slice(0, 3).join(', ');
    this.emitter.emit('layer:change', { layer, desc: 'new version: ' + desc });
    this.logger.add(`bar ${bar}: ${layer.role} new version: ${desc}`);
  }

  // One synth of the layer swapped for another of its family (timbre, same notes).
  timbre(layer, bar) {
    const used = RA.CodeTools.synthsUsed(layer.code).filter((n) => RA.Families.synthFamily(n));
    if (!used.length) return this.mutate(layer, bar);
    const from = this.rng.pick(used);
    const exists = (n) => (this.instruments ? this.instruments.has(n) : !!RA.SynthPresets[n]);
    const to = RA.Families.alt(RA.Families.SYNTHS[RA.Families.synthFamily(from)], from, this.rng, exists);
    if (!to) return this.mutate(layer, bar);
    const body = RA.CodeTools.split(layer.code).body.split(`synth('${from}'`).join(`synth('${to}'`);
    const code = this.fullCode(body);
    if (!this.coder.probe(code).ok || !this.coder.load(layer, code).ok) return;
    this.emitter.emit('layer:change', { layer, desc: `${from} → ${to}` });
    this.logger.add(`bar ${bar}: ~ ${layer.role}: ${from} → ${to}`);
  }

  // Dub-style drop: the layer goes quiet for 1-4 bars from the next bar, then comes back.
  dropout(layer, bar) {
    const bus = this.audio.bus(layer.id);
    if (!bus) return;
    const bars = this.rng.pick([1, 2, 2, 4]);
    const from = (bar + 1) * 4, to = from + bars * 4;
    const spb = this.clock.spb();
    bus.fade(0, 0.25 * spb, Math.max(this.audio.ac.currentTime, this.clock.timeOf(from)));
    this.scheduler.at(to, (t) => { if (this.layers.get(layer.role) === layer) bus.fade(1, 0.5 * spb, t); }, null);
    this.logger.add(`bar ${bar}: ${layer.role} drops out for ${bars} bar${bars > 1 ? 's' : ''}`);
  }

  // A new progression within the genre (sometimes a key move too), from the next 4 bars.
  reharmonize(bar) {
    const change = this.harmony.reharm(this.genre, this.rng, this.settings.get('key') === 'auto');
    if (this.settings.get('mode') !== 'auto') change.mode = this.settings.get('mode');
    this.harmony.request(change);
    this.lastHarmBar = bar;
    this.logger.add(`bar ${bar}: reharmonise${change.key != null ? ' and modulate' : ''}`, 'event');
  }

  // A short collage phrase (voices, radio, field sounds) over the texture, FSOL-style.
  collageEvent(bar) {
    const pool = RA.Families.collagePool(this.drift.weights());
    const layer = this.layers.get('texture') || this.layers.get('keys') || [...this.layers.values()][0];
    if (!layer) return;
    const names = [];
    let beat = (bar + 2) * 4;
    for (let k = this.rng.int(1, 3); k > 0; k--) {
      const s = this.rng.pick(pool);
      const n = this.rng.int(0, Math.max(0, this.samples.count(s) - 1));
      this.samples.preload([[s, n]]);
      const opts = { n, amp: this.rng.float(0.25, 0.45), rate: this.rng.pick([0.5, 0.75, 1, 1]), pan: this.rng.float(-0.7, 0.7), begin: this.rng.pick([0, 0, 0.2]) };
      this.scheduler.at(beat, (t) => this.audio.playSample(layer.id, s, opts, t), layer.id);
      beat += this.rng.pick([1, 2, 3, 4]);
      names.push(s);
    }
    this.logger.add(`bar ${bar}: collage (${names.join(', ')})`);
  }

  // Surge pushes the tempo on (+3-6%) for 4-8 bars; dread and collapse drag it back.
  tempoPush(bar) {
    const up = ['surge', 'peak'].includes(this.arc.section);
    const factor = up ? this.rng.float(1.03, 1.06) : this.rng.float(0.94, 0.97);
    this.push = { factor, until: bar + this.rng.int(4, 8) };
    this.logger.add(`bar ${bar}: tempo ${up ? 'pushes' : 'drags'} ${Math.round((factor - 1) * 100)}%`);
  }

  // The last bar before the arc moves on: a break (the beat drops for a bar) or an effect fill.
  fill(bar) {
    const beat = this.layers.get('drums') || this.layers.get('perc');
    if (beat && !beat.locked && this.rng.chance(0.5)) {
      const bus = this.audio.bus(beat.id);
      const spb = this.clock.spb();
      bus.fade(0, 0.1 * spb, Math.max(this.audio.ac.currentTime, this.clock.timeOf(bar * 4 + 2)));
      this.scheduler.at((bar + 1) * 4, (t) => { if (this.layers.get(beat.role) === beat) bus.fade(1, 0.05, t); }, null);
      this.logger.add(`bar ${bar}: break`);
    } else if (this.fx) {
      const id = this.rng.pick(['stutter', 'throw', 'sweep']);
      this.fx.pulse(id, 4 * this.clock.spb());
      this.logger.add(`bar ${bar}: fill (${id})`);
    }
  }

  // The next role is drawn at random, favouring the ones the section wants first, then the
  // ones that suit the genre. Roles the section leaves out only come in when the listener's
  // count needs them.
  add(bar) {
    const spec = this.arc.spec;
    let missing = RA.Genres.of(this.drift.dominant()).roleOrder.filter((r) => !this.layers.has(r));
    const allowed = missing.filter((r) => !(spec.no || []).includes(r));
    if (allowed.length || this.settings.get('densityAuto')) missing = allowed;
    if (!missing.length) return;
    const wants = spec.first || [];
    missing.sort((a, b) => (wants.includes(b) ? 1 : 0) - (wants.includes(a) ? 1 : 0));
    const first = this.rng.weighted(missing.map((r, k) => [r, 1 / (k + 1)]));
    for (const role of [first, ...this.rng.shuffle(missing.filter((r) => r !== first))]) {
      const pattern = this.pickPattern(role);
      if (!pattern) continue;
      const layer = this.enter(role, pattern, this.phraseStart(bar));
      if (layer) this.logger.add(`bar ${bar}: + ${role} (${pattern.id}${layer.recipe.length ? ': ' + layer.recipe.slice(0, 2).join(', ') : ''})`);
      return;
    }
  }

  drop(bar, free) {
    const w = this.drift.weights();
    const order = RA.Genres.of(this.drift.dominant()).roleOrder;
    // In calm sections the beat goes first, leaving pads, melodies and echoes.
    const calm = Composer.CALM.includes(this.arc.section);
    const beat = (l) => (calm && (l.role === 'drums' || l.role === 'perc') ? -1 : 0);
    // roles the section leaves out go first; the ones it wants first go last
    const spec = this.arc.spec;
    const sec = (l) => ((spec.no || []).includes(l.role) ? -2 : (spec.first || []).includes(l.role) ? 1 : 0);
    const score = (l) => this.bank.fit(l.pattern, w) + 0.1 * (order.length - order.indexOf(l.role)) + beat(l) + sec(l);
    const layer = free.slice().sort((a, b) => score(a) - score(b))[0];
    this.logger.add(`bar ${bar}: − ${layer.role} (${layer.patternId})`);
    this.exit(layer, this.phraseStart(bar));
  }

  swap(layer, bar, why, startBar = this.phraseStart(bar)) {
    const pattern = this.pickPattern(layer.role, [layer.patternId]);
    if (!pattern) return this.mutate(layer, bar);
    const { locked, muted, fxAuto } = layer;
    this.exit(layer, startBar);
    const fresh = this.enter(layer.role, pattern, startBar);
    if (fresh) {
      if (muted) this.setMuted(fresh, true);
      fresh.locked = locked;
      fresh.fxAuto = fxAuto;
      this.logger.add(`bar ${bar}: ${layer.role} ${layer.patternId} → ${pattern.id} (${why})`);
    }
  }

  mutate(layer, bar) {
    const v = this.settings.get('variation');
    for (let attempt = 0; attempt < 6; attempt++) {
      const m = this.mutator.mutate(layer.code, layer.base || layer.pattern.code, v);
      if (!m) continue;
      const probe = this.coder.probe(m.code);
      if (!probe.ok) continue;
      this.samples.preload(probe.samples);
      if (!this.coder.load(layer, m.code).ok) continue;
      this.emitter.emit('layer:change', { layer, desc: m.desc });
      this.logger.add(`bar ${bar}: ~ ${layer.role}: ${m.desc}`);
      return;
    }
  }

  // A layer's code carries everything that makes its sound: the inst(...) definitions of
  // the instruments it plays, then the pattern.
  fullCode(code) {
    return this.instruments ? RA.CodeTools.withInstruments(code, this.instruments) : code;
  }

  // Back to the version it came in with (its recipe), before any mutations.
  reset(layer, bar) {
    if (!this.coder.load(layer, this.fullCode(layer.base || layer.pattern.code)).ok) return;
    this.emitter.emit('layer:change', { layer, desc: 'back to original' });
    this.logger.add(`bar ${bar}: ${layer.role} back to its original code`);
  }

  // A pattern comes in as a fresh version of itself (roll()); if that version doesn't run,
  // as written.
  enter(role, pattern, startBar) {
    const r = this.roll(pattern);
    let base = r.code;
    let code = this.fullCode(base);
    let probe = this.coder.probe(code);
    if (!probe.ok && base !== pattern.code) {
      base = pattern.code;
      code = this.fullCode(base);
      probe = this.coder.probe(code);
    }
    if (!probe.ok) { this.logger.add(`skipped ${pattern.id}: ${probe.error}`, 'err'); return null; }
    this.samples.preload(probe.samples);
    const layer = new RA.Layer({ id: `${role}-${++this.serial}`, role, pattern });
    const startBeat = startBar * 4;
    const res = this.coder.load(layer, code, startBeat);
    if (!res.ok) { this.logger.add(`skipped ${pattern.id}: ${res.error}`, 'err'); return null; }
    layer.base = base;
    layer.enteredBar = startBar;
    layer.recipe = base === r.code ? r.changes : [];
    this.memory.note(pattern.id, base === r.code ? r.sig : null, startBar);
    const quick = role === 'drums' || role === 'bass' || startBar === 0;
    const at = Math.max(this.audio.ac.currentTime, this.clock.timeOf(startBeat));
    this.audio.bus(layer.id).fade(1, quick ? 0.03 : 4 * this.clock.spb(), at);
    this.layers.set(role, layer);
    this.remember(pattern.id);
    this.emitter.emit('layer:add', { layer });
    return layer;
  }

  exit(layer, startBar, fadeBars = 2) {
    if (this.layers.get(layer.role) === layer) this.layers.delete(layer.role);
    const startBeat = startBar * 4;
    const bus = this.audio.bus(layer.id);
    if (bus) bus.fade(0, fadeBars * 4 * this.clock.spb(), Math.max(this.audio.ac.currentTime, this.clock.timeOf(startBeat)));
    this.scheduler.at(startBeat + fadeBars * 4 + 1, () => {
      this.coder.remove(layer);
      this.audio.dropBus(layer.id);
    });
    this.emitter.emit('layer:remove', { layer });
  }

  // ───── listener actions ─────

  find(id) { return [...this.layers.values()].find((l) => l.id === id) || null; }

  setMuted(layer, muted) {
    layer.muted = muted;
    const bus = this.audio.bus(layer.id);
    if (bus) bus.setMuted(muted);
    this.emitter.emit('layer:state', { layer });
  }

  toggleMute(id) {
    const layer = this.find(id);
    if (layer) this.setMuted(layer, !layer.muted);
  }

  toggleLock(id) {
    const layer = this.find(id);
    if (!layer) return;
    layer.locked = !layer.locked;
    this.logger.add(`${layer.role} ${layer.locked ? 'locked' : 'unlocked'}`);
    this.emitter.emit('layer:state', { layer });
  }

  regenerate(id) {
    const layer = this.find(id);
    if (layer) this.swap(layer, this.bar, 'by you', this.phraseStart(this.bar + 1));
  }

  // While its editor is open a layer is held (locked) so the composer can't change or
  // remove it under the listener's hands; closing without running restores the old lock.
  setEditing(id, editing) {
    const layer = this.find(id);
    if (!layer) return;
    layer.editing = editing;
    if (editing) {
      layer.lockedBeforeEdit = layer.locked;
      layer.locked = true;
    } else if (!layer.pattern.edited && layer.lockedBeforeEdit != null) {
      layer.locked = layer.lockedBeforeEdit;
    }
    this.emitter.emit('layer:state', { layer });
  }

  // Code typed in the editor: heard from the next bar.
  applyCode(id, code) {
    return this.liveEdit(id, code, { desc: 'edited by you', final: true, restart: true });
  }

  // Code changed by the listener (editor, dragged numbers, sound panel). The layer is
  // locked, its code becomes a "user_" pattern the composer can reuse later, and that
  // code is the new original that resets and mutation bounds follow.
  //   final:   the gesture ended (log it, save the pattern, make long loops pick it up soon)
  //   restart: restart the loops at the next bar even if they're short
  liveEdit(id, code, { desc = 'edited by you', final = false, restart = false } = {}) {
    const layer = this.find(id);
    if (!layer) return { ok: false, error: 'this layer is gone' };
    const probe = this.coder.probe(code, final ? 8 : 2);
    if (!probe.ok) return probe;
    this.samples.preload(probe.samples);
    const res = this.coder.load(layer, code);
    if (!res.ok) return res;
    const longLoop = [...layer.loops.values()].some((l) => l.nextBeat > this.clock.beat + 4);
    if (restart || (final && longLoop)) this.coder.restartAt(layer, Math.floor(this.clock.beat / 4 + 1) * 4);

    const baseId = layer.pattern.id.replace(/^user_/, '');
    layer.pattern = Object.assign({}, layer.pattern, { id: 'user_' + baseId, code, edited: true, user: true });
    layer.base = null; // the listener's code is now the original
    if (!layer.locked) layer.locked = true;
    layer.lockedBeforeEdit = null; // an edited layer stays locked when its editor closes
    this.emitter.emit('layer:change', { layer, desc, instant: true });
    this.emitter.emit('layer:state', { layer });
    if (final) {
      this.emitter.emit('pattern:user', { pattern: layer.pattern });
      this.logger.add(`bar ${this.bar}: ${layer.role}: ${desc} (by you, locked)`);
    }
    return { ok: true };
  }

  forceMove() { this.nextMove = this.bar + 1; }

  // Swaps every playing layer for a fresh pattern of the same role, from the next phrase.
  // Locked layers and the one open in the editor stay. Returns how many changed.
  refreshAll() {
    const start = this.phraseStart(this.bar + 1);
    let n = 0;
    for (const layer of [...this.layers.values()]) {
      if (layer.locked || layer.editing) continue;
      this.swap(layer, this.bar, 'refresh', start);
      n++;
    }
    this.logger.add(n ? `refresh: ${n} layer${n > 1 ? 's' : ''} swapped` : 'refresh: every layer is locked', 'event');
    return n;
  }

  // ───── steering by hand ─────

  // The arc section that matches what the listener is doing on manual, or null when
  // nothing structural is on manual. Layers lead, read together with the tempo when that is
  // on manual too (`ratio`: their tempo against the genre's; 1 when the tempo is on auto, as
  // the auto tempo follows the section itself). Tempo alone counts when layers are on auto.
  // `dir` is the way the layer count last moved (-1 down, +1 up).
  //               slower (< ×0.94)            normal                 faster (> ×1.04)
  //   1-2 layers  suspense (sparse going down) sparse / drift         build
  //   3-4 layers  dread going down, else drift drift / build          tension
  //   5-6 layers  dread                        tension / peak         surge (peak with 6)
  // Going down from full at a normal tempo gives release, or collapse after a peak.
  static sectionForLayers(n, dir, current, ratio = 1) {
    const slow = ratio < 0.94, fast = ratio > 1.04;
    const falling = () => (['peak', 'surge', 'collapse'].includes(current) ? 'collapse' : 'release');
    if (n <= 2) {
      if (slow) return dir < 0 ? 'sparse' : 'suspense';
      if (fast) return 'build';
      return n <= 1 ? 'sparse' : dir < 0 ? falling() : 'drift';
    }
    if (n <= 4) {
      if (slow) return dir < 0 ? 'dread' : 'drift';
      if (fast) return 'tension';
      return dir < 0 ? falling() : n === 4 ? 'build' : 'drift';
    }
    if (slow) return 'dread';
    if (fast) return n >= 6 ? 'peak' : 'surge';
    return n >= 6 ? 'peak' : 'tension';
  }

  static sectionForTempo(ratio) {
    if (ratio >= 1.09) return 'surge';
    if (ratio >= 1.03) return 'tension';
    if (ratio <= 0.86) return 'sparse';
    if (ratio <= 0.95) return 'drift';
    return 'build';
  }

  steeredSection() {
    const S = this.settings;
    const ratio = S.get('bpmAuto') ? 1 : S.get('bpm') / this.drift.tempo();
    if (!S.get('densityAuto')) return Composer.sectionForLayers(S.get('density'), this.steerDir || 0, this.arc.section, ratio);
    if (!S.get('bpmAuto')) return Composer.sectionForTempo(ratio);
    return null;
  }

  // Holds the arc where the listener has taken it, or lets it go on from there.
  steer(bar = this.bar) {
    const want = this.steeredSection();
    if (!want) {
      if (this.arc.held) this.logger.add(`bar ${bar}: back on auto, carrying on from ${this.arc.section.toUpperCase()}`, 'event');
      this.arc.letGo(bar);
      return;
    }
    const tempo = this.settings.get('bpmAuto') ? null : this.settings.get('bpm') / this.drift.tempo();
    const changed = this.arc.hold(want, bar, tempo);
    if (changed) {
      this.logger.add(`bar ${bar}: section → ${changed.toUpperCase()} (by hand)`, 'event');
      this.leanGenre();
      this.drift.rethinkNext(); // the genre after this one should suit the new register
      this.preloadNextGenre();
    }
  }

  // The listener's register also leans the choice of the next genre (slow and sparse →
  // calmer, darker genres; full and fast → excited ones), fading with the arc's lean.
  leanGenre() {
    const l = this.arc.lean;
    this.drift.lean = l && { energy: 0.25 + 0.6 * l.level, bpm: this.drift.tempo() * l.tempo, strength: l.strength };
  }

  skipSection() {
    this.arc.skip(this.bar + 1);
    this.logger.add('section skipped', 'event');
  }

  skipGenre() {
    this.drift.skip();
    this.preloadNextGenre();
    this.logger.add('genre skipped forward', 'event');
  }

  onSetting({ name, value }) {
    if (name === 'density') {
      this.nextMove = Math.min(this.nextMove, this.bar + 1);
      // Which way the listener is going: from their last setting, or from what's playing.
      const from = this.settings.get('densityAuto') || this.lastDensity == null ? this.layers.size : this.lastDensity;
      if (value !== from) this.steerDir = Math.sign(value - from);
      this.lastDensity = value;
    }
    if (name === 'densityAuto') this.nextMove = Math.min(this.nextMove, this.bar + 1);
    if (name === 'steps') {
      if (value === 'auto') this.logger.add('steps → auto', 'event');
      else this.followMeter();
    }
    if (['density', 'densityAuto', 'bpm', 'bpmAuto'].includes(name)) this.steer();
    if (name === 'pace') this.nextMove = Math.min(this.nextMove, this.bar + this.pace());
    if (name === 'paceAuto' && value) this.rollPace(this.bar);
    if (name === 'freeze' && !value) this.nextMove = this.bar + this.pace();
    if (name === 'bpm' && !this.settings.get('bpmAuto')) this.clock.glideTo(value, 8);
    if (name === 'bpmAuto') this.clock.glideTo(value ? Math.round(this.drift.tempo() * this.arc.tempo) : this.settings.get('bpm'), 16);
    if (name === 'key') this.harmony.request({ key: value === 'auto' ? this.harmony.key : value });
    if (name === 'mode') this.harmony.request({ mode: value === 'auto' ? this.harmony.planFor(this.genre, this.rng).mode : value });
    if (name === 'genres') {
      const was = this.drift.dominant();
      this.drift.setAllowed(value);
      this.preloadNextGenre();
      this.logger.add(`genres: ${this.drift.allowed.map((g) => RA.Genres.label(g)).join(' · ')}`, 'event');
      // The style playing now was turned off: move to the new one and swap the layers.
      if (!this.drift.allowed.includes(was)) {
        this.followGenre(this.bar);
        this.refreshAll();
      }
    }
  }
};
