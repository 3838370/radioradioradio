// industrial: machines and the city. Driven kicks, metal and cans, grinding and growling
// basses, sync leads, sirens, arcade glitches, people's voices and a synthesized metro
// (rumble, rail clacks, brake squeal). ~128 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'ind_machine_kick', role: 'drums', flavours: { industrial: 1, dub: 0.2 }, energy: [0.3, 1], code: `
fx({ lpf: 10000, crush: 0.08, rev: 0.12 })
loop('kit', (i) => {
  const b = beat('m', { style: 'four', density: 0.3 + 0.5 * ENERGY })
  for (let k = 0; k < 16; k++) {
    const st = b[k]
    if (st.k) synth('kick_synth', KEY - 12, { amp: 0.9 * st.v })
    if (st.s) s('sequential', { n: vary('sn', [0, 5], 16), amp: 0.45 * st.v })
    if (st.h) synth('hat_synth', 60, { amp: 0.35 * st.v, pan: 0.2 })
    if (st.p) s('metal', { n: vary('m', [2, 5], 8), amp: 0.07, rate: 1.5, pan: rrand(-0.5, 0.5) })
    sleep(0.25)
  }
})` },

  { id: 'ind_hammer', role: 'drums', flavours: { industrial: 0.9, ae: 0.3 }, energy: [0.4, 1], code: `
fx({ lpf: 8000, rev: 0.15, crush: 0.3 })
loop('kit', (i) => {
  const b = beat('h', { style: 'broken', density: 0.5 })
  for (let k = 0; k < 16; k++) {
    const st = b[k]
    if (st.k) s('sequential', { n: 3, amp: 0.9 * st.v })
    if (st.s) s('sequential', { n: 5, amp: 0.55 * st.v })
    if (st.h) s('sequential', { n: 2, amp: 0.15 * st.v })
    if (st.p) s('metal', { n: rrand_i(0, 9), amp: 0.12, rate: rrand(0.8, 1.4) })
    sleep(swing(0.25, k, 0.08))
  }
})` },

  { id: 'ind_metal_perc', role: 'perc', flavours: { industrial: 1, dark: 0.3 }, energy: [0.3, 1], code: `
fx({ rev: 0.25, delay: 0.15, lpf: 7000 })
loop('metal', (i) => {
  const hits = spread(vary('h', [5, 7, 9], 8), 16, vary('r', [0, 3, 5], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s(vary('src', ['metal', 'can', 'industrial'], 8), { n: rrand_i(0, 9), amp: 0.14, rate: walk('rate', 0.6, 1.6, 0.15), pan: rrand(-0.7, 0.7) })
    sleep(0.25)
  }
})` },

  { id: 'ind_arcade', role: 'perc', flavours: { industrial: 0.8, ae: 0.4, rave: 0.2 }, energy: [0.3, 1], code: `
fx({ delay: 0.3, lpf: 6000, crush: 0.3 })
loop('arcade', (i) => {
  sleep(2)
  if (one_in(2)) s(vary('src', ['invaders', 'tacscan', 'subroc3d'], 8), { n: rrand_i(0, 10), amp: 0.14, rate: choose([0.5, 1, 1.5]), pan: rrand(-0.8, 0.8) })
  sleep(2)
})` },

  { id: 'ind_grind_bass', role: 'bass', flavours: { industrial: 1, dark: 0.3 }, energy: [0.4, 1], code: `
loop('grind', (i) => {
  const gate = spread(vary('g', [5, 7, 9], 8), 16, vary('r', [0, 2], 8))
  for (let k = 0; k < 16; k++) {
    if (gate[k]) synth(vary('v', ['growl', 'dist_bass'], 16), ROOT, { dur: 0.12, amp: 0.4, cutoff: 300 + 1200 * ENERGY })
    sleep(0.25)
  }
})` },

  { id: 'ind_reese', role: 'bass', flavours: { industrial: 0.7, atmos: 0.5, dark: 0.3 }, energy: [0.3, 1], code: `
fx({ lpf: 1200 })
loop('reese', (i) => {
  synth('reese_heavy', ROOT + vary('n', [0, 0, 1, -2], 8), { dur: 3.5, amp: 0.5 })
  sleep(4)
})` },

  { id: 'ind_sync_lead', role: 'lead', flavours: { industrial: 0.9, ae: 0.4 }, energy: [0.4, 1], code: `
fx({ delay: 0.3, rev: 0.25, crush: 0.15 })
loop('lead', (i) => {
  for (const n of phrase('l', { beats: 4, density: 0.55, octave: 2 })) {
    if (n.note) synth('sync_lead', n.note, { dur: n.dur * 0.7, amp: 0.3 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'ind_siren', role: 'lead', flavours: { industrial: 0.7, dark: 0.4 }, energy: [0.3, 1], code: `
fx({ rev: 0.5, delay: 0.3, lpf: 4000 })
loop('siren', (i) => {
  sleep(12)
  if (one_in(3)) synth('siren', KEY + 36, { dur: 3, attack: 0.5, release: 1.5, amp: 0.25 })
  sleep(4)
})` },

  { id: 'ind_machine', role: 'keys', flavours: { industrial: 1 }, energy: [0, 1], code: `
fx({ rev: 0.3, lpf: 3000 })
loop('machine', (i) => {
  synth('machine', [ROOT + 12, ROOT + 19], { dur: 7, attack: 0.5, release: 1, amp: 0.4 })
  if (one_in(3)) s('feelfx', { n: 5, amp: 0.2, rate: 0.8 })
  sleep(8)
})` },

  { id: 'ind_metro', role: 'texture', flavours: { industrial: 1, dark: 0.4, dub: 0.2 }, energy: [0, 1], code: `
fx({ rev: 0.35 })
loop('rumble', (i) => {
  synth('metro_rumble', ROOT, { dur: 12, attack: 3, release: 4, amp: 0.6 })
  sleep(16)
})
loop('rails', (i) => {
  for (let k = 0; k < 4; k++) {
    synth('rail', 50, { amp: 0.25 })
    sleep(0.25)
    synth('rail', 52, { amp: 0.18 })
    sleep(0.75)
  }
})
loop('brakes', (i) => {
  sleep(14)
  if (one_in(3)) synth('metro_brake', KEY + 48 + choose([0, 1, 2]), { dur: 1.5, amp: 0.4 })
  sleep(2)
})` },

  { id: 'ind_people', role: 'texture', flavours: { industrial: 0.9, rave: 0.3, ae: 0.3 }, energy: [0, 1], code: `
fx({ rev: 0.4, delay: 0.25, lpf: 5000, crush: 0.2 })
loop('people', (i) => {
  const src = vary('src', ['speech', 'kurt', 'numbers', 'yeah', 'diphone'], 4)
  for (let k = 0; k < 4; k++) {
    if (one_in(2)) s(src, { n: rrand_i(0, 6), amp: 0.16, rate: choose([0.9, 1, 1.1]), cut: choose([0.5, 1, 2]), pan: rrand(-0.7, 0.7) })
    sleep(1)
  }
})` },
);
