// idm_saw_acid: Aphex Twin's ambient side (saw) and his acid / braindance side (acid).
// Melodies here are ostinatos (melody(..., { style: 'ostinato' })): short cells that repeat,
// rotate and transpose instead of closing like a song. Original material, no quotes.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── saw: drums ─────
  { id: 'saw_xtal_kit', role: 'drums', flavours: { saw: 1, boc: 0.7 }, energy: [0.25, 1], code: `
fx({ lpf: 4500, rev: 0.3, wobble: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: 'saw808', density: walk('d', 0.3, 0.6, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 8, amp: 0.75 * st.v })
    if (st.s) s('808sd', { n: 3, amp: 0.3 * st.v })
    if (st.h) s('hh27', { n: 1, amp: 0.1 * st.v, pan: 0.25 })
    sleep(0.25)
  }
})` },

  { id: 'saw_halftime_808', role: 'drums', flavours: { saw: 1, dark: 0.7 }, energy: [0.2, 1], code: `
fx({ lpf: 3000, rev: 0.35 })
loop('kit', (i) => {
  const b = beat('b', { style: 'halftime', density: 0.45 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 15, amp: 0.8 * st.v })
    if (st.s) s('808sd', { n: 10, amp: 0.35 * st.v })
    if (st.h) s('808', { n: 1, amp: 0.08 * st.v, pan: -0.2 })
    sleep(0.25)
  }
})` },

  { id: 'saw_soft_break', role: 'drums', flavours: { saw: 1, boc: 0.7 }, energy: [0.3, 1], code: `
fx({ lpf: walk('lpf', 1800, 4000, 0.1), rev: 0.25, crush: 0.06 })
loop('break', (i) => {
  const b = beat('b', { style: 'fsol_break', density: 0.45 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('dr', { n: 2, amp: 0.7 * st.v })
    if (st.s) s('dr', { n: 18, amp: 0.35 * st.v })
    if (st.h) s('dr', { n: 26, amp: 0.1 * st.v, pan: 0.3 })
    sleep(0.25)
  }
})` },

  { id: 'saw_pulse_808', role: 'drums', flavours: { saw: 1, space: 0.7 }, energy: [0, 0.7], code: `
fx({ lpf: 2200, rev: 0.45, delay: 0.2 })
loop('pulse', (i) => {
  const b = beat('b', { style: 'pulse_sparse', density: 0.4 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 2, amp: 0.7 * st.v })
    if (st.h) s('808', { n: 1, amp: 0.06 * st.v })
    sleep(0.25)
  }
})` },

  { id: 'saw_ticking_kit', role: 'drums', flavours: { saw: 1, space: 0.5 }, energy: [0, 0.8], code: `
fx({ lpf: 3500, rev: 0.4 })
loop('tick', (i) => {
  const b = beat('b', { style: 'drift_free', density: walk('d', 0.3, 0.7, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 20, amp: 0.55 * st.v })
    if (st.s) s('tok', { n: 0, amp: 0.15 * st.v })
    if (st.h) s('click', { n: 1, amp: 0.06 * st.v, pan: rrand(-0.4, 0.4) })
    sleep(0.25)
  }
})` },

  // ───── saw: perc ─────
  { id: 'saw_tick_hats', role: 'perc', flavours: { saw: 1, acid: 0.6 }, energy: [0.25, 1], code: `
fx({ lpf: 7000, rev: 0.2 })
loop('hats', (i) => {
  for (let k = 0; k < 16; k++) {
    if (k % 2 == 0 || one_in(3)) s('808', { n: 1, amp: (k % 4 == 2 ? 0.1 : 0.05) * walk('a', 0.7, 1.2, 0.1), pan: 0.3 })
    sleep(0.25)
  }
})` },

  { id: 'saw_shaker_tape', role: 'perc', flavours: { saw: 1, boc: 0.6 }, energy: [0.2, 1], code: `
fx({ lpf: 5000, crush: 0.1, rev: 0.2, wobble: 0.15 })
loop('shake', (i) => {
  for (let k = 0; k < 8; k++) {
    s('perc', { n: 6, amp: k % 2 ? 0.05 : 0.08, pan: -0.3 })
    sleep(swing(0.5, k, 0.08))
  }
})` },

  { id: 'saw_melodic_toms', role: 'perc', flavours: { saw: 1, acid: 0.7 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.2 })
loop('toms', (i) => {
  for (const n of melody('t', { style: 'ostinato', octave: 1 })) {
    if (n.note) s(n.note % 3 == 0 ? '808lt' : n.note % 3 == 1 ? '808mt' : '808ht', { n: 0, amp: 0.16 * n.vel, rate: 1 + (n.note % 5) * 0.03 })
    sleep(n.dur)
  }
})` },

  // ───── saw: bass ─────
  { id: 'saw_sub_ostinato', role: 'bass', flavours: { saw: 1, acid: 0.5 }, energy: [0.2, 1], code: `
fx({ lpf: 700 })
loop('bass', (i) => {
  for (const n of melody('b', { style: 'ostinato', octave: 0 })) {
    if (n.note) synth('sub808', n.note, { dur: n.len * 0.9, amp: 0.45 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'saw_dx_bass_slow', role: 'bass', flavours: { saw: 1, space: 0.7 }, energy: [0, 0.9], code: `
fx({ lpf: 900, rev: 0.15 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['sub', 'dub'], 16) })) {
    if (b.note) synth('dx_bass', b.note, { dur: b.len, amp: 0.38 * b.vel })
    sleep(b.dur)
  }
})` },

  // ───── saw: keys and melodies ─────
  { id: 'saw_prepared_ostinato', role: 'lead', flavours: { saw: 1, drill: 0.7 }, energy: [0, 1], code: `
fx({ rev: 0.35, lpf: 4000 })
loop('piano', (i) => {
  for (const n of melody('p', { style: 'ostinato', octave: 2 })) {
    if (n.note) synth('prepared_piano', n.note, { vel: 0.5 + 0.5 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'saw_dx_ostinato', role: 'lead', flavours: { saw: 1, space: 0.6 }, energy: [0, 1], code: `
fx({ rev: 0.45, delay: 0.25, wobble: 0.1 })
loop('dx', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 3 })) {
    if (n.note) synth('dx_bell', n.note, { amp: 0.22 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'saw_mute_cells', role: 'lead', flavours: { saw: 1, minimal: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.3, delay: 0.3 })
loop('mute', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 2 })) {
    if (n.notes.length) synth('prepared_mute', n.notes, { vel: n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'saw2_square_drift', role: 'lead', flavours: { saw: 1, dark: 0.7 }, energy: [0, 0.9], code: `
fx({ rev: 0.5, lpf: 2000, wobble: 0.2 })
loop('square', (i) => {
  for (const n of melody('d', { style: 'drift', octave: 2 })) {
    if (n.note) synth('saw2_square', n.note, { dur: n.len, amp: 0.24 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'saw_glass_arp', role: 'lead', flavours: { saw: 1, acid: 0.5 }, energy: [0.2, 1], code: `
fx({ delay: 0.3, rev: 0.3 })
loop('arp', (i) => {
  for (const n of melody('a', { style: 'ostinato', octave: 3, chord: true })) {
    if (n.note) synth('fm_glass', n.note, { amp: 0.16 * n.vel, pan: rrand(-0.4, 0.4) })
    sleep(n.dur)
  }
})` },

  { id: 'saw_aphex_lead_slow', role: 'lead', flavours: { saw: 1, drill: 0.6 }, energy: [0.15, 1], code: `
fx({ rev: 0.4, delay: 0.25, lpf: 3000 })
loop('lead', (i) => {
  for (const n of melody('l', { style: 'ostinato', octave: 2 })) {
    if (n.note && !one_in(4)) synth('aphex_lead', n.note, { dur: n.len * 1.2, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'saw_dx_pad_chords', role: 'keys', flavours: { saw: 1, space: 0.6 }, energy: [0, 0.9], code: `
fx({ rev: 0.5, lpf: 2400, wobble: 0.12 })
loop('pad', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'add9', 'sus2'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('dx_pad', c.notes, { dur: c.len, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'saw_prepared_chords', role: 'keys', flavours: { saw: 1, drill: 0.7 }, energy: [0, 1], code: `
fx({ rev: 0.4 })
loop('chords', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['triad', 'add9'], 16), rhythm: 'push', octave: 1, density: 0.4 })) {
    if (c.notes) synth('prepared_piano', c.notes, { vel: 0.6 * c.vel + 0.3, strum: 0.04 })
    sleep(c.dur)
  }
})` },

  // ───── saw: texture ─────
  { id: 'saw_tape_hiss', role: 'texture', flavours: { saw: 1, boc: 0.7 }, energy: [0, 1], code: `
fx({ lpf: 8000, wobble: 0.15 })
loop('tape', (i) => {
  const t = tape('t')
  synth('hiss_bed', 70, { dur: 3.5, attack: 0.5, release: 1, amp: 0.3 * t.level })
  sleep(4)
})` },

  { id: 'saw_field_rain', role: 'texture', flavours: { saw: 1, space: 0.6 }, energy: [0, 0.9], code: `
fx({ rev: 0.4, lpf: 5000 })
loop('field', (i) => {
  for (const e of collage('c', { pool: ['outdoor', 'wind', 'birds3'], rate: walk('r', 0.15, 0.4, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.7, cut: 4 })
    sleep(e.dur)
  }
})` },

  { id: 'saw_shimmer_wash', role: 'texture', flavours: { saw: 1, space: 0.7 }, energy: [0, 0.8], code: `
fx({ rev: 0.6, lpf: 6000 })
loop('wash', (i) => {
  synth('shimmer_pad', harm(2, ''), { dur: 12, attack: 4, release: 5, amp: 0.18 })
  sleep(16)
})` },

  { id: 'saw_far_radio', role: 'texture', flavours: { saw: 1, boc: 0.7 }, energy: [0, 1], code: `
fx({ rev: 0.5, delay: 0.35, lpf: 2600, crush: 0.08 })
loop('radio', (i) => {
  for (const e of collage('c', { pool: ['speechless', 'numbers', 'speech'], rate: walk('r', 0.08, 0.25, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * 0.85, begin: e.begin, pan: e.pan, amp: e.amp * 0.45, cut: 1.5 })
    sleep(e.dur)
  }
})` },

  // ───── acid: drums ─────
  { id: 'acid_808_jack', role: 'drums', flavours: { acid: 1, saw: 0.5 }, energy: [0.4, 1], code: `
fx({ lpf: 9000, crush: 0.05 })
loop('kit', (i) => {
  const b = beat('b', { style: 'braindance', density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 4, amp: 0.85 * st.v })
    if (st.s) s('808sd', { n: 12, amp: 0.4 * st.v })
    if (st.h) s('808', { n: 1, amp: 0.12 * st.v, pan: 0.2 })
    if (st.p) s('808oh', { n: 0, amp: 0.1 * st.v, pan: -0.2 })
    sleep(0.25)
  }
})` },

  { id: 'acid_909_four', role: 'drums', flavours: { acid: 1, minimal: 0.6 }, energy: [0.45, 1], code: `
fx({ lpf: 9000, rev: 0.08 })
loop('kit', (i) => {
  const b = beat('b', { style: 'four', density: 0.6 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('909', { n: 0, amp: 0.85 * st.v })
    if (st.s) s('realclaps', { n: 1, amp: 0.3 * st.v })
    if (st.h) s('linnhats', { n: 2, amp: 0.12 * st.v, pan: 0.2 })
    sleep(0.25)
  }
})` },

  { id: 'acid_electro_kit', role: 'drums', flavours: { acid: 1, ae: 0.5 }, energy: [0.4, 1], code: `
fx({ lpf: 8000, crush: 0.08 })
loop('kit', (i) => {
  const b = beat('b', { style: 'electro', density: 0.6 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('dr_few', { n: 0, amp: 0.85 * st.v })
    if (st.s) s('dr_few', { n: 2, amp: 0.4 * st.v })
    if (st.h) s('dr_few', { n: 5, amp: 0.1 * st.v, pan: 0.25 })
    sleep(0.25)
  }
})` },

  { id: 'acid_ifdrums', role: 'drums', flavours: { acid: 1, drill: 0.5 }, energy: [0.45, 1], code: `
fx({ lpf: 7000, crush: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: 'braindance', density: 0.55 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('ifdrums', { n: 0, amp: 0.8 * st.v })
    if (st.s) s('ifdrums', { n: 1, amp: 0.45 * st.v })
    if (st.h) s('ifdrums', { n: 2, amp: 0.12 * st.v, pan: rrand(-0.3, 0.3) })
    sleep(0.25)
  }
})` },

  // ───── acid: perc ─────
  { id: 'acid_cowbell', role: 'perc', flavours: { acid: 1 }, energy: [0.4, 1], code: `
fx({ delay: 0.25, lpf: 7000 })
loop('bell', (i) => {
  const hits = spread(vary('h', [3, 5, 7], 8), 16, vary('r', [2, 5], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('cb', { n: 0, amp: 0.1, rate: vary('rate', [1, 1.12, 0.89], 16), pan: 0.3 })
    sleep(0.25)
  }
})` },

  { id: 'acid_clap_rolls', role: 'perc', flavours: { acid: 1, drill: 0.5 }, energy: [0.45, 1], code: `
fx({ rev: 0.2, lpf: 8000 })
loop('claps', (i) => {
  for (let k = 0; k < 16; k++) {
    if (k == 12 || (k > 12 && one_in(2)) || one_in(12)) s('realclaps', { n: 3, amp: 0.12 + (k > 12 ? 0.04 : 0), pan: -0.2 })
    sleep(0.25)
  }
})` },

  { id: 'acid_rims', role: 'perc', flavours: { acid: 1, minimal: 0.5 }, energy: [0.3, 1], code: `
fx({ delay: 0.2, lpf: 6000 })
loop('rims', (i) => {
  const hits = spread(vary('h', [4, 5, 7], 8), 16, 3)
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('rs', { n: 0, amp: 0.13, pan: k % 2 ? 0.35 : -0.35 })
    sleep(0.25)
  }
})` },

  { id: 'acid_congas_808', role: 'perc', flavours: { acid: 1, saw: 0.5 }, energy: [0.35, 1], code: `
fx({ rev: 0.2, delay: 0.15 })
loop('congas', (i) => {
  const hits = spread(vary('h', [5, 6], 8), 16, vary('r', [1, 4], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s(choose(['808hc', '808mc', '808lc']), { n: 0, amp: 0.15, pan: rrand(-0.4, 0.4) })
    sleep(0.25)
  }
})` },

  // ───── acid: bass ─────
  { id: 'acid_303_saw', role: 'bass', flavours: { acid: 1 }, energy: [0.4, 1], code: `
fx({ lpf: 5000, delay: 0.08 })
loop('acid', (i) => {
  for (const b of bassline('b', { style: 'acid' })) {
    if (b.note) synth('tb303_saw', b.note + 12, { dur: b.len * (b.slide ? 1.1 : 0.7), amp: 0.36 * b.vel, cutoff: b.accent ? 1800 : walk('cut', 250, 1100, 0.12) })
    sleep(b.dur)
  }
})` },

  { id: 'acid_303_square', role: 'bass', flavours: { acid: 1, ae: 0.5 }, energy: [0.4, 1], code: `
fx({ lpf: 4000, crush: 0.06 })
loop('acid', (i) => {
  for (const b of bassline('b', { style: 'acid' })) {
    if (b.note) synth('tb303_square', b.note, { dur: b.len * 0.7, amp: 0.34 * b.vel, cutoff: b.accent ? 1400 : walk('cut', 220, 900, 0.15) })
    sleep(b.dur)
  }
})` },

  { id: 'acid_braindance_bass', role: 'bass', flavours: { acid: 1, saw: 0.5 }, energy: [0.35, 1], code: `
fx({ lpf: 1800 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['808', 'pedal'], 16) })) {
    if (b.note) synth('braindance_bass', b.note, { dur: b.len * 0.8, amp: 0.36 * b.vel })
    sleep(b.dur)
  }
})` },

  // ───── acid: keys ─────
  { id: 'acid_detuned_chords', role: 'keys', flavours: { acid: 1, saw: 0.6 }, energy: [0.3, 1], code: `
fx({ rev: 0.3, lpf: 3000 })
loop('chords', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['cluster', 'm7'], 16), rhythm: 'push', octave: 1, density: 0.5 })) {
    if (c.notes) synth('aphex_lead', c.notes, { dur: Math.max(0.3, c.len * 0.8), amp: 0.14 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'acid_fm_stabs', role: 'keys', flavours: { acid: 1, minimal: 0.5 }, energy: [0.35, 1], code: `
fx({ delay: 0.3, rev: 0.2 })
loop('stabs', (i) => {
  for (const c of chords('c', { voicing: 'm7', rhythm: 'stab', octave: 1, density: 0.6 })) {
    if (c.notes) synth('dx_pad', c.notes, { dur: 0.2, attack: 0.005, release: 0.4, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'acid_marimba_cells', role: 'keys', flavours: { acid: 1, ae: 0.5 }, energy: [0.25, 1], code: `
fx({ delay: 0.2, rev: 0.25 })
loop('marimba', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 2 })) {
    if (n.notes.length) synth('dx_marimba', n.notes, { amp: 0.22 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'acid_glass_push', role: 'keys', flavours: { acid: 1, drill: 0.5 }, energy: [0.3, 1], code: `
fx({ delay: 0.35, rev: 0.3 })
loop('glass', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['quartal', 'sus4'], 16), rhythm: 'push', octave: 2, density: 0.6 })) {
    if (c.notes) synth('fm_glass', c.notes, { amp: 0.14 * c.vel, strum: 0.05 })
    sleep(c.dur)
  }
})` },

  { id: 'acid_saw2_pad', role: 'keys', flavours: { acid: 1, saw: 0.7 }, energy: [0.2, 1], code: `
fx({ rev: 0.4, lpf: 1800, wobble: 0.1 })
loop('pad', (i) => {
  for (const c of chords('c', { voicing: 'fifths', rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('saw2_square', c.notes, { dur: c.len, attack: 0.5, amp: 0.14 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'acid_organ_offbeats', role: 'keys', flavours: { acid: 1, minimal: 0.6 }, energy: [0.4, 1], code: `
fx({ lpf: 4000, rev: 0.15 })
loop('organ', (i) => {
  for (const c of chords('c', { voicing: 'triad', rhythm: 'offbeat', octave: 1, density: walk('d', 0.4, 0.8, 0.1) })) {
    if (c.notes) synth('efd_organ', c.notes, { dur: 0.15, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── acid: leads ─────
  { id: 'acid_303_lead', role: 'lead', flavours: { acid: 1 }, energy: [0.4, 1], code: `
fx({ delay: 0.25, lpf: 5000 })
loop('lead', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 2, chord: false })) {
    if (n.note) synth('tb303_saw', n.note, { dur: n.len * 0.6, amp: 0.26 * n.vel, cutoff: walk('cut', 400, 2000, 0.12) })
    sleep(n.dur)
  }
})` },

  { id: 'acid_aphex_lead', role: 'lead', flavours: { acid: 1, saw: 0.5 }, energy: [0.35, 1], code: `
fx({ rev: 0.3, delay: 0.2 })
loop('lead', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 2 })) {
    if (n.note) synth('aphex_lead', n.note, { dur: n.len * 0.8, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'acid_sq_lead', role: 'lead', flavours: { acid: 1, ae: 0.5 }, energy: [0.4, 1], code: `
fx({ crush: 0.08, delay: 0.2, lpf: 4500 })
loop('lead', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 3, chord: false })) {
    if (n.note && !one_in(5)) synth('acid_sq', n.note, { dur: n.len * 0.5, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'acid_sh_lead_tritone', role: 'lead', flavours: { acid: 1, drill: 0.5 }, energy: [0.35, 1], code: `
fx({ delay: 0.3, rev: 0.25 })
loop('lead', (i) => {
  // the line from the probability style leaves the mode (tritones, minor seconds)
  for (const n of melody('m', { style: 'probability', octave: 2 })) {
    if (n.note) synth('sh_lead', n.note, { dur: n.len, amp: 0.2 * n.vel, detune: n.detune * 0.5 })
    sleep(n.dur)
  }
})` },

  { id: 'acid_saw2_lead', role: 'lead', flavours: { acid: 1, saw: 0.6 }, energy: [0.3, 1], code: `
fx({ rev: 0.35, delay: 0.25, lpf: 3000 })
loop('lead', (i) => {
  for (const n of melody('m', { style: 'ostinato', octave: 2 })) {
    if (n.note) synth('saw2_square', n.note, { dur: n.len, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  // ───── acid: texture ─────
  { id: 'acid_mouth_cuts', role: 'texture', flavours: { acid: 1, drill: 0.6 }, energy: [0.3, 1], code: `
fx({ delay: 0.2, crush: 0.1, lpf: 6000 })
loop('mouth', (i) => {
  for (const e of collage('c', { pool: ['mouth', 'diphone', 'glitch'], rate: walk('r', 0.3, 0.7, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.6, cut: 0.3 })
    sleep(e.dur)
  }
})` },

  { id: 'acid_tape_vinyl', role: 'texture', flavours: { acid: 1, saw: 0.6 }, energy: [0, 1], code: `
fx({ lpf: 9000 })
loop('crackle', (i) => {
  for (const c of tape('c').crackles) {
    if (c.amp) synth('vinyl_bed', 84, { dur: 0.02, attack: 0.001, release: 0.04, amp: c.amp })
    sleep(c.dur)
  }
})` },

  { id: 'acid_squelch_bed', role: 'texture', flavours: { acid: 1 }, energy: [0.3, 1], code: `
fx({ rev: 0.4, delay: 0.3, lpf: 3000 })
loop('squelch', (i) => {
  synth('tb303_square', degree(choose([0, 4]), 1), { dur: 3, attack: 0.5, amp: 0.12, cutoff: walk('cut', 300, 1500, 0.2) })
  sleep(4)
})` },

  { id: 'acid_radio_tune', role: 'texture', flavours: { acid: 1, ae: 0.6 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.3 })
loop('radio', (i) => {
  if (one_in(2)) synth('radio_tune', degree(rrand_i(0, 6), 2), { dur: rrand(1, 3), amp: 0.12, pan: rrand(-0.6, 0.6) })
  sleep(4)
})` },

  { id: 'acid_glitch_bed', role: 'texture', flavours: { acid: 1, ae: 0.5 }, energy: [0.3, 1], code: `
fx({ crush: 0.15, delay: 0.2 })
loop('glitch', (i) => {
  for (const e of collage('c', { pool: ['glitch', 'glitch2', 'blip'], rate: walk('r', 0.4, 1, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * choose([1, 2]), pan: e.pan, amp: e.amp * 0.5, cut: 0.15 })
    sleep(e.dur)
  }
})` },

  { id: 'acid_hum_bed', role: 'texture', flavours: { acid: 1, dark: 0.5 }, energy: [0, 1], code: `
fx({ lpf: 700 })
loop('hum', (i) => {
  synth('hum_bed', ROOT - 12, { dur: 14, attack: 3, release: 4, amp: 0.35 })
  sleep(16)
})` },
);
