// Transitions: how the radio gets from one thing to the next. When a new genre takes over
// (its harmony, its tempo) and how layers fade in and out. `c` is the Composer.
RA.Transitions = class Transitions {
  constructor(c) {
    this.c = c;
  }

  // Seconds a layer of this role takes to come in: drums and bass at once (and the very first
  // layers), the rest over PARAMS "fade in" bars.
  fadeIn(role, startBar) {
    const quick = role === 'drums' || role === 'bass' || startBar === 0;
    return quick ? 0.03 : Math.max(0.03, 4 * this.c.settings.get('fadeIn') * this.c.clock.spb());
  }

  // Seconds a layer of this role takes to fade out (PARAMS "fade out" bars).
  fadeOut(role) {
    return Math.max(0.03, 4 * this.c.settings.get('fadeOut') * this.c.clock.spb());
  }

  // Every 4 bars: if the genre in the lead has changed, its harmony comes in (its modes and
  // progressions; the key moves by a related interval) and the layers start handing over.
  followGenre(bar) {
    const { drift, harmony, settings, rng, logger } = this.c;
    const dom = drift.dominant();
    if (dom === this.c.genre) return;
    this.c.genre = dom;
    const change = harmony.planFor(dom, rng);
    // The listener's key and mode choices always win over the genre's.
    if (settings.get('mode') !== 'auto') change.mode = settings.get('mode');
    if (settings.get('key') === 'auto') change.key = harmony.key + rng.pick([0, 5, 7, -3]);
    harmony.request(change);
    this.c.nextMove = Math.min(this.c.nextMove, bar + (this.c.fast ? 1 : 4)); // start handing over soon
    logger.add(`bar ${bar}: genre → ${RA.Genres.label(dom)}`, 'event');
  }
};
