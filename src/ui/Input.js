// Input: the mouse and the keys on the stage. Clicks on the HUD, the cards (edit, sound
// panel, mute, lock, swap), numbers dragged in the code, the XY pad and the EQ, the
// sequencer's cells and buttons, the wheel in the long views, and the keyboard shortcuts.
// It acts on the App (`app`): its views, composer, editor and effects.
RA.Input = class Input {
  constructor(app) {
    this.app = app;
  }

  press(p, event) {
    if (this.app.state !== 'playing') return;
    // Only presses on the canvas itself (not on the editor or panels laid over it).
    if (!event || event.target !== p.canvas) return;
    const mx = p.mouseX, my = p.mouseY;
    const top = this.app.hud.hit(mx, my);
    if (top) {
      if (top.type === 'refresh') this.app.composer.refreshAll();
      else this.app.toggleGenre(top.g);
      return;
    }
    if (this.app.inViewButton(mx, my)) return this.app.nextView();
    if (this.app.view === 'code') {
      const b = this.app.fullCode.hit(mx, my);
      if (b && b.type === 'copy') this.app.copyFullCode();
      if (this.app.fullCode.contains(mx, my)) return;
    }
    if (this.app.view === 'seq') {
      const b = this.app.seq.hit(mx, my);
      if (b) this.seqAction(b);
      if (this.app.seq.contains(mx, my)) return;
    }
    if (this.app.view !== 'cards') return; // the cards aren't on screen
    if (this.app.xy.contains(mx, my)) {
      this.app.drag = { type: 'xy' };
      this.app.xy.set(mx, my);
      return;
    }
    if (this.app.eqCurve.contains(mx, my)) {
      this.app.drag = { type: 'eq' };
      this.app.eqCurve.press(mx, my);
      return;
    }
    const num = this.app.grid.numberAt(mx, my);
    if (num) {
      const code = num.card.layer.code;
      this.app.drag = { type: 'scrub', layer: num.card.layer, start: num.start, len: num.len, from: code.substr(num.start, num.len), y0: my, moved: false, last: 0, code };
      return;
    }
    const hit = this.app.grid.hit(mx, my);
    if (!hit) return;
    if (hit.action === 'edit') return this.app.editor.open(this.app.composer.deck.find(hit.layerId));
    if (hit.action === 'sound') this.app.openLayerPanel(hit.layerId);
    if (hit.action === 'mute') this.app.composer.deck.toggleMute(hit.layerId);
    if (hit.action === 'lock') this.app.composer.deck.toggleLock(hit.layerId);
    if (hit.action === 'regen') this.app.composer.regenerate(hit.layerId);
  }

  wheel(p, event) {
    if (this.app.state !== 'playing' || this.app.view === 'cards' || !event) return;
    const v = this.app.view === 'code' ? this.app.fullCode : this.app.seq;
    if (!v.contains(p.mouseX, p.mouseY)) return;
    v.wheel(this.app.view === 'code' ? event.delta : event.delta * 0.6);
    return false;
  }

  // A sequencer click, turned into an edit of the layer's code (which locks the layer).
  seqAction(b) {
    const layer = this.app.composer.deck.find(b.layerId);
    if (!layer) return;
    const CT = RA.CodeTools;
    if (b.type === 'layer-mute') return this.app.composer.deck.toggleMute(layer.id);
    if (b.type === 'layer-lock') return this.app.composer.deck.toggleLock(layer.id);
    if (b.type === 'audition') return this.audition(b.row);
    let code = layer.code, desc;
    if (b.type === 'mute-row') {
      const keys = new Set(CT.muteKeys(code));
      const off = !keys.has(b.key);
      if (off) keys.add(b.key); else keys.delete(b.key);
      code = CT.setMutes(code, [...keys]);
      desc = `${off ? 'mute' : 'unmute'} ${b.key}`;
    } else if (b.type === 'release-row') {
      code = CT.setHits(code, b.key, null);
      desc = `${b.key} back to the code`;
    } else if (b.type === 'cell') {
      const row = CT.hitsRows(code).find((r) => r.key === b.key);
      // a row taken over for the first time starts from what it plays in this cycle, with
      // the cycle's length (16 steps for a bar, 12, 20... for other loops)
      const cells = row ? [...row.pattern] : b.row.cells.map((v) => (v > 0 ? 'x' : '.'));
      cells[b.step] = cells[b.step] === '.' ? 'x' : '.';
      code = CT.setHits(code, b.key, cells.join(''), row ? '' : this.hitsOpts(b.row));
      desc = `seq ${b.key} step ${b.step + 1}`;
    }
    const res = this.app.composer.deck.liveEdit(layer.id, code, { desc, final: true });
    if (!res.ok) this.app.logger.add(`sequencer: ${res.error}`, 'err');
  }

  // The options a new hits() row copies from the sound's latest event.
  hitsOpts(row) {
    const ev = row.last || {};
    const r2 = (v) => Math.round(v * 100) / 100;
    const o = {};
    if (ev.amp != null) o.amp = r2(ev.amp);
    if (row.kind === 'synth') {
      o.note = ev.notes && ev.notes.length ? ev.notes[0] : this.app.harmony.root(this.app.composer.bar);
      o.dur = ev.dur != null ? r2(ev.dur) : 0.5;
    }
    return o;
  }

  audition(row) {
    const ev = row.last || {};
    if (row.kind === 's') {
      const i = row.key.lastIndexOf(':');
      this.app.audio.audition(row.key.slice(0, i), +row.key.slice(i + 1) || 0, { amp: ev.amp != null ? ev.amp : 0.6 });
    } else {
      this.app.audio.auditionSynth(row.key, ev.notes && ev.notes.length ? ev.notes.slice(0, 4) : [this.app.harmony.root(this.app.composer.bar) + 12],
        { amp: ev.amp != null ? ev.amp : 0.3, dur: 0.6 });
    }
  }

  dragMove(p) {
    const d = this.app.drag;
    if (!d) return;
    if (d.type === 'xy') { this.app.xy.set(p.mouseX, p.mouseY); return; }
    if (d.type === 'eq') { this.app.eqCurve.move(p.mouseX, p.mouseY); return; }
    const dy = d.y0 - p.mouseY;
    if (Math.abs(dy) > 2) d.moved = true;
    if (!d.moved || performance.now() - d.last < 50) return;
    d.last = performance.now();
    this.applyScrub(d, dy, false);
  }

  applyScrub(d, dy, final) {
    const str = RA.CodeTools.scrub(d.from, dy);
    const code = RA.CodeTools.splice(d.code, d.start, d.len, str);
    const res = this.app.composer.deck.liveEdit(d.layer.id, code, { desc: `${d.from} → ${str}`, final });
    if (res.ok) { d.code = code; d.len = str.length; }
  }

  release(p) {
    const d = this.app.drag;
    this.app.drag = null;
    if (d && d.type === 'eq') this.app.eqCurve.release();
    if (!d || d.type !== 'scrub') return;
    if (d.moved) this.applyScrub(d, d.y0 - p.mouseY, true);
    else this.app.editor.open(this.app.composer.deck.find(d.layer.id)); // a plain click on a number edits
  }

  key(p, event) {
    if (this.app.state !== 'playing') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const pad = this.padForKey(p, event);
    if (pad) {
      if (event && event.repeat) return false;
      if (event && event.shiftKey) this.app.fx.toggle(pad.id, 'latch'); else this.app.fx.engage(pad.id, 'hold');
      return false;
    }
    const k = p.key.toLowerCase();
    if (k === 'n') { this.app.composer.forceMove(); this.app.logger.add('(change requested)'); }
    if (k === 't') this.app.composer.skipGenre();
    if (k === 's') this.app.composer.skipSection();
    if (k === 'r') this.app.composer.refreshAll();
    if (k === 'v') this.app.nextView();
    if (k === 'm') {
      this.app.muted = !this.app.muted;
      p.outputVolume(this.app.muted ? 0 : this.app.settings.get('volume'), 0.1);
    }
  }

  // Number keys 1-8 play the effect pads (Shift+number latches). Uses the physical key, so
  // Shift doesn't turn "1" into "!".
  padForKey(p, event) {
    const m = /^(?:Digit|Numpad)(\d)$/.exec((event && event.code) || '');
    const digit = m ? m[1] : p.key;
    return RA.FxRack.PADS.find((x) => x.key === digit) || null;
  }

  keyUp(p, event) {
    if (this.app.state !== 'playing') return;
    const pad = this.padForKey(p, event);
    if (pad && !(event && event.shiftKey)) this.app.fx.release(pad.id, 'hold');
  }
};
