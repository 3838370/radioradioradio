// lib_atmos_rave: more atmospheric drum & bass and rave. Swung rides and tambourines,
// tabla rolls, cowbell, Rhodes and organ chords, flute lines, a hoover call and supersaw
// answer, vocal chops and slow risers.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'rave_jungle_kit', role: 'drums', flavours: { rave: 0.9, atmos: 0.7 }, energy: [0.5, 1], code: `
fx({ lpf: 9000, rev: 0.12 })
loop('kit', (i) => {
  const b = beat('b', { style: vary('st', ['jungle', 'break'], 16), density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('jungle', { n: 5, amp: 0.8 * st.v })
    if (st.s) s('jungle', { n: 11, amp: 0.55 * st.v })
    if (st.h) s('jungle', { n: 0, amp: 0.15 * st.v, pan: 0.2 })
    if (st.p) s('hc', { n: 2, amp: 0.1 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  // ───── perc ─────
  { id: 'atmos_ride_swing', role: 'perc', flavours: { atmos: 1, rave: 0.6 }, energy: [0.35, 1], code: `
fx({ lpf: 9000, rev: 0.2 })
loop('ride', (i) => {
  for (let k = 0; k < 16; k++) {
    if (k % 2 == 0) s('ho', { n: 2, amp: 0.08 * walk('a', 0.7, 1.2, 0.1), pan: 0.35 })
    else if (one_in(3)) s('hh', { n: 4, amp: 0.05, pan: 0.35 })
    sleep(swing(0.25, k, 0.12))
  }
})` },

  { id: 'rave_tamb_16', role: 'perc', flavours: { rave: 1, atmos: 0.6 }, energy: [0.45, 1], code: `
fx({ lpf: 8000, rev: 0.1 })
loop('tamb', (i) => {
  for (let k = 0; k < 16; k++) {
    const accent = k % 4 == 2
    if (accent || !one_in(4)) s('drumtraks', { n: 10, amp: accent ? 0.16 : 0.07, pan: -0.25 })
    sleep(0.25)
  }
})` },

  { id: 'atmos_tabla_roll', role: 'perc', flavours: { atmos: 0.9, rave: 0.5, space: 0.3 }, energy: [0.3, 1], code: `
fx({ rev: 0.25, delay: 0.15, lpf: 6000 })
loop('tabla', (i) => {
  const hits = spread(vary('h', [7, 9, 11], 8), 16, vary('r', [1, 4], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('tabla2', { n: vary('n' + (k % 4), [3, 10, 17, 24, 31, 40], 8), amp: 0.13, pan: rrand(-0.4, 0.4) })
    sleep(0.25)
  }
})` },

  { id: 'rave_cowbell', role: 'perc', flavours: { rave: 1, atmos: 0.5 }, energy: [0.5, 1], code: `
fx({ delay: 0.3, rev: 0.15, lpf: 7000 })
loop('bell', (i) => {
  const hits = spread(vary('h', [3, 5], 8), 8, vary('r', [1, 3], 8))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) s('cb', { n: 0, amp: 0.1, rate: vary('rate', [1, 1.2], 16), pan: 0.3 })
    sleep(0.5)
  }
})` },

  // ───── keys ─────
  { id: 'rave_supersaw_push', role: 'keys', flavours: { rave: 1, atmos: 0.5 }, energy: [0.5, 1], code: `
fx({ lpf: walk('lpf', 2000, 6000, 0.15), rev: 0.25, delay: 0.15 })
loop('stabs', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'triad'], 16), rhythm: vary('r', ['push', 'stab'], 16), octave: 1, density: 0.7 })) {
    if (c.notes) synth(vary('inst', ['supersaw', 'rave_stab'], 32), c.notes, { dur: c.len, amp: 0.26 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'atmos_rhodes_push', role: 'keys', flavours: { atmos: 1, rave: 0.5, deep: 0.4 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.15, wobble: 0.1 })
loop('rhodes', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['add9', 'm7', 'wide'], 16), rhythm: 'push', octave: 1, density: 0.5 })) {
    if (c.notes) synth('rhodes', c.notes, { dur: Math.max(0.5, c.len), vel: 0.6 + 0.4 * c.vel, strum: 0.03 })
    sleep(c.dur)
  }
})` },

  { id: 'rave_organ_offbeat', role: 'keys', flavours: { rave: 0.9, atmos: 0.5 }, energy: [0.55, 1], code: `
fx({ lpf: 5000, rev: 0.15 })
loop('organ', (i) => {
  for (const c of chords('c', { voicing: 'triad', rhythm: 'offbeat', octave: 1, density: walk('d', 0.5, 0.9, 0.1) })) {
    if (c.notes) synth('rave_organ', c.notes, { dur: 0.2, amp: 0.24 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── lead ─────
  { id: 'atmos_flute_motif', role: 'lead', flavours: { atmos: 1, rave: 0.5, deep: 0.3 }, energy: [0.2, 1], code: `
fx({ rev: 0.4, delay: 0.25 })
loop('flute', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.4, octave: 2 })) {
    if (n.note) synth('mono', n.note, { dur: n.dur * 0.9, amp: 0.24 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'rave_hoover_call', role: 'lead', flavours: { rave: 1, atmos: 0.5 }, energy: [0.6, 1], code: `
fx({ rev: 0.2, delay: 0.15, lpf: 7000 })
loop('call', (i) => {
  // the hoover calls on even bars, the supersaw answers on odd bars
  const call = i % 2 == 0
  for (const n of motif(call ? 'call' : 'answer', { beats: 4, density: 0.45, octave: call ? 1 : 2 })) {
    if (n.note) synth(call ? 'hoover' : 'supersaw', n.note, { dur: n.dur * 0.8, amp: (call ? 0.22 : 0.18) * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'atmos_bell_cascade', role: 'lead', flavours: { atmos: 0.9, rave: 0.6, space: 0.3 }, energy: [0.3, 1], code: `
fx({ delay: 0.35, rev: 0.35 })
loop('bells', (i) => {
  for (const n of motif('m', { beats: 4, density: 0.8, octave: 3 })) {
    if (n.note) synth(vary('inst', ['dx_bell', 'fm_glass'], 16), n.note, { dur: n.dur, amp: 0.16 * n.vel, pan: rrand(-0.5, 0.5) })
    sleep(n.dur)
  }
})` },

  // ───── texture ─────
  { id: 'rave_vocal_chops', role: 'texture', flavours: { rave: 1, atmos: 0.5 }, energy: [0.45, 1], code: `
fx({ delay: 0.25, rev: 0.2, lpf: 8000 })
loop('chops', (i) => {
  for (const e of collage('c', { pool: ['rave', 'rave2', 'yeah'], rate: walk('r', 0.4, 0.9, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.8, cut: 0.4 })
    sleep(e.dur)
  }
})` },

  { id: 'atmos_space_voices', role: 'texture', flavours: { atmos: 1, rave: 0.5, space: 0.4 }, energy: [0, 1], code: `
fx({ rev: 0.55, delay: 0.3, lpf: 4500 })
loop('voices', (i) => {
  for (const e of collage('c', { pool: ['speech', 'alphabet', 'east', 'outdoor'], rate: walk('r', 0.15, 0.4, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.6, cut: 2 })
    sleep(e.dur)
  }
})` },

  { id: 'rave_riser_slow', role: 'texture', flavours: { rave: 0.9, atmos: 0.6, industrial: 0.3 }, energy: [0.5, 1], code: `
fx({ rev: 0.3, lpf: 6000 })
loop('rise', (i) => {
  sleep(8)
  synth('riser_slow', degree(0, 1), { dur: 6, amp: 0.3 })
  sleep(8)
})` },

  { id: 'rave_hoover_wash', role: 'texture', flavours: { rave: 0.9, atmos: 0.5 }, energy: [0.4, 1], code: `
fx({ rev: 0.4, delay: 0.2, lpf: 5000, wobble: 0.2 })
loop('wash', (i) => {
  s('hoover', { n: vary('n', [0, 2, 4], 16), amp: 0.2, rate: vary('rate', [0.5, 0.75, 1], 8), pan: rrand(-0.6, 0.6), cut: 3 })
  sleep(4)
})` },
);
