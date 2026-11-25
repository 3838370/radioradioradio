// dark: slow and scary. Half-time weight, horror pads (wide detune + tremolo), noise
// drones, heartbeat kicks, metallic bells in phrygian / locrian, crows and screeches. ~76 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'dark_halftime', role: 'drums', flavours: { dark: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 6000, rev: 0.35, crush: 0.2 })
loop('beat', (i) => {
  const b = beat('ht', { style: 'halftime', density: 0.3 + 0.4 * ENERGY })
  for (let k = 0; k < 16; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 14, amp: 1.0 * st.v })
    if (st.s) s('sn', { n: 31, amp: 0.5 * st.v, rate: 0.8 })
    if (st.h) s('hh27', { n: 0, amp: 0.08 * st.v, rate: 0.7 })
    if (st.p) s('metal', { n: 7, amp: 0.08, rate: 0.5, pan: rrand(-0.7, 0.7) })
    sleep(0.25)
  }
})` },

  { id: 'dark_heartbeat', role: 'drums', flavours: { dark: 1 }, energy: [0, 0.6], code: `
fx({ lpf: 900, rev: 0.4 })
loop('heart', (i) => {
  synth('kick_synth', KEY - 12, { amp: 0.8 })
  sleep(0.35)
  synth('kick_synth', KEY - 12, { amp: 0.5 })
  sleep(vary('gap', [1.65, 3.65], 8))
})` },

  { id: 'dark_horror_pad', role: 'keys', flavours: { dark: 1 }, energy: [0, 1], code: `
fx({ rev: 0.6, wobble: 0.4 })
loop('horror', (i) => {
  synth('horror', harm(1, vary('ext', ['', '7'], 16)), { dur: 10, attack: 4, release: 6, amp: 0.45 })
  sleep(16)
})` },

  { id: 'dark_choir', role: 'keys', flavours: { dark: 1 }, energy: [0, 0.8], code: `
fx({ rev: 0.65, lpf: 1600 })
loop('choir', (i) => {
  synth('choir_dark', [ROOT + 12, ROOT + 13, ROOT + 19], { dur: 12, attack: 4, release: 6, amp: 0.4 })
  sleep(16)
})` },

  { id: 'dark_drone', role: 'bass', flavours: { dark: 1 }, energy: [0, 1], code: `
fx({ lpf: 500, wobble: 0.3 })
loop('drone', (i) => {
  synth('dark_pad', ROOT, { dur: 13, attack: 3, release: 4, amp: 0.5 })
  sleep(16)
})` },

  { id: 'dark_sub', role: 'bass', flavours: { dark: 1 }, energy: [0.3, 1], code: `
loop('sub', (i) => {
  synth('sub808', ROOT, { dur: 1.5, amp: 0.65 })
  sleep(vary('a', [2.5, 3], 8))
  if (one_in(2)) synth('sub808', ROOT + vary('b', [1, -2, 0], 8), { dur: 0.5, amp: 0.5 })
  sleep(4 - vary('a', [2.5, 3], 8))
})` },

  { id: 'dark_bells', role: 'lead', flavours: { dark: 1 }, energy: [0, 1], code: `
fx({ rev: 0.6, delay: 0.35, lpf: 5000 })
loop('bells', (i) => {
  for (const n of phrase('b', { beats: 8, density: 0.2, octave: 2, rest: 0.4 })) {
    if (n.note) synth('metal_lead', n.note, { amp: 0.2 * n.vel, release: 2 })
    sleep(n.dur)
  }
})` },

  { id: 'dark_screech', role: 'lead', flavours: { dark: 1 }, energy: [0.4, 1], code: `
fx({ rev: 0.5, delay: 0.3 })
loop('screech', (i) => {
  sleep(8)
  if (one_in(2)) synth('screech', ROOT + 36 + choose([0, 1, 6]), { dur: 3, attack: 1.5, release: 2, amp: 0.3 })
  sleep(8)
})` },

  { id: 'dark_noise', role: 'texture', flavours: { dark: 1 }, energy: [0, 1], code: `
fx({ rev: 0.4 })
loop('noise', (i) => {
  synth('noise_drone', ROOT + 24, { dur: 12, attack: 4, release: 4, amp: 0.4 })
  sleep(16)
})` },

  { id: 'dark_crows', role: 'texture', flavours: { dark: 1 }, energy: [0, 0.8], code: `
fx({ rev: 0.55, lpf: 4000 })
loop('crows', (i) => {
  sleep(6)
  if (one_in(3)) s('crow', { n: rrand_i(0, 3), amp: 0.15, rate: choose([0.8, 1]), pan: rrand(-0.8, 0.8) })
  else if (one_in(3)) s('breath', { n: 0, amp: 0.2, rate: 0.6 })
  sleep(2)
})` },

  { id: 'dark_clank', role: 'perc', flavours: { dark: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.5, delay: 0.3 })
loop('clank', (i) => {
  const hits = spread(vary('h', [2, 3], 8), 16, vary('r', [1, 5, 11], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth('clank', ROOT + 24 + choose([0, 1, 6]), { amp: 0.3, pan: rrand(-0.6, 0.6) })
    sleep(0.25)
  }
})` },
);
