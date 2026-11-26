import { Grid } from '../lang/Grid.js';

// GridGen: writes a small Befunge-like program (4×4 by default, one symbol per cell) for a
// layer's sounds. The cursor starts top left going right and keeps to its row or column,
// wrapping around it, until an arrow or ? turns it; the rhythm is the path. Each try is
// walked for two bars and the one whose density suits the role (and that visits more than a
// few cells) is kept.
export class GridGen {
  // how much of the time each role plays, and how its letters weigh
  static ROLES = {
    drums: { density: 0.55, letters: { k: 3, s: 2, h: 4, p: 1 } },
    perc: { density: 0.4, letters: { p: 3, h: 2, k: 1, s: 1 } },
    bass: { density: 0.45, letters: { a: 1 } },
    lead: { density: 0.4, letters: { a: 1, c: 0.3 } },
    keys: { density: 0.2, letters: { c: 2, a: 1 } },
    texture: { density: 0.15, letters: { c: 1, a: 1 } },
  };

  constructor(rng) { this.rng = rng; }

  // letters: the sound letters there are (k s h p a c); genre: 'ae' gets more ?
  // -> rows ['> K S H', ...]
  // target (optional): { density, weights: { letter: hits } } from what the layer played, so
  // the grid keeps its density and how much each sound plays
  make(letters, role, genre = null, w = 4, h = w, target = null) {
    const R = target ? { density: Math.max(0.05, Math.min(0.85, target.density)), letters: target.weights } : GridGen.ROLES[role] || GridGen.ROLES.lead;
    const weights = Object.entries(R.letters).filter(([l]) => letters.includes(l));
    if (!weights.length) for (const l of letters) weights.push([l, 1]);
    const chance = genre === 'ae' ? 0.1 : 0.04;
    const pick = () => {
      let t = this.rng.float(0, weights.reduce((s, [, w]) => s + w, 0));
      for (const [l, w] of weights) if ((t -= w) <= 0) return l;
      return weights[0][0];
    };
    let best = null;
    for (let tries = 0; tries < 120; tries++) {
      const cells = [];
      for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
          const r = this.rng.float(0, 1);
          if (r < 0.1) row.push(this.rng.pick(['>', '<', '^', 'v']));
          else if (r < 0.1 + chance) row.push('?');
          else if (r < 0.1 + chance + R.density) row.push(pick());
          else row.push('.');
        }
        cells.push(row);
      }
      cells[0][0] = '>';
      const rows = cells.map((r) => r.join(' '));
      const score = this.score(rows, letters, R.density, R.letters);
      if (!best || score > best.score) best = { rows, score };
    }
    return best.rows;
  }

  // One change to a program, the way it grows while it plays: a cell (never the start)
  // turns another way, swaps its sound, falls silent or starts to sound.
  // -> { x, y, from, to }
  mutate(rows, letters) {
    const cells = rows.map((r) => r.trim().split(/\s+/));
    const spots = [];
    cells.forEach((r, y) => r.forEach((c, x) => { if (x || y) spots.push([x, y]); }));
    const [x, y] = this.rng.pick(spots);
    const from = cells[y][x];
    const arrows = ['>', '<', '^', 'v'];
    let to;
    if (arrows.includes(from)) to = this.rng.chance(0.25) ? '?' : this.rng.pick(arrows.filter((a) => a !== from));
    else if (from === '?') to = this.rng.pick(arrows);
    else if (from === '.') { const r = this.rng.float(0, 1); to = r < 0.6 ? this.rng.pick(letters) : r < 0.85 ? this.rng.pick(arrows) : '?'; }
    else { const others = letters.filter((l) => l !== from.toLowerCase()); to = others.length && this.rng.chance(0.5) ? this.rng.pick(others) : '.'; }
    return { x, y, from, to };
  }

  // Walks a program two bars: how close its density is to the role's, how many cells it
  // visits (a path, not a 1-cell loop), how many different sounds it plays.
  // Walks a program 4 bars: every sound must play (one left out costs a lot), as often as
  // the role / the layer did (density), in about the same proportions (weights), along a
  // path of more than a few cells.
  score(rows, letters, density, weights = null) {
    const sounds = {};
    for (const l of letters) sounds[l] = l;
    let g;
    try { g = Grid.parse('gen', rows, sounds, { semente: 1 }); } catch (e) { return -99; }
    const { hits, path } = Grid.walk(g, Grid.init(g), 64);
    const played = new Set(hits.map((h) => h.k)).size / 64;
    const cells = new Set(path.map((p) => p[0].join(','))).size;
    const count = {};
    for (const h of hits) for (const x of h.cell.hits) count[x.letter] = (count[x.letter] || 0) + 1;
    const missing = letters.filter((l) => !count[l]).length;
    let mix = 0;
    if (weights) {
      const tw = letters.reduce((s, l) => s + (weights[l] || 0), 0) || 1;
      const tc = letters.reduce((s, l) => s + (count[l] || 0), 0) || 1;
      for (const l of letters) mix += Math.abs((weights[l] || 0) / tw - (count[l] || 0) / tc);
    }
    return -missing * 5 - Math.abs(played - density) * 10 - mix * 3 + Math.min(cells, 8) * 0.15;
  }
};
