// lib_atmos_rave: more atmospheric drum & bass and rave. Swung rides and tambourines,
// tabla rolls, cowbell, Rhodes and organ chords, flute lines, a hoover call and supersaw
// answer, vocal chops and slow risers.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'rave_jungle_kit', role: 'drums', flavours: { drill: 1 }, energy: [0.5, 1], code: `
params({ rim: 'hc' })
fx({ lpf: 9000, rev: 0.12 })
loop('kit', (i) => {
  const b = beat('b', { style: vary('st', ['jungle', 'break'], 16), density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('jungle', { n: 5, amp: 0.8 * st.v })
    if (st.s) s('jungle', { n: 11, amp: 0.55 * st.v })
    if (st.h) s('jungle', { n: 0, amp: 0.15 * st.v, pan: 0.2 })
    if (st.p) s(P.rim, { n: 2, amp: 0.1 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  // ───── perc ─────
  { id: 'atmos_ride_swing', role: 'perc', flavours: { minimal: 1 }, energy: [0.35, 1], code: `
params({ hat: 'hh', odds: 3 })
fx({ lpf: 9000, rev: 0.2 })
loop('ride', (i) => {
  for (let k = 0; k < 16; k++) {
    if (k % 2 == 0) s('ho', { n: 2, amp: 0.08 * walk('a', 0.7, 1.2, 0.1), pan: 0.35 })
    else if (one_in(P.odds)) s(P.hat, { n: 4, amp: 0.05, pan: 0.35 })
    sleep(swing(0.25, k, 0.12))
  }
})` },

  { id: 'rave_tamb_16', role: 'perc', flavours: { minimal: 1 }, energy: [0.45, 1], code: `
params({ kit: 'drumtraks', odds: 4 })
fx({ lpf: 8000, rev: 0.1 })
loop('tamb', (i) => {
  for (let k = 0; k < 16; k++) {
    const accent = k % 4 == 2
    if (accent || !one_in(P.odds)) s(P.kit, { n: 10, amp: accent ? 0.16 : 0.07, pan: -0.25 })
    sleep(0.25)
  }
})` },

  { id: 'atmos_tabla_roll', role: 'perc', flavours: { space: 1 }, energy: [0.3, 1], code: `
fx({ rev: 0.25, delay: 0.15, lpf: 6000 })
loop('tabla', (i) => {
  const hits = spread(vary('h', [7, 9, 11], 8), 16, vary('r', [1, 4], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('tabla2', { n: vary('n' + (k % 4), [3, 10, 17, 24, 31, 40], 8), amp: 0.13, pan: rrand(-0.4, 0.4) })
    sleep(0.25)
  }
})` },

  { id: 'rave_cowbell', role: 'perc', flavours: { acid: 1 }, energy: [0.5, 1], code: `
fx({ delay: 0.3, rev: 0.15, lpf: 7000 })
loop('bell', (i) => {
  const hits = spread(vary('h', [3, 5], 8), 8, vary('r', [1, 3], 8))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) s('cb', { n: 0, amp: 0.1, rate: vary('rate', [1, 1.2], 16), pan: 0.3 })
    sleep(0.5)
  }
})` },

  // ───── keys ─────

  { id: 'atmos_rhodes_push', role: 'keys', flavours: { boc: 1 }, energy: [0.2, 1], code: `
params({ keys: 'rhodes' })
fx({ rev: 0.3, delay: 0.15, wobble: 0.1 })
loop('rhodes', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['add9', 'm7', 'wide'], 16), rhythm: 'push', octave: 1, density: 0.5 })) {
    if (c.notes) synth(P.keys, c.notes, { dur: Math.max(0.5, c.len), vel: 0.6 + 0.4 * c.vel, strum: 0.03 })
    sleep(c.dur)
  }
})` },

  // ───── lead ─────
  { id: 'atmos_flute_motif', role: 'lead', flavours: { boc: 1 }, energy: [0.2, 1], code: `
params({ lead: 'mono' })
fx({ rev: 0.4, delay: 0.25 })
loop('flute', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.4, octave: 2 })) {
    if (n.note) synth(P.lead, n.note, { dur: n.dur * 0.9, amp: 0.24 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'atmos_bell_cascade', role: 'lead', flavours: { saw: 1 }, energy: [0.3, 1], code: `
fx({ delay: 0.35, rev: 0.35 })
loop('bells', (i) => {
  for (const n of motif('m', { beats: 4, density: 0.8, octave: 3 })) {
    if (n.note) synth(vary('inst', ['dx_bell', 'fm_glass'], 16), n.note, { dur: n.dur, amp: 0.16 * n.vel, pan: rrand(-0.5, 0.5) })
    sleep(n.dur)
  }
})` },

  // ───── texture ─────

  { id: 'atmos_space_voices', role: 'texture', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ rev: 0.55, delay: 0.3, lpf: 4500 })
loop('voices', (i) => {
  for (const e of collage('c', { pool: ['speech', 'alphabet', 'east', 'outdoor'], rate: walk('r', 0.15, 0.4, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.6, cut: 2 })
    sleep(e.dur)
  }
})` },

);
