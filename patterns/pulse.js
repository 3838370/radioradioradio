// pulse: the new beats (jungle, electro, footwork, garage, gabber, odd meters 7/8, 5/4,
// 11/8 and ae_odd), hard-hitting synths (acid, reese, wobble, FM, donk, brass, organ,
// screamer, risers, sub drops) and the synthesized city (crowds, voices, traffic, metro
// doors and chimes, alarms, footsteps, anvils, welders, steam, hum).
// Odd-meter beats are not 16 steps long: loops use b.length, so they drift against the
// 4/4 layers and line up again now and then (polymeter).
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'pl_jungle', role: 'drums', flavours: { drill: 1 }, energy: [0.5, 1], code: `
params({ odds: 6 })
fx({ lpf: 11000, crush: 0.1, rev: 0.1 })
loop('kit', (i) => {
  const b = beat('j', { style: 'jungle', density: 0.4 + 0.5 * ENERGY })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('amencutup', { n: 0, amp: 0.8 * st.v })
    if (st.s) s('amencutup', { n: vary('sn', [2, 4, 6], 8), amp: 0.6 * st.v, rate: one_in(P.odds) ? 1.3 : 1 })
    if (st.h) s('amencutup', { n: 1, amp: 0.2 * st.v, pan: 0.2 })
    if (st.p) s('amencutup', { n: rrand_i(8, 15), amp: 0.25 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'pl_electro', role: 'drums', flavours: { acid: 1 }, energy: [0.4, 1], code: `
params({ pluck: 'glitch_blip', kick: '808bd' })
fx({ lpf: 12000, rev: 0.12 })
loop('808', (i) => {
  const b = beat('e', { style: 'electro', density: 0.4 + 0.4 * ENERGY })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s(P.kick, { n: vary('bd', [1, 3, 5], 16), amp: 0.9 * st.v })
    if (st.s) synth('clap_synth', 60, { amp: 0.5 * st.v })
    if (st.h) s('808', { n: vary('hh', [1, 2], 8), amp: 0.2 * st.v, pan: 0.25 })
    if (st.p) synth(P.pluck, KEY + 24 + choose([0, 7, 12]), { vel: st.v, pan: rrand(-0.5, 0.5) })
    sleep(swing(0.25, k, vary('sw', [0, 0.06, 0.12], 16)))
  }
})` },

  { id: 'pl_seven', role: 'drums', odd: true, flavours: { ae: 1 }, energy: [0.3, 1], code: `
params({ lead_harsh: 'fm_metal' })
fx({ lpf: 9000, rev: 0.15 })
loop('seven', (i) => {
  const b = beat('7', { style: vary('meter', ['seven', 'five', 'eleven'], 32), density: 0.5 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth('kick_synth', KEY - 12, { amp: 0.8 * st.v })
    if (st.s) s('sequential', { n: 5, amp: 0.45 * st.v })
    if (st.h) synth('hat_synth', 60, { amp: 0.3 * st.v, pan: 0.2 })
    if (st.p) synth(P.lead_harsh, KEY + 12, { amp: 0.4 * st.v, pan: rrand(-0.5, 0.5) })
    sleep(0.25)
  }
})` },

  { id: 'pl_ae_odd', role: 'perc', odd: true, flavours: { ae: 1 }, energy: [0.2, 1], code: `
params({ bell: 'dx_marimba', pluck: 'glitch_blip', glitch: 'glitch' })
fx({ rev: 0.2, delay: 0.2, crush: 0.1 })
loop('odd', (i) => {
  const b = beat('o', { style: 'ae_odd', density: 0.6 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth(P.bell, KEY + choose([0, 3, 7]), { amp: 0.6 * st.v })
    if (st.s) synth(P.pluck, KEY + 36, { amp: 0.5 * st.v, pan: rrand(-0.7, 0.7) })
    if (st.h) s(P.glitch, { n: rrand_i(0, 7), amp: 0.12 * st.v, rate: rrand(0.8, 2) })
    sleep(vary('grain', [0.25, 0.1875, 1 / 6], 8))
  }
})` },

  // ───── hard synths ─────
  { id: 'pl_acid', role: 'bass', flavours: { acid: 1 }, energy: [0.4, 1], code: `
params({ odds: 6 })
fx({ rev: 0.1, delay: 0.25 })
loop('303', (i) => {
  const notes = ring(0, 0, 12, 0, 3, 0, 7, 10, 0, 12, 0, 5, 0, 3, 15, 0)
  const acc = spread(vary('acc', [3, 5, 7], 8), 16, vary('r', [0, 2, 5], 4))
  const slide = vary('slide', [0.05, 0.12, 0.2], 8)
  for (let k = 0; k < 16; k++) {
    if (!one_in(P.odds)) synth(vary('osc', ['acid_303', 'acid_sq'], 32), ROOT - 12 + notes[k], { vel: acc[k] ? 1.1 : 0.55, dur: slide, cutoff: walk('cut', 250, 900, 0.1) })
    sleep(0.25)
  }
})` },

  { id: 'pl_fm_bass', role: 'bass', flavours: { ae: 1 }, energy: [0.3, 1], code: `
params({ sub: 'fm_sub' })
fx({ rev: 0.1, delay: 0.15 })
loop('fm', (i) => {
  const hits = spread(vary('h', [5, 7, 9], 8), 16, vary('rot', [0, 3, 7], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth(P.sub, ROOT - 12 + choose([0, 0, 12, 7]), { amp: 0.5, pan: rrand(-0.2, 0.2) })
    sleep(0.25)
  }
})` },

  { id: 'pl_fm_metal_hits', role: 'perc', flavours: { ae: 1 }, energy: [0.3, 1], code: `
fx({ rev: 0.3, delay: 0.25, crush: 0.15 })
loop('metal', (i) => {
  const steps = vary('steps', [12, 16, 20], 16)
  const hits = spread(vary('h', [3, 4, 5], 8), steps)
  for (let k = 0; k < steps; k++) {
    if (hits[k]) synth(vary('v', ['fm_metal', 'anvil'], 8), KEY + choose([0, 6, 11, 13]), { amp: 0.5, pan: rrand(-0.8, 0.8) })
    sleep(0.25)
  }
})` },

  // ───── the city ─────

  { id: 'pl_city_metro', role: 'texture', flavours: { dark: 1 }, energy: [0, 1], code: `
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

  { id: 'pl_city_street', role: 'texture', flavours: { dark: 1, boc: 0.7 }, energy: [0, 0.7], code: `
params({ odds: 3, odds2: 2 })
fx({ rev: 0.35, lpf: 6000 })
loop('street', (i) => {
  synth('traffic', KEY - 24, { dur: 14, amp: 0.4 })
  sleep(4)
  if (one_in(P.odds)) synth('alarm', KEY + 24, { dur: 3, amp: 0.25, pan: rrand(-0.8, 0.8) })
  if (one_in(P.odds2)) { for (let k = 0; k < 8; k++) { synth('footstep', 50, { amp: rrand(0.3, 0.5), pan: -0.6 + k * 0.15 }); sleep(0.5) } }
  else sleep(4)
  sleep(8)
})` },

  { id: 'pl_factory', role: 'perc', flavours: { ae: 1 }, energy: [0.2, 1], code: `
params({ metal: 'anvil', machine: 'steam', metal2: 'welder', odds: 2, odds2: 3 })
fx({ rev: 0.3, delay: 0.15 })
loop('factory', (i) => {
  const press = spread(vary('p', [2, 3], 8), 8)
  for (let k = 0; k < 8; k++) {
    if (press[k]) synth(P.metal, KEY + choose([-12, 0]), { amp: 0.4, pan: rrand(-0.4, 0.4) })
    if (k === 4 && one_in(P.odds)) synth(P.machine, 60, { dur: 1, amp: 0.3 })
    if (k === 6 && one_in(P.odds2)) synth(P.metal2, 60, { dur: rrand(0.3, 1.2), amp: 0.25, pan: 0.5 })
    sleep(0.5)
  }
})` },

  { id: 'pl_dark_voices', role: 'texture', flavours: { dark: 1 }, energy: [0, 0.7], code: `
params({ machine: 'hum', voice: 'diphone', odds: 3 })
fx({ rev: 0.6, delay: 0.3, wobble: 0.4 })
loop('choir', (i) => {
  synth(vary('v', ['voice_oo', 'voice_ah'], 8), harm(0, ''), { dur: 6, amp: 0.25, attack: 2, release: 3 })
  synth(P.machine, KEY - 24, { dur: 8, amp: 0.4 })
  if (one_in(P.odds)) s(P.voice, { n: rrand_i(0, 20), amp: 0.12, rate: rrand(0.5, 0.8), pan: rrand(-0.6, 0.6) })
  sleep(8)
})` },
);
