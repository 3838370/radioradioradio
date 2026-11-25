// pulse: the new beats (jungle, electro, footwork, garage, gabber, odd meters 7/8, 5/4,
// 11/8 and ae_odd), hard-hitting synths (acid, reese, wobble, FM, donk, brass, organ,
// screamer, risers, sub drops) and the synthesized city (crowds, voices, traffic, metro
// doors and chimes, alarms, footsteps, anvils, welders, steam, hum).
// Odd-meter beats are not 16 steps long: loops use b.length, so they drift against the
// 4/4 layers and line up again now and then (polymeter).
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'pl_jungle', role: 'drums', flavours: { atmos: 1, rave: 0.6 }, energy: [0.5, 1], code: `
fx({ lpf: 11000, crush: 0.1, rev: 0.1 })
loop('kit', (i) => {
  const b = beat('j', { style: 'jungle', density: 0.4 + 0.5 * ENERGY })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('amencutup', { n: 0, amp: 0.8 * st.v })
    if (st.s) s('amencutup', { n: vary('sn', [2, 4, 6], 8), amp: 0.6 * st.v, rate: one_in(6) ? 1.3 : 1 })
    if (st.h) s('amencutup', { n: 1, amp: 0.2 * st.v, pan: 0.2 })
    if (st.p) s('amencutup', { n: rrand_i(8, 15), amp: 0.25 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'pl_electro', role: 'drums', flavours: { rave: 0.8, industrial: 0.6, deep: 0.3 }, energy: [0.4, 1], code: `
fx({ lpf: 12000, rev: 0.12 })
loop('808', (i) => {
  const b = beat('e', { style: 'electro', density: 0.4 + 0.4 * ENERGY })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: vary('bd', [1, 3, 5], 16), amp: 0.9 * st.v })
    if (st.s) synth('clap_synth', 60, { amp: 0.5 * st.v })
    if (st.h) s('808', { n: vary('hh', [1, 2], 8), amp: 0.2 * st.v, pan: 0.25 })
    if (st.p) synth('glitch_blip', KEY + 24 + choose([0, 7, 12]), { vel: st.v, pan: rrand(-0.5, 0.5) })
    sleep(swing(0.25, k, vary('sw', [0, 0.06, 0.12], 16)))
  }
})` },

  { id: 'pl_footwork', role: 'drums', flavours: { atmos: 0.8, ae: 0.5, rave: 0.4 }, energy: [0.4, 1], code: `
fx({ lpf: 10000, rev: 0.12, delay: 0.1 })
loop('juke', (i) => {
  const b = beat('fw', { style: 'footwork', density: 0.5 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth('kick_hard', KEY - 24, { amp: 0.8 * st.v })
    if (st.s) s('realclaps', { n: 1, amp: 0.4 * st.v })
    if (st.h) s('hh27', { n: 2, amp: 0.15 * st.v, pan: -0.2 })
    if (st.p) s(vary('vox', ['yeah', 'hmm', 'mouth'], 16), { n: rrand_i(0, 5), amp: 0.2, cut: 0.15 })
    sleep(0.25)
  }
})` },

  { id: 'pl_garage', role: 'drums', flavours: { dub: 0.6, deep: 0.6, atmos: 0.4 }, energy: [0.3, 0.9], code: `
fx({ lpf: 9000, rev: 0.15 })
loop('2step', (i) => {
  const b = beat('g', { style: 'garage', density: 0.5 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('house', { n: 0, amp: 0.8 * st.v })
    if (st.s) s('realclaps', { n: 3, amp: 0.35 * st.v })
    if (st.h) s('hh27', { n: 6, amp: 0.18 * st.v, pan: 0.2 })
    if (st.p) s('tok', { n: 1, amp: 0.15 })
    sleep(swing(0.25, k, 0.16))
  }
})` },

  { id: 'pl_gabber', role: 'drums', flavours: { industrial: 0.8, rave: 0.6 }, energy: [0.75, 1], code: `
fx({ lpf: 9000, rev: 0.08, crush: 0.05 })
loop('gabba', (i) => {
  const b = beat('gb', { style: 'gabber', density: 0.6 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth('kick_gabber', KEY - 24, { amp: 0.75 * st.v })
    if (st.h) s('hh27', { n: 4, amp: 0.25 * st.v })
    if (st.p) s('industrial', { n: rrand_i(0, 9), amp: 0.15, pan: rrand(-0.6, 0.6) })
    sleep(0.25)
  }
})` },

  { id: 'pl_seven', role: 'drums', odd: true, flavours: { ae: 1, industrial: 0.4, deep: 0.3 }, energy: [0.3, 1], code: `
fx({ lpf: 9000, rev: 0.15 })
loop('seven', (i) => {
  const b = beat('7', { style: vary('meter', ['seven', 'five', 'eleven'], 32), density: 0.5 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth('kick_synth', KEY - 12, { amp: 0.8 * st.v })
    if (st.s) s('sequential', { n: 5, amp: 0.45 * st.v })
    if (st.h) synth('hat_synth', 60, { amp: 0.3 * st.v, pan: 0.2 })
    if (st.p) synth('fm_metal', KEY + 12, { amp: 0.4 * st.v, pan: rrand(-0.5, 0.5) })
    sleep(0.25)
  }
})` },

  { id: 'pl_ae_odd', role: 'perc', odd: true, flavours: { ae: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.2, delay: 0.2, crush: 0.1 })
loop('odd', (i) => {
  const b = beat('o', { style: 'ae_odd', density: 0.6 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth('donk', KEY + choose([0, 3, 7]), { amp: 0.6 * st.v })
    if (st.s) synth('glitch_blip', KEY + 36, { amp: 0.5 * st.v, pan: rrand(-0.7, 0.7) })
    if (st.h) s('glitch', { n: rrand_i(0, 7), amp: 0.12 * st.v, rate: rrand(0.8, 2) })
    sleep(vary('grain', [0.25, 0.1875, 1 / 6], 8))
  }
})` },

  // ───── hard synths ─────
  { id: 'pl_acid', role: 'bass', flavours: { rave: 1, industrial: 0.6, ae: 0.3 }, energy: [0.4, 1], code: `
fx({ rev: 0.1, delay: 0.25 })
loop('303', (i) => {
  const notes = ring(0, 0, 12, 0, 3, 0, 7, 10, 0, 12, 0, 5, 0, 3, 15, 0)
  const acc = spread(vary('acc', [3, 5, 7], 8), 16, vary('r', [0, 2, 5], 4))
  const slide = vary('slide', [0.05, 0.12, 0.2], 8)
  for (let k = 0; k < 16; k++) {
    if (!one_in(6)) synth(vary('osc', ['acid_303', 'acid_sq'], 32), ROOT - 12 + notes[k], { vel: acc[k] ? 1.1 : 0.55, dur: slide, cutoff: walk('cut', 250, 900, 0.1) })
    sleep(0.25)
  }
})` },

  { id: 'pl_reese_roll', role: 'bass', flavours: { atmos: 1, dark: 0.4 }, energy: [0.4, 1], code: `
fx({ lpf: 2000, rev: 0.1 })
loop('reese', (i) => {
  synth('reese_hard', ROOT - 12, { dur: vary('len', [1.5, 3, 3.5], 4), amp: 0.5 })
  sleep(4)
})` },

  { id: 'pl_wobble', role: 'bass', flavours: { industrial: 0.8, rave: 0.5, dark: 0.3 }, energy: [0.5, 1], code: `
fx({ lpf: 4000 })
loop('wob', (i) => {
  const hits = spread(vary('h', [3, 5], 8), 8)
  for (let k = 0; k < 8; k++) {
    if (hits[k]) synth('wobble_bass', ROOT - 12, { dur: 0.35, amp: 0.55 })
    sleep(0.5)
  }
})` },

  { id: 'pl_fm_bass', role: 'bass', flavours: { ae: 0.9, industrial: 0.6, deep: 0.3 }, energy: [0.3, 1], code: `
fx({ rev: 0.1, delay: 0.15 })
loop('fm', (i) => {
  const hits = spread(vary('h', [5, 7, 9], 8), 16, vary('rot', [0, 3, 7], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth('fm_sub', ROOT - 12 + choose([0, 0, 12, 7]), { amp: 0.5, pan: rrand(-0.2, 0.2) })
    sleep(0.25)
  }
})` },

  { id: 'pl_hard_sub', role: 'bass', flavours: { rave: 0.6, industrial: 0.6, atmos: 0.5, dark: 0.4 }, energy: [0.4, 1], code: `
fx({ lpf: 900 })
loop('sub', (i) => {
  const hits = vary('pat', [[0, 10], [0, 6, 12], [2, 10, 14], [0, 3, 8, 11]], 8)
  for (let k = 0; k < 16; k++) {
    if (hits.includes(k)) synth('hard_sub', ROOT - 12, { amp: 0.6, dur: 0.4 })
    sleep(0.25)
  }
})` },

  { id: 'pl_brass_stabs', role: 'keys', flavours: { rave: 1, atmos: 0.3 }, energy: [0.5, 1], code: `
fx({ rev: 0.25, delay: 0.3 })
loop('stabs', (i) => {
  const pat = spread(vary('h', [3, 5], 8), 16, vary('rot', [2, 3, 6], 8))
  for (let k = 0; k < 16; k++) {
    if (pat[k]) synth(vary('v', ['brass_stab', 'rave_organ', 'rave_stab'], 16), harm(1, vary('e', ['', '7'], 8)), { vel: k % 4 === 0 ? 1 : 0.75 })
    sleep(0.25)
  }
})` },

  { id: 'pl_donk_riff', role: 'lead', flavours: { rave: 0.8, ae: 0.5 }, energy: [0.4, 1], code: `
fx({ rev: 0.2, delay: 0.35 })
loop('donk', (i) => {
  for (const n of phrase('d', { beats: 4, density: 0.85, octave: 1, rest: 0.1 })) {
    if (n.note) synth('donk', n.note, { amp: 0.5 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'pl_screamer', role: 'lead', flavours: { rave: 0.9, industrial: 0.5 }, energy: [0.7, 1], code: `
fx({ rev: 0.3, delay: 0.3, lpf: 6000 })
loop('scream', (i) => {
  for (const n of phrase('s', { beats: 8, density: 0.3, octave: 2, rest: 0.2 })) {
    if (n.note) synth('screamer', n.note, { amp: 0.45 * n.vel, dur: n.dur * 0.6 })
    sleep(n.dur)
  }
})` },

  { id: 'pl_pluck_seq', role: 'lead', flavours: { deep: 0.7, atmos: 0.6, rave: 0.5 }, energy: [0.3, 1], code: `
fx({ rev: 0.3, delay: 0.4 })
loop('pluck', (i) => {
  const notes = modal(2, 2)
  const order = ring(0, 4, 2, 7, 4, 9, 2, 5)
  for (let k = 0; k < 16; k++) {
    if (!one_in(4)) synth('pluck_hard', notes[order.tick() % notes.length], { vel: k % 3 === 0 ? 1 : 0.6, cutoff: walk('c', 400, 1600, 0.1) })
    sleep(0.25)
  }
})` },

  { id: 'pl_fm_metal_hits', role: 'perc', flavours: { ae: 1, industrial: 0.8 }, energy: [0.3, 1], code: `
fx({ rev: 0.3, delay: 0.25, crush: 0.15 })
loop('metal', (i) => {
  const steps = vary('steps', [12, 16, 20], 16)
  const hits = spread(vary('h', [3, 4, 5], 8), steps)
  for (let k = 0; k < steps; k++) {
    if (hits[k]) synth(vary('v', ['fm_metal', 'anvil'], 8), KEY + choose([0, 6, 11, 13]), { amp: 0.5, pan: rrand(-0.8, 0.8) })
    sleep(0.25)
  }
})` },

  { id: 'pl_riser_drop', role: 'texture', flavours: { rave: 0.8, atmos: 0.5, industrial: 0.4 }, energy: [0.6, 1], code: `
fx({ rev: 0.4, delay: 0.2 })
loop('rise', (i) => {
  if (one_in(2)) {
    synth('riser', KEY, { attack: 14, dur: 1.5, amp: 0.4 })
    sleep(16)
    synth('sub_drop', ROOT - 12, { amp: 0.6 })
    pad(choose(['stutter', 'tapestop']), 1)
  } else sleep(16)
})` },

  // ───── the city ─────
  { id: 'pl_city_crowd', role: 'texture', flavours: { industrial: 1, dub: 0.3, fog: 0.3 }, energy: [0, 0.8], code: `
fx({ rev: 0.4, lpf: 5000 })
loop('crowd', (i) => {
  synth('crowd', KEY + choose([0, 5, 12]), { dur: 12, amp: 0.35, pan: rrand(-0.5, 0.5) })
  if (one_in(2)) s(vary('talk', ['speech', 'speechless', 'numbers'], 16), { n: rrand_i(0, 7), amp: 0.15, rate: rrand(0.85, 1.05), pan: rrand(-0.7, 0.7) })
  sleep(8)
})` },

  { id: 'pl_city_metro', role: 'texture', flavours: { industrial: 1, dark: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.45, delay: 0.2 })
loop('station', (i) => {
  synth('metro_chime', KEY + 19, { amp: 0.5 })
  sleep(0.75)
  synth('metro_chime', KEY + 15, { amp: 0.45 })
  sleep(1.25)
  synth('metro_doors', 60, { amp: 0.4 })
  sleep(2)
  synth('door_slam', 40, { amp: 0.5 })
  sleep(4)
  synth('metro_rumble', KEY - 24, { dur: 16, amp: 0.4 })
  sleep(8)
})` },

  { id: 'pl_city_street', role: 'texture', flavours: { industrial: 0.8, dub: 0.4, deep: 0.3 }, energy: [0, 0.7], code: `
fx({ rev: 0.35, lpf: 6000 })
loop('street', (i) => {
  synth('traffic', KEY - 24, { dur: 14, amp: 0.4 })
  sleep(4)
  if (one_in(3)) synth('alarm', KEY + 24, { dur: 3, amp: 0.25, pan: rrand(-0.8, 0.8) })
  if (one_in(2)) { for (let k = 0; k < 8; k++) { synth('footstep', 50, { amp: rrand(0.3, 0.5), pan: -0.6 + k * 0.15 }); sleep(0.5) } }
  else sleep(4)
  sleep(8)
})` },

  { id: 'pl_factory', role: 'perc', flavours: { industrial: 1, ae: 0.4, dark: 0.3 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.15 })
loop('factory', (i) => {
  const press = spread(vary('p', [2, 3], 8), 8)
  for (let k = 0; k < 8; k++) {
    if (press[k]) synth('anvil', KEY + choose([-12, 0]), { amp: 0.4, pan: rrand(-0.4, 0.4) })
    if (k === 4 && one_in(2)) synth('steam', 60, { dur: 1, amp: 0.3 })
    if (k === 6 && one_in(3)) synth('welder', 60, { dur: rrand(0.3, 1.2), amp: 0.25, pan: 0.5 })
    sleep(0.5)
  }
})` },

  { id: 'pl_dark_voices', role: 'texture', flavours: { dark: 1, ae: 0.3, industrial: 0.3 }, energy: [0, 0.7], code: `
fx({ rev: 0.6, delay: 0.3, wobble: 0.4 })
loop('choir', (i) => {
  synth(vary('v', ['voice_oo', 'voice_ah'], 8), harm(0, ''), { dur: 6, amp: 0.25, attack: 2, release: 3 })
  synth('hum', KEY - 24, { dur: 8, amp: 0.4 })
  if (one_in(3)) s('diphone', { n: rrand_i(0, 20), amp: 0.12, rate: rrand(0.5, 0.8), pan: rrand(-0.6, 0.6) })
  sleep(8)
})` },
);
