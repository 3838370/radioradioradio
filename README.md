# BROKEN-RADIO

An endless ambient / IDM radio written as live code. It composes in the browser, forever:
every sound you hear is a few lines of code on screen, and you can watch them change,
edit them, or take over with the sequencer.

Pure JavaScript with [p5.js](https://p5js.org) and p5.sound. Samples are streamed from
[Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples).

## Put it online

It's a static site with no build step: upload this folder as it is to any static host
(GitHub Pages, Netlify, Vercel, itch.io as an HTML game, your own server) and open
`index.html`. It needs to be served over http(s), not opened as a file.

To try it locally, from this folder:

```bash
python -m http.server 8000
```

then open http://localhost:8000.

## Playing it

Click **▶ TUNE IN**. The radio drifts between nine styles (deep, space, atmos, rave, dark,
industrial, ae, fog, dub) along an arc of sections. Tension comes fast (**surge**: full
and accelerating) or slow (**dread**: heavy and dark; **suspense**: empty, drones and
risers), between calmer stretches (sparse, drift, build, tension, peak, release, collapse).

Nothing repeats for long: every pattern comes in as a new version of itself (instruments
and kits swapped within their families), generators write chords, basslines, melodies,
drones and collages that keep evolving, the harmony moves within each style, and the radio
remembers what it has played this session.

- **Top bar:** pace, variation, density (layers), tempo, steps (the loops' cycle: 16, or odd
  IDM ones like 12, 20, 28), key and mode, volume. Each **auto** lets the radio decide and
  shows what it chose; moving a control takes over (until you tick auto again), and the
  radio reads what you're doing: many layers and a slow tempo is dread, fast is surge.
- **LOCK** (top right): holds the code of every layer; a manual density still works.
- **Styles:** click a style's name to turn it on or off. **[↻ REFRESH]** swaps the layers.
- **Views** (⇄ bottom right, or **V**): code cards, the full code (live; **[COPY]**), and a
  step sequencer. Everything you do in any view is written into the same code.
- **Code cards:** drag a number up/down to change it; click to edit (click outside to run).
- **Bottom:** effect pads (keys 1-8, Shift latches), delay, an EQ, the spectrum and an XY pad.
- **Keys:** N change something now, T next style, S next section, R refresh, M mute, V view.

Settings, your edited patterns and instruments are kept in your browser (localStorage).
