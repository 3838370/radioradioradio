// lib_deep_space: more deep ambient and space (Selected Ambient Works 85-92, Aethereon,
// FSOL). Loose 808 kits and downtempo breaks, hand drums, 808 toms, FM and Juno pads,
// drones that drift, collage of birds, insects and numbers stations, call and response.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'saw_808_kit', role: 'drums', flavours: { space: 1, deep: 0.8 }, energy: [0.3, 1], code: `
fx({ lpf: 6000, rev: 0.2, crush: 0.05 })
loop('kit', (i) => {
  const b = beat('b', { style: 'saw808', density: walk('dens', 0.35, 0.75, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 5, amp: 0.85 * st.v })
    if (st.s) s('808sd', { n: 7, amp: 0.4 * st.v })
    if (st.h) s('808', { n: 1, amp: 0.12 * st.v, pan: 0.2 })
    if (st.p) s('808oh', { n: 0, amp: 0.1 * st.v, pan: -0.2 })
    sleep(0.25)
  }
})` },

  { id: 'deep_downtempo_kit', role: 'drums', flavours: { deep: 1, space: 0.6 }, energy: [0.25, 1], code: `
fx({ lpf: 5000, rev: 0.25 })
loop('kit', (i) => {
  const b = beat('b', { style: 'downtempo', density: 0.5 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('bd', { n: 3, amp: 0.8 * st.v })
    if (st.s) s('sn', { n: 14, amp: 0.35 * st.v })
    if (st.h) s('hh27', { n: 0, amp: 0.13 * st.v, pan: 0.25 })
    if (st.p) s('perc', { n: 4, amp: 0.08 * st.v, pan: -0.3 })
    sleep(swing(0.25, k, 0.1))
  }
})` },

  { id: 'space_drift_kit', role: 'drums', flavours: { space: 1, deep: 0.5 }, energy: [0, 0.8], code: `
fx({ lpf: 3500, rev: 0.5, delay: 0.3, wobble: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: 'drift_free', density: walk('dens', 0.3, 0.7, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('bd', { n: 20, amp: 0.6 * st.v })
    if (st.s) s('rs', { n: 0, amp: 0.15 * st.v, pan: rrand(-0.5, 0.5) })
    if (st.h) s('hh', { n: 6, amp: 0.08 * st.v, pan: 0.3 })
    if (st.p) s('cosmicg', { n: 2, amp: 0.08 * st.v, rate: 2 })
    sleep(0.25)
  }
})` },

  { id: 'space_fsol_break', role: 'drums', flavours: { space: 0.9, deep: 0.6, atmos: 0.4 }, energy: [0.35, 1], code: `
fx({ lpf: walk('lpf', 2500, 7000, 0.1), rev: 0.2, delay: 0.1 })
loop('break', (i) => {
  const b = beat('b', { style: 'fsol_break', density: 0.55 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('jungle', { n: 5, amp: 0.7 * st.v, rate: 0.85 })
    if (st.s) s('jungle', { n: 11, amp: 0.45 * st.v, rate: 0.85 })
    if (st.h) s('jungle', { n: 0, amp: 0.12 * st.v, rate: 0.85, pan: 0.2 })
    if (st.p) s('tabla', { n: 9, amp: 0.12 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'space_pulse_kick', role: 'drums', flavours: { space: 0.9, deep: 0.5, dark: 0.3 }, energy: [0, 0.7], code: `
fx({ lpf: 2000, rev: 0.45, delay: 0.25 })
loop('pulse', (i) => {
  const b = beat('b', { style: 'pulse_sparse', density: 0.4 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 12, amp: 0.75 * st.v })
    if (st.h) s('cosmicg', { n: 5, amp: 0.06 * st.v, rate: 1.5, pan: 0.4 })
    if (st.p) s('bubble', { n: 3, amp: 0.08 * st.v, pan: -0.4 })
    sleep(0.25)
  }
})` },

  // ───── perc ─────
  { id: 'space_tabla_drift', role: 'perc', flavours: { space: 1, deep: 0.6, atmos: 0.3 }, energy: [0.15, 1], code: `
fx({ rev: 0.35, delay: 0.2, lpf: 5000 })
loop('tabla', (i) => {
  const hits = spread(vary('h', [5, 7, 9], 8), 16, vary('r', [0, 3, 5], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('tabla', { n: vary('n' + (k % 3), [2, 7, 13, 18, 22], 8), amp: 0.16, rate: walk('rate', 0.9, 1.1, 0.05), pan: rrand(-0.5, 0.5) })
    sleep(0.25)
  }
})` },

  { id: 'deep_808_toms', role: 'perc', flavours: { deep: 1, space: 0.6 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.25, lpf: 4000 })
loop('toms', (i) => {
  const hits = spread(vary('h', [3, 4, 5], 8), 16, 2)
  const toms = ['808lt', '808mt', '808ht']
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s(toms[(k + i) % 3], { n: 0, amp: 0.2, pan: (k % 3 - 1) * 0.4 })
    sleep(0.25)
  }
})` },

  { id: 'space_glasstap', role: 'perc', flavours: { space: 1, deep: 0.5 }, energy: [0, 0.9], code: `
fx({ delay: 0.5, rev: 0.45, lpf: 7000 })
loop('glass', (i) => {
  for (let k = 0; k < 8; k++) {
    if (one_in(vary('odds', [3, 4, 6], 8))) s('glasstap', { n: choose([0, 1, 2]), amp: 0.14, rate: choose([1, 1.5, 2]), pan: rrand(-0.7, 0.7) })
    sleep(0.5)
  }
})` },

  { id: 'deep_shaker_swing', role: 'perc', flavours: { deep: 1, space: 0.5, atmos: 0.3 }, energy: [0.3, 1], code: `
fx({ lpf: 6500, rev: 0.15 })
loop('shaker', (i) => {
  for (let k = 0; k < 16; k++) {
    s('perc', { n: 3, amp: (k % 2 ? 0.05 : 0.09) * walk('a', 0.7, 1.2, 0.1), pan: 0.3 })
    sleep(swing(0.25, k, 0.14))
  }
})` },

  // ───── bass ─────
  { id: 'space_sh_bass', role: 'bass', flavours: { space: 0.9, deep: 0.7 }, energy: [0.2, 1], code: `
fx({ lpf: 800, rev: 0.1 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['sub', '808'], 16) })) {
    if (b.note) synth('sh_bass', b.note, { dur: b.len * 0.8, amp: 0.36 * b.vel, cutoff: 450 })
    sleep(b.dur)
  }
})` },

  { id: 'deep_dx_walk', role: 'bass', flavours: { deep: 0.8, space: 0.6, atmos: 0.4 }, energy: [0.3, 1], code: `
fx({ lpf: 1300 })
loop('walk', (i) => {
  for (const b of bassline('b', { style: vary('st', ['walk', 'dub', '808'], 16) })) {
    if (b.note) synth('dx_bass', b.note, { dur: b.len * 0.8, amp: 0.38 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'space_drone_bass', role: 'bass', flavours: { space: 1, deep: 0.6, dark: 0.4 }, energy: [0, 0.7], code: `
fx({ lpf: 600, rev: 0.25, wobble: 0.1 })
loop('drone', (i) => {
  const d = drone('d', { voices: 1, octave: 0 })
  synth('dub_sub', d.notes, { dur: 14, attack: 2, release: 3, amp: 0.4 })
  sleep(16)
})` },

  // ───── keys ─────
  { id: 'space_juno_chords', role: 'keys', flavours: { space: 0.9, deep: 0.8 }, energy: [0, 0.9], code: `
fx({ rev: 0.45, lpf: 2200, wobble: 0.15, delay: 0.15 })
loop('chords', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['add9', 'sus2', 'wide'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth(vary('inst', ['juno_pad', 'warm_pad', 'pwm_pad'], 32), c.notes, { dur: c.len, attack: 1, release: 2, amp: 0.22 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'deep_dx_chords', role: 'keys', flavours: { deep: 1, space: 0.6 }, energy: [0.15, 1], code: `
fx({ rev: 0.35, delay: 0.2, lpf: 3500 })
loop('chords', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'add9'], 16), rhythm: 'push', octave: 1, density: 0.6 })) {
    if (c.notes) synth('dx_pad', c.notes, { dur: Math.max(0.5, c.len), amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── lead ─────
  { id: 'deep_call_response', role: 'lead', flavours: { deep: 1, space: 0.8 }, energy: [0.1, 1], code: `
fx({ rev: 0.4, delay: 0.3 })
loop('talk', (i) => {
  // a call on even bars, the answer on odd bars, an octave lower, on another instrument
  const call = i % 2 == 0
  for (const n of motif(call ? 'call' : 'answer', { beats: 4, density: 0.35, octave: call ? 2 : 1 })) {
    if (n.note) synth(call ? 'dx_bell' : 'soft_saw', n.note, { dur: n.dur * (call ? 1.5 : 0.8), amp: (call ? 0.26 : 0.18) * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'space_warble_motif', role: 'lead', flavours: { space: 1, deep: 0.6 }, energy: [0, 0.9], code: `
fx({ rev: 0.5, delay: 0.25, wobble: 0.25 })
loop('motif', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.3, octave: 2 })) {
    if (n.note) synth('tape_warble', n.note, { dur: n.dur, amp: 0.24 * n.vel })
    sleep(n.dur)
  }
})` },

  // ───── texture ─────
  { id: 'space_cosmic_bed', role: 'texture', flavours: { space: 1, deep: 0.5, dark: 0.3 }, energy: [0, 0.9], code: `
fx({ rev: 0.6, lpf: 4000 })
loop('sweep', (i) => {
  synth('cosmic_sweep', degree(choose([0, 4]), 1), { dur: 12, attack: 4, release: 4, amp: walk('a', 0.2, 0.4, 0.1) })
  sleep(16)
})` },

  { id: 'space_birds_insects', role: 'texture', flavours: { space: 0.9, deep: 0.8 }, energy: [0, 0.9], code: `
fx({ rev: 0.4, delay: 0.2, lpf: 7000 })
loop('field', (i) => {
  for (const e of collage('c', { pool: ['birds3', 'insect', 'outdoor', 'birds'], rate: walk('r', 0.2, 0.6, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.8, cut: 3 })
    sleep(e.dur)
  }
})` },

  { id: 'deep_tape_warm', role: 'texture', flavours: { deep: 0.9, space: 0.7, dub: 0.4 }, energy: [0, 1], code: `
fx({ lpf: 7000, wobble: 0.2 })
loop('tape', (i) => {
  const t = tape('t')
  synth('hiss_bed', 70, { dur: 3.5, attack: 0.5, release: 1, amp: 0.3 * t.level })
  if (t.wow > 0.3) synth('tape_warble', degree(0, 2), { dur: 2, amp: 0.08 })
  sleep(4)
})` },

  { id: 'space_numbers', role: 'texture', flavours: { space: 1, deep: 0.5, ae: 0.3 }, energy: [0, 1], code: `
fx({ delay: 0.45, rev: 0.5, lpf: 3200, crush: 0.1 })
loop('station', (i) => {
  for (const e of collage('c', { pool: ['numbers', 'speechless', 'alphabet'], rate: walk('r', 0.1, 0.35, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * 0.9, begin: e.begin, pan: e.pan, amp: e.amp * 0.6, cut: 1.2 })
    sleep(e.dur)
  }
})` },
);
