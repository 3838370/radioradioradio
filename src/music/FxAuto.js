import { FxRack } from '../audio/FxRack.js';
import { Composer } from './Composer.js';

// FxAuto: the effects the radio plays by itself. Now and then an effect pad that suits the
// section, an Aphex-style jump of the delay time, and a break or fill on the last bar before
// the arc moves on. `c` is the Composer.
export class FxAuto {
  constructor(c) {
    this.c = c;
  }

  // Now and then, fire an effect pad that suits the section, for one to four bars.
  pad(bar) {
    const { settings, fx, rng, arc, clock, logger } = this.c;
    const p = settings.get('fxAuto');
    if (!p || fx.autoActive() || !rng.chance(p * 0.08)) return;
    const sec = arc.section;
    const calm = Composer.CALM.includes(sec);
    const id = rng.weighted(calm
      ? [['dub', 3], ['warp', 2], ['wash', 3], ['wobble', 2], ['throw', 2]]
      : sec === 'dread'
        ? [['sweep', 3], ['wobble', 2], ['warp', 2], ['dub', 1], ['tapestop', 0.5]]
        : [['throw', 3], ['sweep', 2], ['stutter', sec === 'surge' ? 3 : 2], ['dub', 1], ['tapestop', sec === 'tension' ? 0.6 : sec === 'peak' || sec === 'surge' ? 1.2 : 0]]);
    const bars = id === 'stutter' || id === 'tapestop' ? 1 : rng.int(1, 4);
    fx.pulse(id, bars * 4 * clock.spb());
    const pad = FxRack.PADS.find((x) => x.id === id);
    logger.add(`compasso ${bar}: fx ${pad.label.toLowerCase()} (${bars} compasso${bars > 1 ? 's' : ''})`);
  }

  // Aphex-style: sometimes jump the delay to another note value; the glide bends the echoes.
  delay(bar) {
    const { settings, fx, rng, logger } = this.c;
    if (!settings.get('delayAuto') || !rng.chance(this.c.fast ? 0.2 : 0.05)) return;
    const current = settings.get('delayBeats');
    const [name, beats] = rng.pick(FxRack.DELAY_NOTES.filter(([, b]) => Math.abs(b - current) > 0.01));
    fx.setDelayBeats(beats);
    logger.add(`compasso ${bar}: delay → ${name}`);
  }

  // The last bar before the arc moves on: a break (the beat drops for half a bar) or an
  // effect fill. Returns 'break', 'fill' or null.
  fill(bar) {
    const { deck, audio, clock, scheduler, rng, fx, logger } = this.c;
    const beat = deck.get('drums') || deck.get('perc');
    if (beat && !beat.locked && rng.chance(0.5)) {
      const bus = audio.bus(beat.id);
      const spb = clock.spb();
      bus.fade(0, 0.1 * spb, Math.max(audio.ac.currentTime, clock.timeOf(bar * 4 + 2)));
      scheduler.at((bar + 1) * 4, (t) => { if (deck.get(beat.role) === beat) bus.fade(1, 0.05, t); }, null);
      logger.add(`compasso ${bar}: break`);
      return 'break';
    }
    if (fx) {
      const id = rng.pick(['stutter', 'throw', 'sweep']);
      fx.pulse(id, 4 * clock.spb());
      logger.add(`compasso ${bar}: fill (${id})`);
      return 'fill';
    }
    return null;
  }
};
