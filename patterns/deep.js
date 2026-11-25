// deep: deep ambient / downtempo in the spirit of late-90s ambient electronica
// (e.g. the "Los Angeles: Critical Mass" compilation): long pads and drones, soft
// downtempo grooves, gentle analog sequences and melodies. ~100 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'deep_downtempo', role: 'drums', flavours: { deep: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 7000, rev: 0.2 })
loop('kick', (i) => {
  s('808bd', { n: 5, amp: 0.85 })
  sleep(1.75)
  s('808bd', { n: 5, amp: 0.5 })
  sleep(2.25)
})
loop('snare', (i) => {
  sleep(1)
  s('sn', { n: 14, amp: 0.32 })
  sleep(2)
  s('sn', { n: 14, amp: 0.32 })
  sleep(1)
})
loop('hats', (i) => {
  const vel = ring(0.14, 0.07, 0.1, 0.07)
  for (let k = 0; k < 8; k++) {
    s('808', { n: 1, amp: vel.tick() })
    sleep(0.5)
  }
})` },

  { id: 'deep_soft_kit', role: 'drums', flavours: { deep: 0.9, atmos: 0.2 }, energy: [0.2, 0.9], code: `
fx({ lpf: 5000, rev: 0.25, crush: 0.15 })
loop('kit', (i) => {
  s('drumtraks', { n: 6, amp: 0.75 })
  sleep(1.5)
  s('drumtraks', { n: 6, amp: 0.4 })
  sleep(0.5)
  s('drumtraks', { n: 9, amp: 0.35 })
  sleep(2)
})
loop('cabasa', (i) => {
  sleep(0.5)
  s('drumtraks', { n: 0, amp: 0.08, pan: 0.3 })
  sleep(0.5)
})` },

  { id: 'deep_conga', role: 'perc', flavours: { deep: 0.8 }, energy: [0.3, 1], code: `
fx({ rev: 0.3, delay: 0.15, lpf: 5000 })
loop('conga', (i) => {
  const hits = spread(3, 8, 1)
  for (let k = 0; k < 8; k++) {
    if (hits[k]) s('future', { n: 15, amp: 0.2, pan: 0.35 })
    sleep(0.5)
  }
})` },

  { id: 'deep_click_seq', role: 'perc', flavours: { deep: 0.7, fog: 0.3 }, energy: [0.2, 1], code: `
fx({ delay: 0.3, rev: 0.3, lpf: 6000 })
loop('clicks', (i) => {
  const hits = spread(5, 16, i % 2)
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('click', { n: 1, amp: 0.1, pan: -0.4 })
    sleep(0.25)
  }
})` },

  { id: 'deep_air_pad', role: 'keys', flavours: { deep: 1, fog: 0.3 }, energy: [0, 1], code: `
fx({ rev: 0.6, lpf: 2600, wobble: 0.2 })
loop('pad', (i) => {
  synth('choir', harm(1, '9'), { dur: 12, attack: 3, release: 5, amp: 0.45 })
  sleep(16)
})` },

  { id: 'deep_drone', role: 'keys', flavours: { deep: 0.9, fog: 0.4 }, energy: [0, 0.7], code: `
fx({ rev: 0.5, lpf: 1400, wobble: 0.2 })
loop('drone', (i) => {
  synth('drone', [ROOT + 12, ROOT + 19], { dur: 12, attack: 4, release: 4, amp: 0.5 })
  sleep(16)
})` },

  { id: 'deep_pulse_seq', role: 'lead', flavours: { deep: 1, fog: 0.3 }, energy: [0.3, 1], code: `
fx({ delay: 0.35, rev: 0.4, lpf: 2400 })
loop('seq', (i) => {
  const notes = modal(1, 1)
  const order = ring(0, 4, 2, 4, 7, 4, 2, 4)
  for (let k = 0; k < 8; k++) {
    synth('pulse', notes[order.tick() % notes.length], { amp: 0.25, cutoff: 600 + 900 * ENERGY })
    sleep(0.5)
  }
})` },

  { id: 'deep_melody', role: 'lead', flavours: { deep: 1 }, energy: [0.2, 1], code: `
fx({ delay: 0.4, rev: 0.5 })
loop('melody', (i) => {
  for (const n of phrase('m', { beats: 4, density: vary('dens', [0.35, 0.5, 0.65], 16), octave: 2 })) {
    if (n.note) synth('epiano', n.note, { amp: 0.26 * n.vel, release: 1.5 })
    sleep(n.dur)
  }
})` },

  { id: 'deep_piano', role: 'lead', flavours: { deep: 0.9, space: 0.5 }, energy: [0, 0.9], code: `
fx({ rev: 0.5, delay: 0.2, lpf: 4500, wobble: 0.1 })
loop('piano', (i) => {
  for (const n of phrase('p', { beats: 8, density: vary('dens', [0.25, 0.45], 16), octave: 2, evolve: 3 })) {
    if (n.note) synth(vary('voice', ['piano', 'felt'], 32), n.note, { amp: 0.32 * n.vel })
    sleep(n.dur)
  }
})
loop('chords', (i) => {
  if (one_in(2)) synth('felt', harm(1, '7'), { amp: 0.12 })
  sleep(8)
})` },

  { id: 'deep_round_bass', role: 'bass', flavours: { deep: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 700 })
loop('bass', (i) => {
  synth('sub', ROOT, { dur: 1.2, amp: 0.5 })
  sleep(1.75)
  synth('sub', ROOT, { dur: 0.4, amp: 0.35 })
  sleep(1.25)
  synth('sub', ROOT + 7, { dur: 0.6, amp: 0.3 })
  sleep(1)
})` },

  { id: 'deep_sub_drone', role: 'bass', flavours: { deep: 0.8, fog: 0.4 }, energy: [0, 0.6], code: `
fx({ lpf: 800 })
loop('drone', (i) => {
  synth('sub', ROOT, { dur: 5, attack: 1, release: 1.5, amp: 0.42 })
  sleep(8)
})` },

  { id: 'deep_space', role: 'texture', flavours: { deep: 1 }, energy: [0, 1], code: `
fx({ rev: 0.65, lpf: 3500 })
loop('space', (i) => {
  if (i % 2 == 0) s('space', { n: 3, amp: 0.2, rate: 0.5, pan: -0.3 })
  sleep(8)
})` },

  { id: 'deep_birds_wind', role: 'texture', flavours: { deep: 0.8 }, energy: [0, 0.7], code: `
fx({ lpf: 3000, rev: 0.55 })
loop('air', (i) => {
  if (i % 2 == 0) s('wind', { n: 7, amp: 0.12, rate: 0.7, attack: 1, release: 2 })
  sleep(4)
  if (i % 3 == 1) s('birds', { n: 2, amp: 0.08, pan: 0.6 })
  sleep(4)
})` },
);
