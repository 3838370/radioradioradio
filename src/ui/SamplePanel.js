import { CodeTools } from '../lang/CodeTools.js';
import { SliderRow } from './SliderRow.js';

// SamplePanel: browse the Dirt-Samples folders and your own files ('my'), shape a sample
// (rate, start, length, reverse, granular), hear it, and put the code into the editor.
export class SamplePanel {
  constructor(p, parent, app) {
    this.p = p;
    this.app = app;
    this.folder = null;
    this.n = 0;
    const root = p.createDiv().addClass('panel').parent(parent);

    this.search = p.createInput('').attribute('placeholder', 'procurar (ex: amen, pad, voz…)').parent(root);
    this.search.input(() => this.refreshFolders());
    this.list = p.createDiv().addClass('list').parent(root);
    this.title = p.createDiv('').addClass('section').parent(root);
    this.variants = p.createDiv().addClass('variants').parent(root);

    const shape = p.createDiv().parent(root);
    const onShape = () => this.showSnippet();
    const onRelease = () => { this.showSnippet(); this.audition(); };
    this.rate = new SliderRow(p, shape, { label: 'pitch / rate', min: 0.25, max: 4, log: true, value: 1, onInput: onShape, onChange: onRelease });
    this.begin = new SliderRow(p, shape, { label: 'início', min: 0, max: 0.95, value: 0, onInput: onShape, onChange: onRelease });
    this.cut = new SliderRow(p, shape, { label: 'duração (tempos)', min: 0, max: 4, step: 0.05, value: 0, format: (v) => (v ? String(v) : 'inteiro'), onInput: onShape, onChange: onRelease });
    this.amp = new SliderRow(p, shape, { label: 'volume', min: 0, max: 1.5, value: 0.6, onInput: onShape, onChange: onShape });
    const checks = p.createDiv().addClass('buttons').parent(shape);
    this.reverse = p.createCheckbox('reverse', false).addClass('check').parent(checks);
    this.granular = p.createCheckbox('granular', false).addClass('check').parent(checks);
    this.reverse.changed(onRelease);
    this.granular.changed(onShape);

    this.snippet = p.createElement('pre', '').addClass('snippet').parent(root);
    const actions = p.createDiv().addClass('buttons').parent(root);
    p.createButton('▶ ouvir').addClass('btn').parent(actions).mousePressed(() => this.audition());
    p.createButton('inserir / copiar código').addClass('btn').parent(actions).mousePressed(() => this.app.insertCode(this.code(), this.status));
    this.status = p.createP('').addClass('hint').parent(root);
    p.createP('Os teus sons: arrasta ficheiros .wav / .mp3 / .ogg para a janela. Ficam na pasta "my".').addClass('hint').parent(root);
    this.refreshFolders();
  }

  refreshFolders() {
    const q = this.search.value().trim().toLowerCase();
    const lib = this.app.samples;
    const names = lib.folders().filter((f) => !q || f.toLowerCase().includes(q)).sort((a, b) => (a === 'my' ? -1 : b === 'my' ? 1 : a.localeCompare(b)));
    this.list.html('');
    if (!names.length) {
      this.p.createSpan(lib.index ? 'nada encontrado' : 'a carregar a lista…').addClass('hint').parent(this.list);
      return;
    }
    for (const name of names) {
      const chip = this.p.createButton(`${name} ${lib.files(name).length}`).addClass('chip').parent(this.list);
      if (name === this.folder) chip.addClass('active');
      chip.mousePressed(() => this.selectFolder(name));
    }
  }

  selectFolder(name) {
    this.folder = name;
    this.n = 0;
    this.refreshFolders();
    const files = this.app.samples.files(name);
    this.title.html(`${name} · ${files.length} sons`);
    this.variants.html('');
    files.slice(0, 64).forEach((path, n) => {
      const file = path.split('/').pop();
      const label = name === 'my' ? file.replace(/\.\w+$/, '') : String(n);
      const b = this.p.createButton(label).addClass('chip').attribute('title', file).parent(this.variants);
      b.mousePressed(() => this.selectVariant(n));
    });
    this.showSnippet();
  }

  selectVariant(n) {
    this.n = n;
    [...this.variants.elt.children].forEach((el, k) => el.classList.toggle('active', k === n));
    this.showSnippet();
    this.audition();
  }

  opts() {
    const o = { n: this.n };
    const amp = this.amp.value();
    if (Math.abs(amp - 1) > 0.001) o.amp = amp;
    if (Math.abs(this.rate.value() - 1) > 0.001) o.rate = this.rate.value();
    if (this.begin.value() > 0) o.begin = this.begin.value();
    if (this.cut.value() > 0) o.cut = this.cut.value();
    if (this.reverse.checked()) o.reverse = true;
    return o;
  }

  static optsText(o) {
    return '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'number' ? CodeTools.format(v) : v}`).join(', ') + ' }';
  }

  code() {
    if (!this.folder) return '';
    const o = this.opts();
    if (!this.granular.checked()) return `s('${this.folder}', ${SamplePanel.optsText(o)})`;
    const g = Object.assign({}, o, { cut: o.cut || 0.25 });
    delete g.begin;
    const text = SamplePanel.optsText(g).replace(/ }$/, `, begin: (k / 8) * 0.9, pan: k / 4 - 1 }`);
    return `loop('grains', (i) => {\n  for (let k = 0; k < 8; k++) {\n    if (one_in(2)) s('${this.folder}', ${text})\n    sleep(0.5)\n  }\n})`;
  }

  showSnippet() { this.snippet.html(''); this.snippet.elt.textContent = this.code(); }

  audition() {
    if (!this.folder) return;
    if (!this.app.audio) { this.status.html('Carrega em ▶ Sintonizar para ouvir.'); return; }
    const spb = this.app.clock ? this.app.clock.spb() : 60 / 90;
    const o = this.opts();
    if (o.cut) o.cut *= spb;
    if (this.granular.checked()) {
      for (let k = 0; k < 8; k++) {
        setTimeout(() => this.app.audio.audition(this.folder, this.n, Object.assign({}, o, { cut: (this.cut.value() || 0.25) * spb, begin: (k / 8) * 0.9, pan: k / 4 - 1 })), k * 0.5 * spb * 1000);
      }
      return;
    }
    this.status.html('');
    this.app.audio.audition(this.folder, this.n, o).then((ok) => { if (!ok) this.status.html('Não consegui carregar este som.'); });
  }
};
