// lib_dub_fog: more dub techno and Gas-style fog (the "Selection" dub techno reference).
// Soft 4/4 kicks under offbeat hats, ghost shakers, rims into long delays; chords as the
// theme; subs that barely move; tape hiss, hum and crackle as a layer of their own.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'dub_techno_kit', role: 'drums', flavours: { dub: 1, minimal: 0.7 }, energy: [0.25, 1], code: `
params({ kick: 'clubkick', rim: 'rs', hat: 'hh', perc: 'perc' })
fx({ lpf: 5500, rev: 0.15, delay: 0.08 })
loop('kit', (i) => {
  const b = beat('b', { style: 'dubtechno', density: walk('dens', 0.3, 0.75, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s(P.kick, { n: 1, amp: 0.8 * st.v })
    if (st.s) s(P.rim, { n: 0, amp: 0.18 * st.v, pan: -0.25 })
    if (st.h) s(P.hat, { n: 3, amp: 0.14 * st.v, pan: 0.2 })
    if (st.p) s(P.perc, { n: 2, amp: 0.07 * st.v, pan: -0.4 })
    sleep(0.25)
  }
})` },

  { id: 'fog_deep_kick', role: 'drums', flavours: { dub: 1 }, energy: [0.15, 1], code: `
params({ kick: 'bd', hat: 'hh', odds: 6 })
fx({ lpf: 1400, rev: 0.35 })
loop('kick', (i) => {
  s(P.kick, { n: 12, amp: 0.9 })
  sleep(1)
})
loop('hats', (i) => {
  sleep(0.5)
  if (!one_in(P.odds)) s(P.hat, { n: vary('hn', [1, 5, 9], 16), amp: walk('ha', 0.05, 0.12, 0.1), pan: 0.3 })
  sleep(0.5)
})` },

  { id: 'dub_dr55_kit', role: 'drums', flavours: { dub: 1, minimal: 0.7 }, energy: [0.3, 1], code: `
params({ kit: 'dr55' })
fx({ lpf: 7000, delay: 0.12, rev: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: vary('style', ['dubtechno', 'four'], 32), density: 0.5 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s(P.kit, { n: 0, amp: 0.85 * st.v })
    if (st.s) s(P.kit, { n: 3, amp: 0.2 * st.v })
    if (st.h) s(P.kit, { n: 2, amp: 0.12 * st.v, pan: 0.15 })
    sleep(0.25)
  }
})` },

  { id: 'fog_808_pulse', role: 'drums', flavours: { dub: 1 }, energy: [0, 0.8], code: `
params({ kick: '808bd' })
fx({ lpf: 2500, rev: 0.4, wobble: 0.1 })
loop('pulse', (i) => {
  const b = beat('b', { style: 'pulse_sparse', density: walk('dens', 0.2, 0.6, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s(P.kick, { n: 3, amp: 0.8 * st.v })
    if (st.h) s('808', { n: 1, amp: 0.08 * st.v, pan: 0.3 })
    if (st.p) s('808mt', { n: 0, amp: 0.1 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  // ───── perc ─────
  { id: 'dub_shaker_ghost', role: 'perc', flavours: { dub: 1, minimal: 0.7 }, energy: [0.2, 1], code: `
params({ perc: 'perc' })
fx({ lpf: 6000, rev: 0.2, delay: 0.15 })
loop('shake', (i) => {
  const hits = spread(vary('hits', [9, 11, 13], 8), 16)
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s(P.perc, { n: 1, amp: (k % 4 == 2 ? 0.12 : 0.05) * walk('a', 0.6, 1.2, 0.1), pan: rrand(-0.4, 0.4) })
    sleep(0.25)
  }
})` },

  { id: 'dub_rim_synth', role: 'perc', flavours: { dub: 1 }, energy: [0.2, 1], code: `
fx({ delay: 0.5, rev: 0.25, lpf: 4000 })
loop('rim', (i) => {
  const hits = spread(vary('n', [2, 3, 5], 8), 16, vary('rot', [3, 6, 10], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth('dub_rim', KEY + 36, { amp: 0.35, pan: vary('pan', [-0.4, 0.3], 4) })
    sleep(0.25)
  }
})` },

  { id: 'fog_hand_claps', role: 'perc', flavours: { dub: 1 }, energy: [0.25, 1], code: `
params({ clap: 'hand', odds: 3 })
fx({ rev: 0.55, lpf: 3000, delay: 0.2 })
loop('clap', (i) => {
  sleep(1)
  s(P.clap, { n: vary('n', [2, 7, 11], 16), amp: 0.12, pan: -0.2 })
  sleep(2)
  if (one_in(P.odds)) s(P.clap, { n: 4, amp: 0.07, pan: 0.3 })
  sleep(1)
})` },

  { id: 'fog_tick', role: 'perc', flavours: { dub: 1 }, energy: [0, 0.9], code: `
params({ odds: 4 })
fx({ lpf: 2200, rev: 0.4 })
loop('tick', (i) => {
  for (let k = 0; k < 8; k++) {
    if (k % 2 == 1 || one_in(P.odds)) s(vary('f', ['click', 'tok'], 16), { n: 0, amp: walk('a', 0.04, 0.1, 0.1), pan: 0.4 })
    sleep(0.5)
  }
})` },

  // ───── bass ─────
  { id: 'dub_sub_pulse', role: 'bass', flavours: { dub: 1 }, energy: [0.2, 1], code: `
params({ sub: 'dub_sub' })
fx({ lpf: 700 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['pedal', 'sub', 'dub'], 16) })) {
    if (b.note) synth(P.sub, b.note, { dur: b.len * 0.9, amp: 0.5 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'dub_sh_bass', role: 'bass', flavours: { dub: 1 }, energy: [0.3, 1], code: `
params({ acid_bass: 'sh_bass' })
fx({ lpf: walk('lpf', 400, 900, 0.1), rev: 0.05 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'dub' })) {
    if (b.note) synth(P.acid_bass, b.note, { dur: b.len * 0.8, amp: 0.4 * b.vel, cutoff: 500 })
    sleep(b.dur)
  }
})` },

  { id: 'fog_drone_sub', role: 'bass', flavours: { dub: 1 }, energy: [0, 0.8], code: `
params({ sub: 'dub_sub' })
fx({ lpf: 500, rev: 0.2 })
loop('drone', (i) => {
  synth(P.sub, ROOT, { dur: 6, attack: 1, release: 2, amp: 0.45 })
  sleep(8)
})` },

  { id: 'dub_dx_bass', role: 'bass', flavours: { dub: 1, minimal: 0.7 }, energy: [0.25, 1], code: `
params({ sub: 'dx_bass' })
fx({ lpf: 1100, delay: 0.05 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['dub', 'sub'], 16) })) {
    if (b.note) synth(P.sub, b.note, { dur: b.len * 0.85, amp: 0.4 * b.vel })
    sleep(b.dur)
  }
})` },

  // ───── keys ─────
  { id: 'dub_chord_echo', role: 'keys', flavours: { dub: 1 }, energy: [0.15, 1], code: `
params({ stab: 'dub_chord' })
fx({ delay: 0.6, rev: 0.35, lpf: 3000 })
loop('chords', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['dub', 'm7', 'sus2'], 16), rhythm: vary('r', ['offbeat', 'stab'], 32), density: walk('d', 0.3, 0.8, 0.1) })) {
    if (c.notes) synth(P.stab, c.notes, { dur: c.len, amp: 0.34 * c.vel, cutoff: walk('cut', 500, 1800, 0.12) })
    sleep(c.dur)
  }
})` },

  { id: 'fog_wash', role: 'keys', flavours: { dub: 1 }, energy: [0, 0.9], code: `
fx({ rev: 0.55, lpf: 1600, wobble: 0.12 })
loop('wash', (i) => {
  synth('dub_pad_wash', harm(1, vary('ext', ['7', ''], 16)), { dur: 7, attack: 2, release: 4, amp: 0.24 })
  sleep(8)
})` },

  // ───── lead ─────
  { id: 'dub_melodica_motif', role: 'lead', flavours: { dub: 1 }, energy: [0.2, 1], code: `
params({ lead: 'sh_lead', odds: 3 })
fx({ delay: 0.5, rev: 0.3, lpf: 2600 })
loop('motif', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.25, octave: 2 })) {
    if (n.note && !one_in(P.odds)) synth(P.lead, n.note, { dur: n.dur * 0.6, amp: 0.22 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'fog_horn_fifths', role: 'lead', flavours: { dub: 1 }, energy: [0, 0.9], code: `
fx({ rev: 0.5, lpf: 1300, wobble: 0.15 })
loop('horns', (i) => {
  for (const c of chords('c', { voicing: 'fifths', rhythm: 'long', octave: 1 })) {
    if (c.notes) synth(vary('inst', ['brass', 'low_brass'], 32), c.notes, { dur: c.len * 0.9, attack: 0.8, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'dub_bell_echo', role: 'lead', flavours: { dub: 1, minimal: 0.7 }, energy: [0, 1], code: `
params({ bell: 'dx_bell' })
fx({ delay: 0.6, rev: 0.4 })
loop('bell', (i) => {
  const wait = vary('wait', [1.5, 2.5, 3], 8)
  sleep(wait)
  synth(P.bell, degree(choose([0, 2, 4, 6]), 2), { amp: 0.25 })
  sleep(4 - wait)
})` },

  // ───── texture ─────
  { id: 'dub_tape_bed', role: 'texture', flavours: { dub: 1 }, energy: [0, 1], code: `
fx({ lpf: 9000, rev: 0.1 })
loop('hiss', (i) => {
  const t = tape('t')
  synth('hiss_bed', 72, { dur: 3.5, attack: 0.5, release: 1, amp: 0.4 * t.level })
  sleep(4)
})
loop('crackle', (i) => {
  for (const c of tape('c').crackles) {
    if (c.amp) synth('vinyl_bed', 84, { dur: 0.02, attack: 0.001, release: 0.04, amp: c.amp })
    sleep(c.dur)
  }
})` },

  { id: 'dub_hum', role: 'texture', flavours: { dub: 1 }, energy: [0, 0.9], code: `
fx({ lpf: 600, rev: 0.2 })
loop('hum', (i) => {
  synth('hum_bed', ROOT - 12, { dur: 14, attack: 3, release: 4, amp: walk('a', 0.3, 0.6, 0.1) })
  sleep(16)
})` },

  { id: 'fog_noise_wind', role: 'texture', flavours: { dub: 1 }, energy: [0, 1], code: `
params({ nature: 'wind' })
fx({ lpf: 2400, rev: 0.45 })
loop('wind', (i) => {
  s(P.nature, { n: vary('n', [0, 3, 6, 8], 16), amp: walk('a', 0.12, 0.3, 0.1), rate: choose([0.5, 0.75, 1]), pan: rrand(-0.5, 0.5) })
  sleep(8)
})` },

  { id: 'dub_voice_echo', role: 'texture', flavours: { dub: 1 }, energy: [0.1, 1], code: `
fx({ delay: 0.55, rev: 0.45, lpf: 3500 })
loop('voices', (i) => {
  for (const e of collage('c', { pool: ['speech', 'east', 'speechless'], rate: walk('r', 0.15, 0.45, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.7, cut: 1.5 })
    sleep(e.dur)
  }
})` },
);
