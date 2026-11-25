// Automation: moves each layer's sound settings (the sliders of the sound panel) over time.
//
// Auto mode (per layer, plus a global switch): every parameter glides slowly to a new
// target over 8-32 bars, chosen to suit the arc. Calm sections (sparse, drift, release) get
// more reverb, delay and wobble and a closing filter; tension gets drier and brighter.
//
// Effect pads are shortcuts for the same parameters on every layer: DELAY THROW and
// DUB ECHO raise the delay sends, REVERB WASH the reverb, FILTER closes the filter,
// VIBRATO raises the wobble. Pads fired by the radio itself ('auto') fade in and out
// slowly; pads you press respond quickly.
//
// Auto mode writes its values into each layer's top-level fx line (you see the numbers
// change in the code card and on the panel). Pads are a temporary modulation on the bus,
// shown on the cards as a comment line while they're on.
RA.Automation = class Automation {
  static CALM = ['sparse', 'drift', 'release'];

  // param -> [calm range, busy range] for the auto target
  static RANGES = {
    lpfMul: [[0.3, 0.9], [0.75, 1.5]],
    revAdd: [[0.1, 0.4], [0, 0.12]],
    delayAdd: [[0.05, 0.4], [0, 0.15]],
    wobbleAdd: [[0.1, 0.45], [0, 0.12]],
    crushAdd: [[0, 0.08], [0, 0.15]],
    ampMul: [[0.85, 1], [0.92, 1.05]],
    resAdd: [[0, 1.5], [0, 3]],
  };

  // pad id -> how it moves each parameter at full strength
  static PADS = {
    throw: { delayAdd: 0.6 },
    dub: { delayAdd: 0.45 },
    wash: { revAdd: 0.6 },
    sweep: { lpfMul: 0.12, resAdd: 4 },
    wobble: { wobbleAdd: 0.8 },
  };

  constructor({ audio, fx, arc, settings, clock, rng, layers, emitter, fast = false }) {
    Object.assign(this, { audio, fx, arc, settings, clock, rng, layers, emitter, fast });
    this.state = new Map(); // layer id -> { param: { from, to, start, end } }
    this.env = {};          // pad id -> 0..1 envelope
    this.byRadio = {};      // pad id -> whether the radio (not you) switched it on
    for (const id of Object.keys(Automation.PADS)) { this.env[id] = 0; this.byRadio[id] = false; }
    this.last = performance.now();
    this.timer = setInterval(() => this.tick(), 50);
  }

  stop() { clearInterval(this.timer); }

  // Pad envelopes: quick when you press, slow (progressive) when the radio does.
  updateEnvelopes(dt) {
    for (const id of Object.keys(this.env)) {
      const src = this.fx.sources(id);
      const on = src.size > 0;
      // remember who switched it on, so the release matches (slow if it was the radio)
      if (on) this.byRadio[id] = src.size === 1 && src.has('auto');
      const time = this.byRadio[id] ? (on ? 2.5 : 3) : (on ? 0.25 : 0.8);
      this.env[id] += ((on ? 1 : 0) - this.env[id]) * Math.min(1, dt / time);
    }
  }

  neutral(param) { return RA.Bus.NEUTRAL[param]; }

  // A new auto target for one parameter, gliding over 8-32 bars.
  retarget(st, param, now) {
    const calm = Automation.CALM.includes(this.arc.section);
    const [lo, hi] = Automation.RANGES[param][calm ? 0 : 1];
    const bars = this.rng.int(8, 32) * (this.fast ? 0.25 : 1);
    st.from = st.value;
    st.to = this.rng.float(lo, hi);
    st.start = now;
    st.end = now + bars * 4 * this.clock.spb();
  }

  layerAuto(layer) {
    return this.settings.get('layerAuto') && layer.fxAuto !== false;
  }

  // Values when a pattern doesn't set them in its fx line.
  static DEFAULTS = { amp: 1, lpf: 16000, res: 0.7, rev: 0, delay: 0, wobble: 0, crush: 0 };

  // The pattern's own fx values: the centre the auto mode moves around.
  origin(layer) {
    return Object.assign({}, Automation.DEFAULTS, RA.CodeTools.fxParams(layer.pattern.code));
  }

  // Auto offsets applied to the origin -> the values written into the code.
  static apply(o, m) {
    const clamp = RA.MathUtil.clamp;
    return {
      amp: clamp(o.amp * m.ampMul, 0, 2),
      lpf: clamp(o.lpf * m.lpfMul, 60, 16000),
      res: clamp(o.res + m.resAdd, 0.1, 15),
      rev: clamp(o.rev + m.revAdd, 0, 0.9),
      delay: clamp(o.delay + m.delayAdd, 0, 0.8),
      wobble: clamp(o.wobble + m.wobbleAdd, 0, 1),
      crush: clamp(o.crush + m.crushAdd, 0, 0.8),
    };
  }

  // Auto mode doesn't hide its work: it rewrites the layer's top-level fx line, so the
  // code card, the panel and the sound always say the same thing. Parameters you set by
  // hand (pinned) are left alone. Pads stay a temporary modulation on the bus.
  writeCode(layer, bus, values) {
    if (layer.editing) return; // don't change the code under the editor
    if (this.settings.get('freeze')) return; // frozen: the code stays as it is
    // parameters the pattern moves itself inside a loop (e.g. fx({ lpf: walk(...) })) stay its own
    const inLoop = new Set();
    for (const m of layer.code.matchAll(/^\s+fx\(\{([^}\n]*)\}\)/gm)) for (const [, k] of m[1].matchAll(/(\w+):/g)) inLoop.add(k);
    const want = {};
    const current = RA.CodeTools.fxParams(layer.code);
    let changed = false;
    for (const k of RA.CodeTools.FX_KEYS) {
      if (bus.pinned.has(k) || inLoop.has(k)) continue;
      want[k] = values[k];
      if (current[k] == null || RA.CodeTools.format(current[k]) !== RA.CodeTools.format(values[k])) changed = true;
    }
    if (!changed) return;
    layer.code = RA.CodeTools.setFxParams(layer.code, want);
    bus.setFx(want);
    this.emitter.emit('layer:change', { layer, desc: null, instant: true, quiet: true });
  }

  tick() {
    const nowMs = performance.now();
    const dt = Math.min(0.5, (nowMs - this.last) / 1000);
    this.last = nowMs;
    const now = this.audio.ac.currentTime;
    this.updateEnvelopes(dt);
    const write = nowMs - (this.lastWrite || 0) > 400; // code updates ~2.5x per second
    if (write) this.lastWrite = nowMs;
    for (const layer of this.layers()) {
      const bus = this.audio.bus(layer.id);
      if (!bus) continue;
      let st = this.state.get(layer.id);
      if (!st) {
        st = {};
        for (const p of Object.keys(Automation.RANGES)) st[p] = { value: this.neutral(p), from: this.neutral(p), to: this.neutral(p), start: now, end: now };
        this.state.set(layer.id, st);
      }
      if (this.layerAuto(layer)) {
        const mod = {};
        for (const p of Object.keys(Automation.RANGES)) {
          const s = st[p];
          if (now >= s.end) this.retarget(s, p, now);
          const t = RA.MathUtil.smoothstep((now - s.start) / Math.max(0.001, s.end - s.start));
          s.value = s.from + (s.to - s.from) * t;
          mod[p] = s.value;
        }
        if (write) this.writeCode(layer, bus, Automation.apply(this.origin(layer), mod));
      } else {
        for (const p of Object.keys(Automation.RANGES)) st[p].end = now; // fresh targets when auto returns
      }

      const padMod = Object.assign({}, RA.Bus.NEUTRAL);
      for (const [pad, effect] of Object.entries(Automation.PADS)) {
        const e = this.env[pad];
        if (e < 0.001) continue;
        for (const [p, v] of Object.entries(effect)) {
          if (p.endsWith('Mul')) padMod[p] *= 1 + (v - 1) * e;
          else padMod[p] += v * e;
        }
      }
      bus.setMod(padMod, now);
    }
    for (const id of this.state.keys()) if (!this.audio.bus(id)) this.state.delete(id);
  }

  // What the pads are doing right now, as a code comment for the cards.
  padComment() {
    const parts = [];
    for (const [pad, effect] of Object.entries(Automation.PADS)) {
      const e = this.env[pad];
      if (e < 0.02) continue;
      const label = RA.FxRack.PADS.find((p) => p.id === pad).label;
      const fx = Object.entries(effect).map(([p, v]) => (p.endsWith('Mul')
        ? `${p.replace('Mul', '')} ×${(1 + (v - 1) * e).toFixed(2)}`
        : `${p.replace('Add', '')} +${(v * e).toFixed(2)}`)).join(', ');
      parts.push(`${label} (${fx})`);
    }
    return parts.length ? '// + ' + parts.join(' · ') : '';
  }
};
