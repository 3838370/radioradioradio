// Steering: what the listener does by hand. With density or tempo on manual, the arc is held
// in the section that matches what they're doing; back on auto it carries on from there, and
// the register they left (level, tempo) keeps leaning the next sections and genres for a
// while (see Arc.lean, GenreDrift.lean). `c` is the Composer.
RA.Steering = class Steering {
  constructor(c) {
    this.c = c;
    this.dir = 0;            // which way the listener last moved the layer count (-1, +1)
    this.lastDensity = null;
  }

  // The arc section that matches what the listener is doing on manual, or null when
  // nothing structural is on manual. Layers lead, read together with the tempo when that is
  // on manual too (`ratio`: their tempo against the genre's; 1 when the tempo is on auto, as
  // the auto tempo follows the section itself). Tempo alone counts when layers are on auto.
  // `dir` is the way the layer count last moved (-1 down, +1 up).
  //               slower (< ×0.94)            normal                 faster (> ×1.04)
  //   1-2 layers  suspense (sparse going down) sparse / drift         build
  //   3-4 layers  dread going down, else drift drift / build          tension
  //   5-6 layers  dread                        tension / peak         surge (peak with 6)
  // Going down from full at a normal tempo gives release, or collapse after a peak.
  static sectionForLayers(n, dir, current, ratio = 1) {
    const slow = ratio < 0.94, fast = ratio > 1.04;
    const falling = () => (['peak', 'surge', 'collapse'].includes(current) ? 'collapse' : 'release');
    if (n <= 2) {
      if (slow) return dir < 0 ? 'sparse' : 'suspense';
      if (fast) return 'build';
      return n <= 1 ? 'sparse' : dir < 0 ? falling() : 'drift';
    }
    if (n <= 4) {
      if (slow) return dir < 0 ? 'dread' : 'drift';
      if (fast) return 'tension';
      return dir < 0 ? falling() : n === 4 ? 'build' : 'drift';
    }
    if (slow) return 'dread';
    if (fast) return n >= 6 ? 'peak' : 'surge';
    return n >= 6 ? 'peak' : 'tension';
  }

  static sectionForTempo(ratio) {
    if (ratio >= 1.09) return 'surge';
    if (ratio >= 1.03) return 'tension';
    if (ratio <= 0.86) return 'sparse';
    if (ratio <= 0.95) return 'drift';
    return 'build';
  }

  section() {
    const S = this.c.settings;
    const ratio = S.get('bpmAuto') ? 1 : S.get('bpm') / this.c.drift.tempo();
    if (!S.get('densityAuto')) return Steering.sectionForLayers(S.get('density'), this.dir, this.c.arc.section, ratio);
    if (!S.get('bpmAuto')) return Steering.sectionForTempo(ratio);
    return null;
  }

  // Holds the arc where the listener has taken it, or lets it go on from there.
  steer(bar = this.c.bar) {
    const { arc, drift, settings, logger } = this.c;
    const want = this.section();
    if (!want) {
      if (arc.held) logger.add(`bar ${bar}: back on auto, carrying on from ${arc.section.toUpperCase()}`, 'event');
      arc.letGo(bar);
      return;
    }
    const tempo = settings.get('bpmAuto') ? null : settings.get('bpm') / drift.tempo();
    const changed = arc.hold(want, bar, tempo);
    if (changed) {
      logger.add(`bar ${bar}: section → ${changed.toUpperCase()} (by hand)`, 'event');
      this.lean();
      drift.rethinkNext(); // the genre after this one should suit the new register
      this.c.preloadNextGenre();
    }
  }

  // The listener's register also leans the choice of the next genre (slow and sparse →
  // calmer, darker genres; full and fast → excited ones), fading with the arc's lean.
  lean() {
    const l = this.c.arc.lean;
    this.c.drift.lean = l && { energy: 0.25 + 0.6 * l.level, bpm: this.c.drift.tempo() * l.tempo, strength: l.strength };
  }

  // The density slider moved: which way the listener is going (from their last setting, or
  // from what's playing).
  noteDensity(value) {
    const from = this.c.settings.get('densityAuto') || this.lastDensity == null ? this.c.deck.size : this.lastDensity;
    if (value !== from) this.dir = Math.sign(value - from);
    this.lastDensity = value;
  }
};
