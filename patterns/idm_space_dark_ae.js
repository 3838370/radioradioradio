// idm_space_dark_ae: more melodies and parts for space (Aethereon drift), dark (slow
// tension) and ae (Autechre AE_LIVE: 'probability' lines that leave the mode, slightly
// detuned and ratcheting, over the shifting 'ae_live' beat).
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── space ─────
  { id: 'space_choir_drift', role: 'lead', flavours: { space: 1, saw: 0.5 }, energy: [0, 0.9], code: `
fx({ rev: 0.6, delay: 0.3 })
loop('choir', (i) => {
  for (const n of melody('d', { style: 'drift', octave: 2 })) {
    if (n.note) synth('space_choir', n.note, { dur: n.len, amp: 0.2 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'space_glass_drift', role: 'lead', flavours: { space: 1, boc: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.55, delay: 0.4 })
loop('glass', (i) => {
  for (const n of melody('d', { style: 'drift', octave: 3 })) {
    if (n.note) synth('fm_glass', n.note, { amp: 0.16 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'space_shimmer_ostinato', role: 'lead', flavours: { space: 1, saw: 0.6 }, energy: [0, 0.9], code: `
fx({ rev: 0.6, delay: 0.35 })
loop('shimmer', (i) => {
  for (const n of melody('o', { style: 'ostinato', octave: 3 })) {
    if (n.note && !one_in(3)) synth('dx_bell', n.note, { amp: 0.12 * n.vel, pan: rrand(-0.6, 0.6) })
    sleep(n.dur)
  }
})` },

  { id: 'space_drone_low', role: 'bass', flavours: { space: 1, dark: 0.5 }, energy: [0, 0.8], code: `
fx({ lpf: 500, rev: 0.3 })
loop('drone', (i) => {
  synth('space_drone_slow', ROOT, { dur: 14, amp: 0.35 })
  sleep(16)
})` },

  { id: 'space_bubbles', role: 'perc', flavours: { space: 1 }, energy: [0, 1], code: `
fx({ rev: 0.45, delay: 0.3 })
loop('bubbles', (i) => {
  for (let k = 0; k < 8; k++) {
    if (one_in(3)) s('bubble', { n: rrand_i(0, 7), amp: 0.1, rate: choose([0.75, 1, 1.5]), pan: rrand(-0.7, 0.7) })
    sleep(0.5)
  }
})` },

  { id: 'space_choir_chords', role: 'keys', flavours: { space: 1, dark: 0.4 }, energy: [0, 0.9], code: `
fx({ rev: 0.6, lpf: 2400 })
loop('choir', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['sus2', 'wide'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('space_choir', c.notes, { dur: c.len, amp: 0.18 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── dark ─────
  { id: 'dark_prepared_drift', role: 'lead', flavours: { dark: 1, saw: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.5, lpf: 2500 })
loop('piano', (i) => {
  for (const n of melody('d', { style: 'drift', octave: 1 })) {
    if (n.note) synth('prepared_piano', n.note, { vel: 0.4 + 0.4 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'dark_square_cells', role: 'lead', flavours: { dark: 1, ae: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.45, delay: 0.35, lpf: 1800 })
loop('cells', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 1 })) {
    if (n.notes.length) synth('saw2_square', n.notes, { dur: 0.4, amp: 0.14 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'dark_fm_drops', role: 'perc', flavours: { dark: 1, ae: 0.5 }, energy: [0.1, 1], code: `
fx({ rev: 0.5, delay: 0.3, lpf: 3000 })
loop('drops', (i) => {
  for (let k = 0; k < 4; k++) {
    if (one_in(2)) synth('ae_fm_perc', degree(choose([0, 1, 4]), 0), { amp: 0.25, pan: rrand(-0.5, 0.5) })
    sleep(1)
  }
})` },

  { id: 'dark_chains', role: 'perc', flavours: { dark: 1 }, energy: [0.1, 1], code: `
fx({ rev: 0.45, lpf: 4000 })
loop('chains', (i) => {
  const hits = spread(vary('h', [2, 3], 8), 8, vary('r', [1, 5], 8))
  for (let k = 0; k < 8; k++) {
    if (hits[k]) s('metal', { n: vary('n', [2, 6, 9], 8), amp: 0.12, rate: 0.6, pan: rrand(-0.5, 0.5) })
    sleep(0.5)
  }
})` },

  { id: 'dark_ae_bass', role: 'bass', flavours: { dark: 1, ae: 0.6 }, energy: [0.2, 1], code: `
fx({ lpf: 600, crush: 0.05 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'sub' })) {
    if (b.note) synth('ae_bass', b.note, { dur: b.len, amp: 0.36 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'dark_tension_cluster', role: 'keys', flavours: { dark: 1 }, energy: [0, 1], code: `
fx({ rev: 0.45, lpf: 2000 })
loop('cluster', (i) => {
  for (const c of chords('c', { voicing: 'cluster', rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('tension_string', c.notes, { dur: c.len, amp: 0.18 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── ae (AE_LIVE) ─────
  { id: 'ae_live_kit', role: 'drums', flavours: { ae: 1 }, energy: [0.3, 1], odd: true, code: `
fx({ lpf: 9000, crush: 0.12 })
loop('kit', (i) => {
  const b = beat('b', { style: 'ae_live', density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) synth('kick_synth', KEY - 12, { amp: 0.8 * st.v })
    if (st.s) synth('ae_fm_perc', KEY + 12, { amp: 0.4 * st.v })
    if (st.h) s('sid', { n: rrand_i(0, 11), amp: 0.06 * st.v, cut: 0.05, pan: rrand(-0.6, 0.6) })
    if (st.p) synth('ae_grain', KEY + 24, { dur: 0.05, amp: 0.15 * st.v })
    sleep(0.25)
  }
})` },

  { id: 'ae_live_perc', role: 'perc', flavours: { ae: 1, drill: 0.5 }, energy: [0.3, 1], code: `
fx({ delay: 0.15, crush: 0.15 })
loop('perc', (i) => {
  for (const n of melody('p', { style: 'probability', octave: 1 })) {
    if (n.note && n.ratchet) { synth('ae_fm_perc', n.note, { amp: 0.2 }); sleep(n.dur / 2); synth('ae_fm_perc', n.note, { amp: 0.15 }); sleep(n.dur / 2) }
    else { if (n.note) synth('ae_fm_perc', n.note, { amp: 0.22 * n.vel, detune: n.detune }); sleep(n.dur) }
  }
})` },

  { id: 'ae_probability_blips', role: 'lead', flavours: { ae: 1, acid: 0.5 }, energy: [0.2, 1], code: `
fx({ delay: 0.25, rev: 0.2 })
loop('blips', (i) => {
  for (const n of melody('m', { style: 'probability', octave: 2 })) {
    if (n.note && n.ratchet) { synth('ae_blip', n.note, { amp: 0.18, detune: n.detune }); sleep(n.dur / 2); synth('ae_blip', n.note, { amp: 0.14, detune: n.detune }); sleep(n.dur / 2) }
    else { if (n.note) synth('ae_blip', n.note, { amp: 0.2 * n.vel, detune: n.detune }); sleep(n.dur) }
  }
})` },

  { id: 'ae_grain_line', role: 'lead', flavours: { ae: 1, dark: 0.5 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.3 })
loop('grain', (i) => {
  for (const n of melody('g', { style: 'probability', octave: 2 })) {
    if (n.note) synth('ae_grain', n.note, { dur: n.len * 2, amp: 0.16 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'ae_fm_line', role: 'lead', flavours: { ae: 1 }, energy: [0.3, 1], code: `
fx({ crush: 0.1, delay: 0.2 })
loop('fm', (i) => {
  for (const n of melody('f', { style: 'probability', octave: 2 })) {
    if (n.note) synth('fm_metal', n.note, { amp: 0.16 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'ae_bass_probability', role: 'bass', flavours: { ae: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 1200, crush: 0.08 })
loop('bass', (i) => {
  for (const n of melody('b', { style: 'probability', octave: 0 })) {
    if (n.note) synth('ae_bass', n.note, { dur: n.len, amp: 0.34 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'ae_glass_probability', role: 'keys', flavours: { ae: 1, minimal: 0.4 }, energy: [0.2, 1], code: `
fx({ delay: 0.3, rev: 0.3 })
loop('glass', (i) => {
  for (const n of melody('k', { style: 'probability', octave: 2 })) {
    if (n.note) synth('fm_glass', [n.note, n.note + 7], { amp: 0.12 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'ae_sid_texture', role: 'texture', flavours: { ae: 1 }, energy: [0.2, 1], code: `
fx({ crush: 0.2, delay: 0.25, rev: 0.2 })
loop('sid', (i) => {
  for (const e of collage('c', { pool: ['sid', 'feel', 'bev'], rate: walk('r', 0.3, 0.8, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * choose([1, 2, 0.5]), pan: e.pan, amp: e.amp * 0.4, cut: 0.3 })
    sleep(e.dur)
  }
})` },
);
