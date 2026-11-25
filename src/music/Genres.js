// Genres: everything that makes each genre itself, in one table. The rest of the radio reads
// it from here (GenreDrift, Arc, Harmony, Composer, collage()).
//   label        the name in the top bar
//   tempo        BPM (each visit varies it ±7%)
//   intensity    base ENERGY (0..1); a slow wave moves around it
//   tends        where the journey tends to go next (weights; any genre can follow any other)
//   sections     arc sections it prefers (×2.2) and avoids (×0.25), and the most layers on auto
//   modes        modes it plays in
//   progressions scale degrees (0 = tonic), one chord per 4 bars
//   roleOrder    the order its layers come in
//   collage      sample folders for collage() (voices, radio, field recordings)
RA.Genres = class Genres {
  static TABLE = {
    // Aphex Twin's ambient side (Selected Ambient Works 85-92 and II, the Drukqs prepared
    // pianos): FM pads, loose 808, ostinatos, tape. Slow, melancholy turns.
    saw: {
      label: 'saw', tempo: 96, intensity: 0.35,
      tends: { acid: 2, boc: 2, space: 1.5 },
      sections: { prefer: ['drift', 'suspense', 'sparse'], avoid: ['surge', 'peak'], cap: 5 },
      modes: ['aeolian', 'lydian', 'dorian'],
      progressions: [[0, 4], [0, 5, 3, 4], [0, 3, 4, 3], [0, 0, 5, 4], [0, 1, 4, 0], [0, 3], [5, 3, 0, 4], [0, 2, 5, 4], [0, 5, 1, 4], [3, 4, 0, 0], [0, 6, 5, 4], [0, 2]],
      roleOrder: ['keys', 'lead', 'texture', 'bass', 'drums', 'perc'],
      collage: ['outdoor', 'birds3', 'wind', 'bubble', 'speechless'],
    },
    // Aphex Twin's acid and braindance (Analord, the Richard D. James Album): raw 303,
    // 808/909, odd-interval motifs. Sits on one or two chords.
    acid: {
      label: 'acid', tempo: 132, intensity: 0.75,
      tends: { drill: 2.5, ae: 2, minimal: 1.5 },
      sections: { prefer: ['build', 'tension', 'surge'], avoid: ['sparse'], cap: 6 },
      modes: ['phrygian', 'aeolian', 'dorian'],
      progressions: [[0], [0, 1], [0, 0, 0, 6], [0, 6], [0, 0, 1, 0], [0, 4], [0, 0, 5, 1], [0, 3]],
      roleOrder: ['bass', 'drums', 'perc', 'lead', 'keys', 'texture'],
      collage: ['glitch', 'diphone', 'mouth', 'numbers'],
    },
    // drill'n'bass (Drukqs, Come to Daddy): the amen chopped at speed under slow, sad melodies.
    drill: {
      label: 'drill', tempo: 168, intensity: 0.85,
      tends: { dark: 2.5, ae: 2, saw: 1.5 },
      sections: { prefer: ['surge', 'peak', 'collapse'], avoid: ['drift'], cap: 6 },
      modes: ['aeolian', 'dorian', 'lydian'],
      progressions: [[0, 5, 3, 4], [0, 3], [5, 3, 0, 4], [0, 2, 5, 4], [0, 5], [3, 4, 0, 0], [0, 6, 5, 4], [5, 4, 3, 4], [0, 1, 5, 4]],
      roleOrder: ['drums', 'lead', 'bass', 'keys', 'texture', 'perc'],
      collage: ['speech', 'mouth', 'glitch2', 'alphabet'],
    },
    // Boards of Canada: slow hip-hop breaks, detuned drifting synths, tape, voices. Leans on
    // the flat seventh (mixolydian).
    boc: {
      label: 'boc', tempo: 90, intensity: 0.45,
      tends: { saw: 2, dub: 1.5, space: 1.5 },
      sections: { prefer: ['drift', 'build', 'release'], avoid: ['surge', 'peak'], cap: 5 },
      modes: ['mixolydian', 'dorian', 'lydian', 'aeolian'],
      progressions: [[0, 4], [0, 6], [0, 3, 4], [0, 6, 5, 4], [0, 0, 6, 6], [3, 0], [0, 4, 3, 6], [5, 4, 0, 0], [0, 2, 6, 4], [0, 6, 3, 4]],
      roleOrder: ['drums', 'keys', 'lead', 'texture', 'bass', 'perc'],
      collage: ['speech', 'numbers', 'kurt', 'birds3', 'outdoor', 'alphabet'],
    },
    // Efdemin: dry 4/4, shuffled hats, bell and organ cells in different cycle lengths.
    // Barely moves harmonically.
    minimal: {
      label: 'minimal', tempo: 122, intensity: 0.6,
      tends: { dub: 2.5, acid: 1.5, ae: 1.5 },
      sections: { prefer: ['build', 'drift', 'tension'], avoid: ['peak', 'collapse'], cap: 6 },
      modes: ['dorian', 'aeolian', 'mixolydian'],
      progressions: [[0], [0, 3], [0, 0, 0, 5], [0, 0, 6, 0], [0, 5], [0, 0, 3, 0], [3, 0], [0, 4, 0, 0]],
      roleOrder: ['drums', 'perc', 'bass', 'keys', 'lead', 'texture'],
      collage: ['east', 'outdoor', 'noise2', 'speechless'],
    },
    // dub techno and Gas: chord stabs into long delays, muffled kick, hiss. One chord for minutes.
    dub: {
      label: 'dub', tempo: 120, intensity: 0.5,
      tends: { minimal: 2, boc: 1.5, space: 1.5 },
      sections: { prefer: ['drift', 'build', 'dread'], avoid: ['peak'], cap: 5 },
      modes: ['dorian', 'aeolian'],
      progressions: [[0], [0, 0, 0, 3], [0, 0, 5, 0], [0, 3], [0, 0, 0, 6], [0, 5], [0, 0, 3, 5], [3, 0], [0, 6, 0, 0], [0, 4, 0, 0], [0, 0, 5, 5], [0, 0, 3, 3]],
      roleOrder: ['keys', 'drums', 'bass', 'texture', 'perc', 'lead'],
      collage: ['speech', 'east', 'noise2', 'outdoor', 'wind'],
    },
    // drifting space ambient (Aethereon) and FSOL collage.
    space: {
      label: 'space', tempo: 84, intensity: 0.3,
      tends: { saw: 2, dark: 1.5, boc: 1.5 },
      sections: { prefer: ['sparse', 'suspense', 'drift'], avoid: ['surge', 'peak'], cap: 4 },
      modes: ['lydian', 'dorian', 'aeolian'],
      progressions: [[0, 4], [0, 1, 0, 4], [0, 5, 3, 4], [0, 2, 3, 1], [0, 3], [0, 1], [3, 0], [0, 5, 4, 3], [0, 2], [0, 4, 5, 3], [1, 0, 3, 0], [0, 6]],
      roleOrder: ['keys', 'lead', 'texture', 'bass', 'perc', 'drums'],
      collage: ['cosmicg', 'space', 'speechless', 'numbers', 'bubble', 'insect', 'birds3'],
    },
    // slow tension: half-time weight, drones, low brass, detuned pianos.
    dark: {
      label: 'dark', tempo: 76, intensity: 0.35,
      tends: { ae: 2, space: 2, saw: 1.5 },
      sections: { prefer: ['dread', 'suspense', 'collapse'], avoid: ['peak'], cap: 5 },
      modes: ['phrygian', 'locrian', 'aeolian'],
      progressions: [[0, 1], [0, 0, 1, 0], [0, 5, 1, 0], [0], [0, 6], [0, 1, 6, 0], [0, 0, 4, 1], [0, 3, 1, 0], [0, 5, 4, 1]],
      roleOrder: ['texture', 'keys', 'bass', 'drums', 'lead', 'perc'],
      collage: ['crow', 'insect', 'speechless', 'noise2', 'seawolf', 'industrial'],
    },
    // Autechre (AE_LIVE 2016-2018): generated, shifting rhythms, harsh FM, no tonic.
    ae: {
      label: 'ae', tempo: 118, intensity: 0.65,
      tends: { dark: 2, drill: 2, minimal: 1.5 },
      sections: { prefer: ['surge', 'suspense', 'collapse', 'dread'], avoid: ['drift'], cap: 6 },
      modes: ['phrygian', 'locrian', 'dorian'],
      progressions: [[0], [0, 1], [0, 4, 1], [0, 3, 6], [0, 6, 1, 5], [1, 0, 5], [0, 2, 1], [0, 5, 2, 6], [0, 0, 1, 0], [0, 6, 0, 1]],
      roleOrder: ['perc', 'drums', 'bass', 'texture', 'lead', 'keys'],
      collage: ['glitch', 'diphone2', 'tacscan', 'invaders', 'numbers', 'sid'],
    },
  };

  // The genres, in the top bar's order.
  static LIST = Object.keys(Genres.TABLE);

  // The genres of earlier versions, and where they went (saved choices and your patterns).
  static OLD = { fog: ['dub'], deep: ['saw', 'boc'], atmos: ['boc', 'drill'], rave: ['acid'], industrial: ['ae', 'dark'] };

  // The listener's values for some fields (Settings: GENRE_SCHEMA, set in the PARAMS row),
  // { genre: { id: value } }, laid over the table by of().
  static tuning = {};
  static tuned = new Map();

  static tune(tuning) {
    Genres.tuning = tuning || {};
    Genres.tuned.clear();
  }

  // A genre's table with the listener's values in place.
  static of(name) {
    const base = Genres.TABLE[name];
    if (!base) return null;
    const t = Genres.tuning[name];
    if (!t || !Object.keys(t).length) return base;
    if (!Genres.tuned.has(name)) {
      const out = JSON.parse(JSON.stringify(base));
      for (const [id, value] of Object.entries(t)) {
        const spec = RA.Settings.genreSpec(id);
        if (!spec) continue;
        const keys = spec.path.split('.');
        const last = keys.pop();
        keys.reduce((o, k) => o[k], out)[last] = value;
      }
      Genres.tuned.set(name, out);
    }
    return Genres.tuned.get(name);
  }

  // One field of a genre's table by its path ('sections.cap'), with the listener's value.
  static get(name, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), Genres.of(name)); }

  // The table's own value (the default), without the listener's.
  static base(name, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), Genres.TABLE[name]); }

  static label(name) { return (Genres.TABLE[name] || {}).label || name; }

  // { saw: 0, acid: 0, ... }
  static zeroWeights() {
    const w = {};
    for (const g of Genres.LIST) w[g] = 0;
    return w;
  }

  // A list of genre names, older names mapped to today's, unknown ones dropped.
  static migrate(names) {
    return [...new Set((names || []).flatMap((g) => Genres.OLD[g] || [g]).filter((g) => Genres.LIST.includes(g)))];
  }

  // A pattern's weights ({ fog: 1, deep: 0.3 }) in today's genres.
  static migrateWeights(weights) {
    const out = {};
    for (const [g, v] of Object.entries(weights || {})) {
      for (const n of Genres.OLD[g] || [g]) if (Genres.LIST.includes(n)) out[n] = Math.max(out[n] || 0, v);
    }
    return out;
  }

  // A value per genre blended by the weights ({ genre: 0..1 }), e.g. blend(w, (g) => g.tempo).
  static blend(weights, get) {
    let s = 0, total = 0;
    for (const [g, w] of Object.entries(weights || {})) if (w && Genres.TABLE[g]) { s += w * get(Genres.of(g)); total += w; }
    return total ? s / total : 0;
  }
};
