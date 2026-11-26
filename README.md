# BROKEN-RADIO

An endless IDM radio written as live code. It composes in the browser, forever:
every sound you hear is a few lines of code on screen, and you can watch them change,
edit them, or take over with the sequencer.

Pure JavaScript (ES modules) with [p5.js](https://p5js.org) and p5.sound. Samples are
streamed from [Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples).

## Put it online

It's a static site with no build step: upload this folder as it is to any static host
(GitHub Pages, Netlify, Vercel, your own server) and open `index.html`. It needs to be
served over http(s), not opened as a file.

To try it locally, from this folder:

```bash
python serve.py
```

then open http://localhost:8765. `serve.py` (Python 3, nothing to install) turns the
browser cache off, serves `.js` as JavaScript (Python's own `http.server` may not, on
Windows), and lets the Instrumentos panel save sounds to their files.

## Playing it

Click **▶ TUNE IN**. The radio drifts between nine IDM genres:

| Genre | In the spirit of | BPM |
|---|---|---|
| **SAW** | Aphex Twin's ambient side, the prepared pianos | ~96 |
| **ACID** | Aphex Twin's acid and braindance: raw 303, 808/909 | ~132 |
| **DRILL** | drill'n'bass: chopped amen with ratchets under slow, sad melodies | ~168 |
| **BOC** | Boards of Canada: dusty hip-hop breaks, detuned drifting synths, tape, voices | ~90 |
| **MINIMAL** | Efdemin: dry 4/4, bells and organ in shifting little figures | ~122 |
| **DUB** | dub techno and Gas | ~120 |
| **SPACE** | drifting space ambient and collage | ~84 |
| **DARK** | slow tension: drones, low brass, detuned pianos | ~76 |
| **AE** | Autechre live: generated, shifting rhythms, harsh FM, no tonic | ~118 |

It moves along an arc of sections. Tension comes fast (**surge**: full and accelerating) or
slow (**dread**: heavy and dark; **suspense**: empty, drones and risers), between calmer
stretches (sparse, drift, build, tension, peak, release, collapse). A new genre comes in
through a quiet stretch, and key changes wait for a calm moment.

Nothing repeats for long:
- every pattern comes in as a new version of itself: its instruments and kits swapped for
  others of the same family that the genre allows (a Boards of Canada pad never turns into
  an Efdemin one);
- melodies are generated in each genre's own way: ostinatos that turn (Aphex), long detuned
  lines (Boards of Canada), probability sequences that leave the key (Autechre), bell figures
  in different cycle lengths (Efdemin);
- generators also write chords, basslines, drones and collages that keep evolving;
- the harmony moves within each genre, at its own pace (one chord for 16 bars in acid, every
  2-4 bars in saw);
- the radio remembers what it has played this session.

## The controls

- **Top bar:** pace, variation, density (layers), tempo, steps (the loops' cycle: 16, or odd
  IDM ones like 12, 20, 28), key and mode, volume. Each **auto** lets the radio decide and
  shows what it chose; moving a control takes over (until you tick auto again), and the
  radio reads what you're doing: many layers and a slow tempo is dread, fast is surge.
- **[parâmetros]:** opens in the side panel's place (its first tab; [≈] painel goes back to
  the other tabs, and pressing the one open closes it), with everything the radio decides by itself: how often it swaps
  patterns, versions, timbres, drops and collages; timing, dynamics and detune; how often it
  modulates and whether keys wait for calm; how long each genre lasts, fades, tempo glides
  and section lengths. And per genre: tempo, energy, max layers, tape wow, modes and bars per
  chord. **↺** puts one back; **export / import / reset all** for the lot.
- **LOCK** (top right): holds the code of every layer; a manual density still works.
- **Genres:** click a genre's name to turn it on or off. **[↻ REFRESH]** swaps the layers.
- **Views** (⇄ bottom right, or **V**): code cards, the full code (live; **[COPY]**), and a
  step sequencer. Everything you do in any view is written into the same code.
- **Code cards:** drag a number up/down to change it; click to edit (click outside to run).
  In the corner: **[≈]** sound panel, **[S]** solo (only the layers on solo are heard; several
  can be on), **[M]** mute, **[L]** lock, **[↻]** another pattern. The sequencer has [S] [M] [L] too.
- **Bottom:** effect pads (keys 1-8, Shift latches), delay, an EQ, the spectrum and an XY pad.
- **Keys:** N change something now, T next genre, S next section, R refresh, M mute, V view.

- **Sounds (≈ → Instrumentos):** pick the instrument (bateria, percussão, baixo, teclas,
  melodia, textura), the group (bombos, tarolas…) and the sound; every value the sound
  engine reads is a control, and its code shows below. **guardar** writes it to the sound's
  own file (`instrumentos/…/<name>.inst`) through the local server; **guardar como** makes
  a new one. The drums and percussion are rebuilt in code and always play as code (their
  sample files aren't loaded); each card shows the code of the drums it plays, and an edit in
  the panel is heard at once in what is playing. Clicking a card opens its code and the panel
  at the sound of that line. **▶ original / A/B** in the panel play the old sample, to compare.
  Breaks, voices and field sounds still play their samples.
- **Full code:** **[COPIAR]** copies the whole track (tempo and harmony in `setup(...)`, every
  sound it plays, every layer's code); **[COLAR]** loads such a program back, locked.

Settings, parameters and your edited patterns are kept in your browser (localStorage), and
so are changes to sounds until you save them to their files. Your patterns can be exported
one by one as `.rad` files (the Guardar tab).

To edit and save sounds, run the local server (it can write the sound files):

```bash
python serve.py
```

(online, on a static host, sounds can be tuned and heard but not saved.)

## How it's made

- `patterns/<genre>/<id>.rad`: the bank, one file per pattern (a short header and the code as
  it shows on its card), listed in `patterns/index.txt`.
- `instrumentos/<instrument>/<group>/<name>.inst`: every sound, one file each (a short header
  and the recipe the synth plays), listed in `instrumentos/index.txt`. The drums rebuilt in
  code say which sample they replace (`// substitui: 808bd:5`).
- `src/music/Genres.js`: everything that makes each genre itself, in one table.
- `src/core/Settings.js`: every knob and parameter, described once (the PARAMS row is built
  from it).
- `src/music/Composer.js` decides; `Layers`, `Transitions`, `Steering` and `FxAuto` carry it out.
- `PROMPT.md`: the language, the code map, and the prompt for writing new patterns.
- `test.html`: the checks.
