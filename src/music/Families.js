import { Genres } from './Genres.js';

// Families: instruments and sample folders that can stand in for each other. A pattern's
// params name them by family (params({ pad: 'dx_pad', kick: '808bd' })); a new version or a
// timbre move swaps one for another of its family that the genre allows (Genres: palette,
// kits; see Variation), so a pattern keeps its role but changes colour.
export class Families {
  static SYNTHS = {
    boc_pad: ['boc_pad', 'boc_choir', 'juno_pad', 'warm_pad'],
    boc_lead: ['boc_lead', 'boc_flute', 'tape_warble', 'soft_saw'],
    pad: ['haze', 'strings', 'choir', 'string_machine', 'pwm_pad', 'dx_pad', 'space_choir', 'shimmer_pad', 'efd_pad'],
    pad_dark: ['horror', 'choir_dark', 'dark_pad', 'noise_drone', 'drone', 'dread_pad', 'space_drone_slow'],
    drone: ['glass_drone', 'cosmic_sweep', 'space_drone_slow'],
    keys: ['keys', 'piano', 'felt', 'grand', 'rhodes', 'epiano'],
    prepared: ['prepared_piano', 'prepared_mute', 'broken_piano', 'toy_piano'],
    bell: ['bell', 'glass', 'chip', 'dx_bell', 'fm_glass', 'dx_marimba', 'efd_bell'],
    organ: ['efd_organ', 'efd_stab', 'dub_stab_m7'],
    pluck: ['pluck', 'glitch_blip', 'ae_blip'],
    lead: ['mono', 'pulse', 'sync_lead', 'sh_lead', 'saw2_square', 'aphex_lead'],
    lead_harsh: ['metal_lead', 'screech', 'fm_metal'],
    stab: ['stab', 'brass', 'dx_brass', 'dub_chord'],
    sub: ['sub', 'sub808', 'fm_sub', 'dub_sub', 'dx_bass', 'drill_sub'],
    acid: ['acid', 'acid_dirty', 'acid_303', 'acid_sq', 'tb303_saw', 'tb303_square'],
    acid_bass: ['sh_bass', 'braindance_bass'],
    fm_bass: ['fm_bass', 'ae_bass'],
    dread: ['dread_sub', 'low_brass'],
    tension: ['riser_slow', 'tension_string', 'metal_scrape'],
    metal: ['clank', 'anvil', 'welder', 'zap', 'ae_fm_perc'],
    machine: ['grind', 'machine', 'steam', 'hum', 'ae_grain'],
    voice: ['voice_ah', 'voice_oo', 'formant_voice'],
    radio: ['radio_tune', 'shortwave'],
    // glitch, rebuilt in code from a glitch sample pack (instrumentos/percussao/glitch, textura/glitch)
    gl_buzz: ['gl_buzz', 'gl_buzz_slow', 'gl_buzz_fast'],
    gl_crunch: ['gl_crunch', 'gl_crunch_fast'],
    gl_ping: ['gl_ping', 'gl_blip'],
    gl_hiss: ['gl_hiss'],
    gl_thump: ['gl_thump'],
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

  static synthFamily(name) {
    for (const [f, list] of Object.entries(Families.SYNTHS)) if (list.includes(name)) return f;
    return null;
  }

  static kitFamily(folder) {
    for (const [f, list] of Object.entries(Families.KITS)) if (list.includes(folder)) return f;
    return null;
  }

  // The pool for collage() for the genre weights: the dominant genre's (Genres: collage),
  // with a little of the second genre's mixed in.
  static collagePool(weights) {
    const pool = (g) => (Genres.of(g) || {}).collage || [];
    const sorted = Object.entries(weights || {}).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return pool('space');
    const out = new Set(pool(sorted[0][0]));
    if (sorted[1] && sorted[1][1] > 0.25) for (const s of pool(sorted[1][0])) out.add(s);
    return [...out];
  }
};
