// Loop: the state of one loop('name', fn) inside a layer.
export class Loop {
  constructor(name, fn, startBeat) {
    this.name = name;
    this.fn = fn;
    this.nextBeat = startBeat;
    this.i = 0;
    this.counters = {};
    this.stopped = false;
  }
};
