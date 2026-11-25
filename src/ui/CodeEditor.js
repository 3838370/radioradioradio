// CodeEditor: an HTML textarea laid over a code card, across the whole width of the cards
// area, so the listener can live-code a layer. Clicking anywhere outside it runs the code
// (hot-swapped at the loops' next iteration) and closes it; Ctrl/Cmd+Enter runs it and
// keeps editing, Esc closes without running, Tab inserts two spaces. Clicks in `keepOpen`
// elements (the side panels, which insert code here) leave it open.
export class CodeEditor {
  static HINT = 'click outside: run & close · Ctrl+Enter run · Esc cancel';

  constructor(p, parent, { onRun, onOpen, onClose, keepOpen = [] }) {
    this.onRun = onRun;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.layer = null;
    this.box = p.createDiv().addClass('editor').parent(parent).hide();
    this.area = p.createElement('textarea').parent(this.box);
    this.area.attribute('spellcheck', 'false');
    this.status = p.createDiv('').addClass('editor-status').parent(this.box);
    this.area.elt.addEventListener('keydown', (e) => this.onKey(e));
    // Capture phase: this runs before the canvas handles the same click (which may open
    // another card's editor).
    document.addEventListener('mousedown', (e) => {
      if (!this.layer || this.box.elt.contains(e.target)) return;
      if (keepOpen.some((el) => el && el.contains(e.target))) return;
      this.commit();
    }, true);
  }

  // Runs the code if it changed, then closes; on an error it stays open to show it.
  commit() {
    if (this.area.value() !== this.layer.code) {
      const result = this.onRun(this.layer, this.area.value());
      if (!result.ok) { this.setStatus(`not run: ${result.error}`, 'err'); return; }
    }
    this.close();
  }

  get isOpen() { return this.layer !== null; }

  open(layer) {
    if (this.layer === layer) return;
    if (this.layer) this.close();
    this.layer = layer;
    this.onOpen(layer);
    this.area.value(layer.code);
    this.setStatus(`${layer.role} (held while editing) · ${CodeEditor.HINT}`, 'hint');
    this.box.style('display', 'flex'); // p5's show() would force display: block
    // Focus after the click that opened us finishes, or the browser takes focus back.
    setTimeout(() => {
      const el = this.area.elt;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }, 0);
  }

  close() {
    if (!this.layer) return;
    const layer = this.layer;
    this.layer = null;
    this.box.hide();
    this.area.elt.blur();
    this.onClose(layer);
  }

  run() {
    const result = this.onRun(this.layer, this.area.value());
    if (result.ok) this.setStatus(`running ✓ — layer locked · ${CodeEditor.HINT}`, 'ok');
    else this.setStatus(`not run: ${result.error}`, 'err');
  }

  onKey(e) {
    e.stopPropagation();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const el = this.area.elt;
      const at = el.selectionStart;
      el.value = el.value.slice(0, at) + '  ' + el.value.slice(el.selectionEnd);
      el.selectionStart = el.selectionEnd = at + 2;
    }
  }

  // Inserts text at the cursor (used by the sample and instrument panels).
  insert(text) {
    const el = this.area.elt;
    const at = el.selectionStart;
    el.value = el.value.slice(0, at) + text + el.value.slice(el.selectionEnd);
    el.selectionStart = el.selectionEnd = at + text.length;
    el.focus();
  }

  setStatus(text, kind) {
    this.status.html('');
    this.status.elt.textContent = text;
    this.status.attribute('class', `editor-status ${kind}`);
  }

  // Keeps the editor at its card's height as the grid re-flows, across the whole width
  // of the cards area ({ x, w }), and tall enough for the code.
  follow(rect, area) {
    if (!rect) return;
    const lines = this.area.value().split('\n').length;
    this.box.position(area.x, rect.y);
    this.box.size(area.w, Math.max(rect.h + 26, lines * 17.4 + 60, 240));
  }
};
