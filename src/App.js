import { AudioEngine } from './audio/AudioEngine.js';
import { Clock } from './audio/Clock.js';
import { FxRack } from './audio/FxRack.js';
import { InstrumentLibrary } from './audio/InstrumentLibrary.js';
import { SampleLibrary } from './audio/SampleLibrary.js';
import { Scheduler } from './audio/Scheduler.js';
import { InstrumentLoader } from './audio/InstrumentLoader.js';
import { MathUtil } from './core/MathUtil.js';
import { Theory } from './lang/Theory.js';
import { SynthVoice } from './audio/SynthVoice.js';
import { Emitter } from './core/Emitter.js';
import { Logger } from './core/Logger.js';
import { Rng } from './core/Rng.js';
import { Settings } from './core/Settings.js';
import { Store } from './core/Store.js';
import { CodeTools } from './lang/CodeTools.js';
import { LanguageApi } from './lang/LanguageApi.js';
import { LiveCoder } from './lang/LiveCoder.js';
import { Arc } from './music/Arc.js';
import { Automation } from './music/Automation.js';
import { Composer } from './music/Composer.js';
import { GenreDrift } from './music/GenreDrift.js';
import { Genres } from './music/Genres.js';
import { Harmony } from './music/Harmony.js';
import { PatternBank } from './music/PatternBank.js';
import { PatternLoader } from './music/PatternLoader.js';
import { CardGrid } from './ui/CardGrid.js';
import { CodeEditor } from './ui/CodeEditor.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { Drawer } from './ui/Drawer.js';
import { EqCurve } from './ui/EqCurve.js';
import { FullCodeView } from './ui/FullCodeView.js';
import { FxBar } from './ui/FxBar.js';
import { Hud } from './ui/Hud.js';
import { Input } from './ui/Input.js';
import { InstrumentPanel } from './ui/InstrumentPanel.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { LogView } from './ui/LogView.js';
import { ParamsBar } from './ui/ParamsBar.js';
import { SamplePanel } from './ui/SamplePanel.js';
import { SavePanel } from './ui/SavePanel.js';
import { SequencerView } from './ui/SequencerView.js';
import { Spectrum } from './ui/Spectrum.js';
import { Theme } from './ui/Theme.js';
import { XYPad } from './ui/XYPad.js';

// App: builds every component, wires them together and runs the p5 sketch (instance mode).
//
// URL flags: ?fast=1 (genres last ~1 minute, pace divided by 8), ?seed=123 (repeatable choices)
// Keys: N = change something now, T = skip genre forward, S = skip section, M = mute all,
//       V = next view (cards / full code / sequencer), R = refresh,
//       1-8 = effect pads (hold; Shift+number latches)
// On a code card: drag a number up/down to change it; click elsewhere to edit the code
// (Ctrl/Cmd+Enter runs it, Esc closes); ≈ opens the layer's sound panel.
export class App {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.fast = params.get('fast') === '1';
    this.rng = new Rng(params.has('seed') ? +params.get('seed') : null);
    this.store = new Store();
    const saved = this.store.load();
    this.settings = new Settings(Settings.migrate(saved.settings));
    this.emitter = new Emitter();
    this.logger = new Logger();
    // every sound from its own file (instrumentos/<papel>/<grupo>/<nome>.inst), plus the
    // changes not yet saved to the files (kept in the browser, shown as "por guardar")
    this.instruments = new InstrumentLibrary();
    this.instruments.load(saved.instruments);
    this.soundsLoaded = [0, 0];
    this.instrumentsReady = InstrumentLoader.load({ logger: this.logger, onProgress: (n, total) => { this.soundsLoaded = [n, total]; } })
      .then((list) => this.instruments.addAll(list));
    // your saved patterns now (the bank moves older genre names to today's: fog → dub, deep →
    // saw/boc...); the bank's own .rad files load in the background (see PatternLoader)
    this.bank = new PatternBank([]);
    for (const pat of saved.userPatterns || []) {
      if (pat && pat.code && pat.role) this.bank.upsert(pat);
    }
    this.patternsLoaded = [0, 0];
    this.patternsReady = PatternLoader.load({ logger: this.logger, onProgress: (n, total) => { this.patternsLoaded = [n, total]; } })
      .then((list) => { for (const p of list) if (!this.bank.get(p.id)) this.bank.upsert(p); });
    this.harmony = new Harmony();
    this.drift = new GenreDrift(this.rng, { legMinutes: this.legMinutes(), allowed: this.settings.get('genres') });
    this.hud = new Hud();
    this.grid = new CardGrid(this.emitter);
    // The stage shows the same code three ways; the ⇄ button (or V) cycles through them.
    this.view = 'cards'; // cards | code | seq
    this.fullCode = new FullCodeView(this.grid.highlighter);
    this.seq = new SequencerView();
    this.viewButton = null;
    this.log = new LogView(this.logger);
    this.xy = new XYPad((v) => { if (this.fx) this.fx.setXY(v); });
    this.arc = new Arc(this.rng, { scale: this.sectionScale() });
    SynthVoice.detuneScale = this.settings.get('detune');
    this.state = 'idle'; // idle | loading | playing
    this.muted = false;
    this.input = new Input(this); // the mouse and the keys
    this.drag = null;    // { type: 'xy' } or { type: 'scrub', ... } while the mouse is down
  }

  // How long each genre lasts (PARAMS: genre min / max, minutes); ?fast=1 makes it ~1 minute.
  legMinutes() {
    if (this.fast) return [1, 1.5];
    const a = this.settings.get('legMin'), b = this.settings.get('legMax');
    return [Math.min(a, b), Math.max(a, b)];
  }

  // How long the arc's sections last (PARAMS: sections ×); ?fast=1 shortens them.
  sectionScale() { return (this.fast ? 0.25 : 1) * this.settings.get('sectionLength'); }

  // A PARAMS value that isn't read live where it acts: pass it on.
  applyParam(name) {
    if (name === 'legMin' || name === 'legMax') this.drift.legMinutes = this.legMinutes();
    if (name === 'sectionLength') this.arc.scale = this.sectionScale();
    if (name === 'detune') SynthVoice.detuneScale = this.settings.get('detune');
  }

  mount() {
    this.p5 = new p5((p) => {
      p.setup = () => this.setup(p);
      p.draw = () => this.draw(p);
      p.windowResized = () => this.resize(p);
      p.mousePressed = (event) => this.input.press(p, event);
      p.mouseDragged = () => this.input.dragMove(p);
      p.mouseReleased = () => this.input.release(p);
      p.doubleClicked = () => {
        if (this.xy.contains(p.mouseX, p.mouseY)) this.xy.reset();
        if (this.eqCurve && this.eqCurve.contains(p.mouseX, p.mouseY)) this.eqCurve.reset();
      };
      p.mouseWheel = (event) => this.input.wheel(p, event);
      p.keyPressed = (event) => this.input.key(p, event);
      p.keyReleased = (event) => this.input.keyUp(p, event);
    });
  }

  // ───── setup ─────

  setup(p) {
    this.p = p;
    this.samples = new SampleLibrary((url, ok, err) => p.loadSound(url, ok, err), this.logger);
    // a sample with a sound rebuilt in code plays as code: its file is never loaded
    this.samples.hasCode = (name, n) => {
      const k = MathUtil.mod(Math.floor(n) || 0, Math.max(1, this.samples.count(name)));
      return !!this.instruments.replacing(`${name}:${k}`);
    };
    this.indexReady = this.samples.loadIndex().then(() => this.samplePanel && this.samplePanel.refreshFolders());

    // Build the control strip first so the stage's remaining height is known.
    this.panel = new ControlPanel(p, this.settings, p.select('#top'));
    // The space on the right, shared by the panel and the PARAMS (a panel of their own, not
    // one of its tabs: each shows without the other). [parâmetros] opens the PARAMS, [≈] painel
    // the last of the panel's tabs; pressing the one showing closes it.
    this.lastPane = 'layer';
    this.drawer = new Drawer(p, p.select('#drawer'), [
      { id: 'params', label: 'Parâmetros', alone: true },
      { id: 'layer', label: 'Camada' }, { id: 'instruments', label: 'Instrumentos' },
      { id: 'samples', label: 'Samples' }, { id: 'save', label: 'Guardar' },
    ], () => this.resize(p), () => {
      const d = this.drawer;
      if (d.current !== 'params') this.lastPane = d.current;
      this.paramsBar.setOpen(d.isOpen && d.current === 'params');
      paramsButton.html(d.isOpen && d.current === 'params' ? '[parâmetros ×]' : '[parâmetros]');
      panelButton.html(d.isOpen && d.current !== 'params' ? '[≈] painel ×' : '[≈] painel');
    });
    this.paramsBar = new ParamsBar(p, this.settings, this.drawer.pane('params'), {
      playing: () => this.drift.dominant(),
      onExport: () => this.store.download('radio-params.json', this.settings.paramsSnapshot()),
      onImport: async (file) => {
        try { this.settings.loadParams(await this.store.readJson(file)); this.paramsBar.render(); } catch (e) { alert('Não consegui importar: ' + e.message); }
      },
    });
    this.drawer.current = 'layer'; // the panel opens on Camada, not on the params
    const paramsButton = this.panel.addButton('[parâmetros]', () => this.drawer.toggleTab('params'));
    const panelButton = this.panel.addButton('[≈] painel', () => this.drawer.toggleTab(this.lastPane));
    this.fxBar = new FxBar(p, p.select('#fxbar'), this.settings);
    this.stage = p.select('#stage');
    const { width, height } = this.stage.elt.getBoundingClientRect();
    p.createCanvas(width, height).parent(this.stage);
    p.textFont(Theme.font);

    this.layerPanel = new LayerPanel(p, this.drawer.pane('layer'), this);
    this.instrumentPanel = new InstrumentPanel(p, this.drawer.pane('instruments'), this);
    this.samplePanel = new SamplePanel(p, this.drawer.pane('samples'), this);
    this.savePanel = new SavePanel(p, this.drawer.pane('save'), this);

    this.editor = new CodeEditor(p, this.stage, {
      onRun: (layer, code) => this.composer.deck.applyCode(layer.id, code),
      onOpen: (layer) => this.composer.deck.setEditing(layer.id, true),
      onClose: (layer) => this.composer.deck.setEditing(layer.id, false),
      keepOpen: [document.getElementById('drawer')], // its panels insert code into the editor
    });
    this.wireEvents(p);
    this.restoreLocalSamples(p);
    this.listenForDrops(p);

    this.startButton = p.createButton('[ ▶ SINTONIZAR ]').addClass('start').parent(this.stage);
    this.startButton.mousePressed(() => this.tuneIn(p));
  }

  wireEvents(p) {
    const { emitter } = this;
    emitter.on('layer:add', ({ layer }) => { this.layerPanel.refresh(); this.syncCodedLines(layer); });
    // a new version of a layer's code: its drums in code come back into it
    emitter.on('layer:change', ({ layer, coded }) => { if (!coded) this.syncCodedLines(layer); });
    emitter.on('layer:remove', ({ layer }) => {
      if (this.editor.layer === layer) this.editor.close();
      this.layerPanel.refresh();
    });
    emitter.on('layer:change', ({ layer, desc, quiet }) => {
      if (this.editor.layer === layer && desc === 'rolled back') this.editor.setStatus('erro ao correr: voltou ao código anterior (ver o registo)', 'err');
      if (!quiet) this.layerPanel.onLayerChange(layer);
    });
    emitter.on('pattern:user', ({ pattern }) => {
      this.bank.upsert(pattern);
      this.save();
      this.savePanel.render();
    });
    this.instrumentsStamp = 0; // changes when any sound changes (the full code's sound lines follow)
    // (the "por guardar" list is rebuilt only when which sounds are unsaved changes, not on
    // every move of a slider)
    this.instruments.on('change', ({ name }) => {
      this.instrumentsStamp++;
      this.save();
      const dirty = this.instruments.dirtyNames().join('|');
      if (dirty !== this.dirtyShown) { this.dirtyShown = dirty; this.savePanel.render(); }
      this.syncInstrument(name);
      this.instrumentPanel.onLibraryChange(name);
    });
    this.instruments.on('loaded', () => { this.instrumentPanel.reload(); this.savePanel.render(); });
    // (the files may have come in before these listeners were set)
    this.instrumentsReady.then(() => { this.instrumentPanel.reload(); this.savePanel.render(); });
    this.settings.on('change', ({ name, value }) => {
      if (name === 'volume' && this.state === 'playing') p.outputVolume(this.muted ? 0 : value, 0.1);
      this.applyParam(name);
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
    await this.patternsReady;
    await this.instrumentsReady;
    this.clock = new Clock(this.drift.tempo());
    this.scheduler = new Scheduler(ac, this.clock, this.logger);
    this.audio = new AudioEngine(ac, this.samples, this.instruments);
    this.fx = new FxRack(this.audio, this.clock, this.settings);
    this.fx.setXY(this.xy.values());
    this.fxBar.attach(this.fx);
    this.coder = new LiveCoder({ scheduler: this.scheduler, audio: this.audio, emitter: this.emitter, logger: this.logger });
    this.coder.attach(new LanguageApi({
      coder: this.coder, audio: this.audio, harmony: this.harmony, clock: this.clock, fx: this.fx, rng: this.rng,
      instruments: this.instruments, settings: this.settings,
      onSetup: (cfg) => this.applySetup(cfg),
      energy: () => this.composer.energy,
      section: () => this.composer.arc.section,
      genres: () => this.drift.weights(),
    }));
    this.composer = new Composer({
      bank: this.bank, coder: this.coder, audio: this.audio, samples: this.samples, harmony: this.harmony,
      drift: this.drift, arc: this.arc, fx: this.fx, instruments: this.instruments,
      settings: this.settings, clock: this.clock, scheduler: this.scheduler, rng: this.rng,
      emitter: this.emitter, logger: this.logger, fast: this.fast,
    });
    this.automation = new Automation({
      audio: this.audio, fx: this.fx, arc: this.arc, settings: this.settings, clock: this.clock, rng: this.rng,
      layers: () => [...this.composer.layers.values()], emitter: this.emitter, fast: this.fast,
    });
    this.spectrum = new Spectrum(this.audio.fft);
    if (this.settings.get('eq')) this.audio.eq.set(this.settings.get('eq'));
    this.eqCurve = new EqCurve(this.audio.eq, (values) => this.settings.set('eq', values));

    this.composer.preloadFor(this.drift.weights());
    const t0 = performance.now();
    while (this.samples.pendingCount > 0 && performance.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 100));

    this.scheduler.addHook((from, to) => this.coder.pump(from, to));
    this.scheduler.start();
    this.composer.start();
    p.outputVolume(this.settings.get('volume'));
    this.state = 'playing';
    this.logger.add('dica: arrasta números no código · clica num cartão para editar · ≈ abre o som da camada', 'event');
  }

  // ───── persistence and your own sounds ─────

  snapshot() {
    return {
      version: 3,
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
      if (!data || ![2, 3].includes(data.version)) throw new Error('não é um ficheiro do Radio AI');
      const current = this.snapshot();
      this.store.save({
        version: 3,
        settings: Object.assign({}, current.settings, Settings.migrate(data.settings)),
        instruments: Object.assign({}, current.instruments, data.instruments),
        userPatterns: current.userPatterns.concat(data.userPatterns || []),
      });
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      alert('Não consegui importar: ' + e.message);
    }
  }

  // One of your patterns as a .rad file (the bank's own format).
  exportPattern(pat) { this.store.downloadText(`${pat.id}.rad`, PatternLoader.format(pat)); }

  // .rad files become your patterns (user_<name>), saved and picked by the composer.
  async importPatterns(files) {
    for (const file of files) {
      try {
        const p = PatternLoader.parse(await file.text(), file.name);
        const id = p.id.startsWith('user_') ? p.id : 'user_' + p.id;
        this.bank.upsert(Object.assign(p, { id, user: true, edited: true }));
        this.logger.add(`padrão importado: ${id}`, 'event');
      } catch (e) {
        alert('Não consegui importar ' + file.name + ': ' + e.message);
      }
    }
    this.save();
    this.savePanel.render();
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
          this.logger.add(`novo som: s('my', { n: ${n} })  ← ${file.name}`, 'event');
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
      const code = CodeTools.updateInstrument(layer.code, name, spec);
      if (code === layer.code) continue;
      layer.code = code;
      // (coded: only inst lines changed; nothing else to bring back into the code)
      this.emitter.emit('layer:change', { layer, desc: null, instant: true, quiet: true, coded: true });
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

  // A card clicked: the INSTRUMENTOS panel opens at the sound of that line of its code.
  openSoundOf(layer, line) {
    const name = layer && this.soundIn(layer, line);
    if (name) this.openInstrument(name);
  }

  // The sound a line of a layer's code plays (an inst line, synth('x' / P.x), a sample with a
  // sound rebuilt in code: s('folder', { n }), s(P.kit...), hits('folder:n')), or else the
  // layer's first sound. null if it plays none the panel has.
  soundIn(layer, line = '') {
    const lib = this.instruments;
    const params = CodeTools.paramsOf(layer.code);
    const coded = (folder, n) => {
      if (!folder) return null;
      const k = MathUtil.mod(Math.floor(n) || 0, Math.max(1, this.samples.count(folder)));
      const exact = lib.replacing(`${folder}:${k}`);
      if (exact) return exact;
      const any = this.codedSounds(layer).find((s) => s.key.startsWith(folder + ':'));
      return any ? any.name : null;
    };
    let m = /^inst\('(\w+)'/.exec(line) || /synth\('(\w+)'/.exec(line);
    if (m && lib.has(m[1])) return m[1];
    m = /synth\(P\.(\w+)/.exec(line);
    if (m && lib.has(params[m[1]])) return params[m[1]];
    m = /\bs\((?:'(\w+)'|P\.(\w+))\s*(?:,\s*\{[^}]*?\bn:\s*(\d+))?/.exec(line);
    if (m) { const name = coded(m[1] || params[m[2]], m[3] ? +m[3] : 0); if (name) return name; }
    m = /hits\('(\w+):(\d+)'/.exec(line);
    if (m) { const name = coded(m[1], +m[2]); if (name) return name; }
    m = /^params\(/.test(line) ? Object.values(params).find((v) => lib.has(v)) : null;
    if (m) return m;
    const synths = CodeTools.synthsUsed(layer.code, lib.names()).filter((n) => lib.has(n));
    const drums = this.codedSounds(layer).map((s) => s.name);
    const first = layer.role === 'drums' || layer.role === 'perc' ? drums.concat(synths) : synths.concat(drums);
    return first[0] || null;
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


  // ───── views: cards → full code → sequencer → cards ─────

  static VIEWS = ['cards', 'code', 'seq'];
  static VIEW_NAMES = { cards: 'CARTÕES', code: 'CÓDIGO COMPLETO', seq: 'SEQUENCIADOR' };

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
    const T = Theme;
    const s = 26;
    p.textSize(Theme.size.small);
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
      this.stepsCache = { at: now, list: SequencerView.cycles([...this.composer.layers.values()], beat) };
    }
    return this.stepsCache.list;
  }

  // The full code: the tempo and harmony (setup), then each layer with every sound it plays,
  // the drums rebuilt in code included, so pasting it back plays the same track.
  fullCodeText() {
    const h = this.harmony;
    const setup = `setup({ bpm: ${Math.round(this.clock.bpm)}, key: '${Theory.name(h.key)}', mode: '${h.mode}', progression: [${h.prog.map((d) => d + 1).join(', ')}], chordBars: ${h.barsPerChord} })`;
    return FullCodeView.text([...this.composer.layers.values()], {
      genre: Genres.label(this.drift.dominant()).toUpperCase(),
      section: Arc.label(this.arc.section).toUpperCase(),
      bpm: Math.round(this.clock.bpm),
      key: h.keyName(),
      setup,
      sounds: (layer) => this.codedSoundLines(layer),
    });
  }

  // inst(...) lines for the samples a layer plays that have a sound rebuilt in code (with
  // "substitui": it plays instead of the file). Lines the layer's code already has are left
  // out (syncCodedLines puts them in it).
  codedSoundLines(layer) {
    const lines = this.codedSounds(layer).map(({ name, key }) => CodeTools.instLine(name, this.instruments.get(name), { substitui: key }));
    return lines.filter((l) => !layer.code.includes(l.slice(0, l.indexOf(',') + 1)));
  }

  // The sounds rebuilt in code that a layer's samples play: [{ name, key: 'folder:n' }].
  codedSounds(layer) {
    this.soundLines = this.soundLines || new Map();
    const plain = CodeTools.withoutCoded(layer.code);
    const hit = this.soundLines.get(layer.id);
    // which samples it plays depends on the code; which have a sound, on the sounds there are
    // (an edit to a sound changes neither: no probing while a slider moves)
    const stamp = plain + '|' + this.instruments.names().length;
    if (hit && hit.stamp === stamp) return hit.sounds;
    const keys = new Set();
    for (let k = 0; k < 3; k++) {  // a few runs: some patterns pick their samples at random
      const probe = this.coder.probe(plain, 16);
      for (const [name, n] of probe.samples || []) keys.add(`${name}:${MathUtil.mod(Math.floor(n) || 0, Math.max(1, this.samples.count(name)))}`);
    }
    const sounds = [];
    for (const key of [...keys].sort()) {
      const name = this.instruments.replacing(key);
      if (name) sounds.push({ name, key });
    }
    this.soundLines.set(layer.id, { stamp, sounds });
    return sounds;
  }

  // A layer's code carries the drums it plays as rebuilt in code (their inst lines, with the
  // sample each replaces), so what plays is all in the card and the panel's edits show there
  // as they're made.
  syncCodedLines(layer) {
    if (!layer || !this.composer) return;
    const plain = CodeTools.withoutCoded(layer.code);
    const lines = this.codedSounds(layer).map(({ name, key }) => CodeTools.instLine(name, this.instruments.get(name), { substitui: key }));
    const code = lines.length ? lines.join('\n') + '\n' + plain : plain;
    if (code === layer.code) return;
    layer.code = code;
    this.emitter.emit('layer:change', { layer, desc: null, instant: true, quiet: true, coded: true });
  }

  copyFullCode() {
    navigator.clipboard.writeText(this.fullCodeText()).then(
      () => { this.fullCode.copiedAt = performance.now(); this.logger.add('código completo copiado'); },
      () => this.logger.add('não consegui copiar o código', 'err'));
  }

  // [COLAR]: a program copied from the full code goes back into the radio.
  pasteFullCode() {
    if (!navigator.clipboard || !navigator.clipboard.readText) { this.logger.add('este browser não deixa ler a área de transferência', 'err'); return; }
    navigator.clipboard.readText().then((text) => this.loadProgram(text), () => this.logger.add('não consegui ler a área de transferência (o browser pediu autorização?)', 'err'));
  }

  // A whole program: setup() sets tempo and harmony; each section becomes that role's layer,
  // exactly as written (its inst lines included), locked; roles not in the program leave. The
  // radio is locked (BLOQUEAR) so it doesn't change the track.
  loadProgram(text) {
    if (!this.composer) { this.logger.add('carrega em SINTONIZAR antes de colar', 'err'); return false; }
    const prog = FullCodeView.parse(text || '');
    if (!prog.sections.length) { this.logger.add('não encontrei secções "// ── PAPEL · nome" no texto colado', 'err'); return false; }
    if (prog.setup) {
      try { this.applySetup(new Function(`return (${prog.setup})`)()); } catch (e) { this.logger.add('setup inválido: ' + e.message, 'err'); }
    }
    const roleOf = {};
    for (const r of PatternBank.ROLES) roleOf[PatternBank.roleLabel(r).toUpperCase()] = r;
    const deck = this.composer.deck;
    const bar = this.composer.bar + 1;
    const roles = new Set();
    this.settings.set('freeze', true);
    for (const s of prog.sections) {
      const role = roleOf[s.label] || (PatternBank.ROLES.includes(s.label.toLowerCase()) ? s.label.toLowerCase() : null);
      if (!role) { this.logger.add(`papel desconhecido no texto colado: ${s.label}`, 'err'); continue; }
      roles.add(role);
      const layer = deck.get(role);
      if (layer) {
        const r = deck.liveEdit(layer.id, s.code, { desc: 'colado', final: true, restart: true });
        if (!r.ok) this.logger.add(`${s.label}: ${r.error}`, 'err');
      } else {
        const id = 'user_' + s.id.replace(/^user_/, '');
        const fresh = deck.enter(role, { id, role, code: s.code, genres: {}, energy: [0, 1], user: true, edited: true }, bar, { asIs: true });
        if (fresh) fresh.locked = true;
      }
    }
    for (const layer of [...deck.values()]) if (!roles.has(layer.role)) deck.exit(layer, bar);
    this.settings.set('densityAuto', false);
    this.settings.set('density', Math.max(1, roles.size));
    this.fullCode.pastedAt = performance.now();
    this.logger.add(`programa colado: ${roles.size} camadas, bloqueado (BLOQUEAR)`, 'event');
    return true;
  }

  // setup({ bpm, key, mode, progression, chordBars }) from a program: tempo and key on
  // manual, the progression asked of the harmony (it starts on the next 4-bar boundary).
  applySetup(cfg) {
    const S = this.settings;
    if (cfg.bpm) { S.set('bpm', Math.round(+cfg.bpm)); S.set('bpmAuto', false); }
    if (cfg.key != null) {
      const pc = typeof cfg.key === 'number' ? cfg.key : Theory.NAMES.indexOf(String(cfg.key).toUpperCase());
      if (pc >= 0) S.set('key', pc);
    }
    if (cfg.mode) S.set('mode', cfg.mode);
    const change = {};
    if (Array.isArray(cfg.progression) && cfg.progression.length) change.prog = cfg.progression.map((d) => Math.max(0, Math.round(d) - 1));
    if (cfg.chordBars) change.bars = Math.max(1, Math.round(cfg.chordBars));
    if (Object.keys(change).length) this.harmony.request(change);
  }





  // Turns one genre on or off. The last one left on can't be turned off.
  toggleGenre(g) {
    const on = new Set(this.drift.allowed);
    if (on.has(g)) {
      if (on.size === 1) { this.logger.add('tem de ficar pelo menos um género ligado'); return; }
      on.delete(g);
    } else {
      on.add(g);
    }
    const list = Genres.LIST.filter((x) => on.has(x));
    this.settings.set('genres', list.length === Genres.LIST.length ? null : list);
  }







  // ───── drawing ─────

  draw(p) {
    const T = Theme;
    p.background(T.bg);
    if (this.state !== 'playing') return this.drawIdle(p);

    const now = performance.now();
    // dt may be large when the browser throttles frames; typing then catches up.
    this.grid.update(Math.min(1, p.deltaTime / 1000), this.audio.ac.currentTime, now);
    this.grid.padLine = this.automation.padComment();
    this.panel.sync(this.clock.bpm, this.composer.layers.size, this.composer.target(),
      [...this.composer.layers.values()].filter((l) => l.muted).length, this.composer.basePace());
    this.paramsBar.sync();
    if (this.drawer.isOpen && this.drawer.current === 'layer') this.layerPanel.tick();

    const bottomH = 104;
    const top = Hud.HEIGHT + 10;
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
    p.fill(Theme.bg);
    p.rect(0, top + stageH - 32, p.width, 40);
    this.drawViewButton(p, p.width - 12 - 26, top + stageH - 26);
    if (this.editor.isOpen && this.view === 'cards') {
      const card = this.grid.cards.get(this.editor.layer.id);
      this.editor.follow(card && card.rect, { x: 12, w: p.width - 24 });
    }
    this.hud.draw(p, p.width, {
      weights: this.drift.weights(),
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
      genres: this.drift.allowed,
      hover: (this.hud.hit(p.mouseX, p.mouseY) || {}).type,
    });
    this.drawBottom(p, p.height - bottomH, bottomH);
    this.updateCursor(p);
  }

  drawBottom(p, by, h) {
    const T = Theme;
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
    const T = Theme;
    const cx = p.width / 2, cy = p.height / 2;
    p.textFont(T.font);
    p.textSize(T.size.title + 3);
    p.fill(T.bright);
    App.tracked(p, 'BROKEN-RADIO', cx, cy - 52, 0.2);
    p.textAlign(p.CENTER);
    p.textSize(T.size.small);
    p.fill(T.text);
    p.text('RÁDIO INFINITA ESCRITA EM CÓDIGO', cx, cy - 28);
    p.fill(T.dim);
    p.text(Genres.LIST.map((g) => Genres.label(g).toUpperCase()).join(' · '), cx, cy - 12);
    // the status line sits under the tune-in button (.start in styles.css: cy+14 to about cy+51)
    if (this.state === 'loading') {
      const s = this.samples;
      const blink = (performance.now() >> 9) % 2 ? '_' : ' ';
      p.fill(T.text);
      p.text((s && s.index ? `A CARREGAR SAMPLES ${s.loaded} / ${s.loaded + s.pendingCount}` : 'A LIGAR') + blink, cx, cy + 76);
    } else if (this.patternsLoaded[0] < this.patternsLoaded[1] || this.soundsLoaded[0] < this.soundsLoaded[1] || !this.soundsLoaded[1]) {
      p.fill(T.dim);
      p.text(`A CARREGAR PADRÕES ${this.patternsLoaded[0]} / ${this.patternsLoaded[1]} · SONS ${this.soundsLoaded[0]} / ${this.soundsLoaded[1]}`, cx, cy + 76);
    }
    p.textAlign(p.LEFT);
  }
};
