// fog: submerged ambient techno in the spirit of Gas (Wolfgang Voigt). A muffled,
// distant 4/4 kick under a haze of looping strings and horns that barely change.
// ~116 BPM. Everything low-passed, wobbly and drenched in reverb.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'fog_kick', role: 'drums', flavours: { dub: 1 }, energy: [0, 1], code: `
params({ kick: 'bd' })
fx({ lpf: 520, crush: 0.15, rev: 0.25, wobble: 0.1 })
loop('kick', (i) => {
  s(P.kick, { n: 2, amp: 1.1 })
  sleep(1)
})` },

  { id: 'fog_kick_hat', role: 'drums', flavours: { dub: 1 }, energy: [0.4, 1], code: `
params({ kick: 'bd', hat: 'hh27' })
fx({ lpf: 900, rev: 0.3, crush: 0.2 })
loop('kick', (i) => {
  s(P.kick, { n: 2, amp: 1.0 })
  sleep(1)
})
loop('hat', (i) => {
  sleep(0.5)
  s(P.hat, { n: 0, amp: 0.07, pan: 0.2 })
  sleep(0.5)
})` },

  { id: 'fog_strings', role: 'keys', flavours: { dub: 1 }, energy: [0, 1], code: `
params({ pad: 'strings' })
fx({ wobble: 0.5, rev: 0.6, lpf: 1300, crush: 0.1 })
loop('strings', (i) => {
  synth(P.pad, harm(1, '7'), { dur: 13, attack: 3, release: 4, amp: 0.45 })
  sleep(16)
})` },

  { id: 'fog_brass_swell', role: 'keys', flavours: { dub: 1 }, energy: [0, 0.8], code: `
params({ stab: 'brass' })
fx({ rev: 0.6, lpf: 900, wobble: 0.6 })
loop('swell', (i) => {
  synth(P.stab, harm(1, ''), { dur: 4, attack: 2.5, release: 3, amp: 0.3 })
  sleep(8)
})` },

  { id: 'fog_horn_loop', role: 'lead', flavours: { dub: 1 }, energy: [0.2, 1], code: `
params({ stab: 'brass' })
fx({ wobble: 0.4, rev: 0.55, delay: 0.2, lpf: 1100 })
loop('horns', (i) => {
  const line = ring(4, 3, 2, 3)
  synth(P.stab, degree(line.tick(), 1), { dur: 1.6, attack: 0.5, release: 1.5, amp: 0.32 })
  sleep(2)
})` },

  { id: 'fog_glimmer', role: 'lead', flavours: { dub: 1 }, energy: [0, 0.7], code: `
params({ bell: 'glass' })
fx({ rev: 0.65, delay: 0.4, lpf: 4000, wobble: 0.3 })
loop('glimmer', (i) => {
  sleep(6)
  if (i % 2 == 0) synth(P.bell, degree(ring(4, 6, 2).tick(), 2), { amp: 0.1 })
  sleep(2)
})` },

  { id: 'fog_sub_pulse', role: 'bass', flavours: { dub: 1 }, energy: [0.3, 1], code: `
params({ sub: 'sub' })
fx({ lpf: 300, wobble: 0.1 })
loop('sub', (i) => {
  sleep(0.5)
  synth(P.sub, ROOT, { dur: 0.3, amp: 0.38 })
  sleep(0.5)
})` },

  { id: 'fog_drone_bass', role: 'bass', flavours: { dub: 1 }, energy: [0, 0.6], code: `
params({ sub: 'sub' })
fx({ lpf: 450, wobble: 0.3 })
loop('drone', (i) => {
  synth(P.sub, ROOT, { dur: 13, attack: 2, release: 2, amp: 0.38 })
  sleep(16)
})` },

  { id: 'fog_muffled_rim', role: 'perc', flavours: { dub: 1 }, energy: [0.3, 1], code: `
params({ rim: 'click' })
fx({ lpf: 1800, rev: 0.45, crush: 0.25 })
loop('rim', (i) => {
  sleep(0.75)
  s(P.rim, { n: 0, amp: 0.12, rate: 0.7 })
  sleep(0.25)
})` },

  { id: 'fog_shaker', role: 'perc', flavours: { dub: 1 }, energy: [0.4, 1], code: `
params({ hat: 'hh27' })
fx({ lpf: 3000, rev: 0.35 })
loop('shaker', (i) => {
  const vel = ring(0.05, 0.03, 0.08, 0.03)
  for (let k = 0; k < 4; k++) {
    s(P.hat, { n: 0, amp: vel.tick(), rate: 0.8, pan: -0.25 })
    sleep(0.25)
  }
})` },

  { id: 'fog_grain_haze', role: 'texture', flavours: { dub: 1 }, energy: [0, 1], code: `
fx({ lpf: 1500, rev: 0.6, wobble: 0.5 })
loop('grain', (i) => {
  const starts = ring(0.1, 0.3, 0.2, 0.5)
  for (let k = 0; k < 8; k++) {
    s('pad', { n: 1, begin: starts.tick(), cut: 0.6, amp: 0.12, rate: 0.5, attack: 0.2, release: 0.3, pan: k / 4 - 1 })
    sleep(0.5)
  }
})` },

  { id: 'fog_wind', role: 'texture', flavours: { dub: 1 }, energy: [0, 1], code: `
params({ nature: 'wind' })
fx({ lpf: 2000, rev: 0.5, wobble: 0.2 })
loop('wind', (i) => {
  s(P.nature, { n: 4, amp: 0.12, rate: 0.5, attack: 2, release: 3 })
  sleep(16)
})` },
);
