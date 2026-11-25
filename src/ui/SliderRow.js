import { MathUtil } from '../core/MathUtil.js';
import { CodeTools } from '../lang/CodeTools.js';

// SliderRow: a labelled slider with a value readout, linear or logarithmic.
// onInput fires while dragging, onChange when the slider is released.
export class SliderRow {
  constructor(p, parent, { label, min, max, step = 0.01, log = false, value, format, onInput, onChange }) {
    Object.assign(this, { min, max, step, log, format });
    this.row = p.createDiv().addClass('row').parent(parent);
    p.createSpan(label).addClass('label').parent(this.row);
    this.slider = p.createSlider(0, 1000, this.toPos(value), 1).parent(this.row);
    this.out = p.createSpan('').addClass('out').parent(this.row);
    this.dragging = false; // while true, live updates from outside don't move the slider
    this.slider.elt.addEventListener('pointerdown', () => { this.dragging = true; });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    this.slider.input(() => { const v = this.value(); this.show(v); if (onInput) onInput(v); });
    this.slider.changed(() => { if (onChange) onChange(this.value()); });
    this.show(value);
  }

  toPos(v) {
    const { min, max } = this;
    const t = this.log ? Math.log(Math.max(v, min) / min) / Math.log(max / min) : (v - min) / (max - min);
    return Math.round(MathUtil.clamp(t, 0, 1) * 1000);
  }

  value() {
    const t = this.slider.value() / 1000;
    const { min, max, step } = this;
    if (this.log) {
      const v = min * Math.pow(max / min, t);
      return v >= 100 ? Math.round(v) : Math.round(v * 1000) / 1000;
    }
    return Math.round((min + t * (max - min)) / step) * step;
  }

  set(v) {
    this.slider.value(this.toPos(v));
    this.show(v);
  }

  show(v) { this.out.html(this.format ? this.format(v) : CodeTools.format(v)); }
};
