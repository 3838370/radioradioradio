// dub: dub techno (Basic Channel lineage, the "Mastodon" selections): short chord stabs
// dissolving into long delays, slowly rolling filters, a steady but soft 4/4. ~122 BPM.
// vary() / walk() keep the stabs, grooves and filters moving so no bar repeats exactly.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'dub_kick', role: 'drums', flavours: { dub: 1 }, energy: [0.2, 1], code: `
fx({ lpf: 7000, rev: 0.15 })
loop('kick', (i) => {
  s('bd', { n: 4, amp: 0.95 })
  sleep(1)
})
loop('hats', (i) => {
  const open = vary('open', [0, 0, 1], 8)
  for (let k = 0; k < 4; k++) {
    sleep(0.5)
    s('hh27', { n: open && k == 3 ? 7 : 0, amp: walk('hamp', 0.06, 0.16, 0.1), pan: 0.2 })
    sleep(0.5)
  }
})` },

  { id: 'dub_minimal_kit', role: 'drums', flavours: { dub: 1, minimal: 0.7 }, energy: [0.4, 1], code: `
fx({ lpf: 6000, rev: 0.2, delay: 0.1 })
loop('kick', (i) => {
  s('bd', { n: 9, amp: 0.9 })
  sleep(1)
})
loop('rim', (i) => {
  const hits = spread(vary('hits', [3, 5, 7], 8), 16, vary('rot', [2, 6, 10], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('rs', { n: 0, amp: 0.14, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'dub_chord_stab', role: 'keys', flavours: { dub: 1, minimal: 0.7 }, energy: [0.2, 1], code: `
fx({ delay: 0.6, rev: 0.35 })
loop('stab', (i) => {
  fx({ lpf: walk('lpf', 500, 2600, 0.15) })
  const hits = spread(vary('hits', [2, 3, 3, 5], 4), 8, vary('rot', [1, 3, 5], 8))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) synth('stab', harm(1, vary('ext', ['7', '9'], 16)), { dur: 0.12, amp: 0.4, cutoff: 1400 })
    sleep(0.5)
  }
})` },

  { id: 'dub_chord_wash', role: 'keys', flavours: { dub: 1 }, energy: [0, 0.8], code: `
fx({ delay: 0.45, rev: 0.55, lpf: 1800, wobble: 0.2 })
loop('wash', (i) => {
  synth(vary('voice', ['choir', 'strings'], 32), harm(1, '9'), { dur: 6, attack: 1.5, release: 4, amp: 0.4 })
  sleep(8)
})` },

  { id: 'dub_sub', role: 'bass', flavours: { dub: 1 }, energy: [0.2, 1], code: `
fx({ lpf: 500 })
loop('sub', (i) => {
  const groove = vary('groove', [[0, 1.5, 2.5], [0, 2.5], [0, 0.75, 2], [0, 3]], 8)
  let t = 0
  for (const g of groove) {
    sleep(g - t)
    synth('sub', ROOT, { dur: 0.4, amp: 0.5 })
    t = g
  }
  sleep(4 - t)
})` },

  { id: 'dub_rim_echo', role: 'perc', flavours: { dub: 1 }, energy: [0.2, 1], code: `
fx({ delay: 0.55, lpf: 4000, rev: 0.2 })
loop('rim', (i) => {
  const hits = spread(vary('n', [1, 2, 3], 4), 8, vary('rot', [1, 3, 5, 6], 4))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) s('rs', { n: 0, amp: 0.2, pan: walk('pan', -0.6, 0.6, 0.2) })
    sleep(0.5)
  }
})` },

  { id: 'dub_shaker', role: 'perc', flavours: { dub: 1 }, energy: [0.4, 1], code: `
fx({ lpf: 6000, rev: 0.2 })
loop('shaker', (i) => {
  const dens = vary('dens', [2, 3, 4], 8)
  for (let k = 0; k < 16; k++) {
    if (k % 4 == 2 || one_in(dens)) s('hh27', { n: 0, amp: k % 4 == 2 ? 0.08 : 0.04, rate: 1.2, pan: 0.4 })
    sleep(0.25)
  }
})` },

  { id: 'dub_melodica', role: 'lead', flavours: { dub: 1 }, energy: [0.2, 1], code: `
fx({ delay: 0.5, rev: 0.4, lpf: 2400, wobble: 0.2 })
loop('melodica', (i) => {
  if (i % 2 == 1) {
    sleep(4)
    return
  }
  for (const n of phrase('m', { beats: 4, density: 0.3, octave: 1 })) {
    if (n.note) synth('mono', n.note, { dur: n.dur * 0.8, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'dub_piano', role: 'lead', flavours: { dub: 1, saw: 0.7 }, energy: [0, 0.8], code: `
fx({ delay: 0.45, rev: 0.45, lpf: 3000, wobble: 0.15 })
loop('piano', (i) => {
  for (const n of phrase('p', { beats: 8, density: 0.25, octave: 2, rest: 0.3 })) {
    if (n.note) synth('felt', n.note, { amp: 0.3 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'dub_vinyl', role: 'texture', flavours: { dub: 1 }, energy: [0, 1], code: `
fx({ lpf: 5000, rev: 0.3 })
loop('crackle', (i) => {
  for (let k = 0; k < 16; k++) {
    if (one_in(3)) s('click', { n: rrand_i(0, 3), amp: rrand(0.01, 0.04), rate: rrand(0.5, 2), pan: rrand(-1, 1) })
    sleep(0.25)
  }
})` },

  { id: 'dub_space_echo', role: 'texture', flavours: { dub: 1 }, energy: [0, 1], code: `
fx({ delay: 0.5, rev: 0.5, lpf: 3000 })
loop('echo', (i) => {
  sleep(6)
  if (one_in(3)) {
    s('space', { n: vary('n', [2, 5, 9], 8), amp: 0.15, rate: 0.5, reverse: one_in(2) })
    pad('dub', 6)
  }
  sleep(2)
})` },
);
