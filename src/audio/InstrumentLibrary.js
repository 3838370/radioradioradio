import { Emitter } from '../core/Emitter.js';

// InstrumentLibrary: the synth presets the code can use. Built-ins come from SynthPresets;
// the listener can override them or design new ones. Every note reads its preset when it
// starts, so edits are heard on the next note. Emits 'change' with { name }.
export class InstrumentLibrary extends Emitter {
  static clone(spec) { return JSON.parse(JSON.stringify(spec)); }

  constructor(builtins) {
    super();
    this.builtins = InstrumentLibrary.clone(builtins);
    this.custom = {}; // overrides of built-ins and new instruments
  }

  get(name) { return this.custom[name] || this.builtins[name] || null; }

  has(name) { return !!this.get(name); }

  isBuiltin(name) { return name in this.builtins; }

  isModified(name) { return this.isBuiltin(name) && name in this.custom; }

  names() { return [...new Set([...Object.keys(this.builtins), ...Object.keys(this.custom)])]; }

  set(name, spec) {
    this.custom[name] = InstrumentLibrary.clone(spec);
    this.emit('change', { name });
  }

  // Built-in: back to the original. Custom: deleted.
  reset(name) {
    delete this.custom[name];
    this.emit('change', { name });
  }

  serialize() { return InstrumentLibrary.clone(this.custom); }

  load(custom) {
    for (const [name, spec] of Object.entries(custom || {})) {
      if (spec && Array.isArray(spec.osc) && spec.osc.length) this.custom[name] = InstrumentLibrary.clone(spec);
    }
  }
};
