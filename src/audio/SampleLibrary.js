// SampleLibrary: the Dirt-Samples index plus lazily loaded AudioBuffers.
// `loader` is p5.sound's loadSound(url, onLoad, onError), injected by the App.
RA.SampleLibrary = class SampleLibrary {
  static BASE = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/';

  // Only used if strudel.json can't be fetched: one file per folder (any n plays that file).
  static FALLBACK = {
    '808bd': ['808bd/BD0000.WAV'], '808sd': ['808sd/SD0000.WAV'], '808': ['808/CH.WAV'], bd: ['bd/BT0A0A7.wav'],
    sn: ['sn/ST0T0S0.wav'], dr2: ['dr2/003_DR110KIK.WAV'], drumtraks: ['drumtraks/006_DT Kick.wav'],
    odx: ['odx/000_Kick_1.wav'], amencutup: ['amencutup/000_AMENCUT_001.wav'], jungle: ['jungle/jungle4closedhh.wav'],
    glitch: ['glitch/000_BD.wav'], glitch2: ['glitch2/002_FX.wav'], click: ['click/000_click0.wav'],
    metal: ['metal/000_0.wav'], tok: ['tok/000_0.wav'], industrial: ['industrial/000_01.wav'],
    space: ['space/000_0.wav'], wind: ['wind/000_wind1.wav'], birds: ['birds/000_1.wav'], outdoor: ['outdoor/1.wav'],
    speech: ['speech/000_Sound10.wav'], mouth: ['mouth/000_1.wav'], juno: ['juno/09_juno_pad_c_minor_filter.wav'],
    pad: ['pad/alien-monolith-pad.wav'], hh27: ['hh27/000_hh27closedhh.wav'], future: ['future/013_Shake2.wav'],
  };

  constructor(loader, logger) {
    this.loader = loader;
    this.logger = logger;
    this.index = null;
    this.buffers = new Map(); // path -> AudioBuffer | null (failed)
    this.pending = new Map(); // path -> Promise<AudioBuffer | null>
    this.reversedCache = new WeakMap();
    this.loaded = 0;
    this.failed = 0;
  }

  async loadIndex() {
    const local = this.index && this.index.my; // files dropped in before the index arrived
    try {
      const res = await fetch(SampleLibrary.BASE + 'strudel.json');
      const json = await res.json();
      delete json._base;
      this.index = json;
    } catch (e) {
      this.logger.add('sample index unavailable, using fallback list', 'err');
      this.index = Object.assign({}, SampleLibrary.FALLBACK);
    }
    if (local) this.index.my = local;
  }

  folders() { return this.index ? Object.keys(this.index) : []; }

  files(name) { return (this.index && this.index[name]) || []; }

  // The listener's own files live in the folder 'my': s('my', { n }).
  addLocal(fileName, buffer) {
    if (!this.index) this.index = {};
    const list = this.index.my || (this.index.my = []);
    const p = 'my/' + fileName;
    if (!list.includes(p)) list.push(p);
    this.buffers.set(p, buffer);
    return list.indexOf(p);
  }

  removeLocal(fileName) {
    const p = 'my/' + fileName;
    if (this.index && this.index.my) this.index.my = this.index.my.filter((x) => x !== p);
    this.buffers.delete(p);
  }

  // A reversed copy of a buffer (cached).
  reversed(buffer) {
    let r = this.reversedCache.get(buffer);
    if (r) return r;
    r = new AudioBuffer({ length: buffer.length, numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
    for (let c = 0; c < buffer.numberOfChannels; c++) r.copyToChannel(buffer.getChannelData(c).slice().reverse(), c);
    this.reversedCache.set(buffer, r);
    return r;
  }

  count(name) {
    const files = this.index && this.index[name];
    return files ? files.length : 0;
  }

  path(name, n = 0) {
    const files = this.index && this.index[name];
    if (!files || !files.length) return null;
    return files[RA.MathUtil.mod(Math.floor(n) || 0, files.length)];
  }

  // The buffer if ready; otherwise starts loading it and returns null.
  get(name, n) {
    const p = this.path(name, n);
    if (!p) return null;
    if (this.buffers.has(p)) return this.buffers.get(p);
    this.request(p);
    return null;
  }

  request(p) {
    if (this.buffers.has(p)) return Promise.resolve(this.buffers.get(p));
    if (this.pending.has(p)) return this.pending.get(p);
    const url = SampleLibrary.BASE + p.split('/').map(encodeURIComponent).join('/');
    const promise = new Promise((resolve) => {
      this.loader(url,
        (sf) => { this.buffers.set(p, sf.buffer); this.pending.delete(p); this.loaded++; resolve(sf.buffer); },
        () => { this.buffers.set(p, null); this.pending.delete(p); this.failed++; this.logger.add('sample failed: ' + p, 'err'); resolve(null); });
    });
    this.pending.set(p, promise);
    return promise;
  }

  // Resolves with the buffer once it's loaded (or null).
  ensure(name, n) {
    const p = this.path(name, n);
    return p ? this.request(p) : Promise.resolve(null);
  }

  // list: [[name, n], ...]
  preload(list) {
    for (const [name, n] of list) {
      const p = this.path(name, n);
      if (p) this.request(p);
    }
  }

  get pendingCount() { return this.pending.size; }
};
