// SoundFields: every field of a sound's recipe that SynthVoice reads, described once. The
// INSTRUMENTOS panel is built from this list, so what it shows is exactly what makes the
// sound (a test checks that the engine reads no field missing here, and none listed here
// goes unread).
//
// A field: { path, label, min, max, step, log, def, required, hint }
//   path      where it lives in the recipe ('cutoff', 'pitch.from', in an oscillator 'fm.ratio')
//   def       what the engine does when the field is missing: a number = it uses that value;
//             null = that part of the sound is off
//   required  the recipe must have it (the engine has no default)
// Modules ('pitch', 'vibrato', 'flfo', 'trem'; in an oscillator 'fm', 'unison') switch on and
// off as a whole: when the object is missing that part of the sound is off; `on` is what it
// starts with when switched on.
// Ranges cover every value the built-in sounds use (Scripts\auditar_campos.py).
// scale: 'time' (seconds) or 'freq' (Hz): how the field changes when the sound is played
// faster or slower, as a sample would be (atRate).
export const SoundFields = {
  TYPES: ['sine', 'triangle', 'sawtooth', 'square', 'noise'],
  FILTERS: ['lowpass', 'bandpass', 'highpass'],

  // the whole voice
  voice: [
    { group: 'som', path: 'gain', label: 'volume', min: 0.00005, max: 200, log: true, required: true, hint: 'multiplica a força da nota' },
    { group: 'som', path: 'attack', scale: 'time', label: 'ataque (s)', min: 0.001, max: 8, log: true, required: true, hint: 'tempo até ao pico' },
    { group: 'som', path: 'dur', scale: 'time', label: 'manter (s)', min: 0, max: 8, step: 0.005, def: 0.2, hint: 'quanto tempo a nota fica antes do release (se a nota não disser outro)' },
    { group: 'som', path: 'decay', scale: 'time', label: 'decay (s)', min: 0.001, max: 10, log: true, def: null, hint: 'enquanto se mantém, o volume cai do pico até ao nível sustentado; desligado = fica no pico' },
    { group: 'som', path: 'sustain', label: 'nível sustentado', min: 0, max: 1, step: 0.005, def: 0, hint: 'onde o decay pára (0 = cai até ao silêncio, como uma corda tocada)' },
    { group: 'som', path: 'release', scale: 'time', label: 'release (s)', min: 0.003, max: 10, log: true, required: true, hint: 'tempo a apagar depois de largada' },
    { group: 'som', path: 'drift', label: 'drift (cents)', min: 0, max: 60, step: 1, def: 0, hint: 'desafinação ao acaso em cada nota (escalada pelo parâmetro desafinação)' },
    { group: 'som', path: 'drive', label: 'drive', min: 0, max: 1, step: 0.01, def: 0, hint: 'saturação antes do filtro' },

    { group: 'filtro', path: 'ftype', label: 'tipo', options: 'FILTERS', def: 'lowpass' },
    { group: 'filtro', path: 'cutoff', scale: 'freq', label: 'filtro (Hz)', min: 20, max: 20000, log: true, required: true },
    { group: 'filtro', path: 'res', label: 'ressonância', min: 0.1, max: 30, log: true, required: true },
    { group: 'filtro', path: 'fenv', label: 'env. filtro (×)', min: 0.1, max: 16, log: true, def: null, hint: 'o filtro começa neste múltiplo do corte e desce até ele' },
    { group: 'filtro', path: 'fdecay', scale: 'time', label: 'decay filtro (s)', min: 0.001, max: 3, log: true, def: 0.2, hint: 'quanto tempo o env. filtro leva a descer' },
    { group: 'filtro', path: 'hpf', scale: 'freq', label: 'passa-altos (Hz)', min: 20, max: 18000, log: true, def: null, hint: 'um passa-altos extra depois do filtro (12 dB/oitava)' },
    { group: 'filtro', path: 'veltrack', label: 'filtro × força', min: 0, max: 1, step: 0.01, def: 0, hint: 'notas fortes abrem o filtro' },
    { group: 'filtro', path: 'keytrack', label: 'filtro × nota', min: 0, max: 1, step: 0.01, def: 0, hint: 'o filtro acompanha a altura da nota (1 = totalmente)' },

    { group: 'modulação', module: 'pitch', label: 'queda de altura', on: { from: 12, time: 0.05 }, fields: [
      { path: 'pitch.from', label: 'de (semitons)', min: -48, max: 48, step: 0.1, hint: '+ começa acima e cai para a nota (bombos), − sobe' },
      { path: 'pitch.time', scale: 'time', label: 'tempo (s)', min: 0.001, max: 10, log: true },
    ] },
    { group: 'modulação', module: 'vibrato', label: 'vibrato', on: { rate: 5, depth: 6, delay: 0.2 }, fields: [
      { path: 'vibrato.rate', scale: 'freq', label: 'velocidade (Hz)', min: 0.01, max: 12, log: true },
      { path: 'vibrato.depth', label: 'profundidade (cents)', min: 0, max: 400, step: 1 },
      { path: 'vibrato.delay', scale: 'time', label: 'atraso (s)', min: 0, max: 4, step: 0.01, def: 0 },
    ] },
    { group: 'modulação', module: 'flfo', label: 'LFO do filtro', on: { rate: 0.5, depth: 600 }, fields: [
      { path: 'flfo.rate', scale: 'freq', label: 'velocidade (Hz)', min: 0.01, max: 20, log: true },
      { path: 'flfo.depth', label: 'profundidade (cents)', min: 0, max: 4800, step: 10 },
    ] },
    { group: 'modulação', module: 'trem', label: 'tremolo', on: { rate: 4, depth: 0.3 }, fields: [
      { path: 'trem.rate', scale: 'freq', label: 'velocidade (Hz)', min: 0.01, max: 100, log: true },
      { path: 'trem.depth', label: 'profundidade', min: 0, max: 1, step: 0.01 },
    ] },
  ],

  // one oscillator (osc: [ ... ])
  osc: [
    { path: 'type', label: 'onda', options: 'TYPES', required: true },
    { path: 'level', label: 'nível', min: 0.0005, max: 2, log: true, def: 1 },
    { path: 'octave', label: 'oitava', min: -3, max: 3, step: 1, def: 0, tonal: true },
    { path: 'detune', label: 'detune (cents)', min: -100, max: 100, step: 1, def: 0, tonal: true },
    { path: 'ratio', label: 'rácio (parcial)', min: 0.25, max: 16, log: true, def: 1, tonal: true, hint: 'múltiplo da frequência da nota: inarmónico para sinos, metais, bateria' },
    { path: 'decay', scale: 'time', label: 'apaga em (s)', min: 0.001, max: 10, log: true, def: null, hint: 'este oscilador apaga-se sozinho neste tempo; desligado = dura a nota toda' },
    { module: 'unison', label: 'unison', tonal: true, on: { voices: 3, spread: 15 }, fields: [
      { path: 'unison.voices', label: 'vozes', min: 1, max: 9, step: 1 },
      { path: 'unison.spread', label: 'abertura (cents)', min: 0, max: 100, step: 1 },
    ] },
    { module: 'fm', label: 'FM (sino / metal)', tonal: true, on: { ratio: 3.5, index: 2, decay: 0.5 }, fields: [
      { path: 'fm.ratio', label: 'rácio', min: 0.1, max: 16, log: true },
      { path: 'fm.index', label: 'índice', min: 0, max: 20, step: 0.01 },
      { path: 'fm.decay', scale: 'time', label: 'decay (s)', min: 0.001, max: 10, log: true, def: null, hint: 'o brilho da FM desce até um décimo neste tempo; desligado = fica' },
    ] },
  ],

  // one part of a sound made of parts ({ layers: [ ... ] }): a whole voice plus these
  part: [
    { path: 'transpose', label: 'afinação (st)', min: -60, max: 72, step: 0.01, def: 0, hint: 'semitons acima da nota tocada' },
    { path: 'at', scale: 'time', label: 'entra aos (s)', min: 0, max: 1, step: 0.001, def: 0, hint: 'atraso desta parte em relação à pancada' },
  ],

  get(obj, path) {
    const [a, b] = path.split('.');
    return b ? (obj[a] ? obj[a][b] : undefined) : obj[a];
  },

  set(obj, path, value) {
    const [a, b] = path.split('.');
    if (!b) { obj[a] = value; return; }
    obj[a] = Object.assign({}, obj[a], { [b]: value });
  },

  remove(obj, path) {
    const [a, b] = path.split('.');
    if (!b) delete obj[a]; else if (obj[a]) delete obj[a][b];
  },

  // every plain field of a list, modules opened up
  flat(list) {
    return list.flatMap((f) => (f.module ? f.fields : [f]));
  },

  // A recipe played at `rate` the way a sample is (rate 2: twice as fast, an octave up):
  // every time divided by rate, every frequency (filters, noise bands, wobbles) times rate.
  // The notes' pitch moves with the note played (60 + 12·log2(rate)), so it isn't touched here;
  // a filter that already follows the note (keytrack) moves only by what it doesn't follow.
  atRate(recipe, rate) {
    if (!rate || rate === 1) return recipe;
    const S = SoundFields;
    const scaled = (obj, fields) => {
      const out = JSON.parse(JSON.stringify(obj));
      for (const f of S.flat(fields)) {
        if (!f.scale) continue;
        let v = S.get(out, f.path);
        // a missing time the engine fills in (dur 0.2, fdecay 0.2) is scaled too
        if (typeof v !== 'number' && !f.path.includes('.') && typeof f.def === 'number') v = f.def;
        if (typeof v !== 'number') continue;
        const k = f.scale === 'time' ? 1 / rate : Math.pow(rate, f.path === 'cutoff' ? 1 - (out.keytrack || 0) : 1);
        S.set(out, f.path, v * k);
      }
      if (out.osc) out.osc = out.osc.map((o) => scaled(o, S.osc));
      return out;
    };
    const voice = (l) => scaled(l, S.voice.concat(S.part));
    return recipe.layers ? Object.assign({}, recipe, { layers: recipe.layers.map(voice) }) : voice(recipe);
  },
};
