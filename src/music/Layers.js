import { PatternBank } from './PatternBank.js';
import { CodeTools } from '../lang/CodeTools.js';
import { Layer } from '../lang/Layer.js';
import { Memory } from './Memory.js';
import { Variation } from './Variation.js';

// Layers: the layers playing (one per role) and everything about their life: coming in as a
// fresh version of their pattern, fading out, being swapped, getting new params, being muted,
// locked or edited by the listener. The Composer decides; this class carries it out.
// `c` is the Composer (its clock, coder, audio, settings, genre...). `map`: role -> Layer.
export class Layers {
  constructor(c) {
    this.c = c;
    this.map = new Map();
    this.serial = 0;
    this.recent = [];              // last pattern ids heard, avoided when choosing
    this.solos = new Set();        // roles on solo [S]: when any is on, only they are heard
    this.memory = new Memory(); // everything heard this session (fatigue, versions)
    this.variation = new Variation({
      rng: c.rng,
      synthExists: (n) => (c.instruments ? c.instruments.has(n) : true),
      sampleCount: (f) => c.samples.count(f),
    });
  }

  get size() { return this.map.size; }
  get(role) { return this.map.get(role); }
  has(role) { return this.map.has(role); }
  values() { return this.map.values(); }
  free() { return [...this.map.values()].filter((l) => !l.locked); }
  find(id) { return [...this.map.values()].find((l) => l.id === id) || null; }

  // A layer's code carries everything that makes its sound: the inst(...) definitions of
  // the instruments it plays, then the pattern.
  fullCode(code) {
    return this.c.instruments ? CodeTools.withInstruments(code, this.c.instruments) : code;
  }

  // A new version of a pattern: some of its params (instruments, kits) swapped for others
  // of their family that the genre allows. Tries a few times for a version not heard this
  // session. Returns { code, changes, sig }.
  roll(pattern) {
    const params = CodeTools.paramsOf(pattern.code);
    const strength = 0.3 + 0.7 * this.c.settings.get('variation');
    let r = null;
    for (let k = 0; k < 4; k++) {
      r = this.variation.version(params, this.c.genre, strength);
      if (!this.memory.heard(pattern.id + r.sig)) break;
    }
    const code = r.changes.length ? CodeTools.setParams(pattern.code, r.params) : pattern.code;
    return { code, changes: r.changes, sig: pattern.id + r.sig };
  }

  // Loads new params into a layer (its code with the params line rewritten).
  loadParams(layer, params, desc, bar) {
    const { coder, samples, emitter, logger } = this.c;
    const code = CodeTools.setParams(layer.code, params);
    const probe = coder.probe(code);
    if (!probe.ok) return false;
    samples.preload(probe.samples);
    if (!coder.load(layer, this.fullCode(code)).ok) return false;
    emitter.emit('layer:change', { layer, desc });
    logger.add(`compasso ${bar}: ~ ${PatternBank.roleLabel(layer.role)}: ${desc}`);
    return true;
  }

  remember(id) {
    this.recent.push(id);
    if (this.recent.length > 12) this.recent.shift();
  }

  // A pattern comes in as a fresh version of itself (roll()); if that version doesn't run,
  // as written. It fades in as Transitions says for its role.
  // asIs: exactly the pattern's code, no new version (a pasted program).
  enter(role, pattern, startBar, { asIs = false } = {}) {
    const { coder, samples, audio, clock, logger, emitter } = this.c;
    const r = asIs ? { code: pattern.code, changes: [], sig: pattern.id } : this.roll(pattern);
    let base = r.code;
    let code = asIs ? base : this.fullCode(base); // a pasted program keeps its own inst(...) lines
    let probe = coder.probe(code);
    if (!probe.ok && base !== pattern.code) {
      base = pattern.code;
      code = this.fullCode(base);
      probe = coder.probe(code);
    }
    if (!probe.ok) { logger.add(`saltei ${pattern.id}: ${probe.error}`, 'err'); return null; }
    samples.preload(probe.samples);
    const layer = new Layer({ id: `${role}-${++this.serial}`, role, pattern });
    const startBeat = startBar * 4;
    const res = coder.load(layer, code, startBeat);
    if (!res.ok) { logger.add(`saltei ${pattern.id}: ${res.error}`, 'err'); return null; }
    layer.base = base;
    layer.enteredBar = startBar;
    layer.changes = base === r.code ? r.changes : [];
    this.memory.note(pattern.id, base === r.code ? r.sig : null, startBar);
    const at = Math.max(audio.ac.currentTime, clock.timeOf(startBeat));
    audio.bus(layer.id).fade(1, this.c.transitions.fadeIn(role, startBar), at);
    this.applySilence(layer); // quiet if another role is on solo
    this.map.set(role, layer);
    this.remember(pattern.id);
    emitter.emit('layer:add', { layer });
    return layer;
  }

  // Fades a layer out from `startBar` (over Transitions' time for its role) and removes it.
  exit(layer, startBar, seconds = this.c.transitions.fadeOut(layer.role)) {
    const { audio, clock, scheduler, coder, emitter } = this.c;
    if (this.map.get(layer.role) === layer) this.map.delete(layer.role);
    const startBeat = startBar * 4;
    const bus = audio.bus(layer.id);
    if (bus) bus.fade(0, seconds, Math.max(audio.ac.currentTime, clock.timeOf(startBeat)));
    scheduler.at(startBeat + Math.ceil(seconds / clock.spb()) + 1, () => {
      coder.remove(layer);
      audio.dropBus(layer.id);
      // a role on solo that left for good: its solo goes, or everything would stay quiet
      if (this.solos.has(layer.role) && !this.map.has(layer.role)) {
        this.solos.delete(layer.role);
        for (const l of this.map.values()) { this.applySilence(l); emitter.emit('layer:state', { layer: l }); }
      }
    });
    emitter.emit('layer:remove', { layer });
  }

  // Another pattern in this layer's role, keeping its lock, mute and automation switch.
  replace(layer, pattern, startBar) {
    const { locked, muted, fxAuto } = layer;
    this.exit(layer, startBar, this.c.transitions.fadeOut(layer.role, true));
    const fresh = this.enter(layer.role, pattern, startBar);
    if (fresh) {
      if (muted) this.setMuted(fresh, true);
      fresh.locked = locked;
      fresh.fxAuto = fxAuto;
    }
    return fresh;
  }

  // Back to the version it came in with, before any tweaks or timbre moves.
  reset(layer, bar) {
    if (!this.c.coder.load(layer, this.fullCode(layer.base || layer.pattern.code)).ok) return;
    this.c.emitter.emit('layer:change', { layer, desc: 'de volta ao original' });
    this.c.logger.add(`compasso ${bar}: ${PatternBank.roleLabel(layer.role)} de volta ao código original`);
  }

  // ───── the listener's actions ─────

  setMuted(layer, muted) {
    layer.muted = muted;
    this.applySilence(layer);
    this.c.emitter.emit('layer:state', { layer });
  }

  // Heard or not: muted [M], or another role is on solo [S] and this one isn't.
  applySilence(layer) {
    layer.soloed = this.solos.has(layer.role);
    layer.silenced = layer.muted || (this.solos.size > 0 && !layer.soloed);
    const bus = this.c.audio.bus(layer.id);
    if (bus) bus.setMuted(layer.silenced);
  }

  // Solo follows the role (a new pattern in that role stays on solo); several can be on.
  toggleSolo(id) {
    const layer = this.find(id);
    if (!layer) return;
    if (this.solos.has(layer.role)) this.solos.delete(layer.role); else this.solos.add(layer.role);
    for (const l of this.map.values()) {
      this.applySilence(l);
      this.c.emitter.emit('layer:state', { layer: l });
    }
    const names = [...this.solos].map((r) => PatternBank.roleLabel(r)).join(', ');
    this.c.logger.add(names ? `solo: ${names}` : 'solo desligado');
  }

  toggleMute(id) {
    const layer = this.find(id);
    if (layer) this.setMuted(layer, !layer.muted);
  }

  toggleLock(id) {
    const layer = this.find(id);
    if (!layer) return;
    layer.locked = !layer.locked;
    this.c.logger.add(`${PatternBank.roleLabel(layer.role)} ${layer.locked ? 'bloqueada' : 'desbloqueada'}`);
    this.c.emitter.emit('layer:state', { layer });
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
    this.c.emitter.emit('layer:state', { layer });
  }

  // Code typed in the editor: heard from the next bar.
  applyCode(id, code) {
    return this.liveEdit(id, code, { desc: 'editado por ti', final: true, restart: true });
  }

  // Code changed by the listener (editor, dragged numbers, sound panel). The layer is
  // locked, its code becomes a "user_" pattern the composer can reuse later, and that
  // code is the new original that resets and tweaks follow.
  //   final:   the gesture ended (log it, save the pattern, make long loops pick it up soon)
  //   restart: restart the loops at the next bar even if they're short
  liveEdit(id, code, { desc = 'editado por ti', final = false, restart = false } = {}) {
    const { coder, samples, clock, emitter, logger } = this.c;
    const layer = this.find(id);
    if (!layer) return { ok: false, error: 'esta camada já saiu' };
    const probe = coder.probe(code, final ? 8 : 2);
    if (!probe.ok) return probe;
    samples.preload(probe.samples);
    const res = coder.load(layer, code);
    if (!res.ok) return res;
    const longLoop = [...layer.loops.values()].some((l) => l.nextBeat > clock.beat + 4);
    if (restart || (final && longLoop)) coder.restartAt(layer, Math.floor(clock.beat / 4 + 1) * 4);

    const baseId = layer.pattern.id.replace(/^user_/, '');
    layer.pattern = Object.assign({}, layer.pattern, { id: 'user_' + baseId, code, edited: true, user: true });
    layer.base = null; // the listener's code is now the original
    if (!layer.locked) layer.locked = true;
    layer.lockedBeforeEdit = null; // an edited layer stays locked when its editor closes
    emitter.emit('layer:change', { layer, desc, instant: true });
    emitter.emit('layer:state', { layer });
    if (final) {
      emitter.emit('pattern:user', { pattern: layer.pattern });
      logger.add(`compasso ${this.c.bar}: ${PatternBank.roleLabel(layer.role)}: ${desc} (por ti, bloqueada)`);
    }
    return { ok: true };
  }
};
