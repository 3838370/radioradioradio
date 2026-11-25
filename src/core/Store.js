// Store: persistence. Settings, instruments and the listener's patterns go to
// localStorage; dropped audio files (too big for that) go to IndexedDB. Everything is
// best-effort: private windows or blocked storage just mean nothing is remembered.
export class Store {
  static KEY = 'radio-ai-v3';
  static OLD_KEYS = ['radio-ai-v2']; // read once if there's nothing under KEY yet (Settings.migrate does the rest)

  constructor() {
    this.timer = null;
    this.db = null;
  }

  load() {
    for (const key of [Store.KEY, ...Store.OLD_KEYS]) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data) return data;
      } catch (e) { /* unreadable: try the next */ }
    }
    return {};
  }

  save(state) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      try { localStorage.setItem(Store.KEY, JSON.stringify(state)); } catch (e) { console.warn('could not save', e); }
    }, 400);
  }

  clear() {
    try { localStorage.removeItem(Store.KEY); } catch (e) { /* nothing stored */ }
  }

  async openDb() {
    if (this.db) return this.db;
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('radio-ai', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('samples', { keyPath: 'name' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  async tx(mode, fn) {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const t = db.transaction('samples', mode);
      const req = fn(t.objectStore('samples'));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  }

  putSample(name, bytes) { return this.tx('readwrite', (s) => s.put({ name, bytes })); }
  allSamples() { return this.tx('readonly', (s) => s.getAll()); }
  deleteSample(name) { return this.tx('readwrite', (s) => s.delete(name)); }
  clearSamples() { return this.tx('readwrite', (s) => s.clear()); }

  download(filename, data) { this.downloadText(filename, JSON.stringify(data, null, 2), 'application/json'); }

  downloadText(filename, text, type = 'text/plain') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async readJson(file) { return JSON.parse(await file.text()); }
};
