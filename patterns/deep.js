// deep: deep ambient / downtempo in the spirit of late-90s ambient electronica
// (e.g. the "Los Angeles: Critical Mass" compilation): long pads and drones, soft
// downtempo grooves, gentle analog sequences and melodies. ~100 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'deep_downtempo', role: 'drums', flavours: { boc: 1 }, energy: [0.3, 1], code: `
params({ kick: '808bd', snare: 'sn' })
fx({ lpf: 7000, rev: 0.2 })
loop('kick', (i) => {
  s(P.kick, { n: 5, amp: 0.85 })
  sleep(1.75)
  s(P.kick, { n: 5, amp: 0.5 })
  sleep(2.25)
})
loop('snare', (i) => {
  sleep(1)
  s(P.snare, { n: 14, amp: 0.32 })
  sleep(2)
  s(P.snare, { n: 14, amp: 0.32 })
  sleep(1)
})
loop('hats', (i) => {
  const vel = ring(0.14, 0.07, 0.1, 0.07)
  for (let k = 0; k < 8; k++) {
    s('808', { n: 1, amp: vel.tick() })
    sleep(0.5)
  }
})` },

  { id: 'deep_soft_kit', role: 'drums', flavours: { boc: 1 }, energy: [0.2, 0.9], code: `
params({ kit: 'drumtraks' })
fx({ lpf: 5000, rev: 0.25, crush: 0.15 })
loop('kit', (i) => {
  s(P.kit, { n: 6, amp: 0.75 })
  sleep(1.5)
  s(P.kit, { n: 6, amp: 0.4 })
  sleep(0.5)
  s(P.kit, { n: 9, amp: 0.35 })
  sleep(2)
})
loop('cabasa', (i) => {
  sleep(0.5)
  s(P.kit, { n: 0, amp: 0.08, pan: 0.3 })
  sleep(0.5)
})` },

  { id: 'deep_conga', role: 'perc', flavours: { boc: 1 }, energy: [0.3, 1], code: `
params({ space: 'future' })
fx({ rev: 0.3, delay: 0.15, lpf: 5000 })
loop('conga', (i) => {
  const hits = spread(3, 8, 1)
  for (let k = 0; k < 8; k++) {
    if (hits[k]) s(P.space, { n: 15, amp: 0.2, pan: 0.35 })
    sleep(0.5)
  }
})` },

  { id: 'deep_click_seq', role: 'perc', flavours: { saw: 1 }, energy: [0.2, 1], code: `
params({ rim: 'click' })
fx({ delay: 0.3, rev: 0.3, lpf: 6000 })
loop('clicks', (i) => {
  const hits = spread(5, 16, i % 2)
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s(P.rim, { n: 1, amp: 0.1, pan: -0.4 })
    sleep(0.25)
  }
})` },

  { id: 'deep_air_pad', role: 'keys', flavours: { saw: 1 }, energy: [0, 1], code: `
params({ pad: 'choir' })
fx({ rev: 0.6, lpf: 2600, wobble: 0.2 })
loop('pad', (i) => {
  synth(P.pad, harm(1, '9'), { dur: 12, attack: 3, release: 5, amp: 0.45 })
  sleep(16)
})` },

  { id: 'deep_drone', role: 'keys', flavours: { saw: 1 }, energy: [0, 0.7], code: `
params({ pad_dark: 'drone' })
fx({ rev: 0.5, lpf: 1400, wobble: 0.2 })
loop('drone', (i) => {
  synth(P.pad_dark, [ROOT + 12, ROOT + 19], { dur: 12, attack: 4, release: 4, amp: 0.5 })
  sleep(16)
})` },

  { id: 'deep_pulse_seq', role: 'lead', flavours: { saw: 1 }, energy: [0.3, 1], code: `
params({ lead: 'pulse' })
fx({ delay: 0.35, rev: 0.4, lpf: 2400 })
loop('seq', (i) => {
  const notes = modal(1, 1)
  const order = ring(0, 4, 2, 4, 7, 4, 2, 4)
  for (let k = 0; k < 8; k++) {
    synth(P.lead, notes[order.tick() % notes.length], { amp: 0.25, cutoff: 600 + 900 * ENERGY })
    sleep(0.5)
  }
})` },

  { id: 'deep_melody', role: 'lead', flavours: { saw: 1 }, energy: [0.2, 1], code: `
params({ keys: 'epiano' })
fx({ delay: 0.4, rev: 0.5 })
loop('melody', (i) => {
  for (const n of phrase('m', { beats: 4, density: vary('dens', [0.35, 0.5, 0.65], 16), octave: 2 })) {
    if (n.note) synth(P.keys, n.note, { amp: 0.26 * n.vel, release: 1.5 })
    sleep(n.dur)
  }
})` },

  { id: 'deep_piano', role: 'lead', flavours: { saw: 1 }, energy: [0, 0.9], code: `
params({ keys: 'felt', odds: 2 })
fx({ rev: 0.5, delay: 0.2, lpf: 4500, wobble: 0.1 })
loop('piano', (i) => {
  for (const n of phrase('p', { beats: 8, density: vary('dens', [0.25, 0.45], 16), octave: 2, evolve: 3 })) {
    if (n.note) synth(vary('voice', ['piano', 'felt'], 32), n.note, { amp: 0.32 * n.vel })
    sleep(n.dur)
  }
})
loop('chords', (i) => {
  if (one_in(P.odds)) synth(P.keys, harm(1, '7'), { amp: 0.12 })
  sleep(8)
})` },

  { id: 'deep_round_bass', role: 'bass', flavours: { saw: 1 }, energy: [0.3, 1], code: `
params({ sub: 'sub' })
fx({ lpf: 700 })
loop('bass', (i) => {
  synth(P.sub, ROOT, { dur: 1.2, amp: 0.5 })
  sleep(1.75)
  synth(P.sub, ROOT, { dur: 0.4, amp: 0.35 })
  sleep(1.25)
  synth(P.sub, ROOT + 7, { dur: 0.6, amp: 0.3 })
  sleep(1)
})` },

  { id: 'deep_sub_drone', role: 'bass', flavours: { saw: 1 }, energy: [0, 0.6], code: `
params({ sub: 'sub' })
fx({ lpf: 800 })
loop('drone', (i) => {
  synth(P.sub, ROOT, { dur: 5, attack: 1, release: 1.5, amp: 0.42 })
  sleep(8)
})` },

  { id: 'deep_space', role: 'texture', flavours: { saw: 1 }, energy: [0, 1], code: `
params({ space: 'space' })
fx({ rev: 0.65, lpf: 3500 })
loop('space', (i) => {
  if (i % 2 == 0) s(P.space, { n: 3, amp: 0.2, rate: 0.5, pan: -0.3 })
  sleep(8)
})` },

  { id: 'deep_birds_wind', role: 'texture', flavours: { saw: 1 }, energy: [0, 0.7], code: `
params({ nature: 'wind', nature2: 'birds' })
fx({ lpf: 3000, rev: 0.55 })
loop('air', (i) => {
  if (i % 2 == 0) s(P.nature, { n: 7, amp: 0.12, rate: 0.7, attack: 1, release: 2 })
  sleep(4)
  if (i % 3 == 1) s(P.nature2, { n: 2, amp: 0.08, pan: 0.6 })
  sleep(4)
})` },
);
