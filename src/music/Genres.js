import { Settings } from '../core/Settings.js';

// Genres: everything that makes each genre itself, in one table. The rest of the radio reads
// it from here (GenreDrift, Arc, Harmony, Composer, collage()).
//   label        the name in the top bar
//   tempo        BPM (each visit varies it ±7%)
//   intensity    base ENERGY (0..1); a slow wave moves around it
//   tends        where the journey tends to go next (weights; any genre can follow any other)
//   sections     arc sections it prefers (×2.2) and avoids (×0.25), and the most layers on auto
//   modes        modes it plays in
//   progressions scale degrees (0 = tonic)
//   chordBars    how many bars each chord lasts (one of these, drawn per progression)
//   wow          how much the tape's wow and flutter (on the whole mix) move here (×)
//   roleOrder    the order its layers come in
//   collage      sample folders for collage() (voices, radio, field recordings)
//   palette      the instruments it may swap in, per family (Families.SYNTHS): when a pattern
//                says params({ pad: 'boc_pad' }), a new version or a timbre move picks
//                another pad from this genre's `pad` list, never one from another genre
//   kits         the same for sample folders (Families.KITS): kick, snare, hat...
export class Genres {
  static TABLE = {
    // Aphex Twin's acid and braindance (Analord, the Richard D. James Album): raw 303,
    // 808/909, odd-interval motifs. Sits on one or two chords.
    acid: {
      label: 'acid', tempo: 132, intensity: 0.75, chordBars: [8, 16], wow: 0.8,
      tends: { ae: 2.5, dub: 1.5, space: 0.5 },
      sections: { prefer: ['build', 'tension', 'surge'], avoid: ['sparse'], cap: 6 },
      modes: ['phrygian', 'aeolian', 'dorian'],
      progressions: [[0], [0, 1], [0, 0, 0, 6], [0, 6], [0, 0, 1, 0], [0, 4], [0, 0, 5, 1], [0, 3]],
      roleOrder: ['bass', 'drums', 'perc', 'lead', 'keys', 'texture'],
      collage: ['glitch', 'diphone', 'mouth', 'numbers'],
      palette: { acid: ['acid', 'acid_dirty', 'acid_303', 'acid_sq', 'tb303_saw', 'tb303_square'], acid_bass: ['sh_bass', 'braindance_bass'], lead: ['sh_lead', 'aphex_lead', 'saw2_square', 'pulse', 'sync_lead'], bell: ['dx_marimba', 'fm_glass', 'dx_bell'], organ: ['efd_organ'], pad: ['dx_pad', 'pwm_pad'], sub: ['sub808', 'fm_sub'], fm_bass: ['fm_bass'], stab: ['stab', 'dx_brass'], pluck: ['glitch_blip', 'pluck'], metal: ['zap', 'clank'], prepared: ['prepared_mute'], gl_buzz: ['gl_buzz', 'gl_buzz_fast'], gl_crunch: ['gl_crunch', 'gl_crunch_fast'], gl_ping: ['gl_ping', 'gl_blip'], gl_hiss: ['gl_hiss'], gl_thump: ['gl_thump'] },
      kits: { kick: ['808bd', 'bd', 'clubkick', 'kicklinn'], snare: ['808sd', 'sd', 'sn'], clap: ['realclaps', 'cp'], hat: ['808oh', 'linnhats', 'hh', 'hh27'], rim: ['rs', 'click'], kit: ['drumtraks', 'dr2', 'dr55', 'odx'], glitch: ['glitch', 'glitch2', 'blip'], voice: ['mouth', 'diphone'] },
    },
    // dub techno and Gas: chord stabs into long delays, muffled kick, hiss. One chord for minutes.
    dub: {
      label: 'dub', tempo: 120, intensity: 0.5, chordBars: [8, 16], wow: 1.1,
      tends: { space: 2, acid: 1.5, ae: 1 },
      sections: { prefer: ['drift', 'build', 'dread'], avoid: ['peak'], cap: 5 },
      modes: ['dorian', 'aeolian'],
      progressions: [[0], [0, 0, 0, 3], [0, 0, 5, 0], [0, 3], [0, 0, 0, 6], [0, 5], [0, 0, 3, 5], [3, 0], [0, 6, 0, 0], [0, 4, 0, 0], [0, 0, 5, 5], [0, 0, 3, 3]],
      roleOrder: ['keys', 'drums', 'bass', 'texture', 'perc', 'lead'],
      collage: ['speech', 'east', 'noise2', 'outdoor', 'wind'],
      palette: { stab: ['dub_chord', 'stab', 'brass'], organ: ['dub_stab_m7', 'efd_stab'], pad: ['strings', 'haze', 'choir', 'pwm_pad'], pad_dark: ['drone'], sub: ['dub_sub', 'sub', 'dx_bass'], keys: ['rhodes', 'epiano', 'felt'], bell: ['efd_bell', 'glass', 'dx_bell'], lead: ['mono'], boc_pad: ['warm_pad'], voice: ['voice_oo'], dread: ['low_brass'] },
      kits: { kick: ['bd', '808bd', 'clubkick'], snare: ['sn', 'sd'], clap: ['hand', 'cp'], hat: ['hh', 'hh27'], rim: ['rs', 'click', 'tok'], kit: ['dr55', 'dr2', 'odx'], perc: ['perc', 'tabla'], nature: ['wind', 'outdoor'], voice: ['speech', 'speechless'] },
    },
    // drifting space ambient (Aethereon) and FSOL collage.
    space: {
      label: 'space', tempo: 84, intensity: 0.3, chordBars: [4, 8], wow: 1.2,
      tends: { dub: 2, ae: 1.5, acid: 0.8 },
      sections: { prefer: ['sparse', 'suspense', 'drift'], avoid: ['surge', 'peak'], cap: 4 },
      modes: ['lydian', 'dorian', 'aeolian'],
      progressions: [[0, 4], [0, 1, 0, 4], [0, 5, 3, 4], [0, 2, 3, 1], [0, 3], [0, 1], [3, 0], [0, 5, 4, 3], [0, 2], [0, 4, 5, 3], [1, 0, 3, 0], [0, 6]],
      roleOrder: ['keys', 'lead', 'texture', 'bass', 'perc', 'drums'],
      collage: ['cosmicg', 'space', 'speechless', 'numbers', 'bubble', 'insect', 'birds3'],
      palette: { pad: ['space_choir', 'shimmer_pad', 'choir', 'haze', 'dx_pad', 'strings'], drone: ['glass_drone', 'cosmic_sweep', 'space_drone_slow'], pad_dark: ['space_drone_slow', 'drone'], bell: ['glass', 'fm_glass', 'dx_bell', 'bell'], sub: ['sub', 'dx_bass'], keys: ['felt', 'rhodes'], lead: ['mono', 'pulse'], voice: ['voice_ah', 'voice_oo', 'formant_voice'], radio: ['radio_tune', 'shortwave'], boc_pad: ['boc_choir'] },
      kits: { kick: ['808bd', 'bd'], hat: ['hh27'], rim: ['click', 'tok'], perc: ['tabla', 'perc', 'tok'], kit: ['dr', 'odx'], nature: ['birds', 'birds3', 'crow', 'insect', 'wind', 'outdoor'], space: ['space', 'cosmicg', 'bubble', 'future'], voice: ['speechless'] },
    },
    // Autechre (AE_LIVE 2016-2018): generated, shifting rhythms, harsh FM, no tonic.
    ae: {
      label: 'ae', tempo: 118, intensity: 0.65, chordBars: [8, 16], wow: 0.7,
      tends: { acid: 2, space: 1.5, dub: 1 },
      sections: { prefer: ['surge', 'suspense', 'collapse', 'dread'], avoid: ['drift'], cap: 6 },
      modes: ['phrygian', 'locrian', 'dorian'],
      progressions: [[0], [0, 1], [0, 4, 1], [0, 3, 6], [0, 6, 1, 5], [1, 0, 5], [0, 2, 1], [0, 5, 2, 6], [0, 0, 1, 0], [0, 6, 0, 1]],
      roleOrder: ['perc', 'drums', 'bass', 'texture', 'lead', 'keys'],
      collage: ['glitch', 'diphone2', 'tacscan', 'invaders', 'numbers', 'sid'],
      palette: { lead_harsh: ['metal_lead', 'screech', 'fm_metal'], metal: ['clank', 'anvil', 'welder', 'zap', 'ae_fm_perc'], machine: ['ae_grain', 'machine', 'grind'], pluck: ['ae_blip', 'glitch_blip'], fm_bass: ['fm_bass', 'ae_bass'], sub: ['fm_sub', 'sub808'], bell: ['fm_glass', 'dx_marimba', 'glass'], pad: ['pwm_pad', 'dx_pad'], pad_dark: ['dark_pad', 'noise_drone'], lead: ['sync_lead', 'sh_lead', 'pulse'], acid: ['acid_sq'], radio: ['shortwave'], voice: ['formant_voice'], gl_buzz: ['gl_buzz', 'gl_buzz_slow', 'gl_buzz_fast'], gl_crunch: ['gl_crunch', 'gl_crunch_fast'], gl_ping: ['gl_ping', 'gl_blip'], gl_hiss: ['gl_hiss'], gl_thump: ['gl_thump'] },
      kits: { kick: ['bd', '808bd', 'kicklinn'], snare: ['sn', 'sd', '808sd'], hat: ['hh', 'linnhats'], rim: ['click', 'rs', 'hc'], kit: ['drumtraks', 'dr2', 'odx', 'dr55'], glitch: ['glitch', 'glitch2', 'blip', 'bleep'], metal: ['metal', 'industrial', 'glasstap'], voice: ['diphone', 'diphone2', 'mouth'] },
    },
  };

  // The genres, in the top bar's order.
  static LIST = Object.keys(Genres.TABLE);

  // The genres of earlier versions, and where they went (saved choices and your patterns).
  // SAW, DRILL, BOC, MINIMAL and DARK left with the grid mode: their names are dropped.
  static OLD = { fog: ['dub'], deep: ['space'], atmos: ['space'], rave: ['acid'], industrial: ['ae'] };

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
        const spec = Settings.genreSpec(id);
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

  // { acid: 0, dub: 0, ... }
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
