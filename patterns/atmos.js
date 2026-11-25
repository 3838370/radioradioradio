// atmos: atmospheric / intelligent drum & bass (mid-90s, e.g. "Hidden Agenda - Boxed 96"):
// rolling amen breaks, two-step kicks and snares, deep reese and sub bass, jazzy Rhodes
// minor-9th chords, string pads and flute-like lines. ~170 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'atmos_amen_roll', role: 'drums', flavours: { drill: 1 }, energy: [0.4, 1], code: `
fx({ lpf: 9000, rev: 0.12, crush: 0.1 })
loop('amen', (i) => {
  const fill = ring(8, 9, 10, 11)
  for (let k = 0; k < 16; k++) {
    let slice = k + 16 * (i % 2)
    if (k >= 12 && i % 4 == 3) slice = fill.tick()
    s('amencutup', { n: slice, amp: 0.55, rate: 1.25, cut: 0.25 })
    sleep(0.25)
  }
})` },

  { id: 'atmos_halftime_break', role: 'drums', flavours: { drill: 1 }, energy: [0.2, 0.7], code: `
fx({ lpf: 6000, rev: 0.25, crush: 0.2 })
loop('break', (i) => {
  for (let k = 0; k < 8; k++) {
    s('amencutup', { n: k * 2 + 16 * (i % 2), amp: 0.5, rate: 1.25, cut: 0.5 })
    sleep(0.5)
  }
})` },

  { id: 'atmos_ride_hats', role: 'perc', flavours: { minimal: 1 }, energy: [0.4, 1], code: `
fx({ lpf: 11000, rev: 0.15 })
loop('hats', (i) => {
  const vel = ring(0.12, 0.05, 0.08, 0.05)
  for (let k = 0; k < 16; k++) {
    s('hh27', { n: 0, amp: vel.tick(), pan: 0.25, cut: 0.1 })
    sleep(0.25)
  }
})
loop('ride', (i) => {
  s('odx', { n: 4, amp: 0.1, pan: -0.3 })
  sleep(1)
})` },

  { id: 'atmos_shaker', role: 'perc', flavours: { minimal: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 8000, delay: 0.1 })
loop('shaker', (i) => {
  const vel = ring(0.09, 0.04, 0.06, 0.04)
  for (let k = 0; k < 8; k++) {
    s('odx', { n: 2, amp: vel.tick(), pan: 0.4 })
    sleep(0.5)
  }
})` },

  { id: 'atmos_sub_line', role: 'bass', flavours: { drill: 1 }, energy: [0.2, 1], code: `
fx({ lpf: 600 })
loop('sub', (i) => {
  synth('sub', ROOT, { dur: 1.2, amp: 0.5 })
  sleep(1.5)
  synth('sub', ROOT, { dur: 0.6, amp: 0.4 })
  sleep(1)
  synth('sub', ROOT + 12, { dur: 0.3, amp: 0.25 })
  sleep(1.5)
})` },

  { id: 'atmos_rhodes', role: 'keys', flavours: { boc: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.4, delay: 0.25, lpf: 3500, wobble: 0.15 })
loop('rhodes', (i) => {
  synth('epiano', harm(1, '9'), { dur: 2, amp: 0.28 })
  sleep(2.75)
  synth('epiano', harm(1, '7'), { dur: 0.8, amp: 0.18 })
  sleep(1.25)
})` },

  { id: 'atmos_string_pad', role: 'keys', flavours: { saw: 1 }, energy: [0, 1], code: `
fx({ rev: 0.55, lpf: 2200, wobble: 0.15 })
loop('strings', (i) => {
  synth('strings', harm(1, '9'), { dur: 13, attack: 3, release: 4, amp: 0.45 })
  sleep(16)
})` },

  { id: 'atmos_flute', role: 'lead', flavours: { boc: 1 }, energy: [0.3, 1], code: `
fx({ rev: 0.5, delay: 0.35, lpf: 3200 })
loop('flute', (i) => {
  for (const n of phrase('f', { beats: 8, density: 0.15, octave: 2, rest: 0.35 })) {
    if (n.note) synth('mono', n.note, { dur: n.dur * 0.85, attack: 0.3, release: 1.5, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'atmos_piano', role: 'keys', flavours: { saw: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.45, delay: 0.25, lpf: 5000 })
loop('piano', (i) => {
  const voicing = harm(1, vary('ext', ['7', '9'], 8))
  const rhythm = vary('rh', [[0, 1.5, 3], [0, 2.75], [0.5, 2, 3.5], [0, 2.5]], 8)
  let t = 0
  for (const r of rhythm) {
    sleep(r - t)
    synth('piano', r == 0 ? voicing : voicing.slice(1), { amp: r == 0 ? 0.2 : 0.13 })
    t = r
  }
  sleep(4 - t)
})` },

  { id: 'atmos_bell_arp', role: 'lead', flavours: { saw: 1 }, energy: [0.4, 1], code: `
fx({ rev: 0.45, delay: 0.3, lpf: 6000 })
loop('arp', (i) => {
  const notes = ring(...harm(2, '9'))
  for (let k = 0; k < 8; k++) {
    if (k % 3 != 2) synth('glass', notes.tick(), { amp: 0.11, pan: Math.sin(k) * 0.5 })
    sleep(0.5)
  }
})` },

  { id: 'atmos_space_sweep', role: 'texture', flavours: { space: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.45 })
loop('sweep', (i) => {
  fx({ lpf: 500 })
  s('wind', { n: 2, amp: 0.18, rate: 0.8, attack: 2, release: 3 })
  for (let k = 1; k <= 8; k++) {
    sleep(2)
    fx({ lpf: 500 + k * 500 })
  }
})` },

  { id: 'atmos_voice_air', role: 'texture', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ lpf: 3000, rev: 0.65, delay: 0.3, wobble: 0.3 })
loop('voice', (i) => {
  sleep(12)
  if (i % 2 == 1) s('mouth', { n: 5, amp: 0.12, rate: 0.8, pan: -0.4 })
  sleep(4)
})` },
);
