// Drawer: the space on the right, shared by the panel (tabs Camada, Instrumentos, Samples,
// Guardar) and the Parâmetros. A tab marked `alone` is a panel of its own that only takes the
// same place: while it shows, only its title is in the tab row; while the panel shows, it isn't.
// Opening/closing changes the stage width, so it calls onToggle to resize the canvas;
// onChange (optional) hears every change of tab or open/closed.
export class Drawer {
  constructor(p, root, tabs, onToggle, onChange = null) {
    this.root = root;
    this.onToggle = onToggle;
    this.onChange = onChange;
    this.tabs = new Map();
    this.current = tabs[0].id;
    const head = p.createDiv().addClass('tabs').parent(root);
    for (const t of tabs) {
      const button = p.createButton(t.label).addClass('tab').parent(head);
      button.mousePressed(() => this.show(t.id));
      const pane = p.createDiv().addClass('pane').parent(root).hide();
      this.tabs.set(t.id, { button, pane, alone: !!t.alone });
    }
    const close = p.createButton('×').addClass('tab close').parent(head);
    close.mousePressed(() => this.close());
  }

  pane(id) { return this.tabs.get(id).pane; }

  get isOpen() { return this.root.hasClass('open'); }

  show(id = this.current) {
    this.current = id;
    const alone = this.tabs.get(id).alone;
    for (const [tid, t] of this.tabs) {
      if (tid === id) { t.pane.show(); t.button.addClass('active'); } else { t.pane.hide(); t.button.removeClass('active'); }
      // the panel's tabs, or the one standing alone: never both in the row
      if (alone ? tid === id : !t.alone) t.button.show(); else t.button.hide();
    }
    if (!this.isOpen) {
      this.root.addClass('open');
      this.onToggle();
    }
    if (this.onChange) this.onChange();
  }

  close() {
    if (!this.isOpen) return;
    this.root.removeClass('open');
    this.onToggle();
    if (this.onChange) this.onChange();
  }

  // Shows tab `id`, or closes the panel if that tab is already showing.
  toggleTab(id) { if (this.isOpen && this.current === id) this.close(); else this.show(id); }

  toggle() { if (this.isOpen) this.close(); else this.show(); }
};
