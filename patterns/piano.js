// piano: pianos and keys across the moods. Melodies come from phrase() with its human feel
// (vel opens the filter, nudge is rubato, grace notes flick in), chords are strummed, and
// the darker moods get the broken and toy pianos.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'pno_saw_melody', role: 'lead', flavours: { space: 1, deep: 0.6, fog: 0.3 }, energy: [0, 0.9], code: `
fx({ rev: 0.45, delay: 0.25, lpf: 5000, wobble: 0.15 })
loop('melody', (i) => {
  for (const n of phrase('m', { beats: 8, density: vary('dens', [0.2, 0.35, 0.5], 16), octave: 2, rest: 0.25, evolve: 2 })) {
    if (n.grace) synth('piano', n.grace, { vel: n.vel * 0.5, nudge: n.nudge })
    if (n.note) synth('piano', n.note, { vel: n.vel, nudge: n.nudge + (n.grace ? 0.12 : 0), dur: n.last ? 3 : 1.6 })
    sleep(n.dur)
  }
})` },

  { id: 'pno_two_hands', role: 'keys', flavours: { deep: 1, space: 0.7, dub: 0.3 }, energy: [0.1, 0.9], code: `
fx({ rev: 0.4, delay: 0.15, lpf: 4200 })
loop('left', (i) => {
  const shape = vary('shape', ['block', 'broken', 'alberti'], 16)
  const c = harm(0, vary('ext', ['', '7', '9'], 8))
  if (shape === 'block') { synth('grand', c, { vel: rrand(0.5, 0.75), strum: 0.04 }); sleep(4) }
  else if (shape === 'broken') { for (const n of c) { synth('grand', n, { vel: rrand(0.45, 0.65) }); sleep(4 / c.length) } }
  else { for (const k of [0, 2, 1, 2, 0, 2, 1, 2]) { synth('grand', c[k % c.length], { vel: k === 0 ? 0.65 : 0.4 }); sleep(0.5) } }
})
loop('right', (i) => {
  for (const n of phrase('r', { beats: 4, density: vary('d', [0.3, 0.5, 0.7], 8), octave: 2 })) {
    if (n.note) synth('grand', n.note, { vel: n.vel * 0.85, nudge: n.nudge })
    sleep(n.dur)
  }
})` },

  { id: 'pno_rhodes_jazz', role: 'keys', flavours: { atmos: 1, deep: 0.6, dub: 0.4 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.2, wobble: 0.1 })
loop('rhodes', (i) => {
  const hits = spread(vary('h', [3, 5], 8), 8, vary('rot', [0, 2, 3], 4))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) synth('rhodes', harm(1, vary('ext', ['7', '9'], 4)), { vel: k % 2 ? 0.55 : 0.8, strum: 0.02, dur: vary('len', [0.3, 0.8, 1.5], 8) })
    sleep(0.5)
  }
})` },

  { id: 'pno_rhodes_lead', role: 'lead', flavours: { atmos: 0.8, dub: 0.5, deep: 0.5 }, energy: [0.3, 1], code: `
fx({ rev: 0.35, delay: 0.4 })
loop('lead', (i) => {
  for (const n of phrase('l', { beats: 4, density: vary('d', [0.4, 0.6], 16), octave: 2, rest: 0.2 })) {
    if (n.note) synth('rhodes', n.note, { vel: n.vel, nudge: n.nudge })
    sleep(n.dur)
  }
})` },

  { id: 'pno_felt_night', role: 'lead', flavours: { fog: 1, space: 0.6, dark: 0.3 }, energy: [0, 0.6], code: `
fx({ rev: 0.6, delay: 0.3, lpf: 2600, wobble: 0.3 })
loop('felt', (i) => {
  for (const n of phrase('f', { beats: 8, density: 0.15, octave: 1, rest: 0.4, evolve: 3 })) {
    if (n.note) synth('felt', [n.note, n.note + 12], { vel: n.vel * 0.8, nudge: n.nudge * 2, strum: 0.03 })
    sleep(n.dur)
  }
})` },

  { id: 'pno_broken_dread', role: 'lead', flavours: { dark: 1, industrial: 0.4, ae: 0.3 }, energy: [0, 0.8], code: `
fx({ rev: 0.55, delay: 0.35, lpf: 3000, wobble: 0.45 })
loop('dread', (i) => {
  for (const n of phrase('d', { beats: 8, density: vary('d', [0.1, 0.25], 16), octave: 1, rest: 0.45 })) {
    const iv = vary('cl', [0, 1, 6], 8) // alone, a minor second, a tritone
    if (n.note) synth('broken_piano', iv ? [n.note, n.note + iv] : n.note, { vel: n.vel, nudge: n.nudge * 3 })
    sleep(n.dur)
  }
  if (one_in(4)) synth('broken_piano', KEY - 24, { vel: 1.1, dur: 4 }) // a low bass string, struck hard
})` },

  { id: 'pno_toy_music_box', role: 'perc', flavours: { dark: 0.8, space: 0.5, ae: 0.4 }, energy: [0, 0.7], code: `
fx({ rev: 0.5, delay: 0.45, wobble: 0.35 })
loop('box', (i) => {
  const notes = modal(3, 1)
  const order = ring(0, 2, 4, 6, 4, 2, 1, 3)
  for (let k = 0; k < 8; k++) {
    if (!one_in(5)) synth('toy_piano', notes[order.tick() % notes.length], { vel: rrand(0.5, 0.9), nudge: rrand(0, 0.05) })
    sleep(vary('step', [0.5, 0.75], 16))
  }
})` },

  { id: 'pno_rave_house', role: 'keys', flavours: { rave: 1, atmos: 0.4 }, energy: [0.5, 1], code: `
fx({ rev: 0.2, delay: 0.15, lpf: 7000 })
loop('house', (i) => {
  const pat = vary('p', [[0, 3, 6, 10, 12], [0, 2, 6, 8, 12, 14], [2, 6, 10, 14]], 8)
  for (let k = 0; k < 16; k++) {
    if (pat.includes(k)) synth('grand', harm(1, vary('ext', ['7', '9'], 4)), { vel: k % 4 === 0 ? 1 : 0.8, dur: 0.15 })
    sleep(0.25)
  }
})` },

  { id: 'pno_ae_scatter', role: 'lead', flavours: { ae: 1, space: 0.3 }, energy: [0.2, 1], code: `
fx({ rev: 0.35, delay: 0.3 })
loop('scatter', (i) => {
  for (const n of phrase('s', { beats: vary('len', [5, 6, 7], 8), density: 0.75, octave: vary('o', [1, 2, 3], 4), rest: 0.3, evolve: 1 })) {
    if (n.note) synth(vary('v', ['piano', 'toy_piano', 'rhodes'], 8), n.note, { vel: rrand(0.3, 1), pan: rrand(-0.6, 0.6) })
    sleep(n.dur)
  }
})` },

  { id: 'pno_dub_chords', role: 'keys', flavours: { dub: 1, fog: 0.5 }, energy: [0.1, 0.9], code: `
fx({ rev: 0.35, delay: 0.55, lpf: 2400 })
loop('chords', (i) => {
  const hits = spread(vary('h', [2, 3], 8), 8, vary('rot', [1, 3, 5], 8))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) synth('felt', harm(1, '9'), { vel: 0.7, dur: 0.2, strum: -0.015 })
    sleep(0.5)
  }
})` },
);
