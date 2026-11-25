// Families: instruments and sample folders that can stand in for each other. A recipe (see
// Recipe) or a timbre move swaps a synth for another of its family, or a sample folder for
// another of its kit, so a pattern keeps its role but changes colour.
RA.Families = class Families {
  static SYNTHS = {
    pad: ['haze', 'strings', 'choir', 'warm_pad', 'juno_pad', 'string_machine', 'pwm_pad', 'dx_pad', 'space_choir', 'shimmer_pad'],
    pad_dark: ['horror', 'choir_dark', 'dark_pad', 'noise_drone', 'drone', 'dread_pad', 'space_drone_slow'],
    drone: ['space_drone_slow', 'glass_drone', 'cosmic_sweep', 'drone'],
    keys: ['keys', 'piano', 'felt', 'grand', 'rhodes', 'epiano'],
    keys_odd: ['broken_piano', 'toy_piano', 'felt'],
    bell: ['bell', 'glass', 'chip', 'dx_bell', 'fm_glass', 'dx_marimba'],
    pluck: ['pluck', 'pluck_hard', 'donk', 'glitch_blip'],
    lead: ['mono', 'pulse', 'sync_lead', 'laser', 'sh_lead', 'soft_saw', 'tape_warble'],
    lead_harsh: ['metal_lead', 'screech', 'screamer', 'fm_metal'],
    stab: ['stab', 'rave_stab', 'brass_stab', 'brass', 'rave_organ', 'supersaw', 'hoover', 'dx_brass'],
    dub_chord: ['stab', 'dub_chord', 'dub_stab_m7'],
    sub: ['sub', 'sub808', 'fm_sub', 'hard_sub', 'dub_sub', 'dx_bass'],
    reese: ['reese', 'reese_heavy', 'reese_hard', 'growl', 'wobble_bass'],
    acid: ['acid', 'acid_dirty', 'acid_303', 'acid_sq', 'dist_bass', 'fm_bass', 'sh_bass'],
    dread: ['dread_sub', 'hard_sub', 'low_brass'],
    tension: ['riser_slow', 'tension_string', 'metal_scrape'],
    kick: ['kick_synth', 'kick_hard'],
    metal: ['clank', 'anvil', 'welder', 'zap'],
    machine: ['grind', 'machine', 'steam', 'hum'],
    voice: ['voice_ah', 'voice_oo', 'choir', 'formant_voice'],
    radio: ['radio_tune', 'shortwave'],
    bed: ['hiss_bed', 'vinyl_bed'],
  };

  // Sample folders by kit role (Dirt-Samples).
  static KITS = {
    kick: ['bd', '808bd', 'clubkick', 'kicklinn'],
    snare: ['sn', '808sd', 'sd'],
    clap: ['realclaps', 'cp', 'hand'],
    hat: ['hh', 'hh27', '808oh', 'linnhats'],
    rim: ['rs', 'click', 'tok', 'hc'],
    kit: ['drumtraks', 'dr2', 'odx', 'dr', 'dr55', 'drum'],
    perc: ['perc', 'tabla', 'hand', 'tok'],
    glitch: ['glitch', 'glitch2', 'blip', 'bleep'],
    metal: ['metal', 'industrial', 'glasstap'],
    voice: ['speech', 'mouth', 'speechless', 'diphone', 'diphone2'],
    nature: ['birds', 'birds3', 'crow', 'insect', 'wind', 'outdoor'],
    space: ['space', 'cosmicg', 'bubble', 'future'],
  };

  // Sound pools for collage() per mood (FSOL-style collage of voices, radio, field sounds).
  static COLLAGE = {
    deep: ['outdoor', 'birds3', 'wind', 'speech', 'bubble'],
    space: ['cosmicg', 'space', 'speechless', 'numbers', 'bubble', 'insect', 'birds3'],
    atmos: ['speech', 'alphabet', 'east', 'tabla', 'outdoor'],
    fog: ['wind', 'outdoor', 'noise2'],
    dub: ['speech', 'east', 'noise2', 'outdoor'],
    dark: ['crow', 'insect', 'speechless', 'noise2', 'seawolf'],
    industrial: ['industrial', 'metal', 'tacscan', 'subroc3d', 'speech'],
    rave: ['rave', 'future', 'alphabet', 'numbers'],
    ae: ['glitch', 'diphone2', 'tacscan', 'invaders', 'numbers'],
  };

  static synthFamily(name) {
    for (const [f, list] of Object.entries(Families.SYNTHS)) if (list.includes(name)) return f;
    return null;
  }

  static kitFamily(folder) {
    for (const [f, list] of Object.entries(Families.KITS)) if (list.includes(folder)) return f;
    return null;
  }

  // Another member of the family, or null. `known` filters to names that exist.
  static alt(list, name, rng, known = null) {
    const others = list.filter((x) => x !== name && (!known || known(x)));
    return others.length ? rng.pick(others) : null;
  }

  // The pool for collage() for the mood weights: the dominant mood's, with a little of the
  // second mood's mixed in.
  static collagePool(weights) {
    const sorted = Object.entries(weights || {}).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return Families.COLLAGE.space;
    const pool = new Set(Families.COLLAGE[sorted[0][0]] || []);
    if (sorted[1] && sorted[1][1] > 0.25) for (const s of Families.COLLAGE[sorted[1][0]] || []) pool.add(s);
    return [...pool];
  }
};
