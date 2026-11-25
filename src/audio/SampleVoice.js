import { MathUtil } from '../core/MathUtil.js';

// SampleVoice: one sample hit with its own time, rate, amp, pan, start offset and length.
// (p5.SoundFile.play() sets rate and volume on the whole file, which breaks overlapping hits.)
export class SampleVoice {
  constructor(ac, buffer, opts = {}) {
    this.ac = ac;
    this.buffer = buffer;
    this.o = opts;
  }

  start(time, destination, onEnd) {
    const { ac, buffer, o } = this;
    const clamp = MathUtil.clamp;
    const rate = Math.abs(o.rate == null ? 1 : +o.rate) || 1;
    const amp = clamp(o.amp == null ? 1 : +o.amp, 0, 2);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = ac.createGain();
    const pan = ac.createStereoPanner();
    pan.pan.value = clamp(+o.pan || 0, -1, 1);
    src.connect(gain);
    gain.connect(pan);
    pan.connect(destination);

    const offset = clamp(+o.begin || 0, 0, 0.99) * buffer.duration;
    let dur = (buffer.duration - offset) / rate;
    if (o.cut) dur = Math.min(dur, o.cut);
    const atk = Math.min(o.attack || 0.002, dur * 0.5);
    const rel = Math.min(o.release == null ? 0.02 : o.release, dur * 0.5);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(amp, time + atk);
    gain.gain.setValueAtTime(amp, Math.max(time + atk, time + dur - rel));
    gain.gain.linearRampToValueAtTime(0, time + dur);
    src.start(time, offset);
    src.stop(time + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      pan.disconnect();
      onEnd();
    };
  }
};
