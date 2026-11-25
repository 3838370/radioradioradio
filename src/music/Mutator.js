// Mutator: small, musical edits to pattern code. `variation` (0..1) scales how far numbers
// move and unlocks bolder kinds of edit:
//   always       levels, filters, sends (tiny at 0, wider at 1)
//   >= 0.35      rhythm density (one_in, spread), chord extensions, wobble/crush
//   >= 0.65      sample variants and kit swaps
// Numbers are kept within a range around the pattern's original value, so a layer never
// drifts far from what was written.
RA.Mutator = class Mutator {
  static VARIANT_FOLDERS = ['808bd', 'bd', 'sn', '808sd', 'realclaps', 'click', 'metal', 'tok', 'industrial', 'space', 'birds', 'outdoor', 'speech', 'mouth', 'wind'];
  static KIT_FAMILIES = [['dr2', 'drumtraks', 'odx'], ['glitch', 'glitch2'], ['808sd', 'sn'], ['speech', 'mouth']];

  static NUMERIC = [
    { key: 'amp', re: /amp: (\d*\.?\d+)/g, step: (v, x) => v * (1 + x * 0.25), lo: 0.02, hi: 1.2, dp: 2, tier: 0 },
    { key: 'lpf', re: /lpf: (\d+)/g, step: (v, x) => v * (1 + x * 0.5), lo: 250, hi: 14000, dp: 0, tier: 0 },
    { key: 'cutoff', re: /cutoff: (\d+)/g, step: (v, x) => v * (1 + x * 0.5), lo: 150, hi: 6000, dp: 0, tier: 0 },
    { key: 'rev', re: /rev: (\d*\.?\d+)/g, step: (v, x) => v + x * 0.15, lo: 0, hi: 0.7, dp: 2, tier: 0 },
    { key: 'delay', re: /delay: (\d*\.?\d+)/g, step: (v, x) => v + x * 0.15, lo: 0, hi: 0.6, dp: 2, tier: 0 },
    { key: 'wobble', re: /wobble: (\d*\.?\d+)/g, step: (v, x) => v + x * 0.25, lo: 0, hi: 0.9, dp: 2, tier: 1 },
    { key: 'crush', re: /crush: (\d*\.?\d+)/g, step: (v, x) => v + x * 0.2, lo: 0, hi: 0.6, dp: 2, tier: 1 },
    { key: 'one_in', re: /one_in\((\d+)\)/g, step: (v, x) => v + Math.sign(x || 1), lo: 2, hi: 12, dp: 0, tier: 1 },
  ];

  constructor(rng, sampleCount) {
    this.rng = rng;
    this.sampleCount = sampleCount; // (folder) => number of files
  }

  static splice(code, start, len, str) { return code.slice(0, start) + str + code.slice(start + len); }

  // The value at the same occurrence in the original code, to bound drift.
  static original(original, re, index) {
    const ms = [...original.matchAll(re)];
    return ms[index] ? parseFloat(ms[index][1]) : null;
  }

  numeric(code, original, op, variation) {
    const ms = [...code.matchAll(op.re)];
    if (!ms.length) return null;
    const idx = Math.floor(this.rng.next() * ms.length);
    const m = ms[idx];
    const cur = parseFloat(m[1]);
    const x = this.rng.float(-1, 1) * (0.15 + 0.85 * variation);
    let v = op.step(cur, x);
    const base = Mutator.original(original, op.re, idx);
    if (base != null && op.key !== 'one_in') {
      const span = op.dp === 2 && base < 1 ? 0.2 + 0.3 * variation : 0;
      const lo = span ? base - span : base * (0.6 - 0.2 * variation);
      const hi = span ? base + span : base * (1.4 + 0.6 * variation);
      v = RA.MathUtil.clamp(v, lo, hi);
    }
    v = RA.MathUtil.clamp(v, op.lo, op.hi);
    const str = op.dp ? v.toFixed(op.dp) : String(Math.round(v));
    if (str === m[1]) return null;
    const start = m.index + m[0].lastIndexOf(m[1]);
    return { code: Mutator.splice(code, start, m[1].length, str), desc: `${op.key} ${m[1]} → ${str}` };
  }

  spread(code) {
    const ms = [...code.matchAll(/spread\((\d+), (\d+)/g)];
    if (!ms.length) return null;
    const m = this.rng.pick(ms);
    const h = +m[1], steps = +m[2];
    const nh = RA.MathUtil.clamp(h + (this.rng.chance(0.5) ? -1 : 1), 1, steps - 1);
    if (nh === h) return null;
    const start = m.index + 'spread('.length;
    return { code: Mutator.splice(code, start, m[1].length, String(nh)), desc: `spread(${h}, ${steps}) → spread(${nh}, ${steps})` };
  }

  harm(code) {
    const ms = [...code.matchAll(/harm\((\d+), '(\d?)'\)/g)];
    if (!ms.length) return null;
    const m = this.rng.pick(ms);
    const ext = this.rng.pick(['', '7', '9'].filter((e) => e !== m[2]));
    const start = m.index + m[0].lastIndexOf(`'${m[2]}'`);
    const label = (e) => (e === '' ? 'triad' : e === '7' ? '7th' : '9th');
    return { code: Mutator.splice(code, start, m[2].length + 2, `'${ext}'`), desc: `chord ${label(m[2])} → ${label(ext)}` };
  }

  variant(code) {
    const ms = [...code.matchAll(/s\('(\w+)', \{ n: (\d+)/g)].filter((m) => Mutator.VARIANT_FOLDERS.includes(m[1]));
    if (!ms.length) return null;
    const m = this.rng.pick(ms);
    const count = Math.min(this.sampleCount(m[1]) || 1, 24);
    if (count < 2) return null;
    let n = this.rng.int(0, count - 1);
    if (n === +m[2]) n = (n + 1) % count;
    const start = m.index + m[0].lastIndexOf(m[2]);
    return { code: Mutator.splice(code, start, m[2].length, String(n)), desc: `${m[1]} n: ${m[2]} → ${n}` };
  }

  kit(code) {
    const names = [...code.matchAll(/s\('(\w+)'/g)].map((m) => m[1]);
    const fams = Mutator.KIT_FAMILIES.filter((f) => names.some((n) => f.includes(n)));
    if (!fams.length) return null;
    const fam = this.rng.pick(fams);
    const from = names.find((n) => fam.includes(n));
    const to = this.rng.pick(fam.filter((n) => n !== from));
    return { code: code.split(`s('${from}'`).join(`s('${to}'`), desc: `${from} → ${to}` };
  }

  // Only the body is mutated: the head (inst(...) lines and the top-level fx line) belongs
  // to the instrument panel and the automation.
  mutate(code, original, variation) {
    const a = RA.CodeTools.split(code);
    const b = RA.CodeTools.split(original);
    const r = this.mutateBody(a.body, b.body, variation);
    return r ? { code: RA.CodeTools.join(a.head, r.code), desc: r.desc } : null;
  }

  mutateBody(code, original, variation) {
    const tier = variation >= 0.65 ? 2 : variation >= 0.35 ? 1 : 0;
    const tries = Mutator.NUMERIC.filter((op) => op.tier <= tier).map((op) => () => this.numeric(code, original, op, variation));
    if (tier >= 1) tries.push(() => this.spread(code), () => this.harm(code));
    if (tier >= 2) tries.push(() => this.variant(code), () => this.kit(code));
    for (const t of this.rng.shuffle(tries)) {
      const r = t();
      if (r && r.code !== code) return r;
    }
    return null;
  }
};
