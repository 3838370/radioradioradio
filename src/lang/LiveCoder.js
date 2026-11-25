// LiveCoder: compiles layer code, runs loop iterations ahead of time, hot-swaps and rolls
// back broken code. The code is plain JS evaluated inside `with (env)`, where env is the
// LanguageApi, so names like loop/scale shadow p5's own functions.
RA.LiveCoder = class LiveCoder {
  constructor({ scheduler, audio, emitter, logger }) {
    this.scheduler = scheduler;
    this.audio = audio;
    this.emitter = emitter;
    this.logger = logger;
    this.layers = new Map();
    this.env = null;       // set by attach(api)
    this.cur = null;       // the Iteration currently running
    this.compiling = null; // { defined, fx } while top-level code runs
    this.probing = null;   // Set of sample keys while probing
    this.globalCounters = {};
    this.inProbe = false;
  }

  attach(api) { this.env = api.env; }

  compile(code) { return new Function('__env', 'with (__env) {\n' + code + '\n}'); }

  bar() {
    const b = this.cur ? this.cur.start : this.scheduler.clock.beat;
    return Math.floor(b / 4 + 1e-6);
  }

  counters() { return this.cur ? this.cur.loop.counters : this.globalCounters; }

  // Compiles code for a layer and (re)defines its loops; new loops start at startBeat.
  load(layer, code, startBeat) {
    const defined = {};
    this.compiling = { defined, fx: null };
    try {
      this.compile(code)(this.env);
    } catch (e) {
      this.compiling = null;
      return { ok: false, error: e.message };
    }
    const { fx, mute } = this.compiling;
    this.compiling = null;
    if (!Object.keys(defined).length) return { ok: false, error: 'no loop() defined' };

    const start = startBeat != null ? startBeat : Math.ceil(this.scheduler.clock.beat / 4) * 4;
    layer.define(defined, start);
    layer.mutes = new Set(mute || []);
    layer.hand = new Set(RA.CodeTools.hitsKeys(code));
    layer.prevGood = layer.code || null;
    layer.code = code;
    this.layers.set(layer.id, layer);
    const bus = this.audio.bus(layer.id) || this.audio.createBus(layer.id);
    if (fx) bus.setFx(fx);
    return { ok: true };
  }

  // Makes the layer's current code take over at `beat` instead of when each loop's
  // iteration ends: drops what's already queued from there on and restarts every loop.
  restartAt(layer, beat) {
    this.scheduler.cancel(layer.id, beat);
    for (const loop of layer.loops.values()) loop.nextBeat = beat;
  }

  remove(layer) {
    layer.stop();
    this.layers.delete(layer.id);
  }

  // Scheduler hook: run every iteration that starts before `to`.
  pump(from, to) {
    for (const layer of this.layers.values()) {
      for (const loop of layer.loops.values()) {
        let guard = 0;
        while (!loop.stopped && loop.nextBeat < to && guard++ < 16) this.iterate(layer, loop);
      }
    }
  }

  iterate(layer, loop) {
    const it = new RA.Iteration(layer, loop, loop.nextBeat);
    this.cur = it;
    let err = null;
    try { loop.fn(loop.i); } catch (e) { err = e; }
    this.cur = null;
    if (err) {
      loop.nextBeat = it.start + 4;
      this.rollback(layer, err);
      return;
    }
    let len = it.cursor;
    if (len <= 0) {
      this.logger.add(`${layer.id}/${loop.name}: loop did not sleep`, 'err');
      len = 4;
    }
    loop.i++;
    loop.nextBeat = it.start + len;
    if (layer.noteIteration) layer.noteIteration(loop.name, it.start, len);
    for (const ev of it.events) {
      this.scheduler.at(it.start + ev.offset, ev.fn, layer.id);
      if (ev.meta && layer.record) layer.record(Object.assign({ beat: it.start + ev.offset, loop: loop.name }, ev.meta));
    }
  }

  rollback(layer, err) {
    this.logger.add(`error in ${layer.id}: ${err.message}, rolling back`, 'err');
    const good = layer.prevGood;
    if (good && good !== layer.code) {
      this.load(layer, good);
      layer.prevGood = null;
      this.emitter.emit('layer:change', { layer, desc: 'rolled back' });
    } else {
      layer.stop();
    }
  }

  // Schedules fn(time, spb) at the cursor of the running iteration (and flashes the card).
  // meta describes the sound for the sequencer; with meta.silent it is only recorded.
  emit(fn, meta = null) {
    const it = this.cur;
    if (!it || this.probing) return;
    const layerId = it.layer.id;
    if (meta && meta.silent) { it.emit(() => {}, meta); return; }
    it.emit((t, spb) => {
      fn(t, spb);
      this.emitter.emit('sound', { layerId, time: t });
    }, meta);
  }

  // Runs code in isolation without sound: validates it and lists the samples it needs.
  probe(code, iterations = 8) {
    const defined = {};
    const found = new Set();
    const lengths = {}; // loop name -> each iteration's length in beats
    const saved = { compiling: this.compiling, cur: this.cur, probing: this.probing, inProbe: this.inProbe };
    this.inProbe = true; // side effects such as inst() are skipped while probing
    let error = null;
    this.compiling = { defined, fx: null };
    try {
      this.compile(code)(this.env);
      if (!Object.keys(defined).length) throw new Error('no loop() defined');
      this.compiling = null;
      this.probing = found;
      const layer = { id: 'probe', vars: new Map() };
      for (const [name, fn] of Object.entries(defined)) {
        const loop = new RA.Loop(name, fn, 0);
        for (let k = 0; k < iterations; k++) {
          this.cur = new RA.Iteration(layer, loop, k * 4);
          fn(k);
          if (this.cur.cursor <= 0) throw new Error(`loop '${name}' did not sleep`);
          (lengths[name] = lengths[name] || []).push(this.cur.cursor);
        }
      }
    } catch (e) {
      error = e.message;
    }
    Object.assign(this, saved);
    return { ok: !error, error, samples: [...found].map((k) => JSON.parse(k)), lengths };
  }

  noteSample(name, n) {
    if (this.probing) this.probing.add(JSON.stringify([name, n || 0]));
  }
};
