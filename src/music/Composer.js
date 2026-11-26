import { MathUtil } from '../core/MathUtil.js';
import { CodeTools } from '../lang/CodeTools.js';
import { Arc } from './Arc.js';
import { Families } from './Families.js';
import { FxAuto } from './FxAuto.js';
import { Genres } from './Genres.js';
import { Layers } from './Layers.js';
import { PatternBank } from './PatternBank.js';
import { Steering } from './Steering.js';
import { Transitions } from './Transitions.js';

// Composer: the radio's DJ, the one that decides. Once per bar it follows the genre and the
// arc (sections: layer count, tempo, colour), and every `pace` bars makes one move: add or
// drop layers toward the target, replace a layer that no longer fits the genre, or one move
// chosen by score (see candidates()): swap a pattern, play a new version of it, change an
// instrument for another of its family, tweak a number, reset, drop a layer out for a few
// bars, reharmonise, scatter a collage phrase, push or drag the tempo.
// The work is shared out:
//   deck         Layers: the layers playing and their life (enter, fade, swap, edits)
//   transitions  Transitions: genre hand-overs and how layers fade in and out
//   steering     Steering: what the listener does by hand
//   fxAuto       FxAuto: effect pads, delay jumps, breaks and fills
// Versions, timbres and tweaks only change a layer's params({ ... }) line (see Variation).
// Locked layers are never touched. Emits layer:add / layer:change / layer:remove.
export class Composer {
  static CALM = ['sparse', 'drift', 'release', 'collapse', 'suspense'];

  constructor({ bank, coder, audio, samples, harmony, drift, arc, fx = null, instruments = null, settings, clock, scheduler, rng, emitter, logger, fast }) {
    Object.assign(this, { bank, coder, audio, samples, harmony, drift, arc, fx, instruments, settings, clock, scheduler, rng, emitter, logger, fast });
    this.bar = 0;
    this.nextMove = 0;
    this.energy = drift.intensity();
    this.genre = drift.dominant();
    this.lastHarmBar = 0;    // when the progression last changed
    this.push = null;        // { factor, until }: a short tempo push or pull
    this.autoPace = settings.get('pace'); // the pace chosen on auto (see rollPace), and until when
    this.paceUntil = 0;
    this.deck = new Layers(this);
    this.transitions = new Transitions(this);
    this.steering = new Steering(this);
    this.fxAuto = new FxAuto(this);
  }

  // The layers playing: role -> Layer.
  get layers() { return this.deck.map; }

  // ───── lifecycle ─────

  start() {
    this.harmony.key = 40 + this.rng.int(0, 11);
    const plan = this.harmony.planFor(this.genre, this.rng);
    this.harmony.mode = this.settings.get('mode') !== 'auto' ? this.settings.get('mode') : plan.mode;
    this.harmony.prog = plan.prog;
    this.harmony.barsPerChord = plan.bars;
    if (this.settings.get('key') !== 'auto') this.harmony.key = 40 + MathUtil.mod(this.settings.get('key') - 40, 12);
    const bpm = this.settings.get('bpmAuto') ? this.drift.tempo() : this.settings.get('bpm');
    this.clock.bpm = this.clock.target = bpm;
    this.settings.on('change', (e) => this.onSetting(e));
    this.logger.add(`género: ${Genres.label(this.genre)} · ${this.harmony.keyName()} · ${bpm} BPM`, 'event');
    this.scheduler.at(0, () => this.onBar(0));
  }

  preloadFor(weights) {
    for (const p of this.bank.patterns) {
      if (this.bank.fit(p, weights) < 0.3) continue;
      const r = this.coder.probe(p.code, 4);
      if (r.ok) this.samples.preload(r.samples);
    }
  }

  // Applies the waiting harmony changes; the key only `withKey` (else it keeps waiting), or
  // when the listener chose it (keyByHand).
  applyHarmony(bar, withKey) {
    const change = this.harmony.applyPending(withKey || this.keyByHand);
    this.keyByHand = false;
    if (change) this.logger.add(`compasso ${bar}: harmonia → ${change}`, 'event');
  }

  preloadNextGenre() {
    this.preloadFor(Object.assign(Genres.zeroWeights(), { [this.drift.next()]: 1 }));
  }

  onBar(bar) {
    this.bar = bar;
    if (this.drift.advanceBar(this.clock.bpm)) this.preloadNextGenre();
    this.steering.steer(bar);
    const section = this.arc.advanceBar(bar, 240 / this.clock.bpm, this.drift.weights());
    this.steering.lean();
    this.energy = MathUtil.clamp(this.drift.intensity() + this.arc.boost, 0.03, 1);
    if (section) {
      this.logger.add(`compasso ${bar}: secção → ${Arc.label(section).toUpperCase()}`, 'event');
      if (this.settings.get('densityAuto')) this.nextMove = Math.min(this.nextMove, bar + 1);
    }
    if (this.settings.get('paceAuto') && (section || bar >= this.paceUntil)) this.rollPace(bar);
    // the tape's wow: the section's, times the genre's (Genres: wow; boc bends the most)
    if (this.fx) this.fx.setArc(Object.assign({}, this.arc.value, { wow: this.arc.value.wow * Genres.blend(this.drift.weights(), (g) => g.wow) }));
    if (this.push && bar >= this.push.until) this.push = null;
    // a key change held back for a calm moment lands right after a break
    if (bar === this.keyAfterBreak) this.applyHarmony(bar, true);
    if (bar % 4 === 0 || this.push) {
      if (bar % 4 === 0) {
        this.transitions.followGenre(bar);
        this.applyHarmony(bar, this.transitions.keyChangeAllowed());
      }
      if (this.settings.get('bpmAuto')) {
        const t = Math.round(this.drift.tempo() * this.arc.tempo * (this.push ? this.push.factor : 1));
        if (Math.abs(t - this.clock.target) >= 1) this.clock.glideTo(t, this.push ? 8 : 4 * this.settings.get('tempoGlide'));
      }
    }
    // the last bar of a section: a break or a fill (not while frozen or steered by hand)
    const lastBar = !this.arc.held && bar === this.arc.start + this.arc.length - 1;
    if (lastBar && !this.settings.get('freeze') && this.deck.size >= 2 && this.rng.chance(0.6)) {
      if (this.fxAuto.fill(bar) === 'break' && this.harmony.keyPending) this.keyAfterBreak = bar + 1;
    }
    if (this.fx) {
      this.fx.syncTempo(this.clock.bpm);
      this.fxAuto.pad(bar);
      this.fxAuto.delay(bar);
    }
    // Off the layer target (the listener's count, or the arc moved): don't wait a whole pace.
    if (this.deck.size !== this.target()) this.nextMove = Math.min(this.nextMove, bar + this.interval());
    if (bar >= this.nextMove) {
      // Freeze holds the code: no swaps, resets or tweaks. The layer count still follows
      // the listener's density (on auto it stays as it is), and the first two layers always
      // come in so it's never silent.
      const freeze = this.settings.get('freeze') && this.deck.size >= 2;
      if (!freeze) this.move(bar);
      else if (!this.settings.get('densityAuto')) this.moveCount(bar);
      this.nextMove = bar + this.interval();
    }
    this.scheduler.at((bar + 1) * 4, () => this.onBar(bar + 1));
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
    if (!first) this.logger.add(`compasso ${bar}: mudanças → a cada ${this.autoPace} compassos (${{ busy: 'agitado', middle: 'médio', calm: 'calmo' }[kind]})`);
  }

  // How many layers to aim for. With density on auto the arc section gives a range (sparse
  // 1-2 ... surge 5-6), capped by the genre (space 4, drill 6...), and the energy picks within
  // it; otherwise exactly the number the listener set.
  target() {
    if (this.settings.get('densityAuto')) {
      const cap = Arc.cap(this.drift.weights());
      const [lo0, hi0] = this.arc.spec.layers;
      const hi = Math.min(hi0, cap), lo = Math.min(lo0, hi);
      const f = MathUtil.clamp((this.energy - 0.15) / 0.7, 0, 1);
      return lo + Math.round((hi - lo) * f);
    }
    return MathUtil.clamp(this.settings.get('density'), 1, PatternBank.ROLES.length);
  }

  // Build up quickly at the start, follow the target quickly when it thins out or fills up,
  // and hand over quickly when the genre has moved on; otherwise follow the pace knob.
  interval() {
    const target = this.target();
    const building = this.deck.size < target && this.bar < 64;
    const offTarget = Math.abs(this.deck.size - target) >= 1;
    const w = this.drift.weights();
    const outOfGenre = [...this.deck.values()].some((l) => !l.locked && this.misfit(l, w));
    if (offTarget) return Math.min(this.pace(), this.fast ? 1 : 2);
    return building || outOfGenre ? Math.min(this.pace(), this.fast ? 1 : 4) : this.pace();
  }

  // ───── choosing patterns ─────

  // A pattern for a role, avoiding what was heard recently when there's a choice.
  pickPattern(role, exclude = []) {
    const w = this.drift.weights();
    const meter = this.meter();
    // With STEPS chosen, a fitting pattern (even one heard recently) beats any other;
    // roles with none that fit fall back to the usual choice.
    // Patterns heard lately or often weigh less (the session memory).
    const tired = (p) => this.deck.memory.weight(p.id, this.bar);
    const recent = this.deck.recent;
    const tries = [[exclude.concat(recent), meter], [exclude, meter], [exclude.concat(recent), null], [exclude, null]];
    for (const [ex, m] of meter ? tries : tries.slice(2)) {
      const p = this.bank.pick(role, w, this.energy, this.rng, ex, m, tired);
      if (p) return p;
    }
    return null;
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
    return !(meter && PatternBank.fits(this.bank.cycles({ code: layer.code }, meter.probe), meter.steps));
  }

  // After STEPS changes: free layers whose loops don't fit it are swapped at the next phrase.
  followMeter() {
    const meter = this.meter();
    if (!meter) return;
    const start = this.phraseStart(this.bar + 1);
    let n = 0;
    for (const layer of [...this.deck.values()]) {
      if (layer.locked || layer.editing) continue;
      if (PatternBank.fits(this.bank.cycles({ code: layer.code }, meter.probe), meter.steps)) continue;
      this.swap(layer, this.bar, `${meter.steps} passos`, start);
      n++;
    }
    this.logger.add(`passos → ${meter.steps}${n ? ` (${n} camada${n > 1 ? 's' : ''} trocada${n > 1 ? 's' : ''})` : ''}`, 'event');
  }

  // Layers enter on 4-bar boundaries, where the chords change.
  phraseStart(bar) { return Math.ceil(bar / 4) * 4; }

  // ───── moves ─────

  // Adds or drops layers toward the target. Far from it, two enter or leave at once, so
  // the count catches up quickly. Returns whether it did anything.
  moveCount(bar) {
    const target = this.target();
    if (this.deck.size < target) {
      for (let k = Math.min(2, target - this.deck.size); k > 0; k--) this.add(bar);
      return true;
    }
    if (this.deck.size > target && this.deck.free().length) {
      for (let k = Math.min(2, this.deck.size - target); k > 0; k--) {
        const left = this.deck.free();
        if (left.length) this.drop(bar, left);
      }
      return true;
    }
    return false;
  }

  move(bar) {
    const w = this.drift.weights();
    const free = this.deck.free();
    if (this.moveCount(bar)) return;
    if (!free.length) return;
    // a role the section leaves out (no drums in sparse or suspense) goes; another comes in
    const banned = this.settings.get('densityAuto') && free.find((l) => (this.arc.spec.no || []).includes(l.role));
    if (banned) {
      this.logger.add(`compasso ${bar}: − ${PatternBank.roleLabel(banned.role)} (${banned.patternId}, ${Arc.label(this.arc.section)})`);
      this.deck.exit(banned, this.phraseStart(bar));
      return;
    }

    const worst = free.slice().sort((a, b) => this.bank.fit(a.pattern, w) - this.bank.fit(b.pattern, w))[0];
    const misfit = this.misfit(worst, w) ? worst : free.find((l) => this.misfit(l, w));
    if (misfit) return this.swap(misfit, bar, 'género');

    // Everything else is chosen by score (see candidates()).
    const options = this.candidates(bar, free, w);
    const pick = this.rng.weighted(options.map((o) => [o, o.score]));
    if (pick) pick.run();
  }

  // ───── the decision scheme ─────
  //
  // Each possible move gets a score from the variation knob, the arc section, the genre, the
  // listener's weights (PARAMS) and the layer's age (bars since it came in), and one is drawn
  // by weight. So in a dub drift layers drop out for a few bars and the progression shifts; in
  // a build patterns swap; in space the radio scatters collage phrases; in a surge or dread
  // the tempo pushes or drags.

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

  // The PARAMS weight for each kind of move.
  static WEIGHTS = { swap: 'wSwap', reroll: 'wReroll', timbre: 'wTimbre', mutate: 'wMutate', reset: 'wMutate', dropout: 'wDropout', reharm: 'wReharm', collage: 'wCollage' };

  static hasNumbers(code) { return Object.values(CodeTools.paramsOf(code)).some((v) => typeof v === 'number'); }

  // [{ score, run }] for this move.
  candidates(bar, free, w) {
    const v = this.settings.get('variation');
    const sec = this.arc.section;
    const W = Composer.WEIGHTS;
    const I = (kind) => Composer.intent(kind, sec) * (W[kind] ? this.settings.get(W[kind]) : 1);
    const age = (l) => bar - (l.enteredBar == null ? bar : l.enteredBar);
    const dubby = (w.dub || 0) + 0.8 * (w.minimal || 0) + 0.4 * (w.boc || 0);
    const collagey = (w.space || 0) + (w.boc || 0) + 0.6 * (w.saw || 0) + 0.5 * (w.dark || 0) + 0.3 * (w.ae || 0);
    const variation = this.deck.variation;
    const out = [];
    for (const l of free) {
      out.push({ score: (0.08 + 0.3 * v) * MathUtil.clamp(age(l) / 48, 0.2, 2) * I('swap') / free.length, run: () => this.swap(l, bar, 'variedade') });
      // versions and timbres only where the genre has other instruments or kits for its params;
      // tweaks only where it has numbers
      const params = CodeTools.paramsOf(l.code);
      if (Object.values(params).some((x) => typeof x === 'string' && variation.options(x, this.genre).length)) {
        out.push({ score: 0.2 * (0.5 + v) * MathUtil.clamp(age(l) / 24, 0.3, 1.5) * I('reroll') / free.length, run: () => this.reroll(l, bar) });
      }
      if (variation.canTimbre(params, this.genre)) {
        out.push({ score: 0.12 * (0.5 + v) * I('timbre') / free.length, run: () => this.timbre(l, bar) });
      }
      if (Composer.hasNumbers(l.code)) out.push({ score: 0.35 * I('mutate') / free.length, run: () => this.mutate(l, bar) });
      if (l.code !== this.deck.fullCode(l.base || l.pattern.code)) out.push({ score: 0.15 * (1 - v) * I('reset') / free.length, run: () => this.deck.reset(l, bar) });
      if (free.length >= 2 && !l.muted) out.push({ score: (0.04 + 0.25 * dubby) * I('dropout') / free.length, run: () => this.dropout(l, bar) });
    }
    if (this.settings.get('key') === 'auto' || this.settings.get('mode') === 'auto') {
      out.push({ score: (0.04 + 0.2 * MathUtil.clamp((bar - this.lastHarmBar) / 48, 0, 1.5)) * I('reharm'), run: () => this.reharmonize(bar) });
    }
    if (this.deck.size) out.push({ score: (0.03 + 0.25 * collagey) * I('collage'), run: () => this.collageEvent(bar) });
    if (this.settings.get('bpmAuto')) out.push({ score: 0.15 * I('tempo'), run: () => this.tempoPush(bar) });
    return out.filter((o) => o.score > 0);
  }

  // The same pattern, another version (other instruments and kits of the genre), with the
  // layer's head (fx line, mutes) kept.
  reroll(layer, bar) {
    const r = this.deck.roll(layer.pattern);
    if (!r.changes.length) return;
    const params = CodeTools.paramsOf(r.code);
    if (!this.deck.loadParams(layer, params, 'versão nova: ' + r.changes.slice(0, 3).join(', '), bar)) return;
    layer.base = r.code;
    this.deck.memory.note(layer.patternId, r.sig, bar);
  }

  // One instrument of the layer swapped for another of its family in this genre (same notes).
  timbre(layer, bar) {
    const r = this.deck.variation.timbre(CodeTools.paramsOf(layer.code), this.genre);
    if (r) this.deck.loadParams(layer, r.params, r.change, bar);
  }

  // A small move of one of the layer's numeric params (odds...), near the pattern's own value.
  mutate(layer, bar) {
    const original = CodeTools.paramsOf(layer.base || layer.pattern.code);
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = this.deck.variation.tweak(CodeTools.paramsOf(layer.code), original, this.settings.get('variation'));
      if (r && this.deck.loadParams(layer, r.params, r.change, bar)) return;
    }
  }

  // Dub-style drop: the layer goes quiet for 1-4 bars from the next bar, then comes back.
  dropout(layer, bar) {
    const bus = this.audio.bus(layer.id);
    if (!bus) return;
    const bars = this.rng.pick([1, 2, 2, 4]);
    const from = (bar + 1) * 4, to = from + bars * 4;
    const spb = this.clock.spb();
    bus.fade(0, 0.25 * spb, Math.max(this.audio.ac.currentTime, this.clock.timeOf(from)));
    this.scheduler.at(to, (t) => { if (this.deck.get(layer.role) === layer) bus.fade(1, 0.5 * spb, t); }, null);
    this.logger.add(`compasso ${bar}: ${PatternBank.roleLabel(layer.role)} cala-se ${bars} compasso${bars > 1 ? 's' : ''}`);
  }

  // A new progression within the genre (sometimes a key move too), from the next 4 bars.
  reharmonize(bar) {
    const change = this.harmony.reharm(this.genre, this.rng, this.settings.get('key') === 'auto' ? this.settings.get('modulate') : 0);
    if (this.settings.get('mode') !== 'auto') change.mode = this.settings.get('mode');
    this.harmony.request(change);
    this.lastHarmBar = bar;
    this.logger.add(`compasso ${bar}: nova progressão${change.key != null ? ' e modulação' : ''}`, 'event');
  }

  // A short collage phrase (voices, radio, field sounds) over the texture, FSOL-style.
  collageEvent(bar) {
    const pool = Families.collagePool(this.drift.weights());
    const layer = this.deck.get('texture') || this.deck.get('keys') || [...this.deck.values()][0];
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
    this.logger.add(`compasso ${bar}: colagem (${names.join(', ')})`);
  }

  // Surge pushes the tempo on (+3-6%) for 4-8 bars; dread and collapse drag it back.
  tempoPush(bar) {
    const up = ['surge', 'peak'].includes(this.arc.section);
    const factor = up ? this.rng.float(1.03, 1.06) : this.rng.float(0.94, 0.97);
    this.push = { factor, until: bar + this.rng.int(4, 8) };
    this.logger.add(`compasso ${bar}: tempo ${up ? 'acelera' : 'trava'} ${Math.round((factor - 1) * 100)}%`);
  }

  // The next role is drawn at random, favouring the ones the section wants first, then the
  // ones that suit the genre. Roles the section leaves out only come in when the listener's
  // count needs them.
  add(bar) {
    const spec = this.arc.spec;
    let missing = Genres.of(this.drift.dominant()).roleOrder.filter((r) => !this.deck.has(r));
    const allowed = missing.filter((r) => !(spec.no || []).includes(r));
    if (allowed.length || this.settings.get('densityAuto')) missing = allowed;
    if (!missing.length) return;
    const wants = spec.first || [];
    missing.sort((a, b) => (wants.includes(b) ? 1 : 0) - (wants.includes(a) ? 1 : 0));
    const first = this.rng.weighted(missing.map((r, k) => [r, 1 / (k + 1)]));
    for (const role of [first, ...this.rng.shuffle(missing.filter((r) => r !== first))]) {
      const pattern = this.pickPattern(role);
      if (!pattern) continue;
      const layer = this.deck.enter(role, pattern, this.phraseStart(bar));
      if (layer) this.logger.add(`compasso ${bar}: + ${PatternBank.roleLabel(role)} (${pattern.id}${layer.changes.length ? ': ' + layer.changes.slice(0, 2).join(', ') : ''})`);
      return;
    }
  }

  drop(bar, free) {
    const w = this.drift.weights();
    const order = Genres.of(this.drift.dominant()).roleOrder;
    // In calm sections the beat goes first, leaving pads, melodies and echoes.
    const calm = Composer.CALM.includes(this.arc.section);
    const beat = (l) => (calm && (l.role === 'drums' || l.role === 'perc') ? -1 : 0);
    // roles the section leaves out go first; the ones it wants first go last
    const spec = this.arc.spec;
    const sec = (l) => ((spec.no || []).includes(l.role) ? -2 : (spec.first || []).includes(l.role) ? 1 : 0);
    const score = (l) => this.bank.fit(l.pattern, w) + 0.1 * (order.length - order.indexOf(l.role)) + beat(l) + sec(l);
    const layer = free.slice().sort((a, b) => score(a) - score(b))[0];
    this.logger.add(`compasso ${bar}: − ${PatternBank.roleLabel(layer.role)} (${layer.patternId})`);
    this.deck.exit(layer, this.phraseStart(bar));
  }

  // Another pattern in this layer's role, from the next phrase.
  swap(layer, bar, why, startBar = this.phraseStart(bar)) {
    const pattern = this.pickPattern(layer.role, [layer.patternId]);
    if (!pattern) return this.mutate(layer, bar);
    if (this.deck.replace(layer, pattern, startBar)) this.logger.add(`compasso ${bar}: ${PatternBank.roleLabel(layer.role)} ${layer.patternId} → ${pattern.id} (${why})`);
  }

  // ───── the listener's requests ─────

  regenerate(id) {
    const layer = this.deck.find(id);
    if (layer) this.swap(layer, this.bar, 'por ti', this.phraseStart(this.bar + 1));
  }

  forceMove() { this.nextMove = this.bar + 1; }

  // Swaps every playing layer for a fresh pattern of the same role, from the next phrase.
  // Locked layers and the one open in the editor stay. Returns how many changed.
  refreshAll() {
    const start = this.phraseStart(this.bar + 1);
    let n = 0;
    for (const layer of [...this.deck.values()]) {
      if (layer.locked || layer.editing) continue;
      this.swap(layer, this.bar, 'renovar', start);
      n++;
    }
    this.logger.add(n ? `renovar: ${n} camada${n > 1 ? 's' : ''} trocada${n > 1 ? 's' : ''}` : 'renovar: todas as camadas estão bloqueadas', 'event');
    return n;
  }

  skipSection() {
    this.arc.skip(this.bar + 1);
    this.logger.add('secção saltada', 'event');
  }

  skipGenre() {
    this.drift.skip();
    this.preloadNextGenre();
    this.logger.add('género seguinte', 'event');
  }

  onSetting({ name, value }) {
    if (name === 'density') {
      this.nextMove = Math.min(this.nextMove, this.bar + 1);
      this.steering.noteDensity(value);
    }
    if (name === 'densityAuto') this.nextMove = Math.min(this.nextMove, this.bar + 1);
    if (name === 'steps') {
      if (value === 'auto') this.logger.add('passos → auto', 'event');
      else this.followMeter();
    }
    if (['density', 'densityAuto', 'bpm', 'bpmAuto'].includes(name)) this.steering.steer();
    if (name === 'pace') this.nextMove = Math.min(this.nextMove, this.bar + this.pace());
    if (name === 'paceAuto' && value) this.rollPace(this.bar);
    if (name === 'freeze' && !value) this.nextMove = this.bar + this.pace();
    if (name === 'bpm' && !this.settings.get('bpmAuto')) this.clock.glideTo(value, 8);
    if (name === 'bpmAuto') this.clock.glideTo(value ? Math.round(this.drift.tempo() * this.arc.tempo) : this.settings.get('bpm'), 16);
    if (name === 'key') {
      this.harmony.request({ key: value === 'auto' ? this.harmony.key : value });
      this.keyByHand = true; // the listener's key comes in at the next 4 bars, calm or not
    }
    if (name === 'mode') this.harmony.request({ mode: value === 'auto' ? this.harmony.planFor(this.genre, this.rng).mode : value });
    if (name === 'genres') {
      const was = this.drift.dominant();
      this.drift.setAllowed(value);
      this.preloadNextGenre();
      this.logger.add(`géneros: ${this.drift.allowed.map((g) => Genres.label(g)).join(' · ')}`, 'event');
      // The genre playing now was turned off: move to the new one and swap the layers.
      if (!this.drift.allowed.includes(was)) {
        this.transitions.followGenre(this.bar);
        this.refreshAll();
      }
    }
  }
};
