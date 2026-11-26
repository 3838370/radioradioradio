import { FxRack } from '../audio/FxRack.js';
import { CodeTools } from '../lang/CodeTools.js';

// Input: the mouse and the keys on the stage. Clicks on the HUD, the cards (edit, sound
// panel, mute, lock, swap), numbers dragged in the code, the XY pad and the EQ, the
// sequencer's cells and buttons, the wheel in the long views, and the keyboard shortcuts.
// It acts on the App (`app`): its views, composer, editor and effects.
export class Input {
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
    if (this.app.plusPress(mx, my)) return;
    if (this.app.view === 'code') {
      const b = this.app.fullCode.hit(mx, my);
      if (b && b.type === 'copy') this.app.copyFullCode();
      if (b && b.type === 'paste') this.app.pasteFullCode();
      if (this.app.fullCode.contains(mx, my)) return;
    }
    if (this.app.view === 'seq') {
      const b = this.app.seq.hit(mx, my);
      if (b) this.seqAction(b);
      if (this.app.seq.contains(mx, my)) return;
    }
    if (this.app.view === 'grid') return this.gridPress(mx, my);
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
      this.app.drag = { type: 'scrub', layer: num.card.layer, start: num.start, len: num.len, from: code.substr(num.start, num.len), y0: my, moved: false, last: 0, code, line: num.card.lineAt(mx, my) };
      return;
    }
    const hit = this.app.grid.hit(mx, my);
    if (!hit) return;
    if (hit.action === 'edit') {
      // the code opens to edit, and the INSTRUMENTOS panel at the sound of the line clicked
      const layer = this.app.composer.deck.find(hit.layerId);
      const card = this.app.grid.cards.get(hit.layerId);
      this.app.openSoundOf(layer, card ? card.lineAt(mx, my) : '');
      return this.app.editor.open(layer);
    }
    if (hit.action === 'sound') this.app.openLayerPanel(hit.layerId);
    if (hit.action === 'solo') this.app.composer.deck.toggleSolo(hit.layerId);
    if (hit.action === 'mute') this.app.composer.deck.toggleMute(hit.layerId);
    if (hit.action === 'lock') this.app.composer.deck.toggleLock(hit.layerId);
    if (hit.action === 'regen') this.app.composer.regenerate(hit.layerId);
  }

  wheel(p, event) {
    if (this.app.state !== 'playing' || !event) return;
    if (this.app.view === 'cards' || this.app.view === 'grid') { // cards and grids scroll when they don't all fit
      // (only over the canvas: the code editor and the panels scroll themselves)
      const v = this.app.view === 'cards' ? this.app.grid : this.app.gridView;
      if (event.target !== p.canvas || !v.contains(p.mouseX, p.mouseY)) return;
      v.wheel(event.delta);
      return false;
    }
    const v = this.app.view === 'code' ? this.app.fullCode : this.app.seq;
    if (!v.contains(p.mouseX, p.mouseY)) return;
    v.wheel(this.app.view === 'code' ? event.delta : event.delta * 0.6);
    return false;
  }

  // ───── the GRELHA view ─────

  // A click in the GRELHA view: a button ([S] [M] [L], the ruler), or a cell (selects it and
  // opens the Instrumentos panel at its sound), or elsewhere (writes what was typed, and
  // lets go of the cell).
  gridPress(mx, my) {
    const gv = this.app.gridView;
    const b = gv.hit(mx, my);
    if (b) return this.gridButton(b);
    const c = gv.cellAt(mx, my);
    if (c && c.cell) {
      if (!this.app.commitGridCell()) return; // its text has an error: stay on it
      gv.select(c.layer.id, c.name, c.x, c.y);
      const sound = this.app.gridSound(c.layer, c.name, c.cell);
      if (sound) this.app.openInstrument(sound);
      return;
    }
    if (gv.contains(mx, my) && this.app.commitGridCell()) gv.sel = null;
  }

  gridButton(b) {
    const gv = this.app.gridView, deck = this.app.composer.deck;
    if (b.type === 'layer-solo') return deck.toggleSolo(b.layerId);
    if (b.type === 'layer-mute') return deck.toggleMute(b.layerId);
    if (b.type === 'layer-lock') return deck.toggleLock(b.layerId);
    if (b.type === 'freeze') return this.app.freezeLayer(b.layerId);
    if (b.type === 'unfreeze') return this.app.unfreezeLayer(b.layerId);
    if (b.type !== 'ruler' || !gv.sel) return;
    if (b.key === 'OK') return this.app.commitGridCell();
    if (b.key === '×') { gv.sel = null; return; }
    if (b.key === '⌫') return gv.backspace(deck.find(gv.sel.layerId));
    if (b.key === '.') { gv.sel.draft = '.'; return this.app.commitGridCell(); }
    gv.type(b.key);
  }

  // Keys while a cell is selected in the GRELHA view: they type into it (and nothing else:
  // no pads, no shortcuts). Enter writes it, Esc lets go, Delete empties it, the arrows
  // move to the next cell (writing first).
  gridKey(event) {
    const gv = this.app.gridView;
    if (this.app.view !== 'grid' || !gv.sel) return false;
    const layer = this.app.composer.deck.find(gv.sel.layerId);
    const k = (event && event.key) || '';
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (k === 'Enter') this.app.commitGridCell();
    else if (k === 'Escape') gv.sel = null;
    else if (k === 'Backspace') gv.backspace(layer);
    else if (k === 'Delete') { gv.sel.draft = '.'; this.app.commitGridCell(); }
    else if (moves[k]) { if (this.app.commitGridCell()) gv.move(layer, ...moves[k]); }
    else if (k.length === 1 && /[a-zA-Z0-9@<>^?#=~*%',.]/.test(k)) gv.type(k);
    else return false;
    return true;
  }

  // A sequencer click, turned into an edit of the layer's code (which locks the layer).
  seqAction(b) {
    const layer = this.app.composer.deck.find(b.layerId);
    if (!layer) return;
    const CT = CodeTools;
    if (b.type === 'layer-solo') return this.app.composer.deck.toggleSolo(layer.id);
    if (b.type === 'layer-mute') return this.app.composer.deck.toggleMute(layer.id);
    if (b.type === 'layer-lock') return this.app.composer.deck.toggleLock(layer.id);
    if (b.type === 'audition') return this.audition(b.row);
    // a grid's sounds are edited in the GRELHA view (one place for them: the grid's text)
    if ((b.type === 'cell' || b.type === 'release-row') && this.app.isGridSound(layer, b.key)) {
      this.app.logger.add(`${b.key} toca numa grelha: edita-o na vista GRELHA (V)`);
      return;
    }
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
    if (!res.ok) this.app.logger.add(`sequenciador: ${res.error}`, 'err');
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
    const str = CodeTools.scrub(d.from, dy);
    const code = CodeTools.splice(d.code, d.start, d.len, str);
    const res = this.app.composer.deck.liveEdit(d.layer.id, code, { desc: `${d.from} → ${str}`, final });
    if (res.ok) { d.code = code; d.len = str.length; }
  }

  release(p) {
    const d = this.app.drag;
    this.app.drag = null;
    if (d && d.type === 'eq') this.app.eqCurve.release();
    if (!d || d.type !== 'scrub') return;
    if (d.moved) this.applyScrub(d, d.y0 - p.mouseY, true);
    else { // a plain click on a number edits, as a click anywhere on the card
      const layer = this.app.composer.deck.find(d.layer.id);
      this.app.openSoundOf(layer, d.line);
      this.app.editor.open(layer);
    }
  }

  key(p, event) {
    if (this.app.state !== 'playing') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (this.gridKey(event)) return false;
    const pad = this.padForKey(p, event);
    if (pad) {
      if (event && event.repeat) return false;
      if (event && event.shiftKey) this.app.fx.toggle(pad.id, 'latch'); else this.app.fx.engage(pad.id, 'hold');
      return false;
    }
    const k = p.key.toLowerCase();
    if (k === 'n') { this.app.composer.forceMove(); this.app.logger.add('(mudança pedida)'); }
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
    return FxRack.PADS.find((x) => x.key === digit) || null;
  }

  keyUp(p, event) {
    if (this.app.state !== 'playing') return;
    const pad = this.padForKey(p, event);
    if (pad && !(event && event.shiftKey)) this.app.fx.release(pad.id, 'hold');
  }
};
