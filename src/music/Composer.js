// Composer: the radio's DJ. Once per bar it follows the mood (harmony, tempo) and the arc
// (sparse ... tension: layer count, tempo, delay/vibrato colour), sometimes plays an effect
// pad or moves the delay time, and every `pace` bars makes one move: add or drop a layer
// toward the target, replace the layer that fits the mood worst, swap one for variety,
// reset one to its original code, or mutate one. Recently heard patterns are avoided.
// Locked layers are never touched. Emits layer:add / layer:change / layer:remove.
RA.Composer = class Composer {
  static ROLE_ORDER = {
    fog: ['keys', 'drums', 'texture', 'bass', 'perc', 'lead'],
    dub: ['keys', 'drums', 'bass', 'texture', 'perc', 'lead'],
    deep: ['keys', 'texture', 'bass', 'lead', 'drums', 'perc'],
    space: ['keys', 'lead', 'texture', 'bass', 'perc', 'drums'],
    atmos: ['drums', 'bass', 'keys', 'perc', 'lead', 'texture'],
    rave: ['drums', 'bass', 'lead', 'keys', 'perc', 'texture'],
    dark: ['texture', 'keys', 'bass', 'drums', 'lead', 'perc'],
    industrial: ['drums', 'texture', 'bass', 'perc', 'keys', 'lead'],
    ae: ['perc', 'drums', 'bass', 'texture', 'lead', 'keys'],
  };

  static CALM = ['sparse', 'drift', 'release', 'collapse'];

  constructor({ bank, coder, audio, samples, harmony, mood, arc, fx = null, instruments = null, mutator, settings, clock, scheduler, rng, emitter, logger, fast }) {
    Object.assign(this, { bank, coder, audio, samples, harmony, mood, arc, fx, instruments, mutator, settings, clock, scheduler, rng, emitter, logger, fast });
    this.layers = new Map(); // role -> Layer
    this.bar = 0;
    this.nextMove = 0;
    this.energy = mood.intensity();
    this.flavour = mood.dominant();
    this.serial = 0;
    this.recent = [];        // last pattern ids heard, avoided when choosing
  }

  // ───── lifecycle ─────

  start() {
    this.harmony.key = 40 + this.rng.int(0, 11);
    const plan = this.harmony.planFor(this.flavour, this.rng);
    this.harmony.mode = this.settings.get('mode') !== 'auto' ? this.settings.get('mode') : plan.mode;
    this.harmony.prog = plan.prog;
    if (this.settings.get('key') !== 'auto') this.harmony.key = 40 + RA.MathUtil.mod(this.settings.get('key') - 40, 12);
    const bpm = this.settings.get('bpmAuto') ? this.mood.tempo() : this.settings.get('bpm');
    this.clock.bpm = this.clock.target = bpm;
    this.settings.on('change', (e) => this.onSetting(e));
    this.logger.add(`mood: ${RA.Mood.LABELS[this.flavour]} (${this.flavour}) · ${this.harmony.keyName()} · ${bpm} BPM`, 'mood');
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
    if (this.mood.advanceBar(this.clock.bpm)) this.preloadNextFlavour();
    this.steer(bar);
    const section = this.arc.advanceBar(bar, 240 / this.clock.bpm);
    this.leanMood();
    this.energy = RA.MathUtil.clamp(this.mood.intensity() + this.arc.boost, 0.03, 1);
    if (section) {
      this.logger.add(`bar ${bar}: section → ${section.toUpperCase()}`, 'mood');
      if (this.settings.get('densityAuto')) this.nextMove = Math.min(this.nextMove, bar + 1);
    }
    if (this.fx) this.fx.setArc(this.arc.value);
    if (bar % 4 === 0) {
      this.followMood(bar);
      const change = this.harmony.applyPending();
      if (change) this.logger.add(`bar ${bar}: harmony → ${change}`, 'mood');
      if (this.settings.get('bpmAuto')) {
        const t = Math.round(this.mood.tempo() * this.arc.tempo);
        if (Math.abs(t - this.clock.target) >= 1) this.clock.glideTo(t, 32);
      }
    }
    if (this.fx) {
      this.fx.syncTempo(this.clock.bpm);
      this.autoFx(bar);
      this.autoDelay(bar);
    }
    // Freeze stops all changes, except bringing in the first two layers so it's never silent.
    const frozen = this.settings.get('freeze') && this.layers.size >= 2;
    // Off the layer target (the listener's count, or the arc moved): don't wait a whole pace.
    if (this.layers.size !== this.target()) this.nextMove = Math.min(this.nextMove, bar + this.interval());
    if (!frozen && bar >= this.nextMove) {
      this.move(bar);
      this.nextMove = bar + this.interval();
    }
    this.scheduler.at((bar + 1) * 4, () => this.onBar(bar + 1));
  }

  preloadNextFlavour() {
    this.preloadFor(Object.assign(RA.Mood.zeroWeights(), { [this.mood.next()]: 1 }));
  }

  followMood(bar) {
    const dom = this.mood.dominant();
    if (dom === this.flavour) return;
    this.flavour = dom;
    const change = this.harmony.planFor(dom, this.rng);
    // The listener's key and mode choices always win over the mood's.
    if (this.settings.get('mode') !== 'auto') change.mode = this.settings.get('mode');
    if (this.settings.get('key') === 'auto') change.key = this.harmony.key + this.rng.pick([0, 5, 7, -3]);
    this.harmony.request(change);
    this.nextMove = Math.min(this.nextMove, bar + (this.fast ? 1 : 4)); // start handing over soon
    this.logger.add(`bar ${bar}: mood → ${RA.Mood.LABELS[dom]} (${dom})`, 'mood');
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
      : [['throw', 3], ['sweep', 2], ['stutter', 2], ['dub', 1], ['tapestop', sec === 'tension' ? 0.6 : sec === 'peak' ? 1.2 : 0]]);
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

  pace() { return this.fast ? Math.max(1, Math.round(this.settings.get('pace') / 8)) : this.settings.get('pace'); }

  // How many layers to aim for. With density on auto the arc leads (sparse sections drop
  // to one or two layers, up to AUTO_MAX at the peaks); otherwise exactly the number the
  // listener set.
  static AUTO_MAX = 5;

  target() {
    if (this.settings.get('densityAuto')) {
      const d = Composer.AUTO_MAX;
      const level = this.arc.level * 0.8 + this.energy * 0.2;
      return RA.MathUtil.clamp(Math.round(1 + level * (d - 1)), 1, d);
    }
    return RA.MathUtil.clamp(this.settings.get('density'), 1, RA.PatternBank.ROLES.length);
  }

  // Build up quickly at the start, follow the target quickly when it thins out or fills up,
  // and hand over quickly when the mood has moved on; otherwise follow the pace knob.
  interval() {
    const target = this.target();
    const building = this.layers.size < target && this.bar < 64;
    const offTarget = Math.abs(this.layers.size - target) >= 1;
    const w = this.mood.weights();
    const outOfMood = [...this.layers.values()].some((l) => !l.locked && this.misfit(l, w));
    if (offTarget) return Math.min(this.pace(), this.fast ? 1 : 2);
    return building || outOfMood ? Math.min(this.pace(), this.fast ? 1 : 4) : this.pace();
  }

  // A pattern for a role, avoiding what was heard recently when there's a choice.
  pickPattern(role, exclude = []) {
    const w = this.mood.weights();
    const meter = this.meter();
    // With STEPS chosen, a fitting pattern (even one heard recently) beats any other;
    // roles with none that fit fall back to the usual choice.
    const tries = [[exclude.concat(this.recent), meter], [exclude, meter], [exclude.concat(this.recent), null], [exclude, null]];
    for (const [ex, m] of meter ? tries : tries.slice(2)) {
      const p = this.bank.pick(role, w, this.energy, this.rng, ex, m);
      if (p) return p;
    }
    return null;
  }

  // The step count the listener chose (STEPS), or null on auto.
  meter() {
    const steps = this.settings.get('steps');
    return steps === 'auto' || steps == null ? null : { steps: +steps, probe: (code) => this.coder.probe(code, 8) };
  }

  // A layer that no longer suits the mood, unless it's there for the listener's STEPS.
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
    this.logger.add(`steps → ${meter.steps}${n ? ` (${n} layer${n > 1 ? 's' : ''} swapped)` : ''}`, 'mood');
  }

  remember(id) {
    this.recent.push(id);
    if (this.recent.length > 12) this.recent.shift();
  }

  // Layers enter on 4-bar boundaries, where the chords change.
  phraseStart(bar) { return Math.ceil(bar / 4) * 4; }

  // ───── moves ─────

  move(bar) {
    const w = this.mood.weights();
    const free = [...this.layers.values()].filter((l) => !l.locked);
    // Far from the target, two layers enter or leave at once, so the count catches up quickly.
    const target = this.target();
    if (this.layers.size < target) {
      for (let k = Math.min(2, target - this.layers.size); k > 0; k--) this.add(bar);
      return;
    }
    if (this.layers.size > target && free.length) {
      for (let k = Math.min(2, this.layers.size - target); k > 0; k--) {
        const left = [...this.layers.values()].filter((l) => !l.locked);
        if (left.length) this.drop(bar, left);
      }
      return;
    }
    if (!free.length) return;

    const worst = free.slice().sort((a, b) => this.bank.fit(a.pattern, w) - this.bank.fit(b.pattern, w))[0];
    const misfit = this.misfit(worst, w) ? worst : free.find((l) => this.misfit(l, w));
    if (misfit) return this.swap(misfit, bar, 'mood');

    const v = this.settings.get('variation');
    const r = this.rng.next();
    const pSwap = 0.08 + 0.3 * v;
    const pReset = 0.2 * (1 - v);
    if (r < pSwap) return this.swap(this.rng.pick(free), bar, 'variety');
    if (r < pSwap + pReset) {
      const drifted = free.filter((l) => l.code !== l.pattern.code);
      if (drifted.length) return this.reset(this.rng.pick(drifted), bar);
    }
    return this.mutate(this.rng.pick(free), bar);
  }

  // The next role is drawn at random, favouring the ones that suit the mood first.
  add(bar) {
    const missing = Composer.ROLE_ORDER[this.mood.dominant()].filter((r) => !this.layers.has(r));
    if (!missing.length) return;
    const first = this.rng.weighted(missing.map((r, k) => [r, 1 / (k + 1)]));
    for (const role of [first, ...this.rng.shuffle(missing.filter((r) => r !== first))]) {
      const pattern = this.pickPattern(role);
      if (!pattern) continue;
      if (this.enter(role, pattern, this.phraseStart(bar))) this.logger.add(`bar ${bar}: + ${role} (${pattern.id})`);
      return;
    }
  }

  drop(bar, free) {
    const w = this.mood.weights();
    const order = Composer.ROLE_ORDER[this.mood.dominant()];
    // In calm sections the beat goes first, leaving pads, melodies and echoes.
    const calm = Composer.CALM.includes(this.arc.section);
    const beat = (l) => (calm && (l.role === 'drums' || l.role === 'perc') ? -1 : 0);
    const score = (l) => this.bank.fit(l.pattern, w) + 0.1 * (order.length - order.indexOf(l.role)) + beat(l);
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
      const m = this.mutator.mutate(layer.code, layer.pattern.code, v);
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

  reset(layer, bar) {
    if (!this.coder.load(layer, this.fullCode(layer.pattern.code)).ok) return;
    this.emitter.emit('layer:change', { layer, desc: 'back to original' });
    this.logger.add(`bar ${bar}: ${layer.role} back to its original code`);
  }

  enter(role, pattern, startBar) {
    const code = this.fullCode(pattern.code);
    const probe = this.coder.probe(code);
    if (!probe.ok) { this.logger.add(`skipped ${pattern.id}: ${probe.error}`, 'err'); return null; }
    this.samples.preload(probe.samples);
    const layer = new RA.Layer({ id: `${role}-${++this.serial}`, role, pattern });
    const startBeat = startBar * 4;
    const res = this.coder.load(layer, code, startBeat);
    if (!res.ok) { this.logger.add(`skipped ${pattern.id}: ${res.error}`, 'err'); return null; }
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
    this.logger.add(n ? `refresh: ${n} layer${n > 1 ? 's' : ''} swapped` : 'refresh: every layer is locked', 'mood');
    return n;
  }

  // ───── steering by hand ─────

  // The arc section that matches what the listener is doing on manual, or null when
  // nothing structural is on manual. Layers lead; tempo counts when layers are on auto.
  // `dir` is the way the layer count last moved (-1 down, +1 up).
  static sectionForLayers(n, dir, current) {
    if (n <= 1) return 'sparse';
    if (n >= 6) return 'peak';
    if (n === 5) return 'tension';
    if (dir < 0) return current === 'peak' || current === 'collapse' ? 'collapse' : 'release';
    return n === 4 ? 'build' : 'drift';
  }

  static sectionForTempo(ratio) {
    if (ratio >= 1.09) return 'peak';
    if (ratio >= 1.03) return 'tension';
    if (ratio <= 0.86) return 'sparse';
    if (ratio <= 0.95) return 'drift';
    return 'build';
  }

  steeredSection() {
    const S = this.settings;
    if (!S.get('densityAuto')) return Composer.sectionForLayers(S.get('density'), this.steerDir || 0, this.arc.section);
    if (!S.get('bpmAuto')) return Composer.sectionForTempo(S.get('bpm') / this.mood.tempo());
    return null;
  }

  // Holds the arc where the listener has taken it, or lets it go on from there.
  steer(bar = this.bar) {
    const want = this.steeredSection();
    if (!want) {
      if (this.arc.held) this.logger.add(`bar ${bar}: back on auto, carrying on from ${this.arc.section.toUpperCase()}`, 'mood');
      this.arc.letGo(bar);
      return;
    }
    const tempo = this.settings.get('bpmAuto') ? null : this.settings.get('bpm') / this.mood.tempo();
    const changed = this.arc.hold(want, bar, tempo);
    if (changed) {
      this.logger.add(`bar ${bar}: section → ${changed.toUpperCase()} (by hand)`, 'mood');
      this.leanMood();
      this.mood.rethinkNext(); // the mood after this one should suit the new register
      this.preloadNextFlavour();
    }
  }

  // The listener's register also leans the choice of the next mood (slow and sparse →
  // calmer, darker moods; full and fast → excited ones), fading with the arc's lean.
  leanMood() {
    const l = this.arc.lean;
    this.mood.lean = l && { energy: 0.25 + 0.6 * l.level, bpm: this.mood.tempo() * l.tempo, strength: l.strength };
  }

  skipSection() {
    this.arc.skip(this.bar + 1);
    this.logger.add('section skipped', 'mood');
  }

  skipMood() {
    this.mood.skip();
    this.preloadNextFlavour();
    this.logger.add('mood skipped forward', 'mood');
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
      if (value === 'auto') this.logger.add('steps → auto', 'mood');
      else this.followMeter();
    }
    if (['density', 'densityAuto', 'bpm', 'bpmAuto'].includes(name)) this.steer();
    if (name === 'pace') this.nextMove = Math.min(this.nextMove, this.bar + this.pace());
    if (name === 'freeze' && !value) this.nextMove = this.bar + this.pace();
    if (name === 'bpm' && !this.settings.get('bpmAuto')) this.clock.glideTo(value, 8);
    if (name === 'bpmAuto') this.clock.glideTo(value ? Math.round(this.mood.tempo() * this.arc.tempo) : this.settings.get('bpm'), 16);
    if (name === 'key') this.harmony.request({ key: value === 'auto' ? this.harmony.key : value });
    if (name === 'mode') this.harmony.request({ mode: value === 'auto' ? this.harmony.planFor(this.flavour, this.rng).mode : value });
    if (name === 'styles') {
      const was = this.mood.dominant();
      this.mood.setStyles(value);
      this.preloadNextFlavour();
      this.logger.add(`styles: ${this.mood.allowed.map((f) => RA.Mood.LABELS[f]).join(' · ')}`, 'mood');
      // The style playing now was turned off: move to the new one and swap the layers.
      if (!this.mood.allowed.includes(was)) {
        this.followMood(this.bar);
        this.refreshAll();
      }
    }
  }
};
