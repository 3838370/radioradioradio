// Recipe: every time a pattern comes in it is a new version of itself. Its `slots` (if it
// has any: { name: [options] }, written as $name in the code) are drawn, and some of its
// synths, sample kits and sample variants are swapped for others of the same family
// (see Families). The result is plain code, so the card shows exactly what plays.
// `sig` identifies the version, for the session memory.
RA.Recipe = class Recipe {
  // ctx: { rng, synthExists(name), sampleCount(folder), strength 0..1 (how much changes) }
  static roll(pattern, ctx) {
    const { rng } = ctx;
    const strength = ctx.strength == null ? 0.5 : ctx.strength;
    const F = RA.Families;
    const changes = [];
    let code = pattern.code;

    for (const [name, options] of Object.entries(pattern.slots || {})) {
      const v = rng.pick(options);
      code = code.split('$' + name).join(String(v));
      changes.push(`${name}=${v}`);
    }

    const synths = [...new Set([...code.matchAll(/synth\('(\w+)'/g)].map((m) => m[1]))];
    for (const name of synths) {
      const fam = F.synthFamily(name);
      if (!fam || !rng.chance(0.1 + 0.45 * strength)) continue;
      const to = F.alt(F.SYNTHS[fam], name, rng, ctx.synthExists);
      if (!to) continue;
      code = code.split(`synth('${name}'`).join(`synth('${to}'`);
      changes.push(`${name} → ${to}`);
    }

    const folders = [...new Set([...code.matchAll(/\bs\('(\w+)'/g)].map((m) => m[1]))];
    for (const folder of folders) {
      const fam = F.kitFamily(folder);
      if (!fam || !rng.chance(0.05 + 0.35 * strength)) continue;
      const to = F.alt(F.KITS[fam], folder, rng, (f) => ctx.sampleCount(f) > 0);
      if (!to) continue;
      code = code.split(`s('${folder}'`).join(`s('${to}'`);
      changes.push(`${folder} → ${to}`);
    }

    code = code.replace(/\bs\('(\w+)', \{ n: (\d+)/g, (m, folder, n) => {
      const count = Math.min(ctx.sampleCount(folder) || 0, 32);
      if (count < 2 || !rng.chance(0.1 + 0.4 * strength)) return m;
      const k = rng.int(0, count - 1);
      if (k === +n) return m;
      changes.push(`${folder}:${n} → ${k}`);
      return `s('${folder}', { n: ${k}`;
    });

    return { code, changes, sig: pattern.id + '|' + changes.slice().sort().join(',') };
  }
};
