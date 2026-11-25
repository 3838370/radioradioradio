// SavePanel: what's saved in this browser (your patterns, instruments and sounds), plus
// export / import as a .json file and a reset.
RA.SavePanel = class SavePanel {
  constructor(p, parent, app) {
    this.p = p;
    this.app = app;
    const root = p.createDiv().addClass('panel').parent(parent);
    p.createP('Tudo o que editas fica guardado neste browser automaticamente. Os teus padrões entram no rádio: o compositor também os escolhe.').addClass('hint').parent(root);
    this.content = p.createDiv().parent(root);
    const actions = p.createDiv().addClass('buttons').parent(root);
    p.createButton('exportar .json').addClass('btn').parent(actions).mousePressed(() => this.app.exportState());
    const file = p.createFileInput((f) => this.app.importState(f.file), false).parent(actions).hide();
    p.createButton('importar .json').addClass('btn').parent(actions).mousePressed(() => file.elt.click());
    p.createButton('apagar tudo').addClass('btn danger').parent(actions).mousePressed(() => {
      if (confirm('Apagar os teus padrões, instrumentos e sons guardados neste browser?')) this.app.clearState();
    });
    p.createP('O .json leva padrões, instrumentos e definições; os ficheiros de som não vão no .json.').addClass('hint').parent(root);
    this.render();
  }

  section(title) { this.p.createDiv(title).addClass('section').parent(this.content); }

  item(text, buttonLabel, onClick) {
    const row = this.p.createDiv().addClass('row').parent(this.content);
    this.p.createSpan(text).addClass('label wide').parent(row);
    this.p.createButton(buttonLabel).addClass('btn small').parent(row).mousePressed(onClick);
  }

  render() {
    const { app } = this;
    this.content.html('');
    const patterns = app.bank.userPatterns();
    this.section(`os teus padrões (${patterns.length})`);
    for (const pat of patterns) this.item(`${pat.role} · ${pat.id}`, 'apagar', () => { app.bank.remove(pat.id); app.save(); this.render(); });

    const custom = Object.keys(app.instruments.serialize());
    this.section(`instrumentos teus / alterados (${custom.length})`);
    for (const name of custom) {
      this.item(name, app.instruments.isBuiltin(name) ? 'repor' : 'apagar', () => { app.instruments.reset(name); this.render(); });
    }

    const sounds = app.samples.files('my');
    this.section(`os teus sons (${sounds.length})`);
    for (const path of sounds) {
      const file = path.split('/').pop();
      this.item(file, 'apagar', () => app.removeLocalSample(file));
    }
  }
};
