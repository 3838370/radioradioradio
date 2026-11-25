import { Arc } from './Arc.js';
import { Composer } from './Composer.js';
import { Genres } from './Genres.js';

// Transitions: how the radio gets from one thing to the next. `c` is the Composer.
//   layers    drums and bass come in at once; when they are swapped the old ones stop at
//             once too, so two beats or two basslines never overlap. Pads, melodies and
//             textures crossfade over the PARAMS fade in / fade out bars.
//   keys      a key change waits for a calm moment (a quiet section, two layers or fewer, or
//             a break before the arc moves on) unless PARAMS "keys when calm" is off.
//   genres    when a new genre takes over, its harmony comes in and (PARAMS "calm hand-over")
//             the arc first goes to a quiet section: the old layers leave, the tempo moves
//             with little playing, then the new genre builds up.
export class Transitions {
  static RHYTHM = ['drums', 'bass'];
  static QUIET = ['release', 'sparse', 'suspense'];

  constructor(c) {
    this.c = c;
  }

  // Seconds a layer of this role takes to come in: drums and bass at once (and the very first
  // layers), the rest over PARAMS "fade in" bars.
  fadeIn(role, startBar) {
    const quick = Transitions.RHYTHM.includes(role) || startBar === 0;
    return quick ? 0.03 : Math.max(0.03, 4 * this.c.settings.get('fadeIn') * this.c.clock.spb());
  }

  // Seconds a layer of this role takes to fade out (PARAMS "fade out" bars). `replaced`: a new
  // pattern takes its place at the same moment; drums and bass then stop within a quarter beat.
  fadeOut(role, replaced = false) {
    const spb = this.c.clock.spb();
    if (replaced && Transitions.RHYTHM.includes(role)) return 0.25 * spb;
    return Math.max(0.03, 4 * this.c.settings.get('fadeOut') * spb);
  }

  // Whether a waiting key change may happen now.
  keyChangeAllowed() {
    const { settings, arc, deck } = this.c;
    if (!settings.get('modulateCalm')) return true;
    return Composer.CALM.includes(arc.section) || deck.size <= 2;
  }

  // Every 4 bars: if the genre in the lead has changed, its harmony comes in (its modes,
  // progressions and chord length; the key moves by a related interval) and the layers start
  // handing over, through a quiet section when "calm hand-over" is on.
  followGenre(bar) {
    const { drift, harmony, settings, rng, logger, arc } = this.c;
    const dom = drift.dominant();
    if (dom === this.c.genre) return;
    this.c.genre = dom;
    const change = harmony.planFor(dom, rng);
    // The listener's key and mode choices always win over the genre's.
    if (settings.get('mode') !== 'auto') change.mode = settings.get('mode');
    if (settings.get('key') === 'auto') change.key = harmony.key + rng.pick([0, 5, 7, -3]);
    harmony.request(change);
    this.c.nextMove = Math.min(this.c.nextMove, bar + (this.c.fast ? 1 : 4)); // start handing over soon
    logger.add(`bar ${bar}: genre → ${Genres.label(dom)}`, 'event');
    // the hand-over goes through a quiet section the new genre likes (not while the listener
    // steers the arc by hand, or holds the layer count)
    if (settings.get('handoffCalm') && !arc.held && settings.get('densityAuto') && !Transitions.QUIET.includes(arc.section) && arc.section !== 'collapse') {
      const w = { [dom]: 1 };
      const quiet = rng.weighted(Transitions.QUIET.map((s) => [s, Arc.genreBias(s, w)]));
      arc.enter(quiet, bar);
      logger.add(`bar ${bar}: section → ${quiet.toUpperCase()} (hand-over)`, 'event');
    }
  }
};
