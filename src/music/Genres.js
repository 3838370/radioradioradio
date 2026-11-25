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
    // Aphex Twin's ambient side (Selected Ambient Works 85-92 and II, the Drukqs prepared
    // pianos): FM pads, loose 808, ostinatos, tape. Slow, melancholy turns.
    saw: {
      label: 'saw', tempo: 96, intensity: 0.35, chordBars: [2, 4, 4], wow: 1.3,
      tends: { acid: 2, boc: 2, space: 1.5 },
      sections: { prefer: ['drift', 'suspense', 'sparse'], avoid: ['surge', 'peak'], cap: 5 },
      modes: ['aeolian', 'lydian', 'dorian'],
      progressions: [[0, 4], [0, 5, 3, 4], [0, 3, 4, 3], [0, 0, 5, 4], [0, 1, 4, 0], [0, 3], [5, 3, 0, 4], [0, 2, 5, 4], [0, 5, 1, 4], [3, 4, 0, 0], [0, 6, 5, 4], [0, 2]],
      roleOrder: ['keys', 'lead', 'texture', 'bass', 'drums', 'perc'],
      collage: ['outdoor', 'birds3', 'wind', 'bubble', 'speechless'],
      palette: { pad: ['dx_pad', 'haze', 'string_machine', 'pwm_pad', 'shimmer_pad'], boc_pad: ['warm_pad', 'juno_pad'], keys: ['felt', 'piano', 'rhodes', 'epiano'], prepared: ['prepared_piano', 'prepared_mute', 'toy_piano', 'broken_piano'], bell: ['dx_bell', 'fm_glass', 'dx_marimba', 'glass', 'bell'], lead: ['saw2_square', 'aphex_lead', 'sh_lead', 'mono'], boc_lead: ['tape_warble', 'soft_saw'], sub: ['sub808', 'dx_bass', 'sub'], acid_bass: ['sh_bass'], drone: ['glass_drone'], pluck: ['pluck'] },
      kits: { kick: ['808bd', 'bd'], snare: ['808sd', 'sn'], hat: ['hh27', '808oh', 'hh'], rim: ['click', 'tok'], kit: ['dr', 'dr2', 'drumtraks'], perc: ['perc', 'tabla', 'tok'], nature: ['birds', 'birds3', 'wind', 'outdoor'], space: ['bubble', 'space'] },
    },
    // Aphex Twin's acid and braindance (Analord, the Richard D. James Album): raw 303,
    // 808/909, odd-interval motifs. Sits on one or two chords.
    acid: {
      label: 'acid', tempo: 132, intensity: 0.75, chordBars: [8, 16], wow: 0.8,
      tends: { drill: 2.5, ae: 2, minimal: 1.5 },
      sections: { prefer: ['build', 'tension', 'surge'], avoid: ['sparse'], cap: 6 },
      modes: ['phrygian', 'aeolian', 'dorian'],
      progressions: [[0], [0, 1], [0, 0, 0, 6], [0, 6], [0, 0, 1, 0], [0, 4], [0, 0, 5, 1], [0, 3]],
      roleOrder: ['bass', 'drums', 'perc', 'lead', 'keys', 'texture'],
      collage: ['glitch', 'diphone', 'mouth', 'numbers'],
      palette: { acid: ['acid', 'acid_dirty', 'acid_303', 'acid_sq', 'tb303_saw', 'tb303_square'], acid_bass: ['sh_bass', 'braindance_bass'], lead: ['sh_lead', 'aphex_lead', 'saw2_square', 'pulse', 'sync_lead'], bell: ['dx_marimba', 'fm_glass', 'dx_bell'], organ: ['efd_organ'], pad: ['dx_pad', 'pwm_pad'], sub: ['sub808', 'fm_sub'], fm_bass: ['fm_bass'], stab: ['stab', 'dx_brass'], pluck: ['glitch_blip', 'pluck'], metal: ['zap', 'clank'], prepared: ['prepared_mute'] },
      kits: { kick: ['808bd', 'bd', 'clubkick', 'kicklinn'], snare: ['808sd', 'sd', 'sn'], clap: ['realclaps', 'cp'], hat: ['808oh', 'linnhats', 'hh', 'hh27'], rim: ['rs', 'click'], kit: ['drumtraks', 'dr2', 'dr55', 'odx'], glitch: ['glitch', 'glitch2', 'blip'], voice: ['mouth', 'diphone'] },
    },
    // drill'n'bass (Drukqs, Come to Daddy): the amen chopped at speed under slow, sad melodies.
    drill: {
      label: 'drill', tempo: 168, intensity: 0.85, chordBars: [4], wow: 1,
      tends: { dark: 2.5, ae: 2, saw: 1.5 },
      sections: { prefer: ['surge', 'peak', 'collapse'], avoid: ['drift'], cap: 6 },
      modes: ['aeolian', 'dorian', 'lydian'],
      progressions: [[0, 5, 3, 4], [0, 3], [5, 3, 0, 4], [0, 2, 5, 4], [0, 5], [3, 4, 0, 0], [0, 6, 5, 4], [5, 4, 3, 4], [0, 1, 5, 4]],
      roleOrder: ['drums', 'lead', 'bass', 'keys', 'texture', 'perc'],
      collage: ['speech', 'mouth', 'glitch2', 'alphabet'],
      palette: { keys: ['piano', 'felt', 'rhodes', 'grand'], prepared: ['prepared_piano', 'prepared_mute', 'broken_piano'], pad: ['strings', 'dx_pad', 'string_machine', 'haze'], sub: ['drill_sub', 'sub', 'sub808'], lead: ['aphex_lead', 'saw2_square', 'mono'], bell: ['dx_bell', 'fm_glass', 'glass'], boc_pad: ['warm_pad'], pad_dark: ['dark_pad'], acid: ['acid_303'] },
      kits: { kick: ['bd', '808bd'], snare: ['sn', 'sd', '808sd'], hat: ['hh', 'hh27'], rim: ['rs', 'click'], kit: ['drumtraks', 'dr', 'drum'], glitch: ['glitch', 'glitch2'], voice: ['speech', 'mouth'] },
    },
    // Boards of Canada: slow hip-hop breaks, detuned drifting synths, tape, voices. Leans on
    // the flat seventh (mixolydian).
    boc: {
      label: 'boc', tempo: 90, intensity: 0.45, chordBars: [2, 4], wow: 1.8,
      tends: { saw: 2, dub: 1.5, space: 1.5 },
      sections: { prefer: ['drift', 'build', 'release'], avoid: ['surge', 'peak'], cap: 5 },
      modes: ['mixolydian', 'dorian', 'lydian', 'aeolian'],
      progressions: [[0, 4], [0, 6], [0, 3, 4], [0, 6, 5, 4], [0, 0, 6, 6], [3, 0], [0, 4, 3, 6], [5, 4, 0, 0], [0, 2, 6, 4], [0, 6, 3, 4]],
      roleOrder: ['drums', 'keys', 'lead', 'texture', 'bass', 'perc'],
      collage: ['speech', 'numbers', 'kurt', 'birds3', 'outdoor', 'alphabet'],
      palette: { boc_pad: ['boc_pad', 'boc_choir', 'juno_pad', 'warm_pad'], boc_lead: ['boc_lead', 'boc_flute', 'tape_warble', 'soft_saw'], keys: ['rhodes', 'epiano', 'felt'], pad: ['string_machine', 'haze', 'pwm_pad'], sub: ['sub', 'dx_bass', 'sub808'], bell: ['glass', 'dx_bell'], prepared: ['toy_piano'], lead: ['mono', 'sh_lead'], voice: ['voice_oo', 'formant_voice'], radio: ['shortwave', 'radio_tune'], drone: ['glass_drone'] },
      kits: { kick: ['bd', '808bd', 'kicklinn'], snare: ['sn', 'sd'], hat: ['hh27', 'hh'], rim: ['rs', 'click', 'tok'], kit: ['dr', 'dr55', 'drumtraks', 'odx'], perc: ['perc', 'tabla', 'hand'], nature: ['birds', 'birds3', 'crow', 'insect', 'wind', 'outdoor'], voice: ['speech', 'speechless'] },
    },
    // Efdemin: dry 4/4, shuffled hats, bell and organ cells in different cycle lengths.
    // Barely moves harmonically.
    minimal: {
      label: 'minimal', tempo: 122, intensity: 0.6, chordBars: [8, 16], wow: 0.7,
      tends: { dub: 2.5, acid: 1.5, ae: 1.5 },
      sections: { prefer: ['build', 'drift', 'tension'], avoid: ['peak', 'collapse'], cap: 6 },
      modes: ['dorian', 'aeolian', 'mixolydian'],
      progressions: [[0], [0, 3], [0, 0, 0, 5], [0, 0, 6, 0], [0, 5], [0, 0, 3, 0], [3, 0], [0, 4, 0, 0]],
      roleOrder: ['drums', 'perc', 'bass', 'keys', 'lead', 'texture'],
      collage: ['east', 'outdoor', 'noise2', 'speechless'],
      palette: { organ: ['efd_organ', 'efd_stab', 'dub_stab_m7'], bell: ['efd_bell', 'dx_marimba', 'glass', 'bell', 'fm_glass'], pad: ['efd_pad', 'dx_pad', 'pwm_pad'], sub: ['dub_sub', 'sub', 'dx_bass'], stab: ['dub_chord', 'stab', 'dx_brass'], keys: ['rhodes', 'epiano'], pluck: ['pluck', 'glitch_blip'], acid_bass: ['sh_bass'], lead: ['pulse', 'mono'] },
      kits: { kick: ['bd', 'clubkick', '808bd'], snare: ['sn', 'sd'], clap: ['realclaps', 'cp', 'hand'], hat: ['hh', 'hh27', 'linnhats'], rim: ['rs', 'click', 'tok', 'hc'], kit: ['dr2', 'dr55', 'odx', 'drumtraks'], perc: ['perc', 'tabla', 'hand', 'tok'], metal: ['glasstap'] },
    },
    // dub techno and Gas: chord stabs into long delays, muffled kick, hiss. One chord for minutes.
    dub: {
      label: 'dub', tempo: 120, intensity: 0.5, chordBars: [8, 16], wow: 1.1,
      tends: { minimal: 2, boc: 1.5, space: 1.5 },
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
      tends: { saw: 2, dark: 1.5, boc: 1.5 },
      sections: { prefer: ['sparse', 'suspense', 'drift'], avoid: ['surge', 'peak'], cap: 4 },
      modes: ['lydian', 'dorian', 'aeolian'],
      progressions: [[0, 4], [0, 1, 0, 4], [0, 5, 3, 4], [0, 2, 3, 1], [0, 3], [0, 1], [3, 0], [0, 5, 4, 3], [0, 2], [0, 4, 5, 3], [1, 0, 3, 0], [0, 6]],
      roleOrder: ['keys', 'lead', 'texture', 'bass', 'perc', 'drums'],
      collage: ['cosmicg', 'space', 'speechless', 'numbers', 'bubble', 'insect', 'birds3'],
      palette: { pad: ['space_choir', 'shimmer_pad', 'choir', 'haze', 'dx_pad', 'strings'], drone: ['glass_drone', 'cosmic_sweep', 'space_drone_slow'], pad_dark: ['space_drone_slow', 'drone'], bell: ['glass', 'fm_glass', 'dx_bell', 'bell'], sub: ['sub', 'dx_bass'], keys: ['felt', 'rhodes'], lead: ['mono', 'pulse'], voice: ['voice_ah', 'voice_oo', 'formant_voice'], radio: ['radio_tune', 'shortwave'], boc_pad: ['boc_choir'] },
      kits: { kick: ['808bd', 'bd'], hat: ['hh27'], rim: ['click', 'tok'], perc: ['tabla', 'perc', 'tok'], kit: ['dr', 'odx'], nature: ['birds', 'birds3', 'crow', 'insect', 'wind', 'outdoor'], space: ['space', 'cosmicg', 'bubble', 'future'], voice: ['speechless'] },
    },
    // slow tension: half-time weight, drones, low brass, detuned pianos.
    dark: {
      label: 'dark', tempo: 76, intensity: 0.35, chordBars: [4, 8], wow: 1.2,
      tends: { ae: 2, space: 2, saw: 1.5 },
      sections: { prefer: ['dread', 'suspense', 'collapse'], avoid: ['peak'], cap: 5 },
      modes: ['phrygian', 'locrian', 'aeolian'],
      progressions: [[0, 1], [0, 0, 1, 0], [0, 5, 1, 0], [0], [0, 6], [0, 1, 6, 0], [0, 0, 4, 1], [0, 3, 1, 0], [0, 5, 4, 1]],
      roleOrder: ['texture', 'keys', 'bass', 'drums', 'lead', 'perc'],
      collage: ['crow', 'insect', 'speechless', 'noise2', 'seawolf', 'industrial'],
      palette: { pad_dark: ['horror', 'choir_dark', 'dark_pad', 'noise_drone', 'drone', 'dread_pad', 'space_drone_slow'], dread: ['dread_sub', 'low_brass'], tension: ['riser_slow', 'tension_string', 'metal_scrape'], prepared: ['broken_piano', 'prepared_piano'], keys: ['piano', 'felt'], bell: ['dx_bell', 'bell', 'glass'], sub: ['sub', 'fm_sub'], metal: ['anvil', 'clank', 'welder'], machine: ['hum', 'steam', 'grind', 'machine'], voice: ['voice_oo', 'formant_voice'], lead_harsh: ['screech', 'metal_lead'], drone: ['space_drone_slow', 'cosmic_sweep'] },
      kits: { kick: ['808bd', 'bd'], snare: ['sn', '808sd'], hat: ['hh27'], rim: ['tok', 'click'], perc: ['tabla', 'perc'], kit: ['dr', 'drum'], metal: ['metal', 'industrial', 'glasstap'], nature: ['crow', 'insect', 'wind'], voice: ['speechless'] },
    },
    // Autechre (AE_LIVE 2016-2018): generated, shifting rhythms, harsh FM, no tonic.
    ae: {
      label: 'ae', tempo: 118, intensity: 0.65, chordBars: [8, 16], wow: 0.7,
      tends: { dark: 2, drill: 2, minimal: 1.5 },
      sections: { prefer: ['surge', 'suspense', 'collapse', 'dread'], avoid: ['drift'], cap: 6 },
      modes: ['phrygian', 'locrian', 'dorian'],
      progressions: [[0], [0, 1], [0, 4, 1], [0, 3, 6], [0, 6, 1, 5], [1, 0, 5], [0, 2, 1], [0, 5, 2, 6], [0, 0, 1, 0], [0, 6, 0, 1]],
      roleOrder: ['perc', 'drums', 'bass', 'texture', 'lead', 'keys'],
      collage: ['glitch', 'diphone2', 'tacscan', 'invaders', 'numbers', 'sid'],
      palette: { lead_harsh: ['metal_lead', 'screech', 'fm_metal'], metal: ['clank', 'anvil', 'welder', 'zap', 'ae_fm_perc'], machine: ['ae_grain', 'machine', 'grind'], pluck: ['ae_blip', 'glitch_blip'], fm_bass: ['fm_bass', 'ae_bass'], sub: ['fm_sub', 'sub808'], bell: ['fm_glass', 'dx_marimba', 'glass'], pad: ['pwm_pad', 'dx_pad'], pad_dark: ['dark_pad', 'noise_drone'], lead: ['sync_lead', 'sh_lead', 'pulse'], acid: ['acid_sq'], radio: ['shortwave'], voice: ['formant_voice'] },
      kits: { kick: ['bd', '808bd', 'kicklinn'], snare: ['sn', 'sd', '808sd'], hat: ['hh', 'linnhats'], rim: ['click', 'rs', 'hc'], kit: ['drumtraks', 'dr2', 'odx', 'dr55'], glitch: ['glitch', 'glitch2', 'blip', 'bleep'], metal: ['metal', 'industrial', 'glasstap'], voice: ['diphone', 'diphone2', 'mouth'] },
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
