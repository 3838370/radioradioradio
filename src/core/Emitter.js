// Emitter: minimal publish/subscribe, so components don't reach into each other.
export class Emitter {
  constructor() {
    this.handlers = new Map();
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return () => this.handlers.set(type, this.handlers.get(type).filter((h) => h !== fn));
  }

  emit(type, payload) {
    for (const fn of this.handlers.get(type) || []) {
      try { fn(payload); } catch (e) { console.warn(`handler for '${type}' failed`, e); }
    }
  }
};
