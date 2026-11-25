// rave: excited early-90s energy. Breakbeats that keep mutating, hoovers, supersaw gates,
// rave stabs and pianos, distorted basses, rave voices and lasers. ~148 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'rave_break', role: 'drums', flavours: { rave: 1, atmos: 0.3 }, energy: [0.4, 1], code: `
fx({ lpf: 12000, crush: 0.1 })
loop('break', (i) => {
  const b = beat('br', { style: 'break', density: 0.4 + 0.5 * ENERGY })
  for (let k = 0; k < 16; k++) {
    const st = b[k]
    if (st.k) s('hardcore', { n: 4, amp: 0.9 * st.v })
    if (st.s) s('hardcore', { n: vary('sn', [10, 11], 8), amp: 0.6 * st.v })
    if (st.h) s('hardcore', { n: 0, amp: 0.18 * st.v, pan: 0.2 })
    if (st.p) s('hardcore', { n: 7, amp: 0.2 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'rave_amen', role: 'drums', flavours: { rave: 0.9, atmos: 0.5 }, energy: [0.5, 1], code: `
fx({ lpf: 10000, crush: 0.15 })
loop('amen', (i) => {
  const map = vary('map', [[0, 1, 2, 3], [0, 1, 0, 3], [2, 1, 2, 3], [0, 3, 2, 1]], 4)
  for (let k = 0; k < 16; k++) {
    const slice = map[Math.floor(k / 4)] * 4 + (k % 4) + 16 * (i % 2)
    if (!(k == 15 && one_in(3))) s('amencutup', { n: slice, amp: 0.6, rate: 1.09, cut: 0.25 })
    sleep(0.25)
  }
})` },

  { id: 'rave_hoover', role: 'lead', flavours: { rave: 1, industrial: 0.2 }, energy: [0.5, 1], code: `
fx({ rev: 0.2, delay: 0.2 })
loop('hoover', (i) => {
  const pat = vary('pat', [[0, 1.5, 3], [0, 2], [0, 0.75, 2.5]], 8)
  let t = 0
  for (const p of pat) {
    sleep(p - t)
    synth('hoover', ROOT + 12 + vary('int', [0, 0, 7, 12, -2], 4), { dur: 0.6, amp: 0.4 })
    t = p
  }
  sleep(4 - t)
})` },

  { id: 'rave_stabs', role: 'keys', flavours: { rave: 1 }, energy: [0.3, 1], code: `
fx({ delay: 0.3, rev: 0.2 })
loop('stabs', (i) => {
  const hits = spread(vary('h', [3, 5, 7], 8), 16, vary('r', [0, 2, 3], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth('rave_stab', harm(1, '7'), { amp: 0.35, cutoff: 1500 + 2500 * ENERGY })
    sleep(0.25)
  }
})` },

  { id: 'rave_gate', role: 'keys', flavours: { rave: 0.9, atmos: 0.3 }, energy: [0.5, 1], code: `
fx({ rev: 0.3, delay: 0.15 })
loop('gate', (i) => {
  const gate = vary('gate', [[1, 0, 1, 1, 0, 1, 1, 0], [1, 1, 0, 1, 1, 0, 1, 0], [1, 0, 1, 0, 1, 1, 1, 0]], 8)
  for (let k = 0; k < 8; k++) {
    if (gate[k]) synth('supersaw', harm(1, '7'), { dur: 0.15, amp: 0.3 })
    sleep(0.5)
  }
})` },

  { id: 'rave_piano', role: 'lead', flavours: { rave: 0.8, deep: 0.2 }, energy: [0.4, 1], code: `
fx({ rev: 0.3 })
loop('piano', (i) => {
  const rh = vary('rh', [[0.5, 1.5, 2.5, 3.5], [0, 1.5, 2.5], [0.5, 1, 2.5, 3]], 8)
  let t = 0
  for (const r of rh) {
    sleep(r - t)
    synth('piano', harm(2, '7'), { amp: 0.25 })
    t = r
  }
  sleep(4 - t)
})` },

  { id: 'rave_dist_bass', role: 'bass', flavours: { rave: 1, industrial: 0.4 }, energy: [0.4, 1], code: `
fx({ lpf: 3000 })
loop('bass', (i) => {
  for (let k = 0; k < 8; k++) {
    if (k % 2 == 1 || one_in(5)) synth('dist_bass', ROOT + (k == 7 && i % 2 ? 12 : 0), { dur: 0.15, amp: 0.45, cutoff: 400 + 900 * ENERGY })
    sleep(0.5)
  }
})` },

  { id: 'rave_808', role: 'bass', flavours: { rave: 0.8, dark: 0.3 }, energy: [0.3, 1], code: `
loop('sub', (i) => {
  const pat = vary('pat', [[0, 2.5], [0, 1.5, 2.5], [0, 3]], 8)
  let t = 0
  for (const p of pat) {
    sleep(p - t)
    synth('sub808', ROOT, { dur: 0.5, amp: 0.6 })
    t = p
  }
  sleep(4 - t)
})` },

  { id: 'rave_voices', role: 'texture', flavours: { rave: 1 }, energy: [0.3, 1], code: `
fx({ delay: 0.4, rev: 0.3, lpf: 7000 })
loop('voices', (i) => {
  sleep(4)
  if (one_in(2)) s(vary('src', ['rave', 'yeah'], 8), { n: vary('n', [0, 4, 5, 2, 12, 20], 4), amp: 0.3, rate: choose([1, 1, 0.5]) })
  sleep(4)
})` },

  { id: 'rave_lasers', role: 'perc', flavours: { rave: 0.9, ae: 0.3 }, energy: [0.4, 1], code: `
fx({ delay: 0.25, rev: 0.15 })
loop('lasers', (i) => {
  const hits = spread(vary('h', [2, 3, 5], 4), 16, vary('r', [3, 6, 9], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth('laser', ROOT + 36 + choose([0, 7, 12]), { amp: 0.25, pan: rrand(-0.6, 0.6) })
    sleep(0.25)
  }
})` },

  { id: 'rave_hats', role: 'perc', flavours: { rave: 0.9, atmos: 0.3 }, energy: [0.5, 1], code: `
fx({ lpf: 12000 })
loop('hats', (i) => {
  for (let k = 0; k < 8; k++) {
    if (k % 2 == 1) s('hardcore', { n: 6, amp: 0.16, cut: 0.4 })
    else if (one_in(2)) s('hardcore', { n: 9, amp: 0.1, pan: 0.4 })
    sleep(0.5)
  }
})` },
);
