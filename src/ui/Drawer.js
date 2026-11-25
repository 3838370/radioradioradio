// Drawer: the side panel with tabs (Camada, Instrumentos, Samples, Guardar).
// Opening/closing changes the stage width, so it calls onToggle to resize the canvas.
export class Drawer {
  constructor(p, root, tabs, onToggle) {
    this.root = root;
    this.onToggle = onToggle;
    this.tabs = new Map();
    this.current = tabs[0].id;
    const head = p.createDiv().addClass('tabs').parent(root);
    for (const t of tabs) {
      const button = p.createButton(t.label).addClass('tab').parent(head);
      button.mousePressed(() => this.show(t.id));
      const pane = p.createDiv().addClass('pane').parent(root).hide();
      this.tabs.set(t.id, { button, pane });
    }
    const close = p.createButton('×').addClass('tab close').parent(head);
    close.mousePressed(() => this.close());
  }

  pane(id) { return this.tabs.get(id).pane; }

  get isOpen() { return this.root.hasClass('open'); }

  show(id = this.current) {
    this.current = id;
    for (const [tid, t] of this.tabs) {
      if (tid === id) { t.pane.show(); t.button.addClass('active'); } else { t.pane.hide(); t.button.removeClass('active'); }
    }
    if (!this.isOpen) {
      this.root.addClass('open');
      this.onToggle();
    }
  }

  close() {
    if (!this.isOpen) return;
    this.root.removeClass('open');
    this.onToggle();
  }

  toggle() { if (this.isOpen) this.close(); else this.show(); }
};
