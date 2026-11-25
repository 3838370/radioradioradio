// ae: in the spirit of Autechre's AE_LIVE sets. Rhythms that keep re-drawing themselves,
// loops of 3, 5, 6 and 7 beats running against each other (polymeter), harsh FM and
// metallic synths, glitching voices and breaks. ~112 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  { id: 'ae_poly_kit', role: 'drums', flavours: { ae: 1 }, energy: [0.3, 1], code: `
params({ odds: 4 })
fx({ lpf: 10000, crush: 0.2 })
loop('kick', (i) => {
  const b = beat('k', { style: 'ae', density: 0.5 })
  for (let k = 0; k < 10; k++) {
    if (b[k].k) synth('kick_synth', KEY - 12, { amp: 0.85 * b[k].v })
    sleep(0.5)
  }
})
loop('snare', (i) => {
  const d = vary('d', [2, 3, 4], 4)
  for (let k = 0; k < 7; k++) {
    if (k == 2 || one_in(d)) synth('snare_synth', 60, { amp: 0.6 })
    sleep(1)
  }
})
loop('hats', (i) => {
  const step = vary('step', [0.25, 1 / 3, 0.2], 4)
  for (let k = 0; k < Math.round(3 / step); k++) {
    if (!one_in(P.odds)) synth('hat_synth', 60, { amp: rrand(0.15, 0.35) })
    sleep(step)
  }
})` },

  { id: 'ae_broken_break', role: 'drums', flavours: { drill: 1, ae: 0.7 }, energy: [0.4, 1], code: `
params({ odds: 6 })
fx({ lpf: 9000, crush: 0.3, delay: 0.1 })
loop('break', (i) => {
  const order = vary('order', [[0, 6, 2, 11, 4, 9, 13, 7], [3, 3, 8, 1, 12, 12, 5, 14], [0, 1, 0, 1, 10, 4, 15, 2]], 2)
  for (let k = 0; k < 16; k++) {
    const st = one_in(P.odds)
    const n = order[k % 8] + 16 * (i % 2)
    if (st) {
      for (let r = 0; r < 3; r++) {
        s('amencutup', { n, amp: 0.4, rate: 1.2 + r * 0.2, cut: 1 / 12 })
        sleep(1 / 12)
      }
    } else {
      s('amencutup', { n, amp: 0.55, rate: 1.21, cut: 0.25 })
      sleep(0.25)
    }
  }
})` },

  { id: 'ae_glitch_hats', role: 'perc', flavours: { ae: 1 }, energy: [0.3, 1], code: `
fx({ delay: 0.2, rev: 0.1 })
loop('hats', (i) => {
  const step = vary('step', [0.25, 1 / 3, 0.2, 0.125], 2)
  for (let k = 0; k < Math.round(4 / step); k++) {
    if (one_in(vary('d', [2, 3], 4))) synth('hat_synth', 60, { amp: rrand(0.1, 0.3), pan: Math.sin(k + i) * 0.7 })
    sleep(step)
  }
})` },

  { id: 'ae_clank_grid', role: 'perc', flavours: { ae: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.25 })
loop('clank', (i) => {
  const hits = spread(vary('h', [5, 7], 4), 12, vary('r', [0, 1, 4, 7], 2))
  for (let k = 0; k < 12; k++) {
    if (hits[k]) synth(vary('v', ['clank', 'zap', 'clank'], 4), ROOT + 24 + choose([0, 1, 6, 7]), { amp: 0.3, pan: rrand(-0.8, 0.8) })
    sleep(0.25)
  }
})` },

  { id: 'ae_fm_bass', role: 'bass', flavours: { ae: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 2500 })
loop('bass', (i) => {
  const hits = spread(vary('h', [5, 7], 8), 16, vary('r', [0, 3, 9], 4))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) synth(vary('v', ['fm_bass', 'fm_bass'], 8), ROOT + choose([0, 0, 1, 12]), { dur: 0.1, amp: 0.45 })
    sleep(0.25)
  }
})` },

  { id: 'ae_metal_lead', role: 'lead', flavours: { ae: 1 }, energy: [0.2, 1], code: `
fx({ delay: 0.35, rev: 0.3 })
loop('lead', (i) => {
  for (const n of phrase('m', { beats: 6, density: 0.5, octave: 2, evolve: 1 })) {
    if (n.note) synth(vary('v', ['metal_lead', 'screech', 'chip'], 8), n.note, { dur: n.dur * 0.6, amp: 0.25 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'ae_chords', role: 'keys', flavours: { ae: 1 }, energy: [0.2, 1], code: `
fx({ rev: 0.4, delay: 0.3, lpf: 4000 })
loop('chords', (i) => {
  const pat = vary('pat', [[0, 1.5, 4], [0, 2.75], [0.5, 3, 4.5]], 4)
  let t = 0
  for (const p of pat) {
    sleep(p - t)
    synth(vary('v', ['sync_lead', 'fm_glass', 'metal_lead'], 8), harm(1, vary('e', ['', '7'], 4)), { dur: 0.3, amp: 0.25 })
    t = p
  }
  sleep(6 - t)
})` },

  { id: 'ae_drone', role: 'keys', flavours: { ae: 1 }, energy: [0, 0.8], code: `
params({ pad_dark: 'dark_pad' })
fx({ rev: 0.5, wobble: 0.3 })
loop('drone', (i) => {
  synth(P.pad_dark, [ROOT + 12, ROOT + 18], { dur: 12, attack: 3, release: 4, amp: 0.4 })
  sleep(16)
})` },

  { id: 'ae_noise', role: 'texture', flavours: { ae: 1 }, energy: [0.3, 1], code: `
fx({ rev: 0.3, delay: 0.2 })
loop('bursts', (i) => {
  const hits = spread(vary('h', [2, 3], 4), 7, vary('r', [0, 2, 4], 4))
  for (let k = 0; k < 7; k++) {
    if (hits[k]) synth(vary('v', ['grind', 'noise_drone'], 4), ROOT + 24, { dur: choose([0.1, 0.3, 0.8]), attack: 0.01, release: 0.2, amp: 0.3 })
    sleep(1)
  }
})` },

  { id: 'ae_voice_glitch', role: 'texture', flavours: { ae: 1 }, energy: [0.2, 1], code: `
params({ odds: 3 })
fx({ delay: 0.3, rev: 0.25, crush: 0.3 })
loop('voice', (i) => {
  const src = vary('src', ['diphone', 'speechless', 'numbers'], 4)
  for (let k = 0; k < 10; k++) {
    if (one_in(P.odds)) s(src, { n: rrand_i(0, 9), begin: rrand(0, 0.6), cut: choose([0.1, 0.2]), amp: 0.2, rate: choose([0.7, 1, 1.4]), pan: rrand(-0.8, 0.8) })
    sleep(0.5)
  }
})` },
);
