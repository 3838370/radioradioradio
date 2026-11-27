import { Emitter } from './Emitter.js';
import { Genres } from '../music/Genres.js';

// Settings: every knob of the radio, described once in SCHEMA. The listener's controls (top
// bar, delay bar, panels) and the musical parameters (PARAMS row) all live here, so they are
// saved, exported and reset the same way. Emits 'change' with { name, value } (and `genre`
// for a genre's own parameter).
//
// A schema entry: { id, def, group, label, hint, min, max, step, kind, ui }
//   kind: 'bool' for a switch (no range); numbers otherwise
//   ui: 'params' = shown in the PARAMS row (generated from the schema); null = shown
//       elsewhere (the top bar, the delay bar, panels) or kept internally
// GENRE_SCHEMA: the parameters each genre has (defaults from the Genres table, `path` in it).
export class Settings extends Emitter {
  static SCHEMA = [
    // ───── the top bar, the delay bar and the panels ─────
    { id: 'pace', def: 32 },               // bars between composer moves
    { id: 'paceAuto', def: true },         // the composer alternates short and long paces by itself
    { id: 'freeze', def: false },          // LOCK: no code changes at all
    { id: 'variation', def: 0.3 },         // 0 = tiny nudges only, 1 = big swings and swaps
    { id: 'density', def: 5 },             // layers playing when density isn't on auto
    { id: 'densityAuto', def: true },      // the arc shapes the layer count (sparse ... surge)
    { id: 'delayBeats', def: 0.75 },       // master delay time in beats (0.75 = dotted 1/8)
    { id: 'delayAuto', def: true },        // the composer changes the delay time now and then, gliding
    { id: 'feedback', def: 0.42 },         // master delay feedback
    { id: 'glide', def: 0.4 },             // seconds a delay-time change takes (pitch-bending echoes)
    { id: 'fxAuto', def: 0.4 },            // how often the composer fires effect pads by itself
    { id: 'layerAuto', def: true },        // master switch for the layers' automatic sound settings
    { id: 'bpmAuto', def: true },          // the tempo follows the genre and the arc
    { id: 'bpm', def: 116 },
    { id: 'key', def: 'auto' },            // 'auto' or a pitch class 0..11
    { id: 'mode', def: 'auto' },           // 'auto' or a mode name
    { id: 'steps', def: 'auto' },          // 'auto' or a loop cycle in 16th steps the patterns should have
    { id: 'volume', def: 0.8 },
    // the genres allowed to play (array of names); null = all. While the grid mode is built,
    // only these four (the others stay in the bank, switched off; their genre names can be
    // clicked back on)
    { id: 'genres', def: ['acid', 'ae', 'dub', 'space'] },
    { id: 'genresV', def: 2 },             // which default genre choice the saved settings have
    { id: 'eq', def: null },               // master EQ { low, lomid, himid, high: { f, g } }; null = flat
    { id: 'genreTune', def: {} },          // the listener's values for genre parameters: { genre: { id: value } }

    // ───── the PARAMS row: how the composer varies things ─────
    { id: 'wSwap', def: 1, group: 'variation', label: 'trocas', hint: 'quantas vezes uma camada é trocada por outro padrão', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'wReroll', def: 1, group: 'variation', label: 'versões', hint: 'quantas vezes uma camada volta numa versão nova de si mesma (outros instrumentos da família)', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'wTimbre', def: 1, group: 'variation', label: 'timbres', hint: 'quantas vezes um instrumento é trocado por outro da família, com as mesmas notas', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'wMutate', def: 1, group: 'variation', label: 'ajustes', hint: 'quantas vezes mudam pequenos valores (números dos params)', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'wDropout', def: 1, group: 'variation', label: 'silêncios', hint: 'quantas vezes uma camada se cala por uns compassos (à dub)', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'wCollage', def: 1, group: 'variation', label: 'colagens', hint: 'quantas vezes aparecem vozes, rádio e sons de campo por cima da música', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'wReharm', def: 1, group: 'variation', label: 'progressões', hint: 'quantas vezes muda a progressão de acordes dentro do género', min: 0, max: 3, step: 0.1, ui: 'params' },

    // human feel and tuning
    { id: 'humanTime', def: 1, group: 'feel', label: 'tempo humano', hint: 'quão soltas no tempo são as melodias (rubato)', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'humanVel', def: 1, group: 'feel', label: 'dinâmica', hint: 'quanto varia a força das notas das melodias', min: 0, max: 3, step: 0.1, ui: 'params' },
    { id: 'detune', def: 0.5, group: 'feel', label: 'desafinação', hint: 'quanto cada nota sai do tom (drift dos sintetizadores e detune das melodias); 0 = afinado, 1 = como os instrumentos foram desenhados. O wow da fita (por género) dobra tudo junto', min: 0, max: 2, step: 0.05, ui: 'params' },

    // harmony
    { id: 'modulate', def: 0.3, group: 'harmony', label: 'modular', hint: 'probabilidade de uma progressão nova também mudar de tom', min: 0, max: 1, step: 0.05, ui: 'params' },
    { id: 'modulateCalm', def: true, group: 'harmony', label: 'tom na calma', hint: 'as mudanças de tom esperam por um momento calmo (secção calma, duas camadas ou menos, ou um break) em vez de saltarem com tudo a tocar', kind: 'bool', ui: 'params' },

    // transitions
    { id: 'legMin', def: 8, group: 'transitions', label: 'género mín.', hint: 'o tempo mínimo num género, em minutos', min: 1, max: 60, step: 1, ui: 'params' },
    { id: 'legMax', def: 20, group: 'transitions', label: 'género máx.', hint: 'o tempo máximo num género, em minutos', min: 1, max: 90, step: 1, ui: 'params' },
    { id: 'handoffCalm', def: true, group: 'transitions', label: 'passagem calma', hint: 'quando entra um género novo, a música esvazia primeiro (secção calma), o tempo muda com pouco a tocar, e só depois o género novo cresce', kind: 'bool', ui: 'params' },
    { id: 'fadeIn', def: 1, group: 'transitions', label: 'fade in', hint: 'compassos que um pad, melodia ou textura nova leva a entrar (a bateria e o baixo entram logo)', min: 0, max: 8, step: 0.25, ui: 'params' },
    { id: 'fadeOut', def: 2, group: 'transitions', label: 'fade out', hint: 'compassos que uma camada leva a sair. Quando a bateria ou o baixo são trocados, os antigos param logo, para nunca tocarem duas baterias ou dois baixos juntos', min: 0, max: 8, step: 0.25, ui: 'params' },
    { id: 'tempoGlide', def: 8, group: 'transitions', label: 'deslize de tempo', hint: 'compassos que uma mudança de tempo leva', min: 1, max: 32, step: 1, ui: 'params' },
    { id: 'sectionLength', def: 1, group: 'transitions', label: 'secções', hint: 'quanto tempo o arco fica em cada secção (×)', min: 0.25, max: 3, step: 0.05, ui: 'params' },
  ];

  // Each genre's own parameters (PARAMS row, genre block). Defaults come from Genres.TABLE.
  static GENRE_SCHEMA = [
    { id: 'tempo', path: 'tempo', label: 'tempo', hint: 'o BPM do género (cada visita varia ±7%)', min: 60, max: 180, step: 1 },
    { id: 'intensity', path: 'intensity', label: 'energia', hint: 'quão intenso é (mais camadas, padrões mais cheios)', min: 0, max: 1, step: 0.05 },
    { id: 'cap', path: 'sections.cap', label: 'máx. camadas', hint: 'o máximo de camadas que toca em auto', min: 1, max: 6, step: 1 },
    { id: 'modes', path: 'modes', label: 'modos', hint: 'os modos em que toca', options: ['dorian', 'aeolian', 'lydian', 'mixolydian', 'phrygian', 'locrian'] },
    { id: 'chordBars', path: 'chordBars', label: 'compassos por acorde', hint: 'quanto dura cada acorde (um dos marcados, sorteado em cada progressão)', options: [1, 2, 4, 8, 16] },
    { id: 'wow', path: 'wow', label: 'wow da fita', hint: 'quanto o wow e o flutter da fita dobram a mistura toda (×)', min: 0, max: 3, step: 0.1 },
  ];

  static DEFAULTS = Object.fromEntries(Settings.SCHEMA.map((s) => [s.id, s.def]));

  static spec(id) { return Settings.SCHEMA.find((s) => s.id === id) || null; }

  static genreSpec(id) { return Settings.GENRE_SCHEMA.find((s) => s.id === id) || null; }

  // Saved settings from earlier versions: `styles` (the genres allowed to play) is now `genres`;
  // `codedSamples` (the [SAMPLE]/[CÓDIGO] switch) is gone: the drums rebuilt in code always play.
  static migrate(saved) {
    const s = Object.assign({}, saved || {});
    if ('styles' in s) {
      if (!('genres' in s)) s.genres = s.styles;
      delete s.styles;
    }
    delete s.codedSamples;
    // the four genres of the grid mode (ACID, AE, DUB, SPACE), once, over an older choice
    if (saved && s.genresV !== 2) { s.genres = ['acid', 'ae', 'dub', 'space']; s.genresV = 2; }
    return s;
  }

  static clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }

  constructor(overrides = {}) {
    super();
    this.values = {};
    for (const s of Settings.SCHEMA) this.values[s.id] = Settings.clone(s.def);
    Object.assign(this.values, Settings.migrate(overrides));
    Genres.tune(this.values.genreTune);
  }

  get(name) { return this.values[name]; }

  set(name, value) {
    if (this.values[name] === value) return;
    this.values[name] = value;
    if (name === 'genreTune') Genres.tune(value);
    this.emit('change', { name, value });
  }

  // Back to the default (a PARAMS ↺).
  reset(name) { this.set(name, Settings.clone(Settings.DEFAULTS[name])); }

  isDefault(name) { return JSON.stringify(this.values[name]) === JSON.stringify(Settings.DEFAULTS[name]); }

  // ───── a genre's own parameters (tempo, energy, max layers, modes) ─────

  genre(g, id) { return Genres.get(g, Settings.genreSpec(id).path); }

  setGenre(g, id, value) {
    if (Array.isArray(value) && !value.length) return; // a genre keeps at least one mode
    const tune = Settings.clone(this.values.genreTune) || {};
    tune[g] = Object.assign({}, tune[g], { [id]: value });
    this.setTune(tune, g, id);
  }

  resetGenre(g, id) {
    const tune = Settings.clone(this.values.genreTune) || {};
    if (tune[g]) delete tune[g][id];
    if (tune[g] && !Object.keys(tune[g]).length) delete tune[g];
    this.setTune(tune, g, id);
  }

  isGenreDefault(g, id) { return !((this.values.genreTune || {})[g] || {}).hasOwnProperty(id); }

  setTune(tune, g, id) {
    this.values.genreTune = tune;
    Genres.tune(tune);
    this.emit('change', { name: 'genreTune', value: tune, genre: g, param: id });
  }

  // Every PARAMS value (and the genres' own) back to the defaults; the top bar stays.
  resetParams() {
    for (const s of Settings.SCHEMA) if (s.ui === 'params' && !this.isDefault(s.id)) this.reset(s.id);
    if (Object.keys(this.values.genreTune || {}).length) this.setTune({}, null, null);
  }

  // The PARAMS values as a plain object, for export; and back.
  paramsSnapshot() {
    const out = { genreTune: Settings.clone(this.values.genreTune) };
    for (const s of Settings.SCHEMA) if (s.ui === 'params') out[s.id] = this.values[s.id];
    return out;
  }

  loadParams(data) {
    for (const s of Settings.SCHEMA) if (s.ui === 'params' && typeof (data || {})[s.id] === typeof s.def) this.set(s.id, data[s.id]);
    if (data && data.genreTune && typeof data.genreTune === 'object') this.setTune(Settings.clone(data.genreTune), null, null);
  }
};
