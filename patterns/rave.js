// rave: excited early-90s energy. Breakbeats that keep mutating, hoovers, supersaw gates,
// rave stabs and pianos, distorted basses, rave voices and lasers. ~148 BPM.
RA.PATTERNS = RA.PATTERNS || [];
RA.PATTERNS.push(

  { id: 'rave_amen', role: 'drums', flavours: { drill: 1 }, energy: [0.5, 1], code: `
fx({ lpf: 10000, crush: 0.15 })
loop('amen', (i) => {
  const map = vary('map', [[0, 1, 2, 3], [0, 1, 0, 3], [2, 1, 2, 3], [0, 3, 2, 1]], 4)
  for (let k = 0; k < 16; k++) {
    const slice = map[Math.floor(k / 4)] * 4 + (k % 4) + 16 * (i % 2)
    if (!(k == 15 && one_in(3))) s('amencutup', { n: slice, amp: 0.6, rate: 1.09, cut: 0.25 })
    sleep(0.25)
  }
})` },

  { id: 'rave_808', role: 'bass', flavours: { acid: 1 }, energy: [0.3, 1], code: `
loop('sub', (i) => {
  const pat = vary('pat', [[0, 2.5], [0, 1.5, 2.5], [0, 3]], 8)
  let t = 0
  for (const p of pat) {
    sleep(p - t)
    synth('sub808', ROOT, { dur: 0.5, amp: 0.6 })
    t = p
  }
  sleep(4 - t)
})` },

);
