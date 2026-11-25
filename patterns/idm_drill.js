// idm_drill: drill'n'bass (Drukqs, Come to Daddy). Amen and breaks chopped at speed with
// ratchets (a step split into 2-4 hits) and rolls, a clean slow sub underneath, and slow,
// sad melodies and chords floating over the chaos.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'drill_amen_ratchet', role: 'drums', flavours: { drill: 1 }, energy: [0.5, 1], code: `
params({ odds: 3 })
fx({ lpf: 11000, crush: 0.05 })
loop('amen', (i) => {
  const b = beat('b', { style: 'drill', density: walk('d', 0.5, 0.9, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    const r = st.s && one_in(P.odds) ? choose([2, 3, 4]) : 1
    for (let j = 0; j < r; j++) {
      if (st.k && j == 0) s('amencutup', { n: 0, amp: 0.8 * st.v, rate: BPM / 136 })
      if (st.s) s('amencutup', { n: choose([2, 6, 10, 14]), amp: (0.5 - j * 0.07) * st.v, rate: BPM / 136 + j * 0.05, cut: 0.2 })
      if (st.h && j == 0) s('amencutup', { n: choose([1, 3, 5]), amp: 0.15, rate: BPM / 136, cut: 0.1 })
      sleep(0.25 / r)
    }
  }
})` },

  { id: 'drill_breaks_chop', role: 'drums', flavours: { drill: 1, ae: 0.5 }, energy: [0.5, 1], code: `
params({ odds: 3, odds2: 6 })
fx({ lpf: 10000, crush: 0.08 })
loop('chop', (i) => {
  const src = vary('src', ['breaks152', 'breaks157', 'breaks165'], 16)
  for (let k = 0; k < 16; k++) {
    // a slice of the break, often out of order; sometimes repeated fast
    const slice = one_in(P.odds) ? rrand_i(0, 15) : k
    const r = one_in(P.odds2) ? 2 : 1
    for (let j = 0; j < r; j++) {
      s(src, { n: 0, begin: slice / 16, cut: 0.25 / r, amp: 0.6, rate: BPM / 160 })
      sleep(0.25 / r)
    }
  }
})` },

  // ───── perc ─────
  { id: 'drill_ratchet_hats', role: 'perc', flavours: { drill: 1, ae: 0.5 }, energy: [0.45, 1], code: `
params({ hat: 'hh', odds: 5 })
fx({ lpf: 12000, rev: 0.1 })
loop('hats', (i) => {
  for (let k = 0; k < 16; k++) {
    const r = one_in(P.odds) ? choose([2, 3, 4]) : 1
    for (let j = 0; j < r; j++) {
      s(P.hat, { n: 8, amp: 0.07 + (k % 4 == 2 ? 0.04 : 0), pan: rrand(-0.3, 0.3), rate: 1 + j * 0.08 })
      sleep(0.25 / r)
    }
  }
})` },

  { id: 'drill_snare_rolls', role: 'perc', flavours: { drill: 1 }, energy: [0.5, 1], code: `
params({ snare: 'sn', odds: 5 })
fx({ rev: 0.15, lpf: 9000 })
loop('roll', (i) => {
  // quiet ghost hits, and every few bars a roll that speeds up and rises
  const roll = i % vary('every', [2, 4], 8) == 1
  for (let k = 0; k < 16; k++) {
    if (roll && k >= 8) { s(P.snare, { n: 30, amp: 0.05 + (k - 8) * 0.02, rate: 1 + (k - 8) * 0.04 }); sleep(0.125); s(P.snare, { n: 30, amp: 0.05 + (k - 8) * 0.02 }); sleep(0.125) }
    else { if (one_in(P.odds)) s(P.snare, { n: 30, amp: 0.05 }); sleep(0.25) }
  }
})` },

  { id: 'drill_click_storm', role: 'perc', flavours: { drill: 1, ae: 0.6 }, energy: [0.4, 1], code: `
fx({ crush: 0.15, delay: 0.1 })
loop('clicks', (i) => {
  const odds = vary('odds', [2, 3, 5], 4)
  for (let k = 0; k < 32; k++) {
    if (one_in(odds)) s(choose(['click', 'glitch2']), { n: rrand_i(0, 4), amp: 0.07, rate: choose([1, 1.5, 2]), pan: rrand(-0.8, 0.8), cut: 0.05 })
    sleep(0.125)
  }
})` },

  { id: 'drill_tabla_fast', role: 'perc', flavours: { drill: 1, space: 0.5 }, energy: [0.4, 1], code: `
fx({ rev: 0.2, delay: 0.1 })
loop('tabla', (i) => {
  const hits = spread(vary('h', [9, 11, 13], 4), 16, vary('r', [0, 3], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('tabla2', { n: rrand_i(0, 45), amp: 0.11, rate: 1.1, pan: rrand(-0.5, 0.5) })
    sleep(0.25)
  }
})` },

  { id: 'drill_blip_perc', role: 'perc', flavours: { drill: 1, acid: 0.5 }, energy: [0.4, 1], code: `
params({ pluck: 'ae_blip' })
fx({ delay: 0.15, lpf: 8000 })
loop('blips', (i) => {
  for (const n of melody('p', { style: 'probability', octave: 3 })) {
    if (n.note) synth(P.pluck, n.note, { amp: 0.12 * n.vel, detune: n.detune, pan: rrand(-0.5, 0.5) })
    sleep(n.dur)
  }
})` },

  // ───── bass ─────
  { id: 'drill_sub_slow', role: 'bass', flavours: { drill: 1, saw: 0.5 }, energy: [0.3, 1], code: `
params({ sub: 'drill_sub' })
fx({ lpf: 450 })
loop('sub', (i) => {
  synth(P.sub, ROOT, { dur: 7, attack: 0.05, release: 1, amp: 0.5 })
  sleep(8)
})` },

  { id: 'drill_sub_line', role: 'bass', flavours: { drill: 1 }, energy: [0.4, 1], code: `
params({ sub: 'drill_sub' })
fx({ lpf: 500 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'sub' })) {
    if (b.note) synth(P.sub, b.note, { dur: b.len, amp: 0.5 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'drill_808_glide', role: 'bass', flavours: { drill: 1, acid: 0.6 }, energy: [0.4, 1], code: `
params({ sub: 'sub808' })
fx({ lpf: 900, crush: 0.04 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: '808' })) {
    if (b.note) synth(P.sub, b.note, { dur: b.len, amp: 0.48 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'drill_dx_sub', role: 'bass', flavours: { drill: 1, saw: 0.5 }, energy: [0.35, 1], code: `
params({ sub: 'dx_bass' })
fx({ lpf: 700 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['dub', 'sub'], 16) })) {
    if (b.note) synth(P.sub, b.note, { dur: b.len, amp: 0.4 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'drill_fm_sub_pulse', role: 'bass', flavours: { drill: 1, ae: 0.5 }, energy: [0.45, 1], code: `
params({ sub: 'fm_sub', odds: 4 })
fx({ lpf: 800, crush: 0.05 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'pedal' })) {
    if (b.note && !one_in(P.odds)) synth(P.sub, b.note, { dur: b.len * 0.6, amp: 0.42 * b.vel })
    sleep(b.dur)
  }
})` },

  // ───── keys ─────
  { id: 'drill_sad_strings', role: 'keys', flavours: { drill: 1, saw: 0.6 }, energy: [0.2, 1], code: `
params({ pad: 'string_machine' })
fx({ rev: 0.5, lpf: 2600 })
loop('strings', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'add9'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth(P.pad, c.notes, { dur: c.len, attack: 1, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'drill_dx_pad', role: 'keys', flavours: { drill: 1, space: 0.5 }, energy: [0.2, 1], code: `
params({ pad: 'dx_pad' })
fx({ rev: 0.45, delay: 0.2 })
loop('pad', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['add9', 'sus2', 'wide'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth(P.pad, c.notes, { dur: c.len, amp: 0.18 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'drill_juno_chords', role: 'keys', flavours: { drill: 1, boc: 0.6 }, energy: [0.2, 1], code: `
params({ boc_pad: 'juno_pad' })
fx({ rev: 0.4, lpf: 2000, wobble: 0.15 })
loop('juno', (i) => {
  for (const c of chords('c', { voicing: 'sus2', rhythm: 'long', octave: 1 })) {
    if (c.notes) synth(P.boc_pad, c.notes, { dur: c.len, attack: 0.8, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'drill_organ_slow', role: 'keys', flavours: { drill: 1, minimal: 0.5 }, energy: [0.25, 1], code: `
params({ organ: 'efd_organ' })
fx({ rev: 0.35, lpf: 3000 })
loop('organ', (i) => {
  for (const c of chords('c', { voicing: 'm7', rhythm: 'long', octave: 1 })) {
    if (c.notes) synth(P.organ, c.notes, { dur: c.len * 0.9, amp: 0.16 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── leads (many melodies, slow against the speed) ─────
  { id: 'drill_piano_ostinato', role: 'lead', flavours: { drill: 1, saw: 0.6 }, energy: [0.2, 1], code: `
fx({ rev: 0.35 })
loop('piano', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 2 })) {
    if (n.note) synth(vary('inst', ['prepared_piano', 'felt'], 32), n.note, { vel: 0.4 + 0.5 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'drill_sad_square', role: 'lead', flavours: { drill: 1, dark: 0.5 }, energy: [0.25, 1], code: `
params({ lead: 'saw2_square' })
fx({ rev: 0.45, delay: 0.3, lpf: 2400 })
loop('lead', (i) => {
  for (const n of melody('d', { style: 'drift', octave: 2 })) {
    if (n.note) synth(P.lead, n.note, { dur: n.len, amp: 0.22 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'drill_bell_line', role: 'lead', flavours: { drill: 1, saw: 0.5 }, energy: [0.3, 1], code: `
params({ bell: 'dx_bell' })
fx({ delay: 0.35, rev: 0.35 })
loop('bells', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 3 })) {
    if (n.note) synth(P.bell, n.note, { amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'drill_flute_drift', role: 'lead', flavours: { drill: 1, boc: 0.6 }, energy: [0.2, 1], code: `
params({ boc_lead: 'boc_flute' })
fx({ rev: 0.4, delay: 0.25 })
loop('flute', (i) => {
  for (const n of melody('f', { style: 'drift', octave: 2 })) {
    if (n.note) synth(P.boc_lead, n.note, { dur: n.len, amp: 0.22 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'drill_aphex_line', role: 'lead', flavours: { drill: 1, acid: 0.5 }, energy: [0.35, 1], code: `
params({ lead: 'aphex_lead', odds: 5 })
fx({ rev: 0.3, delay: 0.2, lpf: 3500 })
loop('lead', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 2 })) {
    if (n.note && !one_in(P.odds)) synth(P.lead, n.note, { dur: n.len, amp: 0.18 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'drill_glass_motif', role: 'lead', flavours: { drill: 1, space: 0.5 }, energy: [0.25, 1], code: `
params({ bell: 'fm_glass' })
fx({ delay: 0.4, rev: 0.4 })
loop('glass', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.3, octave: 3 })) {
    if (n.note) synth(P.bell, n.note, { amp: 0.16 * n.vel })
    sleep(n.dur)
  }
})` },

  // ───── texture ─────
  { id: 'drill_vocal_cuts', role: 'texture', flavours: { drill: 1, acid: 0.5 }, energy: [0.4, 1], code: `
fx({ delay: 0.15, crush: 0.12 })
loop('cuts', (i) => {
  for (const e of collage('c', { pool: ['speech', 'mouth', 'alphabet'], rate: walk('r', 0.5, 1, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * choose([1, 1.5, 2]), begin: e.begin, pan: e.pan, amp: e.amp * 0.55, cut: 0.12 })
    sleep(e.dur)
  }
})` },

  { id: 'drill_tape_hiss', role: 'texture', flavours: { drill: 1, saw: 0.5 }, energy: [0, 1], code: `
fx({ lpf: 9000 })
loop('tape', (i) => {
  const t = tape('t')
  synth('hiss_bed', 72, { dur: 3.5, attack: 0.3, release: 0.8, amp: 0.25 * t.level })
  sleep(4)
})` },

  { id: 'drill_glitch_bed', role: 'texture', flavours: { drill: 1, ae: 0.5 }, energy: [0.3, 1], code: `
fx({ crush: 0.2, delay: 0.25 })
loop('glitch', (i) => {
  for (const e of collage('c', { pool: ['glitch2', 'glitch', 'sid'], rate: walk('r', 0.4, 0.9, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * 2, pan: e.pan, amp: e.amp * 0.45, cut: 0.08 })
    sleep(e.dur)
  }
})` },

  { id: 'drill_cosmic_noise', role: 'texture', flavours: { drill: 1, space: 0.6 }, energy: [0, 1], code: `
params({ drone: 'cosmic_sweep' })
fx({ rev: 0.5, lpf: 4000 })
loop('sweep', (i) => {
  synth(P.drone, degree(0, 1), { dur: 7, attack: 2, release: 3, amp: 0.2 })
  sleep(8)
})` },

  { id: 'drill_alphabet', role: 'texture', flavours: { drill: 1, boc: 0.5 }, energy: [0.2, 1], code: `
fx({ delay: 0.3, rev: 0.3, lpf: 4000 })
loop('letters', (i) => {
  for (const e of collage('c', { pool: ['alphabet', 'numbers'], rate: walk('r', 0.2, 0.5, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, pan: e.pan, amp: e.amp * 0.5, cut: 0.6 })
    sleep(e.dur)
  }
})` },
);
