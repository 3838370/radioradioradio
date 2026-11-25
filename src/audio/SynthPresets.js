// SynthPresets: data for SynthVoice. Times in seconds.
//   osc:     [{ type, detune (cents), octave, level, fm: { ratio, index, decay } }]
//   fenv:    filter envelope start multiplier, fdecay its decay time
//   vibrato: { rate (Hz), depth (cents), delay (s) }
//   drift:   random detune per note (cents), the "never quite in tune" analog feel
RA.SynthPresets = {
  haze: {
    osc: [{ type: 'sawtooth', detune: -7, level: 0.5 }, { type: 'sawtooth', detune: 7, level: 0.5 }, { type: 'triangle', octave: -1, level: 0.6 }],
    attack: 1.5, release: 3, cutoff: 1100, res: 0.3, gain: 0.12, vibrato: { rate: 4.2, depth: 6, delay: 0.8 }, drift: 10,
  },
  keys: {
    osc: [{ type: 'sine', fm: { ratio: 1, index: 1.1, decay: 0.35 } }, { type: 'sine', octave: 1, level: 0.1 }],
    attack: 0.004, release: 1.1, dur: 0.4, cutoff: 3600, res: 0.5, gain: 0.3, vibrato: { rate: 4.8, depth: 3, delay: 0.3 }, drift: 5,
  },
  bell: {
    osc: [{ type: 'sine', fm: { ratio: 3.5, index: 2, decay: 0.5 } }],
    attack: 0.002, release: 1.8, dur: 0, cutoff: 8000, res: 0.5, gain: 0.26, drift: 3,
  },
  glass: {
    osc: [{ type: 'sine', fm: { ratio: 7.01, index: 1.4, decay: 0.2 } }, { type: 'sine', octave: 1, level: 0.18 }],
    attack: 0.003, release: 1.2, dur: 0, cutoff: 9000, res: 0.5, gain: 0.2, drift: 4,
  },
  mono: {
    osc: [{ type: 'square', level: 0.3 }, { type: 'triangle', level: 0.8 }],
    attack: 0.012, release: 0.3, cutoff: 1700, res: 1, fenv: 1.6, fdecay: 0.25, gain: 0.28,
    vibrato: { rate: 5.4, depth: 9, delay: 0.25 }, drift: 6,
  },
  pluck: {
    osc: [{ type: 'triangle' }, { type: 'square', detune: 7, level: 0.2 }],
    attack: 0.002, release: 0.4, dur: 0, cutoff: 2200, res: 1, fenv: 2, fdecay: 0.2, gain: 0.33, drift: 4,
  },
  acid: {
    osc: [{ type: 'sawtooth' }],
    attack: 0.003, release: 0.06, cutoff: 380, res: 13, fenv: 5, fdecay: 0.2, gain: 0.26, drift: 2,
  },
  sub: {
    osc: [{ type: 'sine' }, { type: 'triangle', octave: 1, level: 0.12 }],
    attack: 0.01, release: 0.25, cutoff: 900, res: 0.5, gain: 0.62, drift: 2,
  },
  // Gas-style "orchestra": a detuned string ensemble and soft, slow brass.
  strings: {
    osc: [{ type: 'sawtooth', detune: -12, level: 0.4 }, { type: 'sawtooth', detune: 11, level: 0.4 }, { type: 'sawtooth', detune: 3, octave: 1, level: 0.15 }],
    attack: 2, release: 4, cutoff: 1400, res: 0.3, gain: 0.1, vibrato: { rate: 5, depth: 7, delay: 1 }, drift: 8,
  },
  brass: {
    osc: [{ type: 'sawtooth', level: 0.6 }, { type: 'square', octave: -1, level: 0.2 }],
    attack: 0.6, release: 2, cutoff: 900, res: 0.6, fenv: 1.6, fdecay: 0.8, gain: 0.14, vibrato: { rate: 4, depth: 4, delay: 0.6 }, drift: 6,
  },
  choir: {
    osc: [{ type: 'triangle', detune: -6 }, { type: 'triangle', detune: 6 }, { type: 'sine', octave: 1, level: 0.3 }],
    attack: 3, release: 5, cutoff: 2200, res: 0.4, gain: 0.14, vibrato: { rate: 0.3, depth: 10, delay: 0 }, drift: 6,
  },
  // Pianos. A struck string: partials that fade faster the higher they are (slightly
  // stretched, as real strings are), a hammer thump of noise, a filter that opens with how
  // hard the note is played (vel) and follows the pitch, and a long natural decay.
  piano: {
    osc: [
      { type: 'triangle', level: 0.9 }, { type: 'sine', ratio: 2.003, level: 0.4, decay: 1.6 },
      { type: 'sine', ratio: 3.008, level: 0.26, decay: 0.6 }, { type: 'noise', level: 0.12, decay: 0.012 },
    ],
    attack: 0.002, dur: 1.1, decay: 4, sustain: 0, release: 0.7, cutoff: 2400, res: 0.5, fenv: 2, fdecay: 0.5,
    veltrack: 0.7, keytrack: 0.5, gain: 0.36, drift: 3,
  },
  felt: {
    osc: [{ type: 'triangle' }, { type: 'sine', ratio: 2.002, level: 0.22, decay: 1 }, { type: 'noise', level: 0.05, decay: 0.02 }],
    attack: 0.008, dur: 1.4, decay: 3.5, sustain: 0, release: 0.9, cutoff: 1000, res: 0.4, fenv: 1.4, fdecay: 0.3,
    veltrack: 0.5, keytrack: 0.4, gain: 0.42, drift: 4,
  },
  // A big, bright concert grand for chords and loud phrases.
  grand: {
    osc: [
      { type: 'sawtooth', level: 0.35, decay: 1.2 }, { type: 'triangle', level: 0.8 }, { type: 'sine', ratio: 2.004, level: 0.4, decay: 1.5 },
      { type: 'sine', ratio: 5.03, level: 0.12, decay: 0.25 }, { type: 'noise', level: 0.18, decay: 0.01 },
    ],
    attack: 0.001, dur: 1.4, decay: 5, sustain: 0, release: 0.9, cutoff: 3200, res: 0.4, fenv: 2.2, fdecay: 0.6,
    veltrack: 0.8, keytrack: 0.6, gain: 0.3, drift: 2,
  },
  // A Rhodes: a soft bell-like tine on top, the amp's tremolo, a bark when hit hard.
  rhodes: {
    osc: [{ type: 'sine', fm: { ratio: 1, index: 1.3, decay: 0.7 } }, { type: 'sine', ratio: 14, level: 0.07, decay: 0.06 }, { type: 'sine', octave: 1, level: 0.12, decay: 1 }],
    attack: 0.003, dur: 1.2, decay: 3, sustain: 0.15, release: 0.6, cutoff: 3500, res: 0.4, veltrack: 0.6,
    trem: { rate: 4.6, depth: 0.28 }, drive: 0.12, gain: 0.3, drift: 4,
  },
  // A detuned, damaged upright: two strings out of tune, a dull hammer. For horror and dread.
  broken_piano: {
    osc: [{ type: 'triangle', detune: -22 }, { type: 'triangle', detune: 19, level: 0.8 }, { type: 'sine', ratio: 2.71, level: 0.2, decay: 0.4 }, { type: 'noise', level: 0.2, decay: 0.03 }],
    attack: 0.002, dur: 1.4, decay: 3, sustain: 0, release: 1.2, cutoff: 1500, res: 1.5, fenv: 1.6, fdecay: 0.3,
    veltrack: 0.6, keytrack: 0.4, vibrato: { rate: 0.4, depth: 14, delay: 0.3 }, gain: 0.34, drift: 18,
  },
  // A toy / prepared piano: short, metallic, inharmonic.
  toy_piano: {
    osc: [{ type: 'sine', fm: { ratio: 4.1, index: 1.8, decay: 0.12 } }, { type: 'sine', ratio: 6.9, level: 0.15, decay: 0.1 }, { type: 'noise', level: 0.1, decay: 0.008 }],
    attack: 0.001, dur: 0.6, decay: 0.9, sustain: 0, release: 0.4, cutoff: 6000, res: 0.6, veltrack: 0.5, gain: 0.24, drift: 6,
  },
  // Warm electric piano for jazzy DnB chords and melodies.
  epiano: {
    osc: [{ type: 'sine', fm: { ratio: 1, index: 1.6, decay: 0.6 } }, { type: 'sine', octave: 1, level: 0.15 }],
    attack: 0.003, release: 1.6, dur: 0.5, cutoff: 3000, res: 0.5, gain: 0.3, vibrato: { rate: 5, depth: 4, delay: 0.2 }, drift: 4,
  },
  // Short resonant analog blip for techno-ambient sequences.
  pulse: {
    osc: [{ type: 'square', level: 0.5 }, { type: 'sawtooth', detune: 5, level: 0.4 }],
    attack: 0.003, release: 0.25, dur: 0.05, cutoff: 900, res: 6, fenv: 3, fdecay: 0.15, gain: 0.22, drift: 3,
  },
  drone: {
    osc: [{ type: 'sawtooth', detune: -4, level: 0.4 }, { type: 'sawtooth', detune: 5, level: 0.4 }, { type: 'sine', octave: -1, level: 0.8 }],
    attack: 3, release: 4, cutoff: 600, res: 0.5, gain: 0.13, vibrato: { rate: 0.2, depth: 9, delay: 0 }, drift: 6,
  },

  // ───── basses that hit ─────
  sub808: {
    osc: [{ type: 'sine' }, { type: 'triangle', octave: 1, level: 0.1 }],
    attack: 0.002, dur: 0.3, release: 0.6, cutoff: 2000, res: 0.5, pitch: { from: 12, time: 0.05 }, drive: 0.35, gain: 0.55,
  },
  acid_dirty: {
    osc: [{ type: 'sawtooth' }],
    attack: 0.003, release: 0.06, cutoff: 300, res: 16, fenv: 7, fdecay: 0.16, drive: 0.6, gain: 0.2,
  },
  fm_bass: {
    osc: [{ type: 'sine', fm: { ratio: 1, index: 4, decay: 0.12 } }],
    attack: 0.002, dur: 0.1, release: 0.2, cutoff: 1500, res: 0.7, drive: 0.3, gain: 0.4,
  },

  // ───── leads and stabs ─────
  stab: {
    osc: [{ type: 'sawtooth' }, { type: 'square', detune: -6, level: 0.5 }],
    attack: 0.003, dur: 0, release: 0.18, cutoff: 1400, res: 2, fenv: 1.5, fdecay: 0.08, drive: 0.15, gain: 0.15,
  },
  sync_lead: {
    osc: [{ type: 'sawtooth' }, { type: 'square', octave: 1, detune: 7, level: 0.5 }],
    attack: 0.005, release: 0.2, cutoff: 2200, res: 5, fenv: 2, fdecay: 0.3, drive: 0.55, vibrato: { rate: 6, depth: 10, delay: 0.15 }, gain: 0.16,
  },
  chip: {
    osc: [{ type: 'square' }],
    attack: 0.001, release: 0.08, cutoff: 8000, res: 0.5, vibrato: { rate: 7, depth: 15, delay: 0.1 }, gain: 0.14,
  },
  metal_lead: {
    osc: [{ type: 'sine', fm: { ratio: 1.41, index: 5, decay: 0.8 } }],
    attack: 0.003, release: 0.6, cutoff: 6000, res: 0.5, drive: 0.3, gain: 0.2,
  },
  screech: {
    osc: [{ type: 'sawtooth', fm: { ratio: 2.01, index: 6, decay: 2 } }],
    attack: 0.02, release: 0.3, ftype: 'bandpass', cutoff: 1800, res: 8, flfo: { rate: 5, depth: 900 }, drive: 0.6, gain: 0.14,
  },

  // ───── dark pads and drones ─────
  dark_pad: {
    osc: [{ type: 'sawtooth', unison: { voices: 3, spread: 14 } }, { type: 'sawtooth', octave: -1, level: 0.5 }],
    attack: 2.5, release: 4, cutoff: 500, res: 2, flfo: { rate: 0.08, depth: 900 }, gain: 0.12, drift: 10,
  },
  horror: {
    osc: [{ type: 'sawtooth', detune: -35, level: 0.4 }, { type: 'sawtooth', detune: 31, level: 0.4 }, { type: 'sine', octave: -1, level: 0.6 }],
    attack: 3, release: 5, cutoff: 900, res: 4, trem: { rate: 5.5, depth: 0.5 }, vibrato: { rate: 0.15, depth: 40, delay: 0 }, gain: 0.12,
  },
  noise_drone: {
    osc: [{ type: 'noise' }],
    attack: 3, release: 4, ftype: 'bandpass', cutoff: 400, res: 12, flfo: { rate: 0.07, depth: 1800 }, gain: 0.5,
  },
  choir_dark: {
    osc: [{ type: 'triangle', detune: -8 }, { type: 'triangle', detune: 8 }, { type: 'sine', octave: -1, level: 0.5 }],
    attack: 3, release: 5, cutoff: 1100, res: 0.5, trem: { rate: 0.3, depth: 0.3 }, gain: 0.16, drift: 8,
  },

  // ───── synthesized drums ─────
  // Play it low (KEY - 12, ~40-60 Hz): the pitch envelope starts ~1.7 octaves up and falls
  // fast, like an analog kick; a little drive rounds it, the low cutoff removes the click.
  kick_synth: {
    osc: [{ type: 'sine' }],
    attack: 0.001, dur: 0.06, release: 0.28, cutoff: 900, res: 0.5, pitch: { from: 20, time: 0.035 }, drive: 0.25, gain: 0.9,
  },
  snare_synth: {
    osc: [{ type: 'noise', level: 0.9 }, { type: 'triangle', level: 0.5 }],
    attack: 0.001, dur: 0, release: 0.18, ftype: 'bandpass', cutoff: 1800, res: 0.7, pitch: { from: 7, time: 0.03 }, gain: 0.5,
  },
  // A metallic, 808-style hat (inharmonic square FM, band-limited) instead of white noise.
  hat_synth: {
    osc: [{ type: 'square', fm: { ratio: 1.47, index: 6, decay: 0.05 } }, { type: 'noise', level: 0.15 }],
    attack: 0.001, dur: 0, release: 0.035, ftype: 'bandpass', cutoff: 9000, res: 1.2, gain: 0.16,
  },
  tom_synth: {
    osc: [{ type: 'sine' }, { type: 'triangle', level: 0.3 }],
    attack: 0.001, dur: 0, release: 0.3, cutoff: 3000, res: 0.5, pitch: { from: 12, time: 0.1 }, drive: 0.3, gain: 0.6,
  },
  clank: {
    osc: [{ type: 'square', fm: { ratio: 3.73, index: 8, decay: 0.08 } }],
    attack: 0.001, dur: 0, release: 0.15, ftype: 'bandpass', cutoff: 2500, res: 3, gain: 0.35,
  },
  zap: {
    osc: [{ type: 'sawtooth' }],
    attack: 0.001, dur: 0, release: 0.15, cutoff: 6000, res: 6, pitch: { from: 36, time: 0.08 }, gain: 0.2,
  },

  // ───── industrial and city ─────
  grind: {
    osc: [{ type: 'noise' }, { type: 'sawtooth', octave: -2, level: 0.4 }],
    attack: 0.05, release: 0.3, ftype: 'bandpass', cutoff: 600, res: 10, flfo: { rate: 6, depth: 1500 }, drive: 0.5, gain: 0.4,
  },
  machine: {
    osc: [{ type: 'square', fm: { ratio: 0.5, index: 2, decay: 5 } }],
    attack: 0.02, release: 0.2, cutoff: 800, res: 6, trem: { rate: 8, depth: 0.7 }, drive: 0.4, gain: 0.2,
  },
  // A subway train: low rumble, steel squeal of the brakes, clacks over the rail joints.
  metro_rumble: {
    osc: [{ type: 'noise' }, { type: 'sine', octave: -1, level: 0.5 }],
    attack: 2, release: 3, cutoff: 220, res: 2, flfo: { rate: 0.5, depth: 600 }, gain: 0.9,
  },
  metro_brake: {
    osc: [{ type: 'sine' }, { type: 'sine', detune: 30, level: 0.7 }],
    attack: 0.3, release: 0.8, ftype: 'bandpass', cutoff: 3000, res: 3, vibrato: { rate: 9, depth: 18, delay: 0 }, pitch: { from: -2, time: 1 }, gain: 0.08,
  },
  rail: {
    osc: [{ type: 'noise' }, { type: 'square', level: 0.3 }],
    attack: 0.001, dur: 0, release: 0.06, ftype: 'bandpass', cutoff: 1200, res: 5, gain: 0.6,
  },

  // ───── hard-hitting synths ─────
  // Acid: one saw, a screaming resonance and a filter envelope; loud notes (vel) are accents.
  acid_303: {
    osc: [{ type: 'sawtooth' }],
    attack: 0.002, dur: 0.08, release: 0.1, cutoff: 420, res: 13, fenv: 7, fdecay: 0.16, veltrack: 1, drive: 0.55, gain: 0.15,
  },
  acid_sq: {
    osc: [{ type: 'square' }],
    attack: 0.002, dur: 0.08, release: 0.1, cutoff: 380, res: 12, fenv: 8, fdecay: 0.12, veltrack: 1, drive: 0.6, gain: 0.13,
  },
  fm_sub: {
    osc: [{ type: 'sine', fm: { ratio: 0.5, index: 3.5, decay: 0.16 } }, { type: 'sine', octave: -1, level: 0.8 }],
    attack: 0.002, dur: 0.15, release: 0.12, cutoff: 2500, res: 0.8, drive: 0.5, gain: 0.3,
  },
  fm_metal: {
    osc: [{ type: 'sine', fm: { ratio: 1.414, index: 7, decay: 0.25 } }, { type: 'sine', ratio: 3.77, level: 0.3, decay: 0.15 }],
    attack: 0.001, dur: 0.05, release: 0.3, cutoff: 7000, res: 1, drive: 0.45, gain: 0.18,
  },
  glitch_blip: {
    osc: [{ type: 'square', fm: { ratio: 8.7, index: 12, decay: 0.03 } }],
    attack: 0.001, dur: 0.01, release: 0.04, cutoff: 9000, res: 2, gain: 0.12,
  },
  clap_synth: {
    osc: [{ type: 'noise' }],
    attack: 0.001, dur: 0.035, release: 0.14, ftype: 'bandpass', cutoff: 1300, res: 1.6, trem: { rate: 95, depth: 0.85 }, gain: 0.9,
  },

  // ───── the city, synthesized ─────
  voice_ah: { // a sung or spoken vowel
    osc: [{ type: 'sawtooth' }, { type: 'sawtooth', detune: 7, level: 0.6 }],
    attack: 0.08, release: 0.5, ftype: 'bandpass', cutoff: 800, res: 4, vibrato: { rate: 5, depth: 18, delay: 0.25 }, drift: 25, gain: 0.3,
  },
  voice_oo: {
    osc: [{ type: 'sawtooth' }, { type: 'triangle', level: 0.6 }],
    attack: 0.1, release: 0.6, ftype: 'bandpass', cutoff: 380, res: 5, vibrato: { rate: 4.5, depth: 14, delay: 0.3 }, drift: 25, gain: 0.4,
  },
  traffic: { // a distant road: slow swells of tyre noise
    osc: [{ type: 'noise' }, { type: 'sawtooth', octave: -2, level: 0.15 }],
    attack: 2.5, release: 3, cutoff: 380, res: 1, flfo: { rate: 0.12, depth: 1500 }, trem: { rate: 0.2, depth: 0.5 }, gain: 0.9,
  },
  metro_doors: { // pneumatic hiss as the doors open or close
    osc: [{ type: 'noise' }],
    attack: 0.04, dur: 0.5, release: 0.6, ftype: 'highpass', cutoff: 3500, res: 0.8, fenv: 0.6, fdecay: 0.6, gain: 0.35,
  },
  metro_chime: { // the "doors closing" chime
    osc: [{ type: 'sine', fm: { ratio: 2, index: 0.6, decay: 0.4 } }, { type: 'sine', ratio: 3, level: 0.1, decay: 0.3 }],
    attack: 0.002, dur: 0.3, decay: 1.2, sustain: 0, release: 0.8, cutoff: 6000, res: 0.5, gain: 0.22,
  },
  alarm: { // a car alarm whoop
    osc: [{ type: 'square' }, { type: 'sawtooth', level: 0.4 }],
    attack: 0.02, release: 0.1, cutoff: 2500, res: 2, vibrato: { rate: 5, depth: 350, delay: 0 }, gain: 0.07,
  },
  door_slam: {
    osc: [{ type: 'noise' }, { type: 'sine', level: 0.8 }],
    attack: 0.001, dur: 0.02, release: 0.25, cutoff: 350, res: 1.5, pitch: { from: 7, time: 0.05 }, drive: 0.5, gain: 0.7,
  },
  footstep: {
    osc: [{ type: 'noise' }, { type: 'sine', level: 0.4 }],
    attack: 0.002, dur: 0.01, release: 0.06, ftype: 'bandpass', cutoff: 900, res: 1.2, pitch: { from: 5, time: 0.02 }, gain: 0.6,
  },
  anvil: { // a struck steel beam
    osc: [{ type: 'sine' }, { type: 'sine', ratio: 2.76, level: 0.5, decay: 0.6 }, { type: 'sine', ratio: 5.4, level: 0.35, decay: 0.3 }, { type: 'sine', ratio: 8.93, level: 0.2, decay: 0.15 }, { type: 'noise', level: 0.3, decay: 0.005 }],
    attack: 0.001, dur: 0.2, decay: 1.5, sustain: 0, release: 0.8, cutoff: 8000, res: 0.6, gain: 0.2,
  },
  welder: { // a crackling electric arc
    osc: [{ type: 'noise' }],
    attack: 0.01, release: 0.1, ftype: 'highpass', cutoff: 4500, res: 1, trem: { rate: 37, depth: 1 }, flfo: { rate: 11, depth: 1200 }, gain: 0.3,
  },
  steam: {
    osc: [{ type: 'noise' }],
    attack: 0.3, release: 1.2, ftype: 'bandpass', cutoff: 5500, res: 0.7, flfo: { rate: 0.8, depth: 400 }, gain: 0.35,
  },
  hum: { // mains hum and transformer buzz
    osc: [{ type: 'sawtooth' }, { type: 'square', octave: 1, level: 0.2 }],
    attack: 1, release: 1.5, cutoff: 400, res: 1, trem: { rate: 0.3, depth: 0.3 }, gain: 0.08,
  },

  // ───── FM, DX-style (Selected Ambient Works: pads and chords from a DX7/DX11) ─────
  dx_pad: {
    osc: [{ type: 'sine', detune: -5, fm: { ratio: 1, index: 1.4, decay: 2.5 } }, { type: 'sine', detune: 5, fm: { ratio: 2, index: 0.6 } }],
    attack: 1.1, release: 3, cutoff: 3200, res: 0.4, gain: 0.15, vibrato: { rate: 4.5, depth: 5, delay: 1 }, drift: 6,
  },
  dx_bell: { // inharmonic bell, soft attack
    osc: [{ type: 'sine', fm: { ratio: 1.4, index: 3, decay: 1.2 } }, { type: 'sine', octave: 1, level: 0.15, decay: 0.8 }],
    attack: 0.004, dur: 0, decay: 2.5, sustain: 0, release: 2.2, cutoff: 7000, res: 0.4, gain: 0.2, drift: 3,
  },
  dx_marimba: {
    osc: [{ type: 'sine', fm: { ratio: 4, index: 2.5, decay: 0.08 } }],
    attack: 0.001, dur: 0, decay: 0.6, sustain: 0, release: 0.4, cutoff: 6000, res: 0.5, keytrack: 0.3, gain: 0.32,
  },
  dx_brass: {
    osc: [{ type: 'sine', fm: { ratio: 1, index: 2.5, decay: 0.6 } }, { type: 'sine', octave: -1, level: 0.3 }],
    attack: 0.08, release: 0.8, cutoff: 2500, res: 0.6, fenv: 1.5, fdecay: 0.4, gain: 0.18, vibrato: { rate: 5, depth: 6, delay: 0.4 },
  },
  dx_bass: {
    osc: [{ type: 'sine', fm: { ratio: 1, index: 2, decay: 0.15 } }, { type: 'sine', level: 0.6 }],
    attack: 0.004, release: 0.2, cutoff: 1200, res: 0.6, gain: 0.45, drift: 2,
  },
  fm_glass: {
    osc: [{ type: 'sine', fm: { ratio: 5.01, index: 1.8, decay: 0.4 } }, { type: 'sine', octave: 1, level: 0.2 }],
    attack: 0.003, dur: 0, decay: 1.8, sustain: 0, release: 2, cutoff: 9000, res: 0.4, gain: 0.18, drift: 3,
  },

  // ───── analog (SH-101 leads and basses, Juno pads, string machines) ─────
  sh_lead: {
    osc: [{ type: 'square', level: 0.6 }, { type: 'sawtooth', detune: 5, level: 0.4 }],
    attack: 0.005, release: 0.25, cutoff: 1800, res: 3, fenv: 2.5, fdecay: 0.3, gain: 0.2, vibrato: { rate: 5.5, depth: 8, delay: 0.35 }, drift: 5,
  },
  sh_bass: {
    osc: [{ type: 'sawtooth' }, { type: 'square', octave: -1, level: 0.5 }],
    attack: 0.003, release: 0.12, cutoff: 600, res: 6, fenv: 4, fdecay: 0.15, gain: 0.3, drift: 2,
  },
  warm_pad: {
    osc: [{ type: 'sawtooth', detune: -9, level: 0.45 }, { type: 'sawtooth', detune: 9, level: 0.45 }, { type: 'triangle', octave: -1, level: 0.5 }],
    attack: 1.2, release: 3, cutoff: 900, res: 0.4, flfo: { rate: 0.12, depth: 300 }, gain: 0.12, drift: 8,
  },
  juno_pad: {
    osc: [{ type: 'sawtooth', unison: { voices: 3, spread: 12 } }, { type: 'square', octave: -1, level: 0.3 }],
    attack: 0.8, release: 2.5, cutoff: 1600, res: 0.5, vibrato: { rate: 0.6, depth: 8, delay: 0 }, gain: 0.1, drift: 6,
  },
  string_machine: {
    osc: [{ type: 'sawtooth', unison: { voices: 4, spread: 18 } }],
    attack: 1.5, release: 3, cutoff: 2200, res: 0.2, vibrato: { rate: 5.5, depth: 6, delay: 0.6 }, gain: 0.09, drift: 6,
  },
  pwm_pad: {
    osc: [{ type: 'square', detune: -14, level: 0.5 }, { type: 'square', detune: 14, level: 0.5 }],
    attack: 1, release: 3, cutoff: 1300, res: 0.5, flfo: { rate: 0.2, depth: 500 }, gain: 0.1, drift: 7,
  },
  soft_saw: {
    osc: [{ type: 'sawtooth', level: 0.6 }, { type: 'triangle', level: 0.5 }],
    attack: 0.05, release: 0.8, cutoff: 1500, res: 0.8, fenv: 1.5, fdecay: 0.5, gain: 0.2, drift: 5,
  },

  // ───── dub techno: filtered chord stabs, washes, sub, rim, and the noise beds ─────
  dub_chord: {
    osc: [{ type: 'sawtooth', detune: -6, level: 0.5 }, { type: 'sawtooth', detune: 6, level: 0.5 }, { type: 'square', octave: -1, level: 0.3 }],
    attack: 0.003, dur: 0.1, release: 0.35, cutoff: 700, res: 4, fenv: 4, fdecay: 0.12, gain: 0.2, drift: 4,
  },
  dub_stab_m7: {
    osc: [{ type: 'triangle', level: 0.6 }, { type: 'sawtooth', level: 0.4 }],
    attack: 0.002, dur: 0.08, release: 0.5, cutoff: 1200, res: 2, fenv: 3, fdecay: 0.08, gain: 0.22, drift: 3,
  },
  dub_pad_wash: {
    osc: [{ type: 'sawtooth', detune: -10, level: 0.5 }, { type: 'sawtooth', detune: 10, level: 0.5 }],
    attack: 2, release: 5, cutoff: 800, res: 1, flfo: { rate: 0.1, depth: 700 }, gain: 0.1, drift: 8,
  },
  dub_sub: {
    osc: [{ type: 'sine' }, { type: 'sine', octave: 1, level: 0.08 }],
    attack: 0.02, release: 0.35, cutoff: 500, res: 0.4, gain: 0.62, drift: 1,
  },
  dub_rim: {
    osc: [{ type: 'square', level: 0.6 }, { type: 'noise', level: 0.5, decay: 0.01 }],
    attack: 0.001, dur: 0.01, release: 0.05, ftype: 'bandpass', cutoff: 1700, res: 4, pitch: { from: 3, time: 0.01 }, gain: 0.3,
  },
  hiss_bed: { // tape hiss: play one long note
    osc: [{ type: 'noise' }],
    attack: 2, release: 3, ftype: 'highpass', cutoff: 6000, res: 0.3, gain: 0.05,
  },
  vinyl_bed: { // crackle and surface noise
    osc: [{ type: 'noise' }],
    attack: 1, release: 2, ftype: 'bandpass', cutoff: 3000, res: 1.5, trem: { rate: 23, depth: 0.9 }, gain: 0.06,
  },
  hum_bed: { // a low hum under everything (play a low note)
    osc: [{ type: 'sawtooth' }, { type: 'sine', octave: 1, level: 0.3 }],
    attack: 2, release: 3, cutoff: 220, res: 1, trem: { rate: 0.2, depth: 0.3 }, gain: 0.06,
  },

  // ───── space (Aethereon-style drifting) ─────
  space_choir: {
    osc: [{ type: 'triangle', detune: -8 }, { type: 'triangle', detune: 8 }, { type: 'sine', octave: 1, level: 0.3 }],
    attack: 4, release: 6, cutoff: 1800, res: 0.4, vibrato: { rate: 0.2, depth: 14, delay: 0 }, gain: 0.12, drift: 8,
  },
  space_drone_slow: {
    osc: [{ type: 'sawtooth' }, { type: 'sawtooth', detune: 4, octave: -1 }],
    attack: 6, release: 8, cutoff: 600, res: 2, flfo: { rate: 0.05, depth: 1200 }, gain: 0.1, drift: 6,
  },
  shimmer_pad: {
    osc: [{ type: 'sine', octave: 1 }, { type: 'sine', octave: 2, level: 0.4 }, { type: 'triangle', level: 0.6 }],
    attack: 3, release: 6, cutoff: 6000, res: 0.3, trem: { rate: 3, depth: 0.2 }, vibrato: { rate: 0.4, depth: 6, delay: 0 }, gain: 0.1,
  },
  glass_drone: {
    osc: [{ type: 'sine', fm: { ratio: 2.01, index: 0.8 } }, { type: 'sine', octave: 1, level: 0.2 }],
    attack: 4, release: 6, cutoff: 5000, res: 0.3, gain: 0.1, drift: 4,
  },
  cosmic_sweep: {
    osc: [{ type: 'noise' }, { type: 'sawtooth', level: 0.3 }],
    attack: 3, release: 4, ftype: 'bandpass', cutoff: 1200, res: 6, flfo: { rate: 0.07, depth: 2400 }, gain: 0.1,
  },

  // ───── tension (dread and suspense) ─────
  dread_sub: {
    osc: [{ type: 'sine' }, { type: 'square', level: 0.2 }],
    attack: 0.02, release: 0.5, cutoff: 300, res: 2, drive: 0.5, gain: 0.5, drift: 2,
  },
  dread_pad: {
    osc: [{ type: 'sawtooth', detune: -15, level: 0.5 }, { type: 'sawtooth', detune: 15, level: 0.5 }, { type: 'noise', level: 0.05 }],
    attack: 2, release: 4, cutoff: 450, res: 3, drive: 0.3, flfo: { rate: 0.06, depth: 400 }, gain: 0.12, drift: 10,
  },
  low_brass: {
    osc: [{ type: 'sawtooth', level: 0.6 }, { type: 'square', octave: -1, level: 0.4 }],
    attack: 0.4, release: 1.5, cutoff: 600, res: 1, fenv: 1.8, fdecay: 0.6, drive: 0.25, gain: 0.16, drift: 5,
  },
  riser_slow: { // eight seconds climbing two octaves
    osc: [{ type: 'sawtooth', level: 0.6 }, { type: 'noise', level: 0.3 }],
    attack: 6, release: 2, cutoff: 2000, res: 3, pitch: { from: -24, time: 8 }, gain: 0.1,
  },
  tension_string: { // tremolo strings
    osc: [{ type: 'sawtooth', unison: { voices: 3, spread: 20 } }],
    attack: 0.5, release: 1.5, cutoff: 1800, res: 0.4, trem: { rate: 7, depth: 0.5 }, gain: 0.1, drift: 6,
  },
  metal_scrape: {
    osc: [{ type: 'noise' }, { type: 'sine', ratio: 6.3, level: 0.3 }],
    attack: 0.3, release: 1, ftype: 'bandpass', cutoff: 2500, res: 10, flfo: { rate: 0.4, depth: 900 }, gain: 0.12,
  },

  // ───── FSOL-style collage: radios, tape, voices ─────
  radio_tune: {
    osc: [{ type: 'sawtooth' }, { type: 'noise', level: 0.5 }],
    attack: 0.1, release: 0.5, ftype: 'bandpass', cutoff: 1500, res: 8, flfo: { rate: 2, depth: 1500 }, vibrato: { rate: 7, depth: 40, delay: 0 }, gain: 0.1,
  },
  tape_warble: {
    osc: [{ type: 'triangle' }, { type: 'sine', octave: 1, level: 0.2 }],
    attack: 0.3, release: 1.5, cutoff: 1600, res: 0.5, vibrato: { rate: 0.7, depth: 30, delay: 0 }, drift: 20, gain: 0.16,
  },
  formant_voice: {
    osc: [{ type: 'sawtooth' }],
    attack: 0.4, release: 1.2, ftype: 'bandpass', cutoff: 800, res: 6, flfo: { rate: 0.3, depth: 600 }, vibrato: { rate: 5, depth: 12, delay: 0.3 }, gain: 0.16,
  },
  shortwave: {
    osc: [{ type: 'square' }, { type: 'noise', level: 0.3 }],
    attack: 0.05, release: 0.4, ftype: 'bandpass', cutoff: 2200, res: 5, trem: { rate: 9, depth: 0.7 }, flfo: { rate: 0.5, depth: 1500 }, gain: 0.3,
  },

  // ───── Aphex Twin: prepared piano (Drukqs), SAW II squares, raw 303, braindance ─────
  prepared_piano: { // objects on the strings: inharmonic, metallic partials that die fast
    osc: [
      { type: 'triangle' }, { type: 'sine', ratio: 2.71, level: 0.5, decay: 0.4 }, { type: 'sine', ratio: 4.13, level: 0.35, decay: 0.2 },
      { type: 'sine', ratio: 6.57, level: 0.2, decay: 0.1 }, { type: 'noise', level: 0.15, decay: 0.01 },
    ],
    attack: 0.001, dur: 0.3, decay: 1.8, sustain: 0, release: 0.5, cutoff: 3000, res: 0.5, veltrack: 0.6, keytrack: 0.5, gain: 0.32, drift: 4,
  },
  prepared_mute: { // strings damped with tape: a dull, short pluck
    osc: [{ type: 'triangle' }, { type: 'sine', ratio: 2.01, level: 0.3, decay: 0.08 }, { type: 'noise', level: 0.12, decay: 0.008 }],
    attack: 0.001, dur: 0.05, decay: 0.25, sustain: 0, release: 0.15, cutoff: 1500, res: 0.6, veltrack: 0.5, gain: 0.42, drift: 3,
  },
  saw2_square: {
    osc: [{ type: 'square', level: 0.6 }, { type: 'square', detune: 8, octave: -1, level: 0.3 }],
    attack: 0.02, release: 0.6, cutoff: 1400, res: 2, fenv: 1.6, fdecay: 0.4, gain: 0.16, vibrato: { rate: 5, depth: 6, delay: 0.5 }, drift: 8,
  },
  tb303_saw: {
    osc: [{ type: 'sawtooth' }],
    attack: 0.002, release: 0.05, cutoff: 300, res: 16, fenv: 6, fdecay: 0.18, drive: 0.35, gain: 0.24, drift: 2,
  },
  tb303_square: {
    osc: [{ type: 'square' }],
    attack: 0.002, release: 0.05, cutoff: 320, res: 14, fenv: 5, fdecay: 0.16, drive: 0.3, gain: 0.2, drift: 2,
  },
  braindance_bass: {
    osc: [{ type: 'square' }, { type: 'sine', octave: -1, level: 0.6 }],
    attack: 0.002, release: 0.1, cutoff: 500, res: 4, fenv: 3, fdecay: 0.1, drive: 0.2, gain: 0.35, drift: 3,
  },
  aphex_lead: { // detuned and a little seasick
    osc: [{ type: 'sawtooth', detune: -12, level: 0.45 }, { type: 'sawtooth', detune: 12, level: 0.45 }, { type: 'square', octave: 1, level: 0.2 }],
    attack: 0.01, release: 0.5, cutoff: 2200, res: 1.5, fenv: 1.4, fdecay: 0.3, gain: 0.14, vibrato: { rate: 6, depth: 15, delay: 0.2 }, drift: 14,
  },

  // ───── Boards of Canada: everything wobbles a little out of tune ─────
  boc_pad: {
    osc: [{ type: 'sawtooth', detune: -7, level: 0.45 }, { type: 'sawtooth', detune: 7, level: 0.45 }, { type: 'triangle', octave: -1, level: 0.5 }],
    attack: 1.5, release: 3, cutoff: 1000, res: 0.4, vibrato: { rate: 0.35, depth: 18, delay: 0 }, gain: 0.12, drift: 16,
  },
  boc_lead: {
    osc: [{ type: 'triangle' }, { type: 'sine', octave: 1, level: 0.2 }],
    attack: 0.08, release: 1, cutoff: 1800, res: 0.6, vibrato: { rate: 0.5, depth: 22, delay: 0 }, gain: 0.2, drift: 18,
  },
  boc_flute: {
    osc: [{ type: 'sine' }, { type: 'noise', level: 0.06 }],
    attack: 0.12, release: 0.6, cutoff: 2600, res: 0.5, vibrato: { rate: 4.5, depth: 9, delay: 0.3 }, gain: 0.24, drift: 10,
  },
  boc_choir: {
    osc: [{ type: 'triangle', detune: -10 }, { type: 'triangle', detune: 10 }, { type: 'sine', octave: 1, level: 0.25 }],
    attack: 2, release: 3, cutoff: 1400, res: 0.5, flfo: { rate: 0.2, depth: 300 }, vibrato: { rate: 0.3, depth: 16, delay: 0 }, gain: 0.13, drift: 12,
  },

  // ───── Efdemin: bells, organ, short stabs, a soft pad ─────
  efd_bell: {
    osc: [{ type: 'sine', fm: { ratio: 3.01, index: 1.4, decay: 1.5 } }, { type: 'sine', ratio: 5.4, level: 0.12, decay: 0.8 }],
    attack: 0.002, dur: 0, decay: 3, sustain: 0, release: 2.5, cutoff: 8000, res: 0.4, gain: 0.22, drift: 2,
  },
  efd_organ: { // three drawbars and a little tremolo
    osc: [{ type: 'sine' }, { type: 'sine', octave: 1, level: 0.5 }, { type: 'sine', ratio: 3, level: 0.3 }],
    attack: 0.01, release: 0.15, cutoff: 3000, res: 0.4, trem: { rate: 6, depth: 0.15 }, gain: 0.16, drift: 2,
  },
  efd_stab: {
    osc: [{ type: 'triangle' }, { type: 'sawtooth', level: 0.3 }],
    attack: 0.002, dur: 0.05, release: 0.25, cutoff: 1600, res: 3, fenv: 2.5, fdecay: 0.07, gain: 0.22, drift: 3,
  },
  efd_pad: {
    osc: [{ type: 'sawtooth', detune: -5, level: 0.4 }, { type: 'sawtooth', detune: 5, level: 0.4 }, { type: 'sine', octave: 1, level: 0.2 }],
    attack: 1, release: 2.5, cutoff: 1200, res: 0.5, flfo: { rate: 0.08, depth: 400 }, gain: 0.11, drift: 6,
  },

  // ───── Autechre (AE_LIVE): hard FM hits, grain, resonant FM bass, micro-tuned blips ─────
  ae_fm_perc: {
    osc: [{ type: 'sine', fm: { ratio: 3.7, index: 5, decay: 0.05 } }],
    attack: 0.001, dur: 0.01, release: 0.1, cutoff: 9000, res: 0.5, pitch: { from: 12, time: 0.03 }, gain: 0.3,
  },
  ae_grain: {
    osc: [{ type: 'noise' }, { type: 'sine', level: 0.4 }],
    attack: 0.01, release: 0.2, ftype: 'bandpass', cutoff: 2000, res: 9, trem: { rate: 31, depth: 0.8 }, flfo: { rate: 3, depth: 1800 }, gain: 0.2,
  },
  ae_bass: {
    osc: [{ type: 'sine', fm: { ratio: 0.5, index: 3, decay: 0.2 } }, { type: 'sine', level: 0.6 }],
    attack: 0.003, release: 0.15, cutoff: 900, res: 5, fenv: 3, fdecay: 0.12, drive: 0.3, gain: 0.4, drift: 3,
  },
  ae_blip: {
    osc: [{ type: 'square', level: 0.6 }, { type: 'sine', fm: { ratio: 2.5, index: 1, decay: 0.05 } }],
    attack: 0.001, dur: 0.02, release: 0.08, cutoff: 5000, res: 3, gain: 0.2,
  },

  // ───── drill'n'bass: a clean, slow sub under the chopped breaks ─────
  drill_sub: {
    osc: [{ type: 'sine' }, { type: 'sine', octave: 1, level: 0.05 }],
    attack: 0.005, release: 0.4, cutoff: 400, res: 0.4, gain: 0.6, drift: 1,
  },
};
