// idm_boc_minimal: Boards of Canada (boc) and Efdemin (minimal).
// boc: slow dusty hip-hop breaks, round basses, pads and leads that drift out of tune
// (melody style 'drift'), tape, voices and numbers stations.
// minimal: dry 4/4 with shuffled hats, short basses, bells / organ / marimba in little
// figures of different cycle lengths (melody style 'cells'), quiet room sounds.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── boc: drums ─────
  { id: 'boc_hiphop_kit', role: 'drums', flavours: { boc: 1, saw: 0.5 }, energy: [0.25, 1], code: `
fx({ lpf: 3200, crush: 0.1, rev: 0.15, wobble: 0.12 })
loop('kit', (i) => {
  const b = beat('b', { style: 'boc_hiphop', density: walk('d', 0.35, 0.65, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('dr', { n: 4, amp: 0.85 * st.v })
    if (st.s) s('dr', { n: 15, amp: 0.45 * st.v })
    if (st.h) s('dr', { n: 27, amp: 0.1 * st.v, pan: 0.2 })
    sleep(swing(0.25, k, 0.1))
  }
})` },

  { id: 'boc_dusty_break', role: 'drums', flavours: { boc: 1, space: 0.5 }, energy: [0.3, 1], code: `
fx({ lpf: 2800, crush: 0.12, wobble: 0.15 })
loop('break', (i) => {
  for (let k = 0; k < 8; k++) {
    s('breaks125', { n: 0, begin: (k % 8) / 8, cut: 0.5, amp: 0.6, rate: BPM / 125 })
    sleep(0.5)
  }
})` },

  { id: 'boc_soft_808', role: 'drums', flavours: { boc: 1, saw: 0.6 }, energy: [0.2, 1], code: `
fx({ lpf: 2500, rev: 0.25, wobble: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: 'boc_hiphop', density: 0.45 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 21, amp: 0.8 * st.v })
    if (st.s) s('808sd', { n: 5, amp: 0.3 * st.v })
    if (st.h) s('808', { n: 1, amp: 0.07 * st.v, pan: -0.25 })
    sleep(swing(0.25, k, 0.12))
  }
})` },

  // ───── boc: perc ─────
  { id: 'boc_shaker_tape', role: 'perc', flavours: { boc: 1 }, energy: [0.2, 1], code: `
fx({ lpf: 4000, crush: 0.1, wobble: 0.2 })
loop('shake', (i) => {
  for (let k = 0; k < 8; k++) {
    s('perc', { n: 5, amp: k % 2 ? 0.04 : 0.07, pan: 0.3 })
    sleep(swing(0.5, k, 0.1))
  }
})` },

  { id: 'boc_tamb_lazy', role: 'perc', flavours: { boc: 1, minimal: 0.5 }, energy: [0.3, 1], code: `
fx({ lpf: 5000, rev: 0.2 })
loop('tamb', (i) => {
  sleep(1)
  s('drumtraks', { n: 10, amp: 0.08, pan: -0.3 })
  sleep(2)
  if (one_in(2)) s('drumtraks', { n: 10, amp: 0.05, pan: -0.3 })
  sleep(1)
})` },

  { id: 'boc_rim_click', role: 'perc', flavours: { boc: 1, saw: 0.5 }, energy: [0.2, 1], code: `
fx({ delay: 0.3, rev: 0.25, lpf: 3500 })
loop('rim', (i) => {
  const hits = spread(vary('h', [2, 3], 8), 16, vary('r', [3, 7], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('rs', { n: 0, amp: 0.1, pan: 0.3 })
    sleep(0.25)
  }
})` },

  // ───── boc: bass ─────
  { id: 'boc_round_bass', role: 'bass', flavours: { boc: 1, dub: 0.5 }, energy: [0.2, 1], code: `
fx({ lpf: 800, wobble: 0.1 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['dub', 'sub'], 16) })) {
    if (b.note) synth('sub', b.note, { dur: b.len, amp: 0.48 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'boc_sh_walk', role: 'bass', flavours: { boc: 1, saw: 0.5 }, energy: [0.3, 1], code: `
fx({ lpf: 700, wobble: 0.12 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'walk' })) {
    if (b.note) synth('sh_bass', b.note, { dur: b.len * 0.8, amp: 0.32 * b.vel, cutoff: 400 })
    sleep(b.dur)
  }
})` },

  { id: 'boc_dx_bass', role: 'bass', flavours: { boc: 1, space: 0.5 }, energy: [0.2, 1], code: `
fx({ lpf: 900 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'sub' })) {
    if (b.note) synth('dx_bass', b.note, { dur: b.len, amp: 0.38 * b.vel, detune: rrand(-10, 10) })
    sleep(b.dur)
  }
})` },

  // ───── boc: keys ─────
  { id: 'boc_pad_chords', role: 'keys', flavours: { boc: 1, saw: 0.6 }, energy: [0, 1], code: `
fx({ rev: 0.4, lpf: 1800, wobble: 0.25 })
loop('pad', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['add9', 'wide', 'triad'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('boc_pad', c.notes, { dur: c.len, amp: 0.22 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'boc_choir_wash', role: 'keys', flavours: { boc: 1, space: 0.6 }, energy: [0, 0.9], code: `
fx({ rev: 0.55, lpf: 2200, wobble: 0.2 })
loop('choir', (i) => {
  synth('boc_choir', harm(1, vary('ext', ['', '7'], 16)), { dur: 7, amp: 0.22 })
  sleep(8)
})` },

  { id: 'boc_rhodes_tape', role: 'keys', flavours: { boc: 1 }, energy: [0.15, 1], code: `
fx({ rev: 0.3, wobble: 0.25, lpf: 2600 })
loop('rhodes', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'add9'], 16), rhythm: 'push', octave: 1, density: 0.4 })) {
    if (c.notes) synth('rhodes', c.notes, { dur: Math.max(0.5, c.len), vel: 0.5 + 0.3 * c.vel, strum: 0.04 })
    sleep(c.dur)
  }
})` },

  // ───── boc: leads (many, all a little out of tune) ─────
  { id: 'boc_lead_drift', role: 'lead', flavours: { boc: 1 }, energy: [0, 1], code: `
fx({ rev: 0.4, delay: 0.3, wobble: 0.3 })
loop('lead', (i) => {
  for (const n of melody('d', { style: 'drift', octave: 2 })) {
    if (n.note) synth('boc_lead', n.note, { dur: n.len, amp: 0.24 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'boc_flute_line', role: 'lead', flavours: { boc: 1, space: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.45, delay: 0.25, wobble: 0.2 })
loop('flute', (i) => {
  for (const n of melody('f', { style: 'drift', octave: 2 })) {
    if (n.note) synth('boc_flute', n.note, { dur: n.len, amp: 0.22 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'boc_lead_ostinato', role: 'lead', flavours: { boc: 1, saw: 0.5 }, energy: [0.2, 1], code: `
fx({ rev: 0.35, delay: 0.3, wobble: 0.25 })
loop('lead', (i) => {
  for (const n of melody('o', { style: 'ostinato', octave: 2 })) {
    if (n.note) synth('boc_lead', n.note, { dur: n.len * 1.3, amp: 0.2 * n.vel, detune: rrand(-12, 12) })
    sleep(n.dur)
  }
})` },

  { id: 'boc_bell_drift', role: 'lead', flavours: { boc: 1, saw: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.5, delay: 0.35, wobble: 0.2 })
loop('bell', (i) => {
  for (const n of melody('b', { style: 'drift', octave: 3 })) {
    if (n.note) synth('dx_bell', n.note, { amp: 0.18 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  { id: 'boc_warble_melody', role: 'lead', flavours: { boc: 1, dark: 0.4 }, energy: [0, 0.9], code: `
fx({ rev: 0.45, wobble: 0.4, lpf: 2400 })
loop('warble', (i) => {
  for (const n of melody('w', { style: 'drift', octave: 2 })) {
    if (n.note) synth('tape_warble', n.note, { dur: n.len, amp: 0.22 * n.vel, detune: n.detune * 1.5 })
    sleep(n.dur)
  }
})` },

  { id: 'boc_toy_drift', role: 'lead', flavours: { boc: 1, saw: 0.6 }, energy: [0, 0.9], code: `
fx({ rev: 0.4, delay: 0.3, wobble: 0.2 })
loop('toy', (i) => {
  for (const n of melody('t', { style: 'drift', octave: 3 })) {
    if (n.note) synth('toy_piano', n.note, { vel: 0.4 + 0.4 * n.vel, detune: n.detune })
    sleep(n.dur)
  }
})` },

  // ───── boc: texture ─────
  { id: 'boc_voices', role: 'texture', flavours: { boc: 1, dark: 0.4 }, energy: [0, 1], code: `
fx({ rev: 0.45, delay: 0.3, lpf: 3000, wobble: 0.2 })
loop('voices', (i) => {
  for (const e of collage('c', { pool: ['kurt', 'speech', 'hmm'], rate: walk('r', 0.1, 0.3, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * 0.9, begin: e.begin, pan: e.pan, amp: e.amp * 0.5, cut: 1.5 })
    sleep(e.dur)
  }
})` },

  { id: 'boc_numbers_station', role: 'texture', flavours: { boc: 1, space: 0.6 }, energy: [0, 1], code: `
fx({ rev: 0.4, delay: 0.4, lpf: 2200, crush: 0.15 })
loop('station', (i) => {
  for (const e of collage('c', { pool: ['numbers'], rate: walk('r', 0.08, 0.25, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: 0.95, pan: e.pan, amp: e.amp * 0.45, cut: 1 })
    sleep(e.dur)
  }
})` },

  { id: 'boc_tape_wow', role: 'texture', flavours: { boc: 1, saw: 0.5 }, energy: [0, 1], code: `
fx({ lpf: 7000, wobble: 0.3 })
loop('tape', (i) => {
  const t = tape('t')
  synth('hiss_bed', 70, { dur: 3.5, attack: 0.5, release: 1, amp: 0.3 * t.level })
  if (t.wow > 0.25) synth('tape_warble', degree(4, 2), { dur: 3, amp: 0.07 })
  sleep(4)
})` },

  // ───── minimal: drums ─────
  { id: 'min_efdemin_kit', role: 'drums', flavours: { minimal: 1, dub: 0.5 }, energy: [0.35, 1], code: `
fx({ lpf: 8000, rev: 0.08 })
loop('kit', (i) => {
  const b = beat('b', { style: 'efdemin', density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('clubkick', { n: 2, amp: 0.8 * st.v })
    if (st.s) s('rs', { n: 0, amp: 0.14 * st.v })
    if (st.h) s('hh', { n: 2, amp: 0.1 * st.v, pan: 0.25 })
    if (st.p) s('perc', { n: 0, amp: 0.07 * st.v, pan: -0.3 })
    sleep(swing(0.25, k, 0.08))
  }
})` },

  { id: 'min_dry_909', role: 'drums', flavours: { minimal: 1, acid: 0.5 }, energy: [0.4, 1], code: `
fx({ lpf: 9000 })
loop('kit', (i) => {
  const b = beat('b', { style: 'efdemin', density: 0.55 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('909', { n: 0, amp: 0.8 * st.v })
    if (st.s) s('realclaps', { n: 0, amp: 0.15 * st.v })
    if (st.h) s('linnhats', { n: 0, amp: 0.1 * st.v, pan: 0.2 })
    sleep(swing(0.25, k, 0.06))
  }
})` },

  // ───── minimal: bass ─────
  { id: 'min_short_bass', role: 'bass', flavours: { minimal: 1 }, energy: [0.3, 1], code: `
fx({ lpf: 700 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'pedal' })) {
    if (b.note && !one_in(3)) synth('sub', b.note, { dur: 0.2, amp: 0.45 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'min_sh_pluck_bass', role: 'bass', flavours: { minimal: 1, acid: 0.5 }, energy: [0.35, 1], code: `
fx({ lpf: walk('lpf', 400, 1100, 0.1) })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'dub' })) {
    if (b.note) synth('sh_bass', b.note, { dur: 0.25, amp: 0.34 * b.vel, cutoff: 500 })
    sleep(b.dur)
  }
})` },

  { id: 'min_offbeat_sub', role: 'bass', flavours: { minimal: 1, dub: 0.6 }, energy: [0.3, 1], code: `
fx({ lpf: 600 })
loop('bass', (i) => {
  for (let k = 0; k < 4; k++) {
    sleep(0.5)
    synth('dub_sub', ROOT, { dur: 0.3, amp: 0.4 })
    sleep(0.5)
  }
})` },

  { id: 'min_fm_bass', role: 'bass', flavours: { minimal: 1, ae: 0.5 }, energy: [0.35, 1], code: `
fx({ lpf: 1200 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['pedal', 'dub'], 16) })) {
    if (b.note && !one_in(4)) synth('fm_bass', b.note, { dur: 0.3, amp: 0.36 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'min_organ_bass', role: 'bass', flavours: { minimal: 1, boc: 0.4 }, energy: [0.3, 1], code: `
fx({ lpf: 900 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'sub' })) {
    if (b.note) synth('efd_organ', b.note, { dur: b.len * 0.7, amp: 0.3 * b.vel })
    sleep(b.dur)
  }
})` },

  // ───── minimal: keys ─────
  { id: 'min_organ_stabs', role: 'keys', flavours: { minimal: 1, dub: 0.5 }, energy: [0.3, 1], code: `
fx({ delay: 0.35, rev: 0.2, lpf: 3500 })
loop('stabs', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'sus4'], 16), rhythm: 'stab', octave: 1, density: 0.5 })) {
    if (c.notes) synth('efd_organ', c.notes, { dur: 0.15, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'min_pad_long', role: 'keys', flavours: { minimal: 1, space: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.4, lpf: 1800 })
loop('pad', (i) => {
  for (const c of chords('c', { voicing: 'sus2', rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('efd_pad', c.notes, { dur: c.len, amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'min_stab_offbeat', role: 'keys', flavours: { minimal: 1 }, energy: [0.35, 1], code: `
fx({ delay: 0.3, lpf: 4000 })
loop('stabs', (i) => {
  for (const c of chords('c', { voicing: 'm7', rhythm: 'offbeat', octave: 1, density: walk('d', 0.3, 0.7, 0.1) })) {
    if (c.notes) synth('efd_stab', c.notes, { amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  // ───── minimal: leads (bells and organs in cycles of 3, 4, 5) ─────
  { id: 'min_bell_cells', role: 'lead', flavours: { minimal: 1, dub: 0.5 }, energy: [0, 1], code: `
fx({ delay: 0.35, rev: 0.3 })
loop('bells', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 3 })) {
    if (n.notes.length) synth('efd_bell', n.notes, { amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'min_organ_cells', role: 'lead', flavours: { minimal: 1 }, energy: [0.2, 1], code: `
fx({ delay: 0.25, rev: 0.2 })
loop('organ', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 2 })) {
    if (n.notes.length) synth('efd_organ', n.notes, { dur: 0.2, amp: 0.18 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'min_marimba_cells', role: 'lead', flavours: { minimal: 1, ae: 0.5 }, energy: [0.2, 1], code: `
fx({ delay: 0.2, rev: 0.25 })
loop('marimba', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 2 })) {
    if (n.notes.length) synth('dx_marimba', n.notes, { amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'min_glass_cells', role: 'lead', flavours: { minimal: 1, space: 0.5 }, energy: [0, 1], code: `
fx({ delay: 0.4, rev: 0.4 })
loop('glass', (i) => {
  for (const n of melody('c', { style: 'cells', octave: 3 })) {
    if (n.notes.length) synth('fm_glass', n.notes, { amp: 0.14 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'min_stab_ostinato', role: 'lead', flavours: { minimal: 1, acid: 0.5 }, energy: [0.3, 1], code: `
fx({ delay: 0.3, lpf: 3500 })
loop('stab', (i) => {
  for (const n of melody('o', { style: 'ostinato', octave: 2 })) {
    if (n.note) synth('efd_stab', n.note, { amp: 0.18 * n.vel })
    sleep(n.dur)
  }
})` },

  // ───── minimal: texture ─────
  { id: 'min_room', role: 'texture', flavours: { minimal: 1, dub: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.3, lpf: 4000 })
loop('room', (i) => {
  for (const e of collage('c', { pool: ['outdoor', 'east', 'noise2'], rate: walk('r', 0.1, 0.3, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * 0.8, pan: e.pan, amp: e.amp * 0.35, cut: 2 })
    sleep(e.dur)
  }
})` },

  { id: 'min_hiss', role: 'texture', flavours: { minimal: 1 }, energy: [0, 1], code: `
fx({ lpf: 9000 })
loop('hiss', (i) => {
  const t = tape('t')
  synth('hiss_bed', 74, { dur: 3.5, attack: 0.5, release: 1, amp: 0.2 * t.level })
  sleep(4)
})` },

  { id: 'min_pad_air', role: 'texture', flavours: { minimal: 1, space: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.55, lpf: 5000 })
loop('air', (i) => {
  synth('efd_pad', degree(choose([4, 6]), 2), { dur: 12, attack: 4, release: 4, amp: 0.1 })
  sleep(16)
})` },

  { id: 'min_far_voice', role: 'texture', flavours: { minimal: 1, boc: 0.4 }, energy: [0, 1], code: `
fx({ rev: 0.5, delay: 0.4, lpf: 2500 })
loop('voice', (i) => {
  for (const e of collage('c', { pool: ['speechless', 'speech'], rate: 0.12 })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, pan: e.pan, amp: e.amp * 0.35, cut: 1 })
    sleep(e.dur)
  }
})` },

  { id: 'min_bell_wash', role: 'texture', flavours: { minimal: 1, dub: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.6, delay: 0.5 })
loop('wash', (i) => {
  const wait = choose([1, 2, 3])
  sleep(wait)
  synth('efd_bell', degree(choose([0, 2, 4, 7]), 3), { amp: 0.12 })
  sleep(4 - wait)
})` },

  { id: 'min_hum', role: 'texture', flavours: { minimal: 1, dark: 0.4 }, energy: [0, 1], code: `
fx({ lpf: 600 })
loop('hum', (i) => {
  synth('hum_bed', ROOT - 12, { dur: 14, attack: 3, release: 4, amp: 0.3 })
  sleep(16)
})` },
);
