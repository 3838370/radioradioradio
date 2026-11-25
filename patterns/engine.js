// engine: patterns built on the generators (chords, bassline, collage, drone, motif). The
// code stays short; the generator holds an idea for a few bars, then varies it, so these
// never settle into a fixed loop. Aimed at the references: dub techno chords and basslines,
// Selected Ambient Works motifs and 808 bass, drifting space drones, FSOL-style collage.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'gen_dub_chords', role: 'keys', flavours: { dub: 1, minimal: 0.7 }, energy: [0.15, 1], code: `
fx({ delay: 0.55, rev: 0.3, lpf: 2600 })
loop('stab', (i) => {
  const voicing = vary('voicing', ['m7', 'dub', 'sus4', 'm7'], 16)
  for (const c of chords('c', { voicing, rhythm: 'stab', density: 0.6 })) {
    if (c.notes) synth('stab', c.notes, { dur: c.len, amp: 0.36 * c.vel, cutoff: walk('cut', 600, 2200, 0.12) })
    sleep(c.dur)
  }
})` },

  { id: 'gen_dub_bass', role: 'bass', flavours: { dub: 1 }, energy: [0.2, 1], code: `
fx({ lpf: 900, rev: 0.05 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('style', ['dub', 'dub', 'sub'], 32) })) {
    if (b.note) synth('sub', b.note, { dur: b.len, amp: 0.55 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'gen_saw_motif', role: 'lead', flavours: { saw: 1 }, energy: [0, 0.9], code: `
fx({ rev: 0.4, delay: 0.25, wobble: 0.15 })
loop('motif', (i) => {
  for (const n of motif('m', { beats: 4, density: 0.35, octave: 2 })) {
    if (n.note) synth('glass', n.note, { dur: n.dur * 1.5, amp: 0.28 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'gen_saw_808_bass', role: 'bass', flavours: { saw: 1, boc: 0.7 }, energy: [0.25, 1], code: `
fx({ lpf: 1400, crush: 0.05 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: '808' })) {
    if (b.note) synth('sub808', b.note, { dur: b.len, amp: 0.5 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'gen_space_drone', role: 'keys', flavours: { space: 1 }, energy: [0, 0.8], code: `
fx({ rev: 0.6, delay: 0.3, wobble: 0.2, lpf: 3000 })
loop('drone', (i) => {
  const d = drone('d', { voices: 4, octave: 1 })
  synth('haze', d.notes, { dur: 16, attack: 3, release: 6, amp: 0.2 })
  sleep(16)
})` },

  { id: 'gen_fsol_collage', role: 'texture', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ rev: 0.5, delay: 0.35, lpf: 5000 })
loop('collage', (i) => {
  for (const e of collage('c', { rate: walk('rate', 0.25, 0.8, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp, cut: 2.5 })
    sleep(e.dur)
  }
})` },

  { id: 'gen_dread_sub', role: 'bass', flavours: { dark: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 600, crush: 0.1, rev: 0.1 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('style', ['sub', 'pedal', 'sub'], 16) })) {
    if (b.note) synth('dread_sub', b.note, { dur: b.len, amp: 0.5 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'gen_acid_line', role: 'bass', flavours: { acid: 1 }, energy: [0.45, 1], code: `
fx({ lpf: 4000, res: 0.6, delay: 0.1 })
loop('acid', (i) => {
  for (const b of bassline('b', { style: 'acid' })) {
    if (b.note) synth('acid_303', b.note + 12, { dur: b.len * 0.9, amp: 0.38 * b.vel, cutoff: b.accent ? 2600 : walk('cut', 500, 1800, 0.15) })
    sleep(b.dur)
  }
})` },

  { id: 'gen_long_chords', role: 'keys', flavours: { saw: 1 }, energy: [0, 0.9], code: `
fx({ rev: 0.45, lpf: 2400, wobble: 0.1 })
loop('chords', (i) => {
  const voicing = vary('voicing', ['add9', 'm7', 'wide', 'sus2'], 16)
  for (const c of chords('c', { voicing, rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('strings', c.notes, { dur: c.len, attack: 1, release: 2, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'gen_industrial_quartal', role: 'keys', flavours: { ae: 1 }, energy: [0.2, 1], code: `
fx({ lpf: 1800, crush: 0.12, delay: 0.2 })
loop('push', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['quartal', 'fifths'], 16), rhythm: 'push', octave: 1, density: 0.7 })) {
    if (c.notes) synth('dark_pad', c.notes, { dur: Math.max(0.25, c.len), amp: 0.24 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'gen_walk_bass', role: 'bass', flavours: { boc: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 1600 })
loop('walk', (i) => {
  for (const b of bassline('b', { style: vary('style', ['walk', 'dub'], 16) })) {
    if (b.note) synth('fm_bass', b.note, { dur: b.len * 0.85, amp: 0.45 * b.vel })
    sleep(b.dur)
  }
})` },
);
