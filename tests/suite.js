// suite.js: checks for the pure classes and for every pattern in the bank.
(() => {
  const { assert, equal } = RA.TestRunner;
  const runner = new RA.TestRunner();

  // A LiveCoder with no audio: enough to compile and probe pattern code.
  function makeCoder(harmony = new RA.Harmony()) {
    const clock = new RA.Clock(90);
    const coder = new RA.LiveCoder({
      scheduler: { clock, at() {} },
      audio: { bus: () => null, createBus: () => ({ setFx() {} }) },
      emitter: new RA.Emitter(),
      logger: new RA.Logger(),
    });
    coder.attach(new RA.LanguageApi({ coder, audio: null, harmony, clock, energy: () => 0.5 }));
    return coder;
  }

  runner.test('Pattern files: every .rad in the index loads, and the format round-trips', () => {
    const P = RA.PatternLoader;
    assert(RA.PATTERNS.length >= 341, 'loaded: ' + RA.PATTERNS.length);
    for (const p of RA.PATTERNS) {
      const back = P.parse(P.format(p), p.id + '.rad');
      equal([back.id, back.role, back.genres, back.energy, !!back.odd, back.code], [p.id, p.role, p.genres, p.energy, !!p.odd, p.code], p.id);
    }
    const mine = P.parse(P.format({ id: 'user_x', user: true, role: 'lead', genres: { boc: 0.5 }, energy: [0, 1], code: "loop('a', () => sleep(4))" }), 'whatever.rad');
    equal(mine.id, 'user_x', 'your patterns keep their id');
    let bad = null;
    try { P.parse('// role: nope\nloop()', 'x.rad'); } catch (e) { bad = e.message; }
    assert(bad && /role/.test(bad), 'a file without a valid role is refused');
  });

  runner.test('Genres: one table, every genre complete and consistent', () => {
    const G = RA.Genres;
    const sections = Object.keys(RA.Arc.SECTIONS);
    for (const g of G.LIST) {
      const t = G.of(g);
      assert(t.label && t.tempo > 50 && t.tempo < 200 && t.intensity > 0 && t.intensity <= 1, g + ' basics');
      assert(Object.keys(t.tends).every((x) => G.LIST.includes(x) && x !== g), g + ' tends');
      assert([...t.sections.prefer, ...t.sections.avoid].every((s) => sections.includes(s)) && t.sections.cap >= 1 && t.sections.cap <= 6, g + ' sections');
      assert(t.modes.length && t.modes.every((m) => RA.Harmony.MODES.includes(m)), g + ' modes');
      assert(t.progressions.every((p) => p.length && p.every((d) => d >= 0 && d < 7)), g + ' progressions');
      equal([...t.roleOrder].sort(), [...RA.PatternBank.ROLES].sort(), g + ' roleOrder');
      assert(t.collage.length >= 3, g + ' collage');
    }
    equal(G.migrate(['fog', 'rave', 'nope', 'dub']).sort(), ['acid', 'dub']);
    equal(RA.Settings.migrate({ styles: ['acid'], bpm: 100 }), { bpm: 100, genres: ['acid'] });
  });

  runner.test('Settings: one schema; PARAMS defaults within their ranges', () => {
    const S = RA.Settings;
    const ids = S.SCHEMA.map((s) => s.id);
    equal(ids.length, new Set(ids).size, 'unique ids');
    for (const s of S.SCHEMA.filter((x) => x.ui === 'params')) {
      assert(s.group && s.label && s.hint, s.id);
      if (s.kind === 'bool') assert(typeof s.def === 'boolean', s.id);
      else assert(s.min <= s.def && s.def <= s.max && s.step > 0, s.id);
    }
    // the knobs that existed before keep their defaults
    const d = S.DEFAULTS;
    equal([d.pace, d.variation, d.density, d.delayBeats, d.feedback, d.fxAuto, d.bpm, d.volume], [32, 0.3, 5, 0.75, 0.42, 0.4, 116, 0.8]);
    // the transitions as before; notes half as far out of tune; keys and genres change calmly
    equal([d.modulate, d.legMin, d.legMax, d.fadeIn, d.fadeOut, d.tempoGlide, d.sectionLength, d.detune, d.modulateCalm, d.handoffCalm], [0.3, 8, 20, 1, 2, 8, 1, 0.5, true, true]);
    for (const g of S.GENRE_SCHEMA) assert(g.path && g.label && g.hint && RA.Genres.base('boc', g.path) != null, g.id);
  });

  // A stand-in Composer for the transition tests.
  function fakeComposer(over = {}) {
    const vals = Object.assign({}, RA.Settings.DEFAULTS, over.settings || {});
    const c = {
      settings: { get: (k) => vals[k] }, clock: { spb: () => 0.5 }, rng: new RA.Rng(3),
      arc: over.arc || new RA.Arc(new RA.Rng(1)), deck: { size: over.layers == null ? 5 : over.layers },
      harmony: new RA.Harmony(), logger: new RA.Logger(), fast: false, nextMove: 99, genre: 'saw',
      drift: { dominant: () => over.genre || 'acid' },
    };
    c.transitions = new RA.Transitions(c);
    return c;
  }

  runner.test('Transitions: swapped drums and bass stop at once; pads crossfade', () => {
    const t = fakeComposer().transitions; // 0.5 s per beat
    equal([t.fadeOut('drums', true), t.fadeOut('bass', true)], [0.125, 0.125]);
    equal([t.fadeOut('drums'), t.fadeOut('keys', true), t.fadeIn('keys', 8), t.fadeIn('drums', 8)], [4, 4, 2, 0.03]);
  });

  runner.test('Transitions: key changes wait for a calm moment; the listener\'s key does not', () => {
    const arc = new RA.Arc(new RA.Rng(1));
    arc.enter('peak', 0);
    equal(fakeComposer({ arc }).transitions.keyChangeAllowed(), false, 'peak with 5 layers');
    equal(fakeComposer({ arc, layers: 2 }).transitions.keyChangeAllowed(), true, 'two layers');
    equal(fakeComposer({ arc, settings: { modulateCalm: false } }).transitions.keyChangeAllowed(), true, 'switch off');
    arc.enter('release', 0);
    equal(fakeComposer({ arc }).transitions.keyChangeAllowed(), true, 'release');
    const h = new RA.Harmony();
    h.key = 45;
    h.request({ key: 50, prog: [0, 5] });
    h.applyPending(false);
    equal([h.key, h.prog, h.keyPending], [45, [0, 5], true], 'the progression moves, the key waits');
    h.applyPending(true);
    equal([h.key, h.keyPending], [50, false]);
  });

  runner.test('Transitions: a new genre comes in through a quiet section; chords last as the genre says', () => {
    const arc = new RA.Arc(new RA.Rng(1));
    arc.enter('peak', 0);
    const c = fakeComposer({ arc, genre: 'dub' });
    c.transitions.followGenre(8);
    assert(RA.Transitions.QUIET.includes(arc.section) && c.genre === 'dub', 'quiet: ' + arc.section);
    c.harmony.applyPending(true);
    assert(RA.Genres.of('dub').chordBars.includes(c.harmony.barsPerChord), 'bars ' + c.harmony.barsPerChord);
    const off = new RA.Arc(new RA.Rng(1));
    off.enter('peak', 0);
    fakeComposer({ arc: off, genre: 'dub', settings: { handoffCalm: false } }).transitions.followGenre(8);
    equal(off.section, 'peak', 'switch off');
    for (const g of RA.Genres.LIST) {
      const h = new RA.Harmony();
      for (let k = 0; k < 20; k++) assert(RA.Genres.of(g).chordBars.includes(h.planFor(g, new RA.Rng(k)).bars), g);
    }
  });

  runner.test('Settings: a genre\'s own parameters lay over the Genres table, reset and export', () => {
    const s = new RA.Settings();
    equal(s.genre('boc', 'tempo'), 90);
    s.setGenre('boc', 'tempo', 99);
    s.setGenre('dub', 'cap', 3);
    equal([RA.Genres.of('boc').tempo, RA.Genres.get('dub', 'sections.cap'), RA.Genres.base('boc', 'tempo')], [99, 3, 90]);
    equal(RA.Arc.cap(Object.assign(RA.Genres.zeroWeights(), { dub: 1 })), 3);
    const d = new RA.GenreDrift(new RA.Rng(1), { allowed: ['boc'] });
    assert(Math.abs(d.tempo() - 99) <= 7, 'the drift follows the tuned tempo: ' + d.tempo());
    s.setGenre('boc', 'modes', []); // refused: a genre keeps a mode
    assert(RA.Genres.of('boc').modes.length > 0, 'modes kept');
    s.set('wSwap', 2);
    const snap = s.paramsSnapshot();
    const t = new RA.Settings();
    equal(RA.Genres.of('boc').tempo, 90, 'a fresh Settings starts from the table');
    t.loadParams(snap);
    equal([t.get('wSwap'), RA.Genres.of('boc').tempo, t.isGenreDefault('boc', 'tempo'), t.isGenreDefault('saw', 'tempo')], [2, 99, false, true]);
    t.resetGenre('boc', 'tempo');
    equal(RA.Genres.of('boc').tempo, 90);
    t.resetParams();
    equal([t.get('wSwap'), RA.Genres.get('dub', 'sections.cap'), t.get('genreTune')], [1, 5, {}]);
  });

  runner.test('Harmony: the modulate parameter sets how often a reharmonisation changes key', () => {
    const h = new RA.Harmony();
    const rng = new RA.Rng(9);
    let never = 0, always = 0;
    for (let k = 0; k < 100; k++) {
      if (h.reharm('saw', rng, 0).key != null) never++;
      if (h.reharm('saw', rng, 1).key != null) always++;
    }
    equal([never, always], [0, 100]);
  });

  runner.test('Theory.note parses names', () => {
    equal(RA.Theory.note('a2'), 45);
    equal(RA.Theory.note('c4'), 60);
    equal(RA.Theory.note('fs3'), 54);
    equal(RA.Theory.note('eb4'), 63);
  });

  runner.test('Theory.chord and scale', () => {
    equal(RA.Theory.chord('a2', 'm7'), [45, 48, 52, 55]);
    equal(RA.Theory.scale(60, 'minor_pentatonic'), [60, 63, 65, 67, 70, 72]);
  });

  runner.test('Theory.keyRate picks the nearest octave', () => {
    equal(RA.Theory.keyRate('c', 60), 1);
    assert(Math.abs(RA.Theory.keyRate('c', 62) - Math.pow(2, 2 / 12)) < 1e-9, 'up a tone');
    assert(Math.abs(RA.Theory.keyRate('c', 59) - Math.pow(2, -1 / 12)) < 1e-9, 'down a semitone');
  });

  runner.test('Ring ticks persist in its counters', () => {
    const counters = {};
    const r = RA.Ring.from([1, 2, 3], counters);
    equal([r.tick(), r.tick(), r.tick(), r.tick()], [1, 2, 3, 1]);
    equal(RA.Ring.from([1, 2, 3], counters).look(), 1);
    assert(!(r.map((x) => x) instanceof RA.Ring), 'map returns a plain array');
  });

  runner.test('Harmony builds diatonic chords', () => {
    const h = new RA.Harmony();
    h.key = 45; h.mode = 'aeolian'; h.prog = [0, 5];
    equal(h.chordNotes(0, 1, '7'), [57, 60, 64, 67]);  // Am7
    equal(h.quality(0), 'minor');
    equal(h.chordNotes(4, 1, ''), [65, 69, 72]);       // F major, 4 bars later
    equal(h.quality(4), 'major');
    h.mode = 'phrygian'; h.prog = [0];
    assert(h.chordNotes(0, 1, '9').length === 4, 'flat ninth is dropped');
  });

  runner.test('Harmony applies requests on demand', () => {
    const h = new RA.Harmony();
    h.request({ key: 2, mode: 'lydian' });
    assert(h.mode !== 'lydian', 'not applied yet');
    h.applyPending();
    equal([h.key, h.mode], [50, 'lydian']);
  });

  runner.test('Genre drift: weights sum to 1 and drift', () => {
    const m = new RA.GenreDrift(new RA.Rng(1), { legMinutes: [1, 1] });
    const start = m.dominant();
    let changed = false;
    for (let b = 0; b < 200; b++) {
      m.advanceBar(90);
      const w = m.weights();
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      assert(Math.abs(sum - 1) < 1e-9, 'weights sum to 1');
      if (m.dominant() !== start) changed = true;
    }
    assert(changed, 'dominant genre changes');
  });

  runner.test('Bank: every role has patterns for every genre', () => {
    const bank = new RA.PatternBank(RA.PATTERNS);
    const gaps = [];
    for (const role of RA.PatternBank.ROLES) {
      for (const f of RA.Genres.LIST) {
        const w = Object.assign(RA.Genres.zeroWeights(), { [f]: 1 });
        if (!bank.pick(role, w, 0.5, new RA.Rng(1))) gaps.push(`${role}/${f}`);
      }
    }
    assert(!gaps.length, 'missing: ' + gaps.join(', '));
    return `${bank.patterns.length} patterns`;
  });

  runner.test('Bank: at least 6 patterns of its own for every genre and role', () => {
    const thin = [];
    const bank = new RA.PatternBank(RA.PATTERNS);
    for (const m of RA.Genres.LIST) for (const r of RA.PatternBank.ROLES) {
      const n = bank.patterns.filter((p) => p.role === r && (p.genres[m] || 0) >= 0.5).length;
      if (n < 6) thin.push(`${m}/${r}: ${n}`);
    }
    equal(thin, []);
  });

  runner.test('Bank: ids unique, metadata valid', () => {
    const ids = new Set();
    for (const p of RA.PATTERNS) {
      assert(!ids.has(p.id), 'duplicate id ' + p.id);
      ids.add(p.id);
      assert(RA.PatternBank.ROLES.includes(p.role), p.id + ' bad role');
      assert(Object.keys(p.genres || p.flavours).every((f) => RA.Genres.LIST.includes(f)), p.id + ' bad genre');
      assert(p.energy[0] <= p.energy[1], p.id + ' bad energy');
    }
  });

  runner.test('Bank: every pattern compiles, sleeps, and stays on the bar grid', () => {
    const coder = makeCoder();
    const bad = [];
    for (const p of RA.PATTERNS) {
      const r = coder.probe(p.code, 8);
      if (!r.ok) { bad.push(`${p.id}: ${r.error}`); continue; }
      // measure each loop's iteration length
      const defined = {};
      coder.compiling = { defined, fx: null };
      coder.compile(p.code)(coder.env);
      coder.compiling = null;
      coder.probing = new Set();
      for (const [name, fn] of Object.entries(defined)) {
        const loop = new RA.Loop(name, fn, 0);
        for (let k = 0; k < 6; k++) {
          coder.cur = new RA.Iteration({ id: 'x' }, loop, k * 4);
          fn(k);
          const len = Math.round(coder.cur.cursor * 1000) / 1000;
          if (p.odd ? !(len > 0 && len <= 16) : ![1, 2, 3, 4, 5, 6, 7, 8, 16].includes(len)) bad.push(`${p.id}/${name}: iteration ${k} lasts ${len} beats`);
        }
      }
      coder.cur = null;
      coder.probing = null;
    }
    assert(!bad.length, bad.slice(0, 5).join('; '));
  });

  runner.test('Bank: every sample exists in Dirt-Samples', async () => {
    const lib = new RA.SampleLibrary(() => {}, new RA.Logger());
    await lib.loadIndex();
    assert(lib.index !== RA.SampleLibrary.FALLBACK, 'index downloaded');
    const coder = makeCoder();
    const missing = new Set();
    let count = 0;
    for (const p of RA.PATTERNS) {
      for (const [name] of coder.probe(p.code, 8).samples) {
        count++;
        if (!lib.count(name)) missing.add(`${p.id}: ${name}`);
      }
    }
    for (const name of Object.keys(RA.SampleLibrary.FALLBACK)) if (!lib.count(name)) missing.add('fallback: ' + name);
    assert(!missing.size, [...missing].join(', '));
    return `${count} sample uses checked`;
  });

  runner.test('params(): captured at compile time, read as P, kept per layer', () => {
    const coder = makeCoder();
    const code = "params({ pad: 'dx_pad', odds: 3 })\nloop('a', (i) => { if (one_in(P.odds)) synth(P.pad, 60); sleep(4) })";
    const probe = coder.probe(code, 4);
    assert(probe.ok, probe.error);
    equal(probe.params, { pad: 'dx_pad', odds: 3 });
    const layer = new RA.Layer({ id: 'L', role: 'keys', pattern: { id: 'x', code } });
    assert(coder.load(layer, code, 0).ok, 'loads');
    equal(layer.params, { pad: 'dx_pad', odds: 3 });
    equal(RA.CodeTools.paramsOf(code), { pad: 'dx_pad', odds: 3 });
    const next = RA.CodeTools.setParams(code, { pad: 'haze', odds: 4 });
    equal(next.split('\n')[1], code.split('\n')[1], 'the body is untouched');
    equal(RA.CodeTools.paramsOf(next), { pad: 'haze', odds: 4 });
    assert(RA.CodeTools.synthsUsed(next).includes('haze'), 'instruments in params count as used');
    // a pattern without params gets the line after its inst lines
    equal(RA.CodeTools.setParams("inst('a', { osc: [] })\nloop('a', () => sleep(4))", { k: 1 }).split('\n')[1], 'params({ k: 1 })');
  });

  runner.test('Variation: instruments and kits only swap within their family and the genre playing', () => {
    const v = new RA.Variation({ rng: new RA.Rng(4), sampleCount: () => 5 });
    for (const g of RA.Genres.LIST) {
      const G = RA.Genres.of(g);
      for (const [fam, list] of Object.entries(G.palette)) {
        assert(list.every((n) => RA.Families.SYNTHS[fam] && RA.Families.SYNTHS[fam].includes(n) && RA.SynthPresets[n]), `${g} palette ${fam}`);
        // (an instrument in two families swaps within the first, Families.synthFamily)
        for (const n of list) assert(v.options(n, g).every((x) => G.palette[RA.Families.synthFamily(n)].includes(x) && x !== n), `${g}/${n}`);
      }
      for (const [fam, list] of Object.entries(G.kits)) {
        assert(list.every((f) => RA.Families.KITS[fam] && RA.Families.KITS[fam].includes(f)), `${g} kits ${fam}`);
      }
    }
    // an Efdemin bell never turns into a Boards of Canada sound, and vice versa
    assert(!v.options('efd_bell', 'minimal').some((n) => /^boc_/.test(n)), 'minimal bells');
    equal(v.options('boc_pad', 'ae'), [], 'ae has no boc pads');
    let changed = 0;
    for (let k = 0; k < 200; k++) {
      const r = v.version({ boc_pad: 'boc_pad', kick: 'bd', odds: 3 }, 'boc', 1);
      equal(r.params.odds, 3, 'versions leave numbers alone');
      assert(RA.Genres.of('boc').palette.boc_pad.includes(r.params.boc_pad) && RA.Genres.of('boc').kits.kick.includes(r.params.kick), JSON.stringify(r.params));
      if (r.changes.length) changed++;
    }
    assert(changed > 100, 'versions change something: ' + changed);
    const t = v.timbre({ pad: 'dx_pad', kick: 'bd' }, 'saw');
    assert(t && t.params.kick === 'bd' && RA.Genres.of('saw').palette.pad.includes(t.params.pad), 'timbre: one instrument');
  });

  runner.test('Variation: tweaks keep numbers near the pattern\'s own value', () => {
    const v = new RA.Variation({ rng: new RA.Rng(8) });
    let p = { odds: 4, amp: 0.3, pad: 'haze' };
    for (let k = 0; k < 500; k++) { const r = v.tweak(p, { odds: 4, amp: 0.3 }, 1); if (r) p = r.params; }
    assert(p.odds >= 2 && p.odds <= 7 && Number.isInteger(p.odds), 'odds ' + p.odds);
    assert(p.amp >= 0.3 * 0.4 - 1e-9 && p.amp <= 0.3 * 2 + 1e-9, 'amp ' + p.amp);
    equal(p.pad, 'haze');
    equal(v.tweak({ pad: 'haze' }, {}, 1), null);
  });


  runner.test('LiveCoder hot-swaps loops and keeps their state', () => {
    const coder = makeCoder();
    const layer = new RA.Layer({ id: 'L', role: 'keys', pattern: { id: 'x', code: '' } });
    coder.load(layer, "loop('a', (i) => { sleep(1) })", 0);
    const loop = layer.loops.get('a');
    loop.i = 5;
    coder.load(layer, "loop('a', (i) => { sleep(2) })");
    assert(layer.loops.get('a') === loop && loop.i === 5, 'same loop object, counter kept');
    coder.load(layer, "loop('b', (i) => { sleep(1) })");
    assert(!layer.loops.has('a') && loop.stopped, 'removed loop stops');
  });

  runner.test('Sequencer lines: mute() and hits() rows round-trip in the code', () => {
    const CT = RA.CodeTools;
    const base = "fx({ amp: 0.8 })\nloop('kit', (i) => {\n  s('bd', { n: 1 })\n  sleep(1)\n})";
    let code = CT.setMutes(base, ['sn:0', 'sub']);
    equal(CT.muteKeys(code), ['sn:0', 'sub']);
    assert(CT.split(code).head.endsWith("mute('sn:0', 'sub')"), 'the mute line is part of the head');
    code = CT.setHits(code, 'bd:1', 'x...x...x...x...', { amp: 0.7 });
    code = CT.setHits(code, 'sub', 'x...............', { note: 36, dur: 1 });
    equal(CT.hitsRows(code).map((r) => r.key), ['bd:1', 'sub']);
    code = CT.setHits(code, 'bd:1', 'x.x.............');
    equal(CT.hitsRows(code)[0], { key: 'bd:1', pattern: 'x.x.............', opts: '{ amp: 0.7 }', loop: 'hand' });
    // another cycle length gets its own loop: 12 steps = 3 beats
    code = CT.setHits(code, 'hh:0', 'x.x.x.x.x.x.');
    assert(/loop\('hand_12', \(i\) => \{\n  hits\('hh:0', 'x\.x\.x\.x\.x\.x\.'\)\n  sleep\(3\)\n\}\)/.test(code), 'hand_12 loop');
    equal(CT.hitsRows(code).map((r) => r.loop), ['hand', 'hand', 'hand_12']);
    assert(makeCoder().probe(code).ok, 'still valid code');
    code = CT.setHits(code, 'hh:0', null);
    code = CT.setHits(CT.setHits(code, 'bd:1', null), 'sub', null);
    code = CT.setMutes(code, []);
    equal(code, base);
  });

  runner.test('Sequencer runtime: hits() rows replace the sound, mute() silences, all is recorded', () => {
    const coder = makeCoder();
    const layer = new RA.Layer({ id: 'L', role: 'drums', pattern: { id: 'x', code: '' } });
    let code = "loop('kit', (i) => {\n  s('bd', { n: 1 })\n  s('sn', { amp: 0.5 })\n  sleep(1)\n})";
    code = RA.CodeTools.setHits(RA.CodeTools.setMutes(code, ['sn:0']), 'bd:1', 'x.......X.......', { amp: 0.6 });
    assert(coder.load(layer, code, 0).ok, 'loads');
    coder.pump(0, 4);
    const at = (key, silent) => layer.played.filter((e) => e.key === key && e.silent === silent).map((e) => e.beat);
    equal(at('bd:1', 'hand'), [0, 1, 2, 3]);      // the generated kicks go quiet
    equal(at('bd:1', false), [0, 2]);             // the hits row plays
    equal(at('sn:0', 'mute'), [0, 1, 2, 3]);
    const accent = layer.played.find((e) => e.key === 'bd:1' && e.beat === 2 && !e.silent);
    assert(Math.abs(accent.amp - 0.78) < 1e-9, 'X is an accent');
    const rows = RA.SequencerView.rows(layer, 0.5);
    const bd = rows.find((r) => r.key === 'bd:1'), sn = rows.find((r) => r.key === 'sn:0');
    assert(bd.hand && bd.steps === 16 && bd.cells[0] > 0 && bd.cells[8] > 0 && bd.cells[4] === 0 && bd.head === 2, 'the hand row shows its pattern');
    // the 'kit' loop is 1 beat long: its rows have 4 steps
    assert(sn.muted && sn.steps === 4 && sn.cells[0] > 0 && sn.head === 2, 'a muted row still shows when it would play');
    equal(RA.SequencerView.cycles([layer], 0.5), [16]);
    const odd = new RA.Layer({ id: 'O', role: 'perc', pattern: { id: 'o', code: '' } });
    assert(coder.load(odd, "loop('m', (i) => {\n  for (let k = 0; k < 12; k++) { s('hh', { n: 0 }); sleep(0.25) }\n})", 0).ok, 'loads');
    coder.pump(0, 4);
    const hh = RA.SequencerView.rows(odd, 3.5).find((r) => r.key === 'hh:0');
    assert(hh.steps === 12 && hh.cells.every((v) => v > 0) && hh.head === 2, `a 12-step loop: ${hh.steps} steps, head ${hh.head}`);
    equal(RA.SequencerView.cycles([layer, odd], 3.5), [12, 16]);
    const text = RA.FullCodeView.text([layer], { genre: 'SAW', section: 'SPARSE', bpm: 90, key: 'A minor' });
    assert(text.includes('// ── DRUMS · x') && text.includes("hits('bd:1'") && text.includes("mute('sn:0')"), 'the full code has it all');
  });

  runner.test('STEPS: patterns are measured by cycle, and a chosen count picks fitting ones', () => {
    const coder = makeCoder();
    const bank = new RA.PatternBank(RA.PATTERNS);
    const probe = (code) => coder.probe(code, 8);
    const metal = bank.cycles(bank.get('pl_fm_metal_hits'), probe); // 12, 16 or 20, picked at random
    assert(metal.length && metal.every((c) => [12, 16, 20].includes(c)), 'pl_fm_metal_hits: ' + metal);
    equal(bank.cycles(bank.get('fog_kick'), probe), [4]);
    const seven = bank.cycles(bank.get('pl_seven'), probe); // it picks its meter at random (14, 20, 22)
    assert(seven.length >= 2 && seven.every((c) => [14, 20, 22].includes(c)), 'pl_seven: ' + seven);
    const fits = RA.PatternBank.fits;
    assert(fits([4, 16], 16) && !fits([4], 16) && fits([4], 4) && fits([], 12) && !fits([12], 16) && fits([12, 20], 20) && !fits([16], 12), 'fits');
    const w = Object.assign(RA.Genres.zeroWeights(), { saw: 1 });
    // (roles with no pattern of that cycle fall back to the usual pick)
    for (const [role, steps] of [['perc', 12], ['perc', 16], ['drums', 20]]) {
      const meter = { steps, probe };
      for (let k = 0; k < 10; k++) {
        const p = bank.pick(role, w, 0.5, new RA.Rng(k), [], meter);
        assert(p && fits(bank.cycles(p, probe), steps), `${role} for ${steps}: ${p && p.id}`);
      }
    }
  });

  runner.test('Families: every synth and sample folder named exists', async () => {
    const missing = Object.values(RA.Families.SYNTHS).flat().filter((n) => !RA.SynthPresets[n]);
    equal(missing, []);
    const lib = new RA.SampleLibrary(() => {}, new RA.Logger());
    await lib.loadIndex();
    const folders = [...Object.values(RA.Families.KITS).flat(), ...RA.Genres.LIST.flatMap((g) => RA.Genres.of(g).collage)];
    equal([...new Set(folders.filter((f) => !lib.count(f)))], []);
    equal(RA.Families.synthFamily('rhodes'), 'keys');
    equal(RA.Families.kitFamily('808bd'), 'kick');
  });

  runner.test('Versions: every pattern\'s versions in every genre still run, and only the params line changes', async () => {
    const lib = new RA.SampleLibrary(() => {}, new RA.Logger());
    await lib.loadIndex();
    const coder = makeCoder();
    const v = new RA.Variation({ rng: new RA.Rng(5), sampleCount: (f) => lib.count(f) });
    const bad = [];
    let changed = 0, n = 0;
    const body = (c) => c.split('\n').filter((l) => !RA.CodeTools.PARAMS_LINE.test(l)).join('\n');
    for (const p of RA.PATTERNS) {
      const params = RA.CodeTools.paramsOf(p.code);
      for (const g of Object.keys(p.genres || p.flavours)) {
        if (!RA.Genres.of(g)) continue;
        const r = v.version(params, g, 1);
        n++;
        if (!r.changes.length) continue;
        changed++;
        const code = RA.CodeTools.setParams(p.code, r.params);
        if (body(code) !== body(p.code)) bad.push(p.id + ': body changed');
        const probe = coder.probe(code, 4);
        if (!probe.ok) bad.push(`${p.id}: ${probe.error} (${r.changes.join(', ')})`);
      }
    }
    equal(bad, []);
    // fewer than before v4 on purpose: only the genre's own instruments and kits swap in
    assert(changed > n * 0.3, `versions with changes: ${changed} of ${n}`);
    return `${changed} of ${n} versions change something`;
  });

  runner.test('Memory: patterns heard lately weigh less and recover; versions are remembered', () => {
    const m = new RA.Memory();
    equal(m.weight('a', 0), 1);
    m.note('a', 'a|x', 100);
    assert(m.weight('a', 100) <= 0.05 + 1e-9, 'just heard');
    assert(Math.abs(m.weight('a', 100 + RA.Memory.HALF_LIFE) - 0.5) < 0.01, 'half back after HALF_LIFE');
    assert(m.weight('a', 1100) > 0.95, 'back after a long while');
    assert(m.heard('a|x') && !m.heard('a|y'), 'versions');
  });

  runner.test('Generators: chords, bassline, collage and motif fill the bar; drone drifts a step at a time', () => {
    const h = new RA.Harmony();
    h.key = 45; h.mode = 'dorian'; h.prog = [0, 3];
    const coder = makeCoder(h);
    const code = (body) => `loop('g', (i) => {\n  for (const e of ${body}) sleep(e.dur)\n})`;
    for (const body of ["chords('c', { rhythm: 'stab' })", "chords('c', { rhythm: 'long', voicing: 'quartal' })", "chords('c', { rhythm: 'offbeat', voicing: 'dub' })",
      "bassline('b', { style: 'dub' })", "bassline('b', { style: 'acid' })", "bassline('b', { style: '808' })", "bassline('b', { style: 'walk' })",
      "collage('c', { pool: ['speech'], rate: 0.8 })", "motif('m', { beats: 4 })", "motif('m', { beats: 8 })"]) {
      const r = coder.probe(code(body), 24);
      assert(r.ok, body + ': ' + r.error);
      const lens = [...new Set(r.lengths.g.map((l) => Math.round(l * 1000) / 1000))];
      assert(lens.length === 1 && (lens[0] === 4 || lens[0] === 8), `${body}: bar lengths ${lens}`);
    }
    // chords follow the harmony: notes of the chord, in the mode
    equal(RA.ChordGen.voice(h, 0, 'triad', 1), [57, 60, 64]);
    equal(RA.ChordGen.voice(h, 0, 'fifths', 1), [57, 64, 69]);
    const rng = new RA.Rng(3);
    const d = new RA.DroneGen(rng, 3);
    let prev = d.next().steps, moves = 0;
    for (let k = 0; k < 60; k++) {
      const { steps, changed } = d.next();
      if (changed) {
        moves++;
        const diff = steps.reduce((s, x, j) => s + Math.abs(x - prev[j]), 0);
        assert(diff <= 2, 'one voice, one step: ' + prev + ' → ' + steps);
      }
      prev = steps;
    }
    assert(moves >= 5 && moves <= 30, 'drifts now and then: ' + moves);
    const g = new RA.ChordGen(rng, 'stab');
    let same = 0, last = '';
    for (let k = 0; k < 40; k++) { const s = g.next(1).join(); if (s === last) same++; last = s; }
    assert(same > 20 && same < 39, 'holds an idea for a few bars, then varies: ' + same);
  });

  runner.test('Harmony: reharm() always moves to another progression of the genre', () => {
    const h = new RA.Harmony();
    const rng = new RA.Rng(2);
    for (const f of RA.Genres.LIST) {
      assert(RA.Genres.of(f).progressions.length >= 8, f + ' has 8+ progressions');
      h.prog = RA.Genres.of(f).progressions[0];
      for (let k = 0; k < 20; k++) assert(h.reharm(f, rng).prog.join() !== h.prog.join(), f);
    }
    let keys = 0;
    for (let k = 0; k < 200; k++) if (h.reharm('dub', rng, true).key != null) keys++;
    assert(keys > 30 && keys < 100, 'sometimes modulates: ' + keys);
    for (let k = 0; k < 50; k++) assert(h.reharm('dub', rng, false).key == null, 'not with a fixed key');
  });

  runner.test('Pace on auto: short periods in busy sections, long ones in calm sections, never the same twice', () => {
    const fake = (section) => ({ arc: { section }, rng: new RA.Rng(7), autoPace: 32, paceUntil: 0, nextMove: 999, pace() { return this.autoPace; }, logger: { add() {} } });
    const avg = (section) => {
      const f = fake(section);
      let sum = 0, last = f.autoPace;
      for (let k = 0; k < 200; k++) {
        RA.Composer.prototype.rollPace.call(f, k * 64);
        assert(f.autoPace !== last && [4, 8, 16, 32, 48, 64].includes(f.autoPace), `${section}: ${last} → ${f.autoPace}`);
        assert(f.paceUntil >= k * 64 + 32 && f.paceUntil <= k * 64 + 96, 'a period of 32-96 bars');
        last = f.autoPace;
        sum += f.autoPace;
      }
      return sum / 200;
    };
    const busy = avg('surge'), calm = avg('drift'), dread = avg('dread');
    assert(busy < 16 && calm > 30 && dread > busy && dread < calm, `average pace: surge ${busy}, dread ${dread}, drift ${calm}`);
  });

  runner.test('Melodies: every style fills the bar; ostinato repeats then turns, drift detunes, probability leaves the mode, cells overlap', () => {
    const h = new RA.Harmony();
    h.key = 45; h.mode = 'aeolian'; h.prog = [0, 3];
    const coder = makeCoder(h);
    for (const style of ['ostinato', 'drift', 'probability', 'cells']) {
      const r = coder.probe(`loop('m', (i) => {\n  for (const n of melody('m', { style: '${style}' })) sleep(n.dur)\n})`, 32);
      assert(r.ok, style + ': ' + r.error);
      assert(r.lengths.m.every((l) => Math.abs(l - 4) < 1e-9), `${style}: bars of ${[...new Set(r.lengths.m)]}`);
    }
    const rng = new RA.Rng(8);
    const o = new RA.OstinatoGen(rng, [[0, 0.5], [2, 0.5], [4, 0.5]]);
    const bars = Array.from({ length: 24 }, () => o.next(4).map((e) => e.step).join());
    assert(bars[0] !== bars[1] && new Set(bars).size < 20, 'a 1.5-beat cell runs across the bar and repeats');
    assert(new Set(bars).size > 3, 'and changes over time');
    const d = new RA.DriftGen(rng).next(16);
    assert(d.some((e) => Math.abs(e.detune) > 3) && d.some((e) => e.step == null), 'drift: detuned notes and rests');
    const p = new RA.ProbabilityGen(rng);
    const semis = new Set();
    for (let k = 0; k < 40; k++) for (const e of p.next(4)) if (e.semi != null) semis.add(((e.semi % 12) + 12) % 12);
    assert([...semis].some((s) => ![0, 2, 3, 5, 7, 8, 10].includes(s)), 'probability: notes outside the minor mode: ' + [...semis]);
    const c = new RA.CellsGen(rng);
    assert(new Set(c.voices.map((v) => v.cell.length)).size === c.voices.length, 'cells: each voice its own cycle length');
    assert(RA.MelodyBank.ostinato.length >= 20 && RA.MelodyBank.drift.length >= 14 && RA.MelodyBank.cells.length >= 12, 'a big bank of cells');
  });

  runner.test('Decision scheme: section intents shape the moves', () => {
    const I = RA.Composer.intent;
    assert(I('dropout', 'drift') > I('dropout', 'sparse'), 'dub drops in a drift, not in sparse');
    assert(I('collage', 'suspense') > I('collage', 'peak') * 3, 'collage in suspense');
    equal([I('tempo', 'surge'), I('tempo', 'drift')], [1, 0]);
    assert(I('reharm', 'release') > I('reharm', 'surge'), 'reharmonise when it calms down');
  });

  runner.test('LiveCoder rejects code without loops or sleeps', () => {
    const coder = makeCoder();
    assert(!coder.probe("s('bd')").ok, 'no loop');
    assert(!coder.probe("loop('a', () => { s('bd') })").ok, 'no sleep');
    assert(!coder.probe('this is not js').ok, 'syntax error');
  });

  runner.test('CodeTools reads and writes the fx line', () => {
    const code = "fx({ lpf: 1800, rev: 0.45 })\nloop('a', (i) => {\n  fx({ lpf: 400 })\n  sleep(1)\n})";
    equal(RA.CodeTools.fxParams(code), { lpf: 1800, rev: 0.45 });
    const c2 = RA.CodeTools.setFxParam(code, 'lpf', 2500);
    assert(c2.startsWith('fx({ lpf: 2500, rev: 0.45 })'), c2.split('\n')[0]);
    assert(c2.includes('fx({ lpf: 400 })'), 'inner fx untouched');
    const c3 = RA.CodeTools.setFxParam(code, 'crush', 0.3);
    assert(c3.startsWith('fx({ lpf: 1800, rev: 0.45, crush: 0.3 })'), c3.split('\n')[0]);
    const c4 = RA.CodeTools.setFxParam("loop('a', (i) => { sleep(1) })", 'wobble', 0.5);
    assert(c4.startsWith('fx({ wobble: 0.5 })\n'), c4);
    assert(makeCoder().probe(c3).ok && makeCoder().probe(c4).ok, 'edited code still runs');
  });

  runner.test('CodeTools.scrub keeps the number format', () => {
    equal(RA.CodeTools.scrub('0.35', 10), '0.45');
    equal(RA.CodeTools.scrub('0.35', -100), '0.00');
    equal(RA.CodeTools.scrub('4', 16), '6');
    equal(RA.CodeTools.scrub('900', 80), '1800');
    equal(RA.CodeTools.scrub('1.5', 25), '2.0');
  });

  runner.test('InstrumentLibrary overrides, resets and creates', () => {
    const lib = new RA.InstrumentLibrary(RA.SynthPresets);
    let changes = 0;
    lib.on('change', () => changes++);
    const haze = RA.InstrumentLibrary.clone(lib.get('haze'));
    haze.cutoff = 400;
    lib.set('haze', haze);
    assert(lib.get('haze').cutoff === 400 && lib.isModified('haze'), 'override');
    assert(RA.SynthPresets.haze.cutoff !== 400, 'built-in data untouched');
    lib.reset('haze');
    assert(lib.get('haze').cutoff === RA.SynthPresets.haze.cutoff, 'reset');
    lib.set('my_pad', haze);
    assert(lib.names().includes('my_pad') && !lib.isBuiltin('my_pad'), 'new instrument');
    const lib2 = new RA.InstrumentLibrary(RA.SynthPresets);
    lib2.load(lib.serialize());
    assert(lib2.get('my_pad').cutoff === 400, 'serialize/load');
    equal(changes, 3);
  });

  runner.test('SampleLibrary keeps your sounds in "my"', async () => {
    const lib = new RA.SampleLibrary(() => {}, new RA.Logger());
    const buf = new AudioBuffer({ length: 4, numberOfChannels: 1, sampleRate: 44100 });
    buf.copyToChannel(new Float32Array([1, 2, 3, 4]), 0);
    equal(lib.addLocal('kick.wav', buf), 0);
    await lib.loadIndex();
    equal(lib.files('my'), ['my/kick.wav']);
    assert(lib.get('my', 0) === buf, 'buffer available');
    equal([...lib.reversed(buf).getChannelData(0)], [4, 3, 2, 1]);
    lib.removeLocal('kick.wav');
    equal(lib.files('my'), []);
  });

  runner.test('MelodyGen: motifs fill their length and vary', () => {
    const gen = new RA.MelodyGen(new RA.Rng(11));
    for (let k = 0; k < 50; k++) {
      const m = gen.create({ beats: 8, density: k / 50 });
      const total = m.notes.reduce((s, n) => s + n.dur, 0);
      assert(Math.abs(total - 8) < 1e-9, 'motif lasts 8 beats: ' + total);
      const v = gen.vary(m, 1);
      assert(Math.abs(v.notes.reduce((s, n) => s + n.dur, 0) - 8) < 1e-9, 'variation keeps the length');
    }
  });

  runner.test('Phrase: 64 bars of melody never repeat a 4-bar stretch exactly', () => {
    const gen = new RA.MelodyGen(new RA.Rng(5));
    const ph = new RA.Phrase(gen, { beats: 4, density: 0.5, rest: 0.15, evolve: 2 });
    const bars = [];
    for (let k = 0; k < 64; k++) bars.push(JSON.stringify(ph.next().notes.map((n) => [n.step, n.dur, n.rest])));
    const chunks = new Set();
    let repeats = 0;
    for (let k = 0; k + 4 <= bars.length; k += 4) {
      const c = bars.slice(k, k + 4).join('|');
      if (chunks.has(c)) repeats++;
      chunks.add(c);
    }
    assert(repeats <= 1, `${repeats} repeated 4-bar chunks`);
    return `${chunks.size} different 4-bar chunks out of 16`;
  });

  runner.test('phrase() gives in-mode notes, strong beats on chord tones', () => {
    const h = new RA.Harmony();
    h.key = 45; h.mode = 'aeolian'; h.prog = [0];
    const coder = makeCoder(h);
    const layer = { id: 'L', vars: new Map() };
    const loop = new RA.Loop('a', () => {}, 0);
    const api = new RA.LanguageApi({ coder, audio: null, harmony: h, clock: new RA.Clock(90), energy: () => 0.5, rng: new RA.Rng(2) });
    const inMode = new Set([0, 2, 3, 5, 7, 8, 10]); // A aeolian, relative to A
    const chord = new Set([0, 3, 7, 10]);           // Am7
    for (let k = 0; k < 40; k++) {
      coder.cur = new RA.Iteration(layer, loop, k * 4);
      let pos = 0;
      for (const n of api.phrase('m', { beats: 4, density: 0.6 })) {
        if (n.note != null) {
          const pc = RA.MathUtil.mod(n.note - 45, 12);
          assert(inMode.has(pc), 'note in mode: ' + n.note);
          if (n.dur >= 1 && pos % 1 === 0) assert(chord.has(pc), 'strong beat on chord tone: ' + n.note);
        }
        pos += n.dur;
      }
    }
    coder.cur = null;
  });

  runner.test('vary() holds a value for a while, then changes it; walk() stays in range', () => {
    const coder = makeCoder();
    const api = new RA.LanguageApi({ coder, audio: null, harmony: new RA.Harmony(), clock: new RA.Clock(90), energy: () => 0.5, rng: new RA.Rng(3) });
    const layer = { id: 'L', vars: new Map() };
    const loop = new RA.Loop('a', () => {}, 0);
    const seen = [];
    for (let bar = 0; bar < 64; bar++) {
      coder.cur = new RA.Iteration(layer, loop, bar * 4);
      seen.push(api.env.vary('x', ['a', 'b', 'c'], 4));
      const w = api.env.walk('w', 10, 20, 0.3);
      assert(w >= 10 && w <= 20, 'walk in range: ' + w);
    }
    coder.cur = null;
    let changes = 0;
    for (let k = 1; k < seen.length; k++) if (seen[k] !== seen[k - 1]) changes++;
    assert(changes >= 6 && changes <= 40, 'changes now and then: ' + changes);
  });

  runner.test('Arc moves through sparse and tension sections', () => {
    const arc = new RA.Arc(new RA.Rng(9));
    const seen = new Set();
    let minLevel = 1, maxLevel = 0;
    for (let bar = 0; bar < 2000; bar++) {
      arc.advanceBar(bar);
      seen.add(arc.section);
      minLevel = Math.min(minLevel, arc.level);
      maxLevel = Math.max(maxLevel, arc.level);
    }
    for (const s of Object.keys(RA.Arc.SECTIONS)) assert(seen.has(s), 'visits ' + s);
    assert(minLevel < 0.15 && maxLevel > 0.9, `level range ${minLevel.toFixed(2)}..${maxLevel.toFixed(2)}`);
  });

  runner.test('BeatGen: every style keeps its downbeat and evolves', () => {
    for (const style of Object.keys(RA.BeatGen.STYLES)) {
      const g = new RA.BeatGen(new RA.Rng(4), style, 0.6);
      const bars = [];
      for (let k = 0; k < 32; k++) {
        const b = g.next();
        assert(b.length === g.length && b.length >= 11 && b.length <= 24, `${style}: ${b.length} steps`);
        assert(b[0].k, `${style}: kick on the downbeat`);
        bars.push(JSON.stringify(b.map((st) => [st.k, st.s, st.h])));
      }
      assert(new Set(bars).size >= 4, `${style}: only ${new Set(bars).size} different bars in 32`);
    }
  });

  runner.test('SynthPresets: no name defined twice (a later one would silently replace it)', async () => {
    const src = await (await fetch('src/audio/SynthPresets.js')).text();
    const names = [...src.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]);
    const dup = names.filter((n, k) => names.indexOf(n) !== k);
    assert(!dup.length, 'defined twice: ' + dup.join(', '));
  });

  runner.test('Every synth preset renders: sound, no blow-ups, sane level', async () => {
    const levels = [];
    for (const [name, preset] of Object.entries(RA.SynthPresets)) {
      const off = new OfflineAudioContext(1, 48000 * 2, 48000);
      new RA.SynthVoice(off, preset, name.includes('brake') ? 84 : 48, { dur: 0.5, amp: 0.5 }).start(0.01, off.destination, () => {});
      const d = (await off.startRendering()).getChannelData(0);
      let peak = 0;
      for (const v of d) { if (!Number.isFinite(v)) throw new Error(name + ': not finite'); peak = Math.max(peak, Math.abs(v)); }
      assert(peak > 0.005, `${name}: silent (${peak})`);
      assert(peak < 1.2, `${name}: too loud (${peak.toFixed(2)})`);
      levels.push(`${name} ${peak.toFixed(2)}`);
    }
    return levels.length + ' presets';
  });

  runner.test('Equalizer: flat is 0 dB; a band boost shows in its curve and in the sound', async () => {
    const off = new OfflineAudioContext(1, 48000, 48000);
    const eq = new RA.Equalizer(off);
    const freqs = new Float32Array([50, 1000, 10000]);
    assert(Array.from(eq.response(freqs)).every((d) => Math.abs(d) < 0.01), 'flat');
    equal(RA.Equalizer.BANDS.length, 4);
    eq.set({ low: { f: 200, g: 9 }, high: { f: 6000, g: -9 } });
    const db = eq.response(freqs);
    assert(db[0] > 8 && db[2] < -3, `curve ${Array.from(db).map((d) => d.toFixed(1))}`);
    eq.set({ himid: { f: 99999, g: 50 } });
    equal(eq.values.himid.f, 8000); // clamped to the band's range
    equal(eq.values.himid.g, 12);
    eq.set({ lomid: { f: 400, g: -6 } });
    assert(eq.response(new Float32Array([400]))[0] < -4, 'lo-mid cut');
    eq.set({ himid: { f: 2500, g: 0 }, lomid: { f: 400, g: 0 } });
    // a 50 Hz sine through the boosted EQ comes out louder
    const osc = off.createOscillator();
    osc.frequency.value = 50;
    osc.connect(eq.input);
    eq.output.connect(off.destination);
    osc.start(0);
    const d = (await off.startRendering()).getChannelData(0);
    let peak = 0;
    for (let i = 24000; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    assert(peak > 2.3, 'low boost heard: peak ' + peak.toFixed(2));
  });

  runner.test('Equalizer: setAt puts the curve exactly through each point, neighbours included', () => {
    const eq = new RA.Equalizer(new OfflineAudioContext(1, 1, 48000));
    const targets = { low: -4, lomid: 6, himid: 5, high: -6 };
    for (let pass = 0; pass < 2; pass++) for (const [id, db] of Object.entries(targets)) eq.setAt(id, eq.handleFreq(id), db);
    for (const [id, db] of Object.entries(targets)) {
      const at = eq.responseAt(eq.handleFreq(id));
      assert(Math.abs(at - db) < 0.5, `${id}: wanted ${db} dB, curve has ${at.toFixed(2)}`);
    }
    // two raised neighbours join: between lo-mid and hi-mid the curve stays well up
    const between = eq.responseAt(Math.sqrt(eq.handleFreq('lomid') * eq.handleFreq('himid')));
    assert(between > 3, 'curve between the raised mids: ' + between.toFixed(2));
  });

  runner.test('Genre drift: the genres chosen limit what plays; turning off the current one moves away from it', () => {
    const m = new RA.GenreDrift(new RA.Rng(3), { allowed: ['acid', 'dark'] });
    assert(['acid', 'dark'].includes(m.from), 'starts in an allowed genre: ' + m.from);
    const seen = new Set();
    for (let bar = 0; bar < 20000; bar++) { m.advanceBar(120); seen.add(m.dominant()); }
    assert([...seen].every((f) => f === 'acid' || f === 'dark'), 'only allowed: ' + [...seen].join(','));
    equal(seen.size, 2);
    // choices saved with the old genres carry over (rave → acid, fog → dub, deep → saw + boc)
    equal(new RA.GenreDrift(new RA.Rng(1), { allowed: ['rave', 'fog', 'deep'] }).allowed.sort(), ['acid', 'boc', 'dub', 'saw']);
    equal(RA.Genres.migrateWeights({ fog: 1, atmos: 0.4 }), { dub: 1, boc: 0.4, drill: 0.4 });
    const one = new RA.GenreDrift(new RA.Rng(4), { allowed: ['ae'] });
    for (let bar = 0; bar < 5000; bar++) one.advanceBar(120);
    equal(one.dominant(), 'ae');
    const all = new RA.GenreDrift(new RA.Rng(5));
    const cur = all.from;
    all.setAllowed(RA.Genres.LIST.filter((f) => f !== cur));
    assert(all.dominant() !== cur, 'switches away at once');
    all.setAllowed([]); // empty = everything
    equal(all.allowed.length, RA.Genres.LIST.length);
  });

  runner.test('Density: auto picks within the section range, capped by the genre; manual holds exactly the count set', () => {
    const vals = { density: 3, densityAuto: true };
    const fake = (section, energy, genre = 'drill') => ({
      settings: { get: (k) => vals[k] }, energy,
      arc: { spec: RA.Arc.SECTIONS[section] },
      drift: { weights: () => Object.assign(RA.Genres.zeroWeights(), { [genre]: 1 }) },
    });
    const target = (...a) => RA.Composer.prototype.target.call(fake(...a));
    equal([target('sparse', 0), target('sparse', 1)], [1, 2]);
    equal([target('surge', 0), target('surge', 1), target('peak', 0.5)], [5, 6, 6]);
    equal([target('dread', 0), target('dread', 1)], [4, 6]);
    equal(target('peak', 1, 'space'), 4); // space plays 4 layers at most
    vals.densityAuto = false;
    for (const d of [1, 3, 6]) { vals.density = d; equal([target('sparse', 0), target('peak', 1)], [d, d]); }
    vals.density = 7; // an old saved value: one layer per role, so 6 at most
    equal(target('sparse', 0), RA.PatternBank.ROLES.length);
  });

  runner.test('Arc v2: tension comes fast (surge) or slow (dread, suspense); genres steer the sections', () => {
    const S = RA.Arc.SECTIONS;
    assert(S.surge.tempo > 1.05 && S.surge.layers[0] >= 5, 'surge: fast and full');
    assert(S.dread.tempo < 0.9 && S.dread.layers[1] === 6, 'dread: slow and heavy');
    assert(S.suspense.tempo < 0.9 && S.suspense.layers[1] <= 3 && S.suspense.no.includes('drums'), 'suspense: slow, empty, no drums');
    // every section can be reached and left
    for (const n of Object.keys(S)) {
      assert(RA.Arc.NEXT[n] && RA.Arc.NEXT[n].length, 'leaves ' + n);
      assert(Object.values(RA.Arc.NEXT).some((l) => l.some(([m]) => m === n)), 'reached ' + n);
    }
    const share = (genre, names) => {
      let hit = 0, n = 0;
      const w = Object.assign(RA.Genres.zeroWeights(), { [genre]: 1 });
      for (let seed = 1; seed <= 20; seed++) {
        const arc = new RA.Arc(new RA.Rng(seed));
        for (let b = 0; b < 1500; b++) { arc.advanceBar(b, 2, w); n++; if (names.includes(arc.section)) hit++; }
      }
      return hit / n;
    };
    const dark = share('dark', ['dread', 'suspense']), drill = share('drill', ['dread', 'suspense']);
    assert(dark > drill * 1.8, `dark leans to slow tension: ${dark.toFixed(2)} vs drill ${drill.toFixed(2)}`);
    assert(share('drill', ['surge', 'peak']) > share('space', ['surge', 'peak']) * 3, 'drill leans to surge and peak, space away from them');
  });

  runner.test('Steering: manual layers/tempo pick a section; the arc holds it, then carries on from it', () => {
    const L = (n, dir, cur = 'build', ratio = 1) => RA.Steering.sectionForLayers(n, dir, cur, ratio);
    equal([L(1, 1), L(3, 1), L(4, 1), L(5, 1), L(6, 1)], ['sparse', 'drift', 'build', 'tension', 'peak']);
    equal([L(3, -1), L(2, -1, 'peak'), L(2, -1, 'collapse')], ['release', 'collapse', 'collapse']);
    // layers read with a manual tempo: slow and full = dread, slow and empty = suspense, fast and full = surge
    equal([L(6, 1, 'build', 0.85), L(5, -1, 'build', 0.85), L(4, -1, 'peak', 0.85), L(2, 1, 'build', 0.85)], ['dread', 'dread', 'dread', 'suspense']);
    equal([L(5, 1, 'build', 1.1), L(6, 1, 'build', 1.1), L(3, 1, 'build', 1.1), L(1, -1, 'drift', 0.85)], ['surge', 'peak', 'tension', 'sparse']);
    equal([0.8, 0.9, 1, 1.05, 1.15].map(RA.Steering.sectionForTempo), ['sparse', 'drift', 'build', 'tension', 'surge']);
    const arc = new RA.Arc(new RA.Rng(2));
    const other = arc.section === 'peak' ? 'sparse' : 'peak';
    equal(arc.hold(other, 10), other);
    for (let b = 10; b < 200; b++) arc.advanceBar(b);
    equal(arc.section, other, 'held for 190 bars');
    arc.skip(200);
    equal(arc.section, other, 'skip does nothing while held');
    arc.letGo(200);
    assert(!arc.held && arc.start === 200 && arc.section === other, 'carries on from the held section');
  });

  runner.test('Steering: after a slow, sparse stretch by hand the radio stays in that register', () => {
    const CALM = ['sparse', 'drift', 'release', 'collapse'];
    const calmShare = (steer) => {
      let calm = 0, total = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const arc = new RA.Arc(new RA.Rng(seed));
        if (steer) { arc.hold('sparse', 0, 0.8); arc.letGo(0); }
        else arc.enter('sparse', 0);
        for (let b = 0; b < 120; b++) { arc.advanceBar(b); total++; if (CALM.includes(arc.section)) calm++; }
      }
      return calm / total;
    };
    const free = calmShare(false), leaned = calmShare(true);
    assert(leaned > free + 0.15 && leaned > 0.8, `calm share ${free.toFixed(2)} → ${leaned.toFixed(2)}`);
    const arc = new RA.Arc(new RA.Rng(1));
    arc.hold('sparse', 0, 0.8); arc.letGo(0);
    assert(Math.abs(arc.tempo - 0.8) < 0.01, 'tempo stays at the listener\'s');
    for (let b = 0; b < 75; b++) arc.advanceBar(b, 2); // 150 s
    assert(arc.lean && Math.abs(arc.lean.strength - 0.5) < 0.02, 'half after 2.5 minutes');
    for (let b = 75; b < 151; b++) arc.advanceBar(b, 2); // 302 s
    assert(!arc.lean, 'gone after 5 minutes');
    let darkish = 0;
    for (let k = 0; k < 200; k++) {
      const m = new RA.GenreDrift(new RA.Rng(k), { allowed: ['drill', 'acid', 'dark', 'space'] });
      m.from = 'acid';
      m.lean = { energy: 0.27, bpm: 70, strength: 1 };
      if (['dark', 'space'].includes(m.pickNext())) darkish++;
    }
    assert(darkish > 160, `slow and sparse leads to dark/space genres: ${darkish}/200`);
  });

  runner.test('Piano: harder notes are louder, and held notes decay naturally', async () => {
    const render = async (vel) => {
      const off = new OfflineAudioContext(1, 48000 * 3, 48000);
      new RA.SynthVoice(off, RA.SynthPresets.piano, 60, { vel }).start(0.01, off.destination, () => {});
      return (await off.startRendering()).getChannelData(0);
    };
    const rms = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i] * d[i]; return Math.sqrt(s / (b - a)); };
    const soft = await render(0.4), hard = await render(1);
    assert(rms(hard, 500, 5000) > rms(soft, 500, 5000) * 1.8, 'harder is louder');
    assert(rms(hard, 48000, 52000) < rms(hard, 500, 5000) * 0.6, 'the note decays while held');
  });

  runner.test('phrase() gives human feel: varied velocities, small nudges, some grace notes', () => {
    const coder = makeCoder();
    const r = coder.probe("loop('m', (i) => { for (const n of phrase('m', { beats: 8, density: 0.6 })) { if (n.note) synth('piano', n.note, { vel: n.vel, nudge: n.nudge }); sleep(n.dur) } })", 8);
    assert(r.ok, r.error);
    const api = new RA.LanguageApi({ coder, audio: null, harmony: new RA.Harmony(), clock: { bpm: 120 }, energy: () => 0.5, rng: new RA.Rng(3) });
    let grace = 0, vels = new Set(), maxNudge = 0;
    coder.cur = { layer: { vars: new Map() } };
    coder.bar = () => 0;
    for (let k = 0; k < 60; k++) for (const n of api.phrase('x', { beats: 8, density: 0.6 })) {
      if (n.grace) grace++;
      vels.add(n.vel.toFixed(2));
      maxNudge = Math.max(maxNudge, n.nudge);
    }
    coder.cur = null;
    assert(grace > 0, 'some grace notes');
    assert(vels.size > 20, 'velocities vary');
    assert(maxNudge > 0.01 && maxNudge <= 0.06, 'nudge ' + maxNudge);
  });

  runner.test('Genre drift: random starts and a random order, never the same sequence', () => {
    const run = (seed) => {
      const m = new RA.GenreDrift(new RA.Rng(seed), { legMinutes: [1, 1] });
      const seq = [m.dominant()];
      for (let b = 0; b < 400; b++) { m.advanceBar(100); if (m.dominant() !== seq[seq.length - 1]) seq.push(m.dominant()); }
      return seq;
    };
    const seqs = [1, 2, 3, 4, 5, 6].map(run);
    const starts = new Set(seqs.map((s) => s[0]));
    const orders = new Set(seqs.map((s) => s.slice(0, 6).join('>')));
    assert(starts.size >= 3, 'different starting genres: ' + [...starts]);
    assert(orders.size === seqs.length, 'every run has its own order');
    for (const s of seqs) for (let k = 1; k < s.length; k++) assert(s[k] !== s[k - 1], 'no immediate repeat');
    return seqs[0].slice(0, 6).join(' > ');
  });

  runner.test('Code carries the instruments: inst() lines round-trip and edit the library', () => {
    const lib = new RA.InstrumentLibrary(RA.SynthPresets);
    const p = RA.PATTERNS.find((x) => x.id === 'ae_glitch_hats');
    const code = RA.CodeTools.withInstruments(p.code, lib);
    assert(code.startsWith("inst('hat_synth', { osc: ["), code.split('\n')[0]);
    // the generated line, run as code, defines exactly the library's instrument
    const coder = makeCoder();
    const api = new RA.LanguageApi({ coder, audio: null, harmony: new RA.Harmony(), clock: new RA.Clock(90), energy: () => 0.5, instruments: lib });
    coder.attach(api);
    let changes = 0;
    lib.on('change', () => changes++);
    const layer = new RA.Layer({ id: 'L', role: 'perc', pattern: p });
    assert(coder.load(layer, code, 0).ok, 'loads');
    equal(changes, 0, 'unchanged instrument is not rewritten');
    // editing a number in the inst line changes the instrument
    const edited = code.replace('release: 0.035', 'release: 0.2');
    assert(coder.load(layer, edited).ok, 'edited loads');
    equal(lib.get('hat_synth').release, 0.2);
    assert(coder.probe(RA.CodeTools.updateInstrument(edited, 'hat_synth', RA.SynthPresets.hat_synth)).ok, 'probe ok');
    // instruments chosen with vary() are found too
    const multi = RA.PATTERNS.find((x) => x.id === 'ae_clank_grid');
    const names = RA.CodeTools.synthsUsed(multi.code, lib.names());
    assert(names.includes('clank') && names.includes('zap'), names.join(','));
  });

  runner.test('Head/body split: variation never touches inst lines, the fx line or the body', () => {
    const lib = new RA.InstrumentLibrary(RA.SynthPresets);
    const p = RA.PATTERNS.find((x) => x.id === 'dub_chord_stab');
    const code = RA.CodeTools.setFxParams(RA.CodeTools.withInstruments(p.code, lib), { amp: 0.9, lpf: 1234, res: 0.7, rev: 0.31, delay: 0.42, wobble: 0.1, crush: 0 });
    const { head, body } = RA.CodeTools.split(code);
    assert(head.includes("inst('stab'") && /^fx\(\{.*lpf: 1234/m.test(head), head);
    equal(RA.CodeTools.join(head, body), code);
    // variation rewrites the params line only: the inst lines, the fx line and the body stay
    const v = new RA.Variation({ rng: new RA.Rng(5) });
    let c = code;
    for (let k = 0; k < 50; k++) { const r = v.version(RA.CodeTools.paramsOf(c), 'dub', 1); c = RA.CodeTools.setParams(c, r.params); }
    const strip = (x) => x.split('\n').filter((l) => !RA.CodeTools.PARAMS_LINE.test(l)).join('\n');
    equal(strip(c), strip(code));
  });

  // the pattern bank (patterns/*.rad) loads first
  window.addEventListener('load', () => RA.PatternLoader.load().then(() => runner.run(document.getElementById('results'))));
})();
