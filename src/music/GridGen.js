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
  // target (optional): { density, weights: { letter: hits }, rates: { letter: hits a step } }
  // from what the layer played, so the grid plays each sound about as often as it did
  make(letters, role, genre = null, w = 4, h = w, target = null) {
    const R = target ? { density: Math.max(0.05, Math.min(0.85, target.density)), letters: target.weights } : GridGen.ROLES[role] || GridGen.ROLES.lead;
    const weights = Object.entries(R.letters).filter(([l]) => letters.includes(l));
    if (!weights.length) for (const l of letters) weights.push([l, 1]);
    // how often each sound should play, hits per step
    const tw = weights.reduce((s, [, x]) => s + x, 0) || 1;
    const rates = (target && target.rates) || Object.fromEntries(weights.map(([l, x]) => [l, R.density * x / tw]));
    const chance = genre === 'ae' ? 0.1 : 0.04;
    const pick = () => {
      let t = this.rng.float(0, tw);
      for (const [l, x] of weights) if ((t -= x) <= 0) return l;
      return weights[0][0];
    };
    let best = null;
    for (let tries = 0; tries < 200; tries++) {
      // (how full of sounds the cells are varies from try to try: the path decides the rest)
      const fill = Math.max(0.05, Math.min(0.85, R.density * this.rng.float(0.6, 1.8)));
      const cells = [];
      for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
          const r = this.rng.float(0, 1);
          if (r < 0.1) row.push(this.rng.pick(['>', '<', '^', 'v']));
          else if (r < 0.1 + chance) row.push('?');
          else if (r < 0.1 + chance + fill) row.push(pick());
          else row.push('.');
        }
        cells.push(row);
      }
      cells[0][0] = '>';
      const rows = cells.map((r) => r.join(' '));
      const score = this.score(rows, letters, rates);
      if (!best || score > best.score) best = { rows, score };
    }
    return best.rows;
  }

  // How a program plays for 4 bars (64 steps), from its start and, when given, from where
  // its cursors are now (`cursors`, the live state: a change mustn't trap them):
  // -> { ok, density, missing } — ok: every sound plays and something plays from both.
  health(rows, letters, cursors = null) {
    const sounds = {};
    for (const l of letters) sounds[l] = l;
    let g;
    try { g = Grid.parse('grelha', rows, sounds); } catch (e) { return { ok: false, density: 0, missing: letters.length }; }
    const run = (state) => {
      const { hits } = Grid.walk(g, state, 64);
      const seen = new Set();
      for (const h of hits) for (const x of h.cell.hits) seen.add(x.letter);
      return { density: new Set(hits.map((h) => h.k)).size / 64, missing: letters.filter((l) => !seen.has(l)).length };
    };
    const a = run(Grid.init(g));
    let ok = a.missing === 0 && a.density > 0;
    if (ok && cursors) {
      const b = run({ sig: g.sig, step: 0, trace: [], cursors: cursors.map((c) => ({ x: Math.min(c.x, g.w - 1), y: Math.min(c.y, g.h - 1), dir: c.dir })) });
      ok = b.density > 0 && b.missing < letters.length;
    }
    return { ok, density: a.density, missing: a.missing };
  }

  // A change that keeps the program alive: tries `change` up to 40 times and keeps the
  // first whose result still plays every sound, at about the same density (×0.5…×1.8), and
  // doesn't trap the cursors in a silent loop (an arrow facing another, a row of dots).
  // From a program that is already stuck the first change that plays more of its sounds
  // will do (the next bars carry on until it's healthy). -> change, or null.
  safe(rows, letters, change, cursors = null) {
    const now = this.health(rows, letters, cursors);
    let better = null;
    for (let t = 0; t < 60; t++) {
      const mu = change();
      if (!mu || mu.to === mu.from) continue;
      const next = mu.rows || rows.map((r, y) => r.trim().split(/\s+/).map((c, x) => (x === mu.x && y === mu.y ? mu.to : c)).join(' '));
      const h = this.health(next, letters, cursors);
      if (!now.ok && !h.ok) {
        if (!better && h.density > 0 && (h.missing < now.missing || now.density === 0)) better = Object.assign(mu, { rows: next });
        continue;
      }
      if (!h.ok) continue;
      if (now.ok && (h.density < now.density * 0.5 || h.density > Math.max(0.1, now.density * 1.8))) continue;
      return Object.assign(mu, { rows: next });
    }
    return better;
  }

  // Two cells swap places (never the start): the same sounds, as often, in another order;
  // what a build-up does, a few times a bar. -> { x, y, from, to, x2, y2, rows }
  swap(rows) {
    const cells = rows.map((r) => r.trim().split(/\s+/));
    const spots = [];
    cells.forEach((r, y) => r.forEach((c, x) => { if (x || y) spots.push([x, y]); }));
    const [x, y] = this.rng.pick(spots);
    const others = spots.filter(([a, b]) => cells[b][a] !== cells[y][x]);
    if (!others.length) return null;
    const [x2, y2] = this.rng.pick(others);
    const from = cells[y][x], to = cells[y2][x2];
    cells[y][x] = to;
    cells[y2][x2] = from;
    return { x, y, from, to, x2, y2, rows: cells.map((r) => r.join(' ')) };
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

  // Walks a program 8 bars exactly as the radio will play it (the same name, so the same
  // draws for ?, from the same start) and compares, sound by sound, how often each plays
  // with `rates` (hits a step). Every sound must play (one left out costs more than any
  // other error); a path of more than a few cells is a little better.
  score(rows, letters, rates) {
    const sounds = {};
    for (const l of letters) sounds[l] = l;
    let g;
    try { g = Grid.parse('grelha', rows, sounds); } catch (e) { return -99; }
    // (counted in 4 blocks of 2 bars: a grid that plays it all at once and then falls quiet
    // for bars — a ? that only sometimes finds the sounds — scores badly even if the total fits)
    const N = 128, B = 4, per = N / B;
    const { hits, path } = Grid.walk(g, Grid.init(g), N);
    const cells = new Set(path.map((p) => p[0].join(','))).size;
    const count = {}, blocks = Array.from({ length: B }, () => ({}));
    for (const h of hits) for (const x of h.cell.hits) {
      count[x.letter] = (count[x.letter] || 0) + 1;
      const b = blocks[Math.min(B - 1, Math.floor(h.k / per))];
      b[x.letter] = (b[x.letter] || 0) + 1;
    }
    const missing = letters.filter((l) => !count[l]).length;
    const total = letters.reduce((s, l) => s + (rates[l] || 0), 0);
    let err = 0;
    for (const b of blocks) for (const l of letters) err += Math.abs((b[l] || 0) / per - (rates[l] || 0)) / B;
    return -missing * 20 - err / Math.max(total, 0.02) * 10 + Math.min(cells, 8) * 0.1;
  }
};
