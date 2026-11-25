// lib_dark_ind_ae: more dark, industrial and Autechre-like layers, many of them for the
// slow tension sections (dread: heavy half-time, subs, low brass, tremolo strings;
// suspense: risers, scrapes, drones). Odd loops (ritual 12/8, ae_odd) are marked odd.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(
  // ───── drums ─────
  { id: 'dark_dread_kit', role: 'drums', flavours: { dark: 1, industrial: 0.6 }, energy: [0.3, 1], code: `
fx({ lpf: 3500, rev: 0.25, crush: 0.08 })
loop('kit', (i) => {
  const b = beat('b', { style: 'halftime_dread', density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 18, amp: 0.9 * st.v })
    if (st.s) s('realclaps', { n: 2, amp: 0.4 * st.v })
    if (st.h) s('hh', { n: 9, amp: 0.1 * st.v, pan: 0.2 })
    if (st.p) s('metal', { n: 3, amp: 0.08 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'dark_ritual_drums', role: 'drums', flavours: { dark: 0.9, ae: 0.5 }, energy: [0.3, 1], odd: true, code: `
fx({ lpf: 4500, rev: 0.3 })
loop('ritual', (i) => {
  const b = beat('b', { style: 'ritual', density: 0.55 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('bd', { n: 7, amp: 0.75 * st.v })
    if (st.s) s('tabla2', { n: 12, amp: 0.3 * st.v })
    if (st.h) s('tabla2', { n: 30, amp: 0.08 * st.v, pan: 0.3 })
    if (st.p) s('tabla', { n: 5, amp: 0.14 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'ind_clubkick_four', role: 'drums', flavours: { industrial: 1, dark: 0.5 }, energy: [0.4, 1], code: `
fx({ lpf: 7000, crush: 0.12, rev: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: 'four', density: walk('d', 0.4, 0.8, 0.1) })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('clubkick', { n: 3, amp: 0.9 * st.v })
    if (st.s) s('industrial', { n: 4, amp: 0.3 * st.v })
    if (st.h) s('metal', { n: 1, amp: 0.08 * st.v, pan: 0.3 })
    if (st.p) s('industrial', { n: 12, amp: 0.1 * st.v, pan: -0.3 })
    sleep(0.25)
  }
})` },

  { id: 'ae_break_odd', role: 'drums', flavours: { ae: 1, industrial: 0.5 }, energy: [0.3, 1], odd: true, code: `
fx({ lpf: 8000, crush: 0.15, delay: 0.1 })
loop('kit', (i) => {
  const b = beat('b', { style: 'ae_odd', density: 0.6 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('808bd', { n: 9, amp: 0.85 * st.v })
    if (st.s) s('glitch2', { n: 3, amp: 0.3 * st.v })
    if (st.h) s('hh27', { n: 2, amp: 0.1 * st.v, pan: rrand(-0.5, 0.5) })
    if (st.p) s('blip', { n: 0, amp: 0.1 * st.v, rate: choose([1, 2]) })
    sleep(0.25)
  }
})` },

  { id: 'dark_pulse_heart', role: 'drums', flavours: { dark: 1, ae: 0.4 }, energy: [0, 0.8], code: `
fx({ lpf: 900, rev: 0.4 })
loop('pulse', (i) => {
  const b = beat('b', { style: 'pulse_sparse', density: 0.35 })
  for (let k = 0; k < b.length; k++) {
    const st = b[k]
    if (st.k) s('bd', { n: 1, amp: 0.8 * st.v, rate: 0.7 })
    if (st.p) s('808lt', { n: 0, amp: 0.1 * st.v, rate: 0.6 })
    sleep(0.25)
  }
})` },

  // ───── perc ─────
  { id: 'dark_metal_scrape_hits', role: 'perc', flavours: { dark: 1, industrial: 0.7 }, energy: [0.2, 1], code: `
fx({ rev: 0.45, delay: 0.25, lpf: 5000 })
loop('scrape', (i) => {
  const wait = vary('w', [1, 2, 3], 8)
  sleep(wait)
  synth('metal_scrape', degree(choose([0, 1, 4]), 1), { dur: 0.6, amp: 0.3, pan: rrand(-0.6, 0.6) })
  sleep(4 - wait)
})` },

  { id: 'ind_anvil_grid', role: 'perc', flavours: { industrial: 1, dark: 0.5, ae: 0.4 }, energy: [0.3, 1], code: `
fx({ rev: 0.2, delay: 0.15, lpf: 7000 })
loop('anvil', (i) => {
  const hits = spread(vary('h', [3, 5, 7], 8), 16, vary('r', [0, 2, 5], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) { if (one_in(3)) synth('anvil', degree(choose([0, 3]), 2), { amp: 0.18 }); else s('metal', { n: vary('mn', [0, 5, 8], 8), amp: 0.12, pan: rrand(-0.5, 0.5) }) }
    sleep(0.25)
  }
})` },

  { id: 'ae_glitch_scatter', role: 'perc', flavours: { ae: 1, industrial: 0.5 }, energy: [0.25, 1], code: `
fx({ crush: 0.2, delay: 0.15, lpf: 9000 })
loop('glitch', (i) => {
  const odds = vary('odds', [3, 4, 6], 4)
  for (let k = 0; k < 32; k++) {
    if (one_in(odds)) s(choose(['glitch2', 'blip', 'bleep']), { n: rrand_i(0, 6), amp: 0.08, rate: choose([1, 1.5, 2, 0.5]), pan: rrand(-0.8, 0.8), cut: 0.1 })
    sleep(0.125)
  }
})` },

  { id: 'dark_tabla_low', role: 'perc', flavours: { dark: 0.9, ae: 0.5 }, energy: [0.1, 1], code: `
fx({ rev: 0.4, lpf: 2500 })
loop('tabla', (i) => {
  const hits = spread(vary('h', [3, 5], 8), 16, vary('r', [2, 7], 8))
  for (let k = 0; k < 16; k++) {
    if (hits[k]) s('tabla2', { n: vary('n', [1, 8, 21], 8), amp: 0.18, rate: 0.6, pan: rrand(-0.3, 0.3) })
    sleep(0.25)
  }
})` },

  { id: 'dark_clock_tick', role: 'perc', flavours: { dark: 0.9, industrial: 0.5 }, energy: [0, 0.9], code: `
fx({ rev: 0.35, lpf: 3000, delay: 0.2 })
loop('tick', (i) => {
  for (let k = 0; k < 4; k++) {
    s('click', { n: k % 2, amp: 0.08, pan: k % 2 ? 0.4 : -0.4, rate: 0.8 })
    sleep(1)
  }
})` },

  // ───── bass ─────
  { id: 'dark_dread_sub_line', role: 'bass', flavours: { dark: 1, industrial: 0.6, ae: 0.3 }, energy: [0.25, 1], code: `
fx({ lpf: 450, crush: 0.06 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: vary('st', ['sub', 'dub'], 16) })) {
    if (b.note) synth('dread_sub', b.note, { dur: b.len, amp: 0.48 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'ae_fm_bass_line', role: 'bass', flavours: { ae: 1, industrial: 0.5 }, energy: [0.35, 1], code: `
fx({ lpf: 2500, crush: 0.1 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'acid' })) {
    if (b.note) synth('fm_bass', b.note, { dur: b.len * 0.8, amp: 0.38 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'ae_sh_bass_808', role: 'bass', flavours: { ae: 0.9, dark: 0.5 }, energy: [0.3, 1], code: `
fx({ lpf: 900, delay: 0.08 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: '808' })) {
    if (b.note) synth('sh_bass', b.note, { dur: b.len * 0.7, amp: 0.35 * b.vel, cutoff: 600 })
    sleep(b.dur)
  }
})` },

  { id: 'ae_dx_bass_stutter', role: 'bass', flavours: { ae: 0.9, industrial: 0.4 }, energy: [0.4, 1], code: `
fx({ lpf: 1600, crush: 0.12 })
loop('bass', (i) => {
  for (const b of bassline('b', { style: 'pedal' })) {
    if (b.note && !one_in(3)) synth('dx_bass', b.note, { dur: b.len * 0.5, amp: 0.38 * b.vel })
    sleep(b.dur)
  }
})` },

  { id: 'dark_low_brass_bass', role: 'bass', flavours: { dark: 0.9, ae: 0.5, fog: 0.3 }, energy: [0.2, 1], code: `
fx({ lpf: 700, rev: 0.25 })
loop('brass', (i) => {
  for (const b of bassline('b', { style: 'sub' })) {
    if (b.note) synth('low_brass', b.note, { dur: b.len * 0.9, attack: 0.5, amp: 0.3 * b.vel })
    sleep(b.dur)
  }
})` },

  // ───── keys ─────
  { id: 'ind_tension_strings', role: 'keys', flavours: { industrial: 1, dark: 0.7 }, energy: [0.3, 1], code: `
fx({ rev: 0.35, lpf: 2500 })
loop('strings', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['cluster', 'm7'], 16), rhythm: 'long', octave: 1 })) {
    if (c.notes) synth('tension_string', c.notes, { dur: c.len, amp: 0.22 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'ind_dread_pad', role: 'keys', flavours: { industrial: 0.9, dark: 0.8 }, energy: [0, 1], code: `
fx({ rev: 0.4, lpf: 1200, crush: 0.05 })
loop('pad', (i) => {
  for (const c of chords('c', { voicing: 'fifths', rhythm: 'long', octave: 0 })) {
    if (c.notes) synth('dread_pad', c.notes, { dur: c.len, attack: 1.5, amp: 0.24 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'ae_glass_quartal', role: 'keys', flavours: { ae: 1, industrial: 0.5 }, energy: [0.2, 1], code: `
fx({ delay: 0.3, rev: 0.3 })
loop('glass', (i) => {
  for (const c of chords('c', { voicing: 'quartal', rhythm: 'stab', octave: 2, density: 0.7 })) {
    if (c.notes) synth('fm_glass', c.notes, { dur: c.len, amp: 0.16 * c.vel, strum: rrand(-0.1, 0.1) })
    sleep(c.dur)
  }
})` },

  { id: 'ae_pwm_cluster', role: 'keys', flavours: { ae: 1, dark: 0.4 }, energy: [0.15, 1], code: `
fx({ lpf: 2200, rev: 0.25, crush: 0.08 })
loop('cluster', (i) => {
  for (const c of chords('c', { voicing: 'cluster', rhythm: 'push', octave: 1, density: 0.5 })) {
    if (c.notes) synth('pwm_pad', c.notes, { dur: Math.max(0.25, c.len), amp: 0.2 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'ind_low_brass_stabs', role: 'keys', flavours: { industrial: 1, ae: 0.5 }, energy: [0.4, 1], code: `
fx({ lpf: 2000, crush: 0.1, delay: 0.15 })
loop('stabs', (i) => {
  for (const c of chords('c', { voicing: 'fifths', rhythm: 'stab', octave: 1, density: 0.6 })) {
    if (c.notes) synth('low_brass', c.notes, { dur: 0.3, attack: 0.05, amp: 0.26 * c.vel })
    sleep(c.dur)
  }
})` },

  { id: 'ae_marimba_push', role: 'keys', flavours: { ae: 0.9, industrial: 0.5 }, energy: [0.25, 1], code: `
fx({ delay: 0.25, rev: 0.2 })
loop('marimba', (i) => {
  for (const c of chords('c', { voicing: vary('v', ['m7', 'sus4'], 8), rhythm: 'push', octave: 2, density: 0.8 })) {
    if (c.notes) synth('dx_marimba', c.notes, { amp: 0.2 * c.vel, strum: 0.06 })
    sleep(c.dur)
  }
})` },

  // ───── lead ─────
  { id: 'dark_formant_motif', role: 'lead', flavours: { dark: 1, industrial: 0.5 }, energy: [0, 1], code: `
fx({ rev: 0.5, delay: 0.3, lpf: 3000 })
loop('voice', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.25, octave: 1 })) {
    if (n.note) synth('formant_voice', n.note, { dur: n.dur, amp: 0.24 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'dark_bell_dread', role: 'lead', flavours: { dark: 0.9, ae: 0.5 }, energy: [0, 1], code: `
fx({ delay: 0.55, rev: 0.5 })
loop('bell', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.2, octave: 1 })) {
    if (n.note && !one_in(3)) synth('dx_bell', n.note, { amp: 0.24 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'ae_sh_lead_glitch', role: 'lead', flavours: { ae: 1, industrial: 0.5 }, energy: [0.3, 1], code: `
fx({ crush: 0.12, delay: 0.2, lpf: 6000 })
loop('lead', (i) => {
  for (const n of motif('m', { beats: 4, density: 0.8, octave: 2 })) {
    if (n.note && !one_in(4)) synth('sh_lead', n.note, { dur: n.dur * 0.5, amp: 0.2 * n.vel, nudge: rrand(0, 0.08) })
    sleep(n.dur)
  }
})` },

  { id: 'ind_radio_lead', role: 'lead', flavours: { industrial: 1, ae: 0.5, dark: 0.4 }, energy: [0.2, 1], code: `
fx({ rev: 0.3, delay: 0.25, lpf: 5000 })
loop('radio', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.3, octave: 2 })) {
    if (n.note) synth(vary('inst', ['shortwave', 'radio_tune'], 16), n.note, { dur: n.dur, amp: 0.22 * n.vel })
    sleep(n.dur)
  }
})` },

  { id: 'dark_tape_ghost', role: 'lead', flavours: { dark: 0.9, space: 0.3 }, energy: [0, 0.8], code: `
fx({ rev: 0.55, wobble: 0.35, lpf: 2200 })
loop('ghost', (i) => {
  for (const n of motif('m', { beats: 8, density: 0.2, octave: 1 })) {
    if (n.note) synth('tape_warble', n.note, { dur: n.dur * 1.2, amp: 0.2 * n.vel })
    sleep(n.dur)
  }
})` },

  // ───── texture ─────
  { id: 'dark_suspense_riser', role: 'texture', flavours: { dark: 1, industrial: 0.6 }, energy: [0, 1], code: `
fx({ rev: 0.45, lpf: 5000 })
loop('rise', (i) => {
  synth('riser_slow', degree(0, 0), { dur: 7, amp: 0.25 })
  sleep(8)
  synth('metal_scrape', degree(4, 1), { dur: 3, amp: 0.15 })
  sleep(8)
})` },

  { id: 'ae_arcade_collage', role: 'texture', flavours: { ae: 1, industrial: 0.6 }, energy: [0.2, 1], code: `
fx({ crush: 0.15, delay: 0.25, rev: 0.25 })
loop('arcade', (i) => {
  for (const e of collage('c', { pool: ['tacscan', 'subroc3d', 'invaders', 'glitch'], rate: walk('r', 0.3, 0.8, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate, begin: e.begin, pan: e.pan, amp: e.amp * 0.6, cut: 0.6 })
    sleep(e.dur)
  }
})` },

  { id: 'ae_radio_static', role: 'texture', flavours: { ae: 1, dark: 0.4 }, energy: [0, 1], code: `
fx({ rev: 0.3, delay: 0.3, lpf: 6000 })
loop('static', (i) => {
  if (one_in(2)) synth(choose(['shortwave', 'radio_tune']), degree(rrand_i(0, 6), 2), { dur: rrand(0.5, 2), amp: 0.14, pan: rrand(-0.7, 0.7) })
  sleep(2)
})` },

  { id: 'ae_diphone_cut', role: 'texture', flavours: { ae: 0.9, industrial: 0.4 }, energy: [0.2, 1], code: `
fx({ crush: 0.1, delay: 0.2, lpf: 5000 })
loop('speech', (i) => {
  for (const e of collage('c', { pool: ['diphone2', 'numbers'], rate: walk('r', 0.3, 0.7, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * choose([1, 1.5]), begin: e.begin, pan: e.pan, amp: e.amp * 0.6, cut: 0.25 })
    sleep(e.dur)
  }
})` },

  { id: 'dark_sea_drone', role: 'texture', flavours: { dark: 0.9, ae: 0.5 }, energy: [0, 0.9], code: `
fx({ rev: 0.55, lpf: 2500, wobble: 0.15 })
loop('sea', (i) => {
  for (const e of collage('c', { pool: ['seawolf', 'crow', 'insect'], rate: walk('r', 0.1, 0.35, 0.1) })) {
    if (e.s) s(e.s, { n: e.n, rate: e.rate * 0.6, begin: e.begin, pan: e.pan, amp: e.amp * 0.8, cut: 4 })
    sleep(e.dur)
  }
})` },
);
