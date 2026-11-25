// space: drifting space ambient ("Aethereon: Music For Drifting In Space") with Selected
// Ambient Works-style melodies and pianos, and Future Sound of London-style collage, where
// voices, field recordings and effects are part of the music. ~86 BPM.
// Melodies come from phrase(): motifs that develop in an A A' B A'' form and keep evolving.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'space_piano', role: 'lead', flavours: { saw: 1 }, energy: [0, 1], code: `
fx({ rev: 0.55, delay: 0.25, lpf: 5000, wobble: 0.15 })
loop('right', (i) => {
  for (const n of phrase('right', { beats: 8, density: vary('dens', [0.3, 0.5, 0.7], 16), octave: 2 })) {
    if (n.note) synth('piano', n.note, { amp: 0.34 * n.vel })
    sleep(n.dur)
  }
})
loop('left', (i) => {
  synth('piano', harm(1, vary('ext', ['', '7', '9'], 8)), { amp: 0.14 })
  sleep(vary('lh', [4, 8], 8))
})` },

  { id: 'space_saw_lead', role: 'lead', flavours: { saw: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.5, delay: 0.35, wobble: 0.3 })
loop('lead', (i) => {
  for (const n of phrase('xtal', { beats: 4, density: 0.45, octave: 2, evolve: 3 })) {
    if (n.note) synth(vary('voice', ['bell', 'glass', 'mono'], 32), n.note, { amp: 0.2 * n.vel, release: 1.5 })
    sleep(n.dur)
  }
})` },

  { id: 'space_felt_arp', role: 'keys', flavours: { saw: 1 }, energy: [0, 1], code: `
fx({ rev: 0.5, delay: 0.3, lpf: 3500 })
loop('arp', (i) => {
  const ch = harm(vary('oct', [1, 2], 8), vary('ext', ['7', '9'], 8))
  const order = vary('order', [[0, 1, 2, 3], [0, 2, 1, 3], [3, 2, 1, 0], [0, 2, 3, 1]], 8)
  for (const k of order) {
    if (ch[k] != null) synth('felt', ch[k], { amp: 0.25 })
    sleep(1)
  }
})` },

  { id: 'space_pad', role: 'keys', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ rev: 0.6, wobble: 0.25 })
loop('pad', (i) => {
  fx({ lpf: walk('lpf', 900, 3200, 0.2) })
  synth(vary('voice', ['choir', 'haze', 'strings'], 32), harm(1, '9'), { dur: 12, attack: 3, release: 5, amp: 0.42 })
  sleep(16)
})` },

  { id: 'space_drone', role: 'bass', flavours: { space: 1 }, energy: [0, 0.7], code: `
fx({ lpf: 700, wobble: 0.2 })
loop('drone', (i) => {
  synth('sub', ROOT, { dur: 13, attack: 2, release: 3, amp: 0.4 })
  sleep(16)
})` },

  { id: 'space_round_bass', role: 'bass', flavours: { space: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 800 })
loop('bass', (i) => {
  const groove = vary('groove', [[0, 2.5], [0, 1.5, 3], [0, 3]], 8)
  let t = 0
  for (const g of groove) {
    sleep(g - t)
    synth('sub', g == 0 ? ROOT : ROOT + vary('up', [7, 12, 10], 8), { dur: 0.8, amp: g == 0 ? 0.5 : 0.3 })
    t = g
  }
  sleep(4 - t)
})` },

  { id: 'space_soft_beat', role: 'drums', flavours: { space: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 6000, rev: 0.2 })
loop('kick', (i) => {
  const kicks = vary('kicks', [[0, 2.5], [0, 1.5, 2.5], [0, 3], [0, 0.75, 2.5]], 8)
  let t = 0
  for (const k of kicks) {
    sleep(k - t)
    s('808bd', { n: 3, amp: 0.8 })
    t = k
  }
  sleep(4 - t)
})
loop('snare', (i) => {
  sleep(1)
  s('808sd', { n: vary('sn', [3, 6, 9], 16), amp: 0.3 })
  sleep(2)
  s('808sd', { n: 6, amp: 0.26 })
  sleep(1)
})
loop('hats', (i) => {
  const dens = vary('dens', [2, 4], 8)
  for (let k = 0; k < 8; k++) {
    if (k % 2 == 1 || one_in(dens)) s('808', { n: 1, amp: k % 2 == 1 ? 0.12 : 0.06 })
    sleep(0.5)
  }
})` },

  { id: 'space_bleeps', role: 'perc', flavours: { space: 1 }, energy: [0.1, 1], code: `
fx({ delay: 0.4, rev: 0.5, lpf: 7000 })
loop('bleeps', (i) => {
  const notes = modal(2, 1)
  const sparse = vary('sparse', [3, 4, 6], 8)
  for (let k = 0; k < 8; k++) {
    if (one_in(sparse)) synth('glass', notes[Math.round(walk('idx', 0, notes.length - 1, 0.25))], { amp: 0.1, pan: rrand(-0.7, 0.7) })
    sleep(0.5)
  }
})` },

  { id: 'space_tok', role: 'perc', flavours: { space: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.35, delay: 0.3, lpf: 5000 })
loop('tok', (i) => {
  const hits = spread(vary('h', [3, 5], 8), 16, vary('r', [0, 3, 7], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('tok', { n: k % 4, amp: 0.16, rate: walk('rate', 0.7, 1.3, 0.1), pan: -0.4 })
    sleep(0.25)
  }
})` },

  { id: 'space_collage', role: 'texture', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ rev: 0.55, delay: 0.35, lpf: 4500, wobble: 0.3 })
loop('collage', (i) => {
  const src = vary('src', ['speech', 'space', 'birds', 'mouth', 'outdoor'], 4)
  for (let k = 0; k < 4; k++) {
    if (one_in(2)) s(src, { n: rrand_i(0, 5), begin: rrand(0, 0.7), cut: choose([0.5, 1, 2]), rate: choose([0.5, 0.75, 1, 1.5]), amp: 0.12, reverse: one_in(3), pan: rrand(-0.8, 0.8), attack: 0.05, release: 0.2 })
    sleep(1)
  }
})` },

  { id: 'space_air', role: 'texture', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ lpf: 2500, rev: 0.6 })
loop('air', (i) => {
  s('wind', { n: vary('n', [1, 3, 6, 8], 16), amp: 0.14, rate: walk('rate', 0.4, 0.8, 0.2), attack: 2, release: 3 })
  sleep(16)
})` },

  { id: 'space_pulse_arp', role: 'lead', flavours: { space: 1 }, energy: [0.3, 1], code: `
fx({ delay: 0.4, rev: 0.4 })
loop('seq', (i) => {
  const notes = harm(vary('oct', [1, 2], 16), '9')
  const step = vary('step', [0.25, 0.5], 8)
  for (let k = 0; k < 4 / step; k++) {
    synth('pulse', notes[k % notes.length], { amp: 0.2, cutoff: walk('cut', 400, 2000, 0.1) })
    sleep(step)
  }
})` },
);
