// App: builds every component, wires them together and runs the p5 sketch (instance mode).
//
// URL flags: ?fast=1 (moods last ~1 minute, pace divided by 8), ?seed=123 (repeatable choices)
// Keys: N = change something now, T = skip mood forward, S = skip section, M = mute all,
//       V = next view (cards / full code / sequencer), R = refresh,
//       1-8 = effect pads (hold; Shift+number latches)
// On a code card: drag a number up/down to change it; click elsewhere to edit the code
// (Ctrl/Cmd+Enter runs it, Esc closes); ≈ opens the layer's sound panel.
RA.App = class App {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.fast = params.get('fast') === '1';
    this.rng = new RA.Rng(params.has('seed') ? +params.get('seed') : null);
    this.store = new RA.Store();
    const saved = this.store.load();
    this.settings = new RA.Settings(saved.settings || {});
    this.emitter = new RA.Emitter();
    this.logger = new RA.Logger();
    this.instruments = new RA.InstrumentLibrary(RA.SynthPresets);
    this.instruments.load(saved.instruments);
    this.bank = new RA.PatternBank(RA.PATTERNS);
    for (const pat of saved.userPatterns || []) if (pat && pat.code && pat.role) this.bank.upsert(pat);
    this.harmony = new RA.Harmony();
    this.mood = new RA.Mood(this.rng, { legMinutes: this.fast ? [1, 1.5] : [8, 20], styles: this.settings.get('styles') });
    this.hud = new RA.Hud();
    this.grid = new RA.CardGrid(this.emitter);
    // The stage shows the same code three ways; the ⇄ button (or V) cycles through them.
    this.view = 'cards'; // cards | code | seq
    this.fullCode = new RA.FullCodeView(this.grid.highlighter);
    this.seq = new RA.SequencerView();
    this.viewButton = null;
    this.log = new RA.LogView(this.logger);
    this.xy = new RA.XYPad((v) => { if (this.fx) this.fx.setXY(v); });
    this.arc = new RA.Arc(this.rng, { scale: this.fast ? 0.25 : 1 });
    this.state = 'idle'; // idle | loading | playing
    this.muted = false;
    this.drag = null;    // { type: 'xy' } or { type: 'scrub', ... } while the mouse is down
  }

  mount() {
    this.p5 = new p5((p) => {
      p.setup = () => this.setup(p);
      p.draw = () => this.draw(p);
      p.windowResized = () => this.resize(p);
      p.mousePressed = (event) => this.press(p, event);
      p.mouseDragged = () => this.dragMove(p);
      p.mouseReleased = () => this.release(p);
      p.doubleClicked = () => {
        if (this.xy.contains(p.mouseX, p.mouseY)) this.xy.reset();
        if (this.eqCurve && this.eqCurve.contains(p.mouseX, p.mouseY)) this.eqCurve.reset();
      };
      p.mouseWheel = (event) => this.wheel(p, event);
      p.keyPressed = (event) => this.key(p, event);
      p.keyReleased = (event) => this.keyUp(p, event);
    });
  }

  // ───── setup ─────

  setup(p) {
    this.p = p;
    this.samples = new RA.SampleLibrary((url, ok, err) => p.loadSound(url, ok, err), this.logger);
    this.indexReady = this.samples.loadIndex().then(() => this.samplePanel && this.samplePanel.refreshFolders());

    // Build the control strip first so the stage's remaining height is known.
    this.panel = new RA.ControlPanel(p, this.settings, p.select('#top'));
    this.panel.addButton('[≈] painel', () => this.drawer.toggle());
    this.drawer = new RA.Drawer(p, p.select('#drawer'), [
      { id: 'layer', label: 'Camada' }, { id: 'instruments', label: 'Instrumentos' },
      { id: 'samples', label: 'Samples' }, { id: 'save', label: 'Guardar' },
    ], () => this.resize(p));
    this.fxBar = new RA.FxBar(p, p.select('#fxbar'), this.settings);
    this.stage = p.select('#stage');
    const { width, height } = this.stage.elt.getBoundingClientRect();
    p.createCanvas(width, height).parent(this.stage);
    p.textFont(RA.Theme.font);

    this.layerPanel = new RA.LayerPanel(p, this.drawer.pane('layer'), this);
    this.instrumentPanel = new RA.InstrumentPanel(p, this.drawer.pane('instruments'), this);
    this.samplePanel = new RA.SamplePanel(p, this.drawer.pane('samples'), this);
    this.savePanel = new RA.SavePanel(p, this.drawer.pane('save'), this);

    this.editor = new RA.CodeEditor(p, this.stage, {
      onRun: (layer, code) => this.composer.applyCode(layer.id, code),
      onOpen: (layer) => this.composer.setEditing(layer.id, true),
      onClose: (layer) => this.composer.setEditing(layer.id, false),
      keepOpen: [document.getElementById('drawer')], // its panels insert code into the editor
    });
    this.wireEvents(p);
    this.restoreLocalSamples(p);
    this.listenForDrops(p);

    this.startButton = p.createButton('[ ▶ TUNE IN ]').addClass('start').parent(this.stage);
    this.startButton.mousePressed(() => this.tuneIn(p));
  }

  wireEvents(p) {
    const { emitter } = this;
    emitter.on('layer:add', () => this.layerPanel.refresh());
    emitter.on('layer:remove', ({ layer }) => {
      if (this.editor.layer === layer) this.editor.close();
      this.layerPanel.refresh();
    });
    emitter.on('layer:change', ({ layer, desc, quiet }) => {
      if (this.editor.layer === layer && desc === 'rolled back') this.editor.setStatus('runtime error: rolled back to the previous code (see log)', 'err');
      if (!quiet) this.layerPanel.onLayerChange(layer);
    });
    emitter.on('pattern:user', ({ pattern }) => {
      this.bank.upsert(pattern);
      this.save();
      this.savePanel.render();
    });
    this.instruments.on('change', ({ name }) => { this.save(); this.savePanel.render(); this.syncInstrument(name); });
    this.settings.on('change', ({ name, value }) => {
      if (name === 'volume' && this.state === 'playing') p.outputVolume(this.muted ? 0 : value, 0.1);
      this.save();
    });
  }

  resize(p) {
    const { width, height } = this.stage.elt.getBoundingClientRect();
    p.resizeCanvas(width, height);
  }

  async tuneIn(p) {
    if (this.state !== 'idle') return;
    this.state = 'loading';
    this.startButton.hide();
    await p.userStartAudio();
    const ac = p.getAudioContext();

    await this.indexReady;
    this.clock = new RA.Clock(this.mood.tempo());
    this.scheduler = new RA.Scheduler(ac, this.clock, this.logger);
    this.audio = new RA.AudioEngine(ac, this.samples, this.instruments);
    this.fx = new RA.FxRack(this.audio, this.clock, this.settings);
    this.fx.setXY(this.xy.values());
    this.fxBar.attach(this.fx);
    this.coder = new RA.LiveCoder({ scheduler: this.scheduler, audio: this.audio, emitter: this.emitter, logger: this.logger });
    this.coder.attach(new RA.LanguageApi({
      coder: this.coder, audio: this.audio, harmony: this.harmony, clock: this.clock, fx: this.fx, rng: this.rng,
      instruments: this.instruments,
      energy: () => this.composer.energy,
      section: () => this.composer.arc.section,
    }));
    this.composer = new RA.Composer({
      bank: this.bank, coder: this.coder, audio: this.audio, samples: this.samples, harmony: this.harmony,
      mood: this.mood, arc: this.arc, fx: this.fx, instruments: this.instruments, mutator: new RA.Mutator(this.rng, (name) => this.samples.count(name)),
      settings: this.settings, clock: this.clock, scheduler: this.scheduler, rng: this.rng,
      emitter: this.emitter, logger: this.logger, fast: this.fast,
    });
    this.automation = new RA.Automation({
      audio: this.audio, fx: this.fx, arc: this.arc, settings: this.settings, clock: this.clock, rng: this.rng,
      layers: () => [...this.composer.layers.values()], emitter: this.emitter, fast: this.fast,
    });
    this.spectrum = new RA.Spectrum(this.audio.fft);
    if (this.settings.get('eq')) this.audio.eq.set(this.settings.get('eq'));
    this.eqCurve = new RA.EqCurve(this.audio.eq, (values) => this.settings.set('eq', values));

    this.composer.preloadFor(this.mood.weights());
    const t0 = performance.now();
    while (this.samples.pendingCount > 0 && performance.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 100));

    this.scheduler.addHook((from, to) => this.coder.pump(from, to));
    this.scheduler.start();
    this.composer.start();
    p.outputVolume(this.settings.get('volume'));
    this.state = 'playing';
    this.logger.add('dica: arrasta números no código · clica num cartão para editar · ≈ abre o som da camada', 'mood');
  }

  // ───── persistence and your own sounds ─────

  snapshot() {
    return {
      version: 2,
      settings: this.settings.values,
      instruments: this.instruments.serialize(),
      userPatterns: this.bank.userPatterns(),
    };
  }

  save() { this.store.save(this.snapshot()); }

  exportState() { this.store.download('radio-ai.json', this.snapshot()); }

  async importState(file) {
    try {
      const data = await this.store.readJson(file);
      if (!data || data.version !== 2) throw new Error('não é um ficheiro do Radio AI');
      const current = this.snapshot();
      this.store.save({
        version: 2,
        settings: Object.assign({}, current.settings, data.settings),
        instruments: Object.assign({}, current.instruments, data.instruments),
        userPatterns: current.userPatterns.concat(data.userPatterns || []),
      });
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      alert('Não consegui importar: ' + e.message);
    }
  }

  async clearState() {
    this.store.clear();
    try { await this.store.clearSamples(); } catch (e) { /* no stored sounds */ }
    location.reload();
  }

  async addLocalSample(p, name, bytes) {
    const buffer = await p.getAudioContext().decodeAudioData(bytes.slice(0));
    return this.samples.addLocal(name, buffer);
  }

  async restoreLocalSamples(p) {
    try {
      for (const { name, bytes } of await this.store.allSamples()) await this.addLocalSample(p, name, bytes);
      this.samplePanel.refreshFolders();
      this.savePanel.render();
    } catch (e) { /* storage unavailable: nothing to restore */ }
  }

  listenForDrops(p) {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = [...e.dataTransfer.files].filter((f) => /^audio\//.test(f.type) || /\.(wav|mp3|ogg|flac|aif+)$/i.test(f.name));
      for (const file of files) {
        try {
          const bytes = await file.arrayBuffer();
          const n = await this.addLocalSample(p, file.name, bytes);
          this.store.putSample(file.name, bytes).catch(() => this.logger.add('não consegui guardar ' + file.name + ' (só fica nesta sessão)', 'err'));
          this.logger.add(`novo som: s('my', { n: ${n} })  ← ${file.name}`, 'mood');
        } catch (err) {
          this.logger.add(`não consegui ler ${file.name}`, 'err');
        }
      }
      if (files.length) {
        this.drawer.show('samples');
        this.samplePanel.selectFolder('my');
        this.savePanel.render();
      }
    });
  }

  async removeLocalSample(file) {
    this.samples.removeLocal(file);
    try { await this.store.deleteSample(file); } catch (e) { /* not stored */ }
    this.samplePanel.refreshFolders();
    this.savePanel.render();
  }

  // An instrument changed (Instrumentos panel or an inst() line): every layer that plays it
  // shows the new definition in its code.
  syncInstrument(name) {
    const spec = this.instruments.get(name);
    if (!this.composer || !spec) return;
    for (const layer of this.composer.layers.values()) {
      const code = RA.CodeTools.updateInstrument(layer.code, name, spec);
      if (code === layer.code) continue;
      layer.code = code;
      this.emitter.emit('layer:change', { layer, desc: null, instant: true, quiet: true });
    }
  }

  // ───── panel helpers ─────

  openLayerPanel(layerId) {
    this.drawer.show('layer');
    this.layerPanel.show(layerId);
  }

  openInstrument(name) {
    this.drawer.show('instruments');
    this.instrumentPanel.select_(name);
  }

  openSamples(folder) {
    this.drawer.show('samples');
    this.samplePanel.selectFolder(folder);
  }

  // Puts code into the open editor, or copies it to the clipboard.
  insertCode(text, statusEl) {
    if (!text) return;
    if (this.editor.isOpen) {
      this.editor.insert(text);
      statusEl.html('Inserido no editor. Clica fora do editor para correr.');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => statusEl.html('Copiado. Clica num cartão para o editar e cola (Ctrl+V).'),
      () => statusEl.html('Não consegui copiar; seleciona o código acima.'));
  }

  // ───── mouse and keys ─────

  press(p, event) {
    if (this.state !== 'playing') return;
    // Only presses on the canvas itself (not on the editor or panels laid over it).
    if (!event || event.target !== p.canvas) return;
    const mx = p.mouseX, my = p.mouseY;
    const top = this.hud.hit(mx, my);
    if (top) {
      if (top.type === 'refresh') this.composer.refreshAll();
      else this.toggleStyle(top.f);
      return;
    }
    if (this.inViewButton(mx, my)) return this.nextView();
    if (this.view === 'code') {
      const b = this.fullCode.hit(mx, my);
      if (b && b.type === 'copy') this.copyFullCode();
      if (this.fullCode.contains(mx, my)) return;
    }
    if (this.view === 'seq') {
      const b = this.seq.hit(mx, my);
      if (b) this.seqAction(b);
      if (this.seq.contains(mx, my)) return;
    }
    if (this.view !== 'cards') return; // the cards aren't on screen
    if (this.xy.contains(mx, my)) {
      this.drag = { type: 'xy' };
      this.xy.set(mx, my);
      return;
    }
    if (this.eqCurve.contains(mx, my)) {
      this.drag = { type: 'eq' };
      this.eqCurve.press(mx, my);
      return;
    }
    const num = this.grid.numberAt(mx, my);
    if (num) {
      const code = num.card.layer.code;
      this.drag = { type: 'scrub', layer: num.card.layer, start: num.start, len: num.len, from: code.substr(num.start, num.len), y0: my, moved: false, last: 0, code };
      return;
    }
    const hit = this.grid.hit(mx, my);
    if (!hit) return;
    if (hit.action === 'edit') return this.editor.open(this.composer.find(hit.layerId));
    if (hit.action === 'sound') this.openLayerPanel(hit.layerId);
    if (hit.action === 'mute') this.composer.toggleMute(hit.layerId);
    if (hit.action === 'lock') this.composer.toggleLock(hit.layerId);
    if (hit.action === 'regen') this.composer.regenerate(hit.layerId);
  }

  // ───── views: cards → full code → sequencer → cards ─────

  static VIEWS = ['cards', 'code', 'seq'];
  static VIEW_NAMES = { cards: 'CARDS', code: 'FULL CODE', seq: 'SEQUENCER' };

  nextView() {
    if (this.editor.isOpen) this.editor.commit();
    if (this.editor.isOpen) return; // its code has an error: stay until it's fixed or closed
    const V = App.VIEWS;
    this.view = V[(V.indexOf(this.view) + 1) % V.length];
  }

  inViewButton(mx, my) {
    const b = this.viewButton;
    return !!b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  }

  // Two arrows, one over the other (→ over ←), in the stage's bottom-right corner, with the
  // current view's name beside it. The name also counts as the button.
  drawViewButton(p, x, y) {
    const T = RA.Theme;
    const s = 26;
    p.textSize(RA.Theme.size.small);
    const nameW = p.textWidth(App.VIEW_NAMES[this.view]) + 8;
    this.viewButton = { x: x - nameW, y, w: s + nameW, h: s };
    const hover = this.inViewButton(p.mouseX, p.mouseY);
    p.strokeWeight(1);
    p.stroke(hover ? T.bright : T.text);
    const arrow = (y0, dir) => {
      const a = x + 6, b = x + s - 6, tip = dir > 0 ? b : a;
      p.line(a, y0, b, y0);
      p.line(tip, y0, tip - dir * 4, y0 - 3);
      p.line(tip, y0, tip - dir * 4, y0 + 3);
    };
    arrow(y + 9.5, 1);
    arrow(y + 16.5, -1);
    p.noStroke();
    p.fill(hover ? T.bright : T.text);
    p.textAlign(p.RIGHT);
    p.text(App.VIEW_NAMES[this.view], x - 8, y + s / 2 + 4);
    p.textAlign(p.LEFT);
  }

  // The cycle lengths playing (in steps), for the HUD; worked out twice a second.
  stepsShown(now) {
    if (!this.stepsCache || now - this.stepsCache.at > 500) {
      const beat = this.clock.beatAt(this.audio.ac.currentTime);
      this.stepsCache = { at: now, list: RA.SequencerView.cycles([...this.composer.layers.values()], beat) };
    }
    return this.stepsCache.list;
  }

  fullCodeText() {
    return RA.FullCodeView.text([...this.composer.layers.values()], {
      mood: RA.Mood.LABELS[this.mood.dominant()].toUpperCase(),
      section: this.arc.section.toUpperCase(),
      bpm: Math.round(this.clock.bpm),
      key: this.harmony.keyName(),
    });
  }

  copyFullCode() {
    navigator.clipboard.writeText(this.fullCodeText()).then(
      () => { this.fullCode.copiedAt = performance.now(); this.logger.add('full code copied'); },
      () => this.logger.add('could not copy the code', 'err'));
  }

  wheel(p, event) {
    if (this.state !== 'playing' || this.view === 'cards' || !event) return;
    const v = this.view === 'code' ? this.fullCode : this.seq;
    if (!v.contains(p.mouseX, p.mouseY)) return;
    v.wheel(this.view === 'code' ? event.delta : event.delta * 0.6);
    return false;
  }

  // A sequencer click, turned into an edit of the layer's code (which locks the layer).
  seqAction(b) {
    const layer = this.composer.find(b.layerId);
    if (!layer) return;
    const CT = RA.CodeTools;
    if (b.type === 'layer-mute') return this.composer.toggleMute(layer.id);
    if (b.type === 'layer-lock') return this.composer.toggleLock(layer.id);
    if (b.type === 'audition') return this.audition(b.row);
    let code = layer.code, desc;
    if (b.type === 'mute-row') {
      const keys = new Set(CT.muteKeys(code));
      const off = !keys.has(b.key);
      if (off) keys.add(b.key); else keys.delete(b.key);
      code = CT.setMutes(code, [...keys]);
      desc = `${off ? 'mute' : 'unmute'} ${b.key}`;
    } else if (b.type === 'release-row') {
      code = CT.setHits(code, b.key, null);
      desc = `${b.key} back to the code`;
    } else if (b.type === 'cell') {
      const row = CT.hitsRows(code).find((r) => r.key === b.key);
      // a row taken over for the first time starts from what it plays in this cycle, with
      // the cycle's length (16 steps for a bar, 12, 20... for other loops)
      const cells = row ? [...row.pattern] : b.row.cells.map((v) => (v > 0 ? 'x' : '.'));
      cells[b.step] = cells[b.step] === '.' ? 'x' : '.';
      code = CT.setHits(code, b.key, cells.join(''), row ? '' : this.hitsOpts(b.row));
      desc = `seq ${b.key} step ${b.step + 1}`;
    }
    const res = this.composer.liveEdit(layer.id, code, { desc, final: true });
    if (!res.ok) this.logger.add(`sequencer: ${res.error}`, 'err');
  }

  // The options a new hits() row copies from the sound's latest event.
  hitsOpts(row) {
    const ev = row.last || {};
    const r2 = (v) => Math.round(v * 100) / 100;
    const o = {};
    if (ev.amp != null) o.amp = r2(ev.amp);
    if (row.kind === 'synth') {
      o.note = ev.notes && ev.notes.length ? ev.notes[0] : this.harmony.root(this.composer.bar);
      o.dur = ev.dur != null ? r2(ev.dur) : 0.5;
    }
    return o;
  }

  audition(row) {
    const ev = row.last || {};
    if (row.kind === 's') {
      const i = row.key.lastIndexOf(':');
      this.audio.audition(row.key.slice(0, i), +row.key.slice(i + 1) || 0, { amp: ev.amp != null ? ev.amp : 0.6 });
    } else {
      this.audio.auditionSynth(row.key, ev.notes && ev.notes.length ? ev.notes.slice(0, 4) : [this.harmony.root(this.composer.bar) + 12],
        { amp: ev.amp != null ? ev.amp : 0.3, dur: 0.6 });
    }
  }

  // Turns one style (mood) on or off. The last one left on can't be turned off.
  toggleStyle(f) {
    const on = new Set(this.mood.allowed);
    if (on.has(f)) {
      if (on.size === 1) { this.logger.add('at least one style has to stay on'); return; }
      on.delete(f);
    } else {
      on.add(f);
    }
    const list = RA.Mood.CYCLE.filter((x) => on.has(x));
    this.settings.set('styles', list.length === RA.Mood.CYCLE.length ? null : list);
  }

  dragMove(p) {
    const d = this.drag;
    if (!d) return;
    if (d.type === 'xy') { this.xy.set(p.mouseX, p.mouseY); return; }
    if (d.type === 'eq') { this.eqCurve.move(p.mouseX, p.mouseY); return; }
    const dy = d.y0 - p.mouseY;
    if (Math.abs(dy) > 2) d.moved = true;
    if (!d.moved || performance.now() - d.last < 50) return;
    d.last = performance.now();
    this.applyScrub(d, dy, false);
  }

  applyScrub(d, dy, final) {
    const str = RA.CodeTools.scrub(d.from, dy);
    const code = RA.CodeTools.splice(d.code, d.start, d.len, str);
    const res = this.composer.liveEdit(d.layer.id, code, { desc: `${d.from} → ${str}`, final });
    if (res.ok) { d.code = code; d.len = str.length; }
  }

  release(p) {
    const d = this.drag;
    this.drag = null;
    if (d && d.type === 'eq') this.eqCurve.release();
    if (!d || d.type !== 'scrub') return;
    if (d.moved) this.applyScrub(d, d.y0 - p.mouseY, true);
    else this.editor.open(this.composer.find(d.layer.id)); // a plain click on a number edits
  }

  key(p, event) {
    if (this.state !== 'playing') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const pad = this.padForKey(p, event);
    if (pad) {
      if (event && event.repeat) return false;
      if (event && event.shiftKey) this.fx.toggle(pad.id, 'latch'); else this.fx.engage(pad.id, 'hold');
      return false;
    }
    const k = p.key.toLowerCase();
    if (k === 'n') { this.composer.forceMove(); this.logger.add('(change requested)'); }
    if (k === 't') this.composer.skipMood();
    if (k === 's') this.composer.skipSection();
    if (k === 'r') this.composer.refreshAll();
    if (k === 'v') this.nextView();
    if (k === 'm') {
      this.muted = !this.muted;
      p.outputVolume(this.muted ? 0 : this.settings.get('volume'), 0.1);
    }
  }

  // Number keys 1-8 play the effect pads (Shift+number latches). Uses the physical key, so
  // Shift doesn't turn "1" into "!".
  padForKey(p, event) {
    const m = /^(?:Digit|Numpad)(\d)$/.exec((event && event.code) || '');
    const digit = m ? m[1] : p.key;
    return RA.FxRack.PADS.find((x) => x.key === digit) || null;
  }

  keyUp(p, event) {
    if (this.state !== 'playing') return;
    const pad = this.padForKey(p, event);
    if (pad && !(event && event.shiftKey)) this.fx.release(pad.id, 'hold');
  }

  // ───── drawing ─────

  draw(p) {
    const T = RA.Theme;
    p.background(T.bg);
    if (this.state !== 'playing') return this.drawIdle(p);

    const now = performance.now();
    // dt may be large when the browser throttles frames; typing then catches up.
    this.grid.update(Math.min(1, p.deltaTime / 1000), this.audio.ac.currentTime, now);
    this.grid.padLine = this.automation.padComment();
    this.panel.sync(this.clock.bpm, this.composer.layers.size, this.composer.target());
    if (this.drawer.isOpen && this.drawer.current === 'layer') this.layerPanel.tick();

    const bottomH = 104;
    const top = RA.Hud.HEIGHT + 10;
    const stageH = p.height - top - bottomH - 8;
    const layers = [...this.composer.layers.values()];
    if (this.view === 'cards') {
      this.grid.draw(p, 12, top, p.width - 24, stageH, now);
    } else {
      const m = this.grid.metrics(p, p.width - 24);
      if (this.view === 'code') {
        const flashes = layers.map((l) => (this.grid.cards.get(l.id) || {}).flashAt || 0);
        this.fullCode.draw(p, 12, top, p.width - 24, stageH - 34, m, this.fullCodeText(), flashes, now);
      } else {
        this.seq.draw(p, 12, top, p.width - 24, stageH - 34, m, layers, this.clock.beatAt(this.audio.ac.currentTime), now);
      }
    }
    // a strip at the foot of the stage for the view button (cards taller than the stage end under it)
    p.noStroke();
    p.fill(RA.Theme.bg);
    p.rect(0, top + stageH - 32, p.width, 40);
    this.drawViewButton(p, p.width - 12 - 26, top + stageH - 26);
    if (this.editor.isOpen && this.view === 'cards') {
      const card = this.grid.cards.get(this.editor.layer.id);
      this.editor.follow(card && card.rect, { x: 12, w: p.width - 24 });
    }
    this.hud.draw(p, p.width, {
      weights: this.mood.weights(),
      keyName: this.harmony.keyName(),
      chord: this.harmony.chordName(this.composer.bar),
      bpm: this.clock.bpm,
      steps: this.stepsShown(now),
      bar: this.composer.bar,
      energy: this.composer.energy,
      freeze: this.settings.get('freeze'),
      nextMove: Math.max(0, this.composer.nextMove - this.composer.bar),
      stats: `${this.audio.voices} VOICES · ${this.samples.loaded} SAMPLES`,
      section: this.arc.section,
      steered: this.arc.held,
      styles: this.mood.allowed,
      hover: (this.hud.hit(p.mouseX, p.mouseY) || {}).type,
    });
    this.drawBottom(p, p.height - bottomH, bottomH);
    this.updateCursor(p);
  }

  drawBottom(p, by, h) {
    const T = RA.Theme;
    p.noStroke();
    p.fill(T.panel);
    p.rect(0, by, p.width, h);
    p.fill(T.faint);
    p.rect(0, by, p.width, 1);
    const pad = h - 18;
    const xyX = p.width - 12 - pad;
    this.xy.draw(p, xyX, by + 9, pad, pad);
    const split = p.width < 720 ? xyX - 12 : p.width * 0.5;
    this.log.draw(p, 12, by, split - 24, h);
    if (p.width >= 720) {
      // the EQ curve, then the spectrum bars to its right
      const eqW = Math.min(200, Math.max(110, (xyX - split) * 0.32));
      this.eqCurve.draw(p, split, by + 9, eqW, h - 18);
      this.spectrum.draw(p, split + eqW + 14, by + 22, xyX - split - eqW - 28, h - 32);
    } else {
      this.eqCurve.rect = null;
    }
  }

  updateCursor(p) {
    if (this.drag) return p.cursor(this.drag.type === 'scrub' ? 'ns-resize' : 'crosshair');
    const mx = p.mouseX, my = p.mouseY;
    this.eqCurve.move(mx, my); // hover highlight
    if (this.eqCurve.hoverReset || this.hud.hit(mx, my) || this.inViewButton(mx, my)) p.cursor('pointer');
    else if (this.xy.contains(mx, my) || this.eqCurve.contains(mx, my)) p.cursor('crosshair');
    else if (this.view === 'code' && this.fullCode.contains(mx, my)) p.cursor(this.fullCode.hit(mx, my) ? 'pointer' : 'default');
    else if (this.view === 'seq' && this.seq.contains(mx, my)) p.cursor(this.seq.hit(mx, my) ? 'pointer' : 'default');
    else if (this.view === 'cards' && this.grid.numberAt(mx, my)) p.cursor('ns-resize');
    else if (this.view === 'cards' && this.grid.hit(mx, my)) p.cursor('pointer');
    else p.cursor('default');
  }

  // Draws text with letter spacing (tracking, in em), centred on cx when align is 'center'.
  // Returns its width.
  static tracked(p, str, x, y, em, align = 'center') {
    const gap = p.textSize() * em;
    const width = [...str].reduce((s, c) => s + p.textWidth(c) + gap, -gap);
    let at = align === 'center' ? x - width / 2 : x;
    p.textAlign(p.LEFT);
    for (const c of str) { p.text(c, at, y); at += p.textWidth(c) + gap; }
    return width;
  }

  drawIdle(p) {
    const T = RA.Theme;
    const cx = p.width / 2, cy = p.height / 2;
    p.textFont(T.font);
    p.textSize(T.size.title + 3);
    p.fill(T.bright);
    App.tracked(p, 'BROKEN-RADIO', cx, cy - 52, 0.2);
    p.textAlign(p.CENTER);
    p.textSize(T.size.small);
    p.fill(T.text);
    p.text('ENDLESS JS CODED AMBIENT RADIO', cx, cy - 28);
    p.fill(T.dim);
    p.text('FOG · DUB · DEEP · SPACE · ATMOS · RAVE · DARK · INDUSTRIAL · AE', cx, cy - 12);
    if (this.state === 'loading') {
      const s = this.samples;
      const blink = (performance.now() >> 9) % 2 ? '_' : ' ';
      p.fill(T.text);
      p.text((s && s.index ? `LOADING SAMPLES ${s.loaded} / ${s.loaded + s.pendingCount}` : 'CONNECTING') + blink, cx, cy + 56);
    }
    p.textAlign(p.LEFT);
  }
};
