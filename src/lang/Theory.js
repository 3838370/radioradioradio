import { MathUtil } from '../core/MathUtil.js';

// Theory: pure music-theory helpers (no state).
export class Theory {
  static PITCH = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  static NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  static CHORDS = {
    major: [0, 4, 7], minor: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10],
    m9: [0, 3, 7, 10, 14], add9: [0, 4, 7, 14], maj9: [0, 4, 7, 11, 14], m11: [0, 3, 7, 10, 14, 17],
    sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], power: [0, 7, 12],
  };

  static SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
    minor: [0, 2, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10], harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
    minor_pentatonic: [0, 3, 5, 7, 10], major_pentatonic: [0, 2, 4, 7, 9],
  };

  // 'a2' / 'fs3' / 'eb4' / 57 -> midi number
  static note(n) {
    if (typeof n === 'number') return n;
    const m = /^([a-g])(s|#|b)?(-?\d+)?$/i.exec(String(n).trim());
    if (!m) return 60;
    let v = Theory.PITCH[m[1].toLowerCase()];
    if (m[2] === 's' || m[2] === '#') v++;
    else if (m[2] === 'b') v--;
    const oct = m[3] !== undefined ? parseInt(m[3], 10) : 4;
    return v + (oct + 1) * 12;
  }

  static chord(root, type = 'minor') {
    const r = Theory.note(root);
    return (Theory.CHORDS[type] || Theory.CHORDS.minor).map((x) => r + x);
  }

  static scale(root, name = 'minor', octaves = 1) {
    const r = Theory.note(root);
    const steps = Theory.SCALES[name] || Theory.SCALES.minor;
    const out = [];
    for (let o = 0; o < octaves; o++) for (const x of steps) out.push(r + 12 * o + x);
    out.push(r + 12 * octaves);
    return out;
  }

  static name(midi) { return Theory.NAMES[MathUtil.mod(midi, 12)]; }

  // Playback rate that retunes a sample recorded on pitch class `from` ('c') to `to` (midi),
  // choosing the nearest octave.
  static keyRate(from, to) {
    const pc = MathUtil.mod(Theory.note(/\d/.test(String(from)) ? from : from + '4'), 12);
    let d = MathUtil.mod(Theory.note(to) - pc, 12);
    if (d > 6) d -= 12;
    return Math.pow(2, d / 12);
  }
};
