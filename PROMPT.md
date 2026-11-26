# BROKEN-RADIO: running it, how it's built, and growing the pattern bank

The radio never plays AI audio. It plays **code**. The `patterns/` files hold the bank of
AI-written code layers, and the composer picks, mutates and chains them while the genre
drifts slowly (8–20 minutes each) through nine IDM genres, each at its own tempo:
- **saw** (~96 BPM): Aphex Twin's ambient side (*Selected Ambient Works 85-92* and *II*, the *Drukqs* prepared pianos). FM pads, loose 808, ostinatos, tape.
- **acid** (~132 BPM): Aphex Twin's acid and braindance (*Analord*, *Richard D. James Album*). Raw 303, 808/909, odd-interval motifs.
- **drill** (~168 BPM): drill'n'bass (*Drukqs*, *Come to Daddy*). The amen chopped at speed with ratchets, under slow, sad melodies.
- **boc** (~90 BPM): Boards of Canada. Slow dusty hip-hop breaks, detuned drifting synths, tape, voices and numbers stations.
- **minimal** (~122 BPM): Efdemin. Dry 4/4 with shuffled hats, bells and organ in little figures of different cycle lengths.
- **dub** (~120 BPM): dub techno and Gas. Chord stabs into long delays, a muffled kick, hiss.
- **space** (~84 BPM): drifting space ambient (*Aethereon*) and FSOL collage.
- **dark** (~76 BPM): slow tension. Half-time weight, drones, low brass, detuned pianos, the metro.
- **ae** (~118 BPM): Autechre (*AE_LIVE 2016–2018*). Generated, shifting rhythms, harsh FM, lines with no tonic.

The order is drawn at random, leaning on each genre's `tends` (`src/music/Genres.js`) (ambient into acid, acid into drill, drill into dark or ae...). The genres of earlier versions (fog, deep, atmos, rave, industrial) map to these, both in saved choices and in your saved patterns' flavours.

On top of the genre, an **arc** moves through sections. Tension comes two ways, fast or slow:

| Section | Layers | Tempo | Character |
|---|---|---|---|
| sparse | 1–2 | ×0.85 | no drums, long delays and vibrato |
| drift | 2–4 | ×0.92 | slow and wet |
| build | 3–4 | ×1.00 | the rhythm comes back |
| tension | 4–5 | ×1.04 | drier and brighter |
| **surge** | 5–6 | ×1.10 | fast tension: drums and bass first, dry and bright |
| peak | 6 | ×1.12 | everything in |
| **dread** | 4–6 | ×0.84 | slow tension: heavy, bass and drums first, closed filter, grit |
| **suspense** | 1–3 | ×0.86 | slow, empty tension: no drums or perc, filter opening, resonance rising |
| release | 2–4 | ×0.95 | thinning out |
| collapse | 2–3 | ×0.84 | after a peak: dark, wet, wobbly |

- With density on **auto**, the section gives the range of layers and the genre's energy picks within it.
- Each genre prefers some sections and avoids others, and caps the layers:
  - dark → dread and suspense;
  - drill → surge, peak and collapse;
  - saw, boc and space → drift, sparse, suspense (space at most 4 layers);
  - acid, drill, minimal and ae → up to 6 layers.
- Over hours, auto spends about a quarter of the time on 1–2 layers, 45% on 3–4 and 30% on 5–6, and over 40% in tense sections.

**Steering by hand.** When density or tempo is on manual, the radio reads what you're doing and holds the arc in the matching section. The HUD shows it with **MANUAL** next to the section name.
- **Layers** are read together with the tempo, if that's on manual too (against the genre's tempo):

  | | slower | normal | faster |
  |---|---|---|---|
  | 1–2 layers | suspense (sparse going down) | sparse / drift | build |
  | 3–4 layers | dread going down, else drift | drift / build | tension |
  | 5–6 layers | **dread** | tension / peak | **surge** (peak with 6) |

  Going down at a normal tempo gives release, or collapse after a peak or surge.
- **Tempo** alone (layers on auto): much slower is sparse, slower is drift, faster is tension and much faster is surge.

When you tick auto again, the arc carries on from that section and keeps your **register**:
- The next sections are drawn close to it in level and tempo, staying in the same one included.
- The tempo stays near yours.
- The next genre leans towards genres of similar intensity and tempo (slow and sparse → dark, space, saw; full and fast → drill, acid).

The pull fades out evenly over **5 minutes**, whatever the tempo: half after 2½ minutes, gone at 5. After that the radio wanders freely again.

(The previous IDM bank, BoC / SAW / Autechre / drill, is archived in `Temp\patterns-idm-v2`.)

## Running it
- Start the local server in this folder, `serve.py`: it turns browser caching off so code
  changes always show up on reload, serves `.js` as JavaScript, and lets the Instrumentos panel
  save sounds to their files:
  ```bash
  python serve.py
  ```
  Then open http://localhost:8765 and click **▶ Tune in**. With `python -m http.server` the browser may keep old copies of the files (use Ctrl+Shift+R), and on Windows it may serve `.js` as plain text, which the browser refuses for modules.
- `test.html` on the same server runs the checks. (Outside the repository, the project's helper `Scripts/testar.py` runs them in a headless Chrome; `python Scripts/testar.py --radio 60` plays the radio silently for a minute and reports the log and any errors.)
- **URL flags:** `?fast=1` (each genre lasts about 1 minute and the pace is divided by 8), `?seed=123` (repeatable choices).
- **Controls:**
  - **Pace:** how often something changes (every 4–64 bars).
  - **Lock** (right, next to the panel button; the `freeze` setting in code): see below.
    - On **auto** (the default) the composer alternates periods of short and long paces, each lasting 32–96 bars or until the section changes. Busy sections (build, tension, surge, peak) lean to 4–16 bars, calm ones to 32–64, and dread sits in between. The slider and its label (`auto: every 16 bars`) show the pace in use.
    - Moving the slider turns auto off and holds your pace until you tick auto again.
    - Lock holds the code: no swaps, resets, mutations or auto fx rewrites. The HUD says `CODE LOCKED`.
    - A manual density still adds or drops layers while locked; on auto, the count stays as it is.
  - **Variation:** how big each change is.
  - **Density:** the number of layers, 1–6 (one per role).
    - On **auto** the slider sits on the number of layers playing; the arc chooses (up to 4–6, depending on the genre). While the count is moving, the label shows where it's heading, e.g. `auto 2 → 5`. Muted layers are counted apart, e.g. `auto 4 (1 M)`.
    - Moving the slider turns auto off and holds exactly that many layers.
    - Layers enter or leave two at a time, every 2 bars, until the count is reached.
  - **Tempo:** set it yourself, or tick **auto** to follow the genre. Moving the slider turns auto off.
  - **Steps:** the loops' cycle in 16th steps. Choose **auto** (whatever the patterns bring), a straight count (**4, 8, 16, 32**, the pattern's longest short loop) or an odd IDM one (**7, 11, 12, 14, 17, 18, 20, 22, 24, 28**).
    - The radio then picks only patterns that have that cycle, from any genre, and swaps the free layers that don't. Long loops (pads, drones) fit any count.
    - The odd counts have only a few patterns, mostly drums, perc and lead; roles with none fall back to the usual choice.
  - **Key and mode:** pick them, or leave them on auto.
  - **Volume.**
- **[PARAMS]** (top right) opens a second row with what the radio decides by itself, built from `Settings.SCHEMA`:
  - **variation:** how often it swaps patterns, plays new versions, swaps timbres, tweaks numbers, drops layers out, scatters collage, changes progression (×, 1 = as designed);
  - **feel:** timing (rubato), dynamics, detune (0 = in tune; 0.5 by default);
  - **harmony:** chance to modulate, and whether key changes wait for a calm moment;
  - **transitions:** calm hand-over between genres, how long each genre lasts (min/max minutes), fade in/out bars, tempo glide bars, section length;
  - **genre** (the one playing, or one you pick): tempo, energy, max layers, tape wow, modes and bars per chord.
  - **↺** resets one; **export / import** a .json; **reset all**. Saved in the browser with the rest.
- **Styles:** click a style's name in the top bar (DEEP, SPACE, RAVE…) to turn it on or off.
  - Struck-through styles never play, and at least one stays on. The choice is saved.
  - Turning off the style playing now moves to another one at once.
- **[↻ REFRESH]** (top right, or the **R** key): swaps every playing layer for new patterns from the next phrase. Locked layers stay.
- **Views:** the **⇄** button (bottom right of the stage, or the **V** key) cycles cards → full code → sequencer → cards. All three show the same code.
  - **Full code:** every playing layer's code as one program, live; with Freeze on it doesn't change (Freeze also stops auto from rewriting the fx lines). Scroll with the wheel; **[COPY]** copies it all.
  - **Sequencer:** one block per layer and one row per sound (`folder:n` samples, synth names with `~`). Each row shows the cycle of the loop that plays it, in 16th steps: 16 for a bar, or 12, 20, 22… for IDM loops of other lengths (loops longer than 32 steps show the bar being heard). Its length is written at the row's end. Cells are wide, low bars that light white as the playhead passes a hit. The HUD shows the lengths playing next to the BPM, e.g. `16 STEPS` or `12 · 16 STEPS` for a polyrhythm. Every edit is written into the layer's code and locks the layer:
    - **[●]/[○]** turns a sound on or off, through a `mute('key', …)` line in the code's head.
    - Clicking a **cell** takes the row over: it becomes `hits('key', 'x...x...', { … })` in a `loop('hand', …)` at the end of the code (`loop('hand_12', …)` with `sleep(3)` for a 12-step row, and so on), starting from what that sound played in this bar, and the generated code's uses of that sound go quiet.
    - **[×]** gives the row back to the generated code.
    - Clicking a sound's **name** plays it; **[M] [L]** mute and lock the layer.
- **EQ** (bottom, left of the spectrum): four points (LOW, LO-MID, HI-MID, HIGH) that sit on the curve.
  - Drag one: sideways for frequency, up and down for level.
  - **[RESET]** or a double-click sets it flat.
- **Card buttons** (bottom-right corner of each card): **≈** opens the sound panel, **M** mutes the layer, **L** locks it (the composer won't touch it), and **↻** swaps it for a different pattern.
- **Drag numbers:** drag any number in a card's code up or down to hear it change at once. Big numbers (filters) move exponentially; small ones step.
- **Sound panel (≈):** four tabs.
  - **Camada:** volume, filter, resonance, reverb, delay, wobble and crush for one layer. The sliders rewrite its `fx({...})` line, and there are links to the instruments and samples it uses.
  - **Instrumentos:** every sound, organised as its files are: pick the instrument (bateria, percussão, baixo, teclas, melodia, textura), then a sound in its groups (bombos, tarolas, hihats…). Every field the sound engine reads is a control (built from `SoundFields`); sounds made of parts (the drums rebuilt in code) edit one part at a time, with **▶ original** and **▶ A/B** against the sample they rebuild. Edits are heard at once, show in the sound's code and are marked "por guardar" until **guardar** writes them to the sound's file (through the local server `serve.py`; online they can't be saved). **guardar como** makes a new file in the same folder, **desfazer** goes back to the file, **apagar** deletes it.
  - **Samples:** browse the Dirt-Samples folders and your own sounds. Shape them with pitch/rate, start, length, reverse and granular, then listen and insert the code.
  - **Guardar:** your saved patterns and sounds, the sounds with changes not yet saved to their files, plus .json export/import.
- **XY pad** (bottom right): X is the master filter, Y the space (reverb/delay). Double-click resets.
- **Your own sounds:** drag .wav / .mp3 / .ogg files onto the window. They become `s('my', { n })`.
- **Saving:** every edit is saved in this browser. Edited layers become `user_…` patterns that the composer also picks.
- **Live coding:** click anything else on a card to edit its code. The editor opens across the full width, and the layer is held while it is open.
  - **Click outside the editor** to run your code from the next bar and close it.
  - **Ctrl+Enter** runs the code and keeps you editing.
  - **Esc** closes without running, and **Tab** indents.  - Code with an error is refused and the old code keeps playing.
  - An edited layer is locked and marked `[edited]`. Unlock it (L) to let the composer mutate it again, using your code as its new starting point.
- **The card shows everything that makes the sound:**
  - one `inst('name', {...})` line for each sound the layer plays (edit it there and the sound changes, in the Instrumentos tab too, "por guardar")
  - a full `fx({...})` line, which the automation rewrites as it moves and the Camada sliders also write to
  - a highlighted comment for the effect pads active right now, e.g. `// + REVERB WASH (rev +0.45)`
  - The composer only mutates the code below these lines.
- **Effect pads** (bottom bar): DELAY THROW, DUB ECHO, WARP, REVERB WASH, FILTER, STUTTER, VIBRATO and TAPE STOP.
  - **Left click** holds a pad (on while pressed); **right click** latches it (on/off).
  - Keys **1–8** hold; **Shift+1–8** latch.
  - Dashed pads were fired by the radio itself.
- **Delay bar:**
  - **time** in note values; with **auto**, the radio changes it now and then, and the **glide** bends the echoes' pitch, Aphex-style
  - **feedback**
  - **fx auto:** how often the radio plays the pads by itself
- **Keys:** **N** changes something now, **T** skips the genre forward, **S** skips the section, **M** mutes everything.

## Code map (ES modules: one class per file, each importing what it uses)
- `src/main.js` starts the radio; `src/all.js` re-exports everything (the tests use it).
- `src/core`: Emitter, Settings (every knob and PARAMS parameter, described once in `SCHEMA` and `GENRE_SCHEMA`), Store (localStorage `radio-ai-v3`), Rng, Logger, MathUtil
- `src/audio`:
  - Clock and Scheduler (lookahead timing)
  - SampleLibrary (Dirt-Samples)
  - AudioEngine, Bus and TapeFx (the master and per-layer chains; TapeFx's wow is scaled per genre)
  - Reverb: an algorithmic Freeverb-style reverb. It replaced p5.Reverb, whose long convolution caused crackling.
  - FxRack: the 8 effect pads and the master delay
  - SynthVoice (its random drift and notes' detune scaled by PARAMS detune) and SampleVoice; SoundFields describes every field of a sound's recipe (the Instrumentos panel is built from it, and a test keeps it equal to what SynthVoice reads)
  - InstrumentLoader (reads `instrumentos/**/*.inst`, one file per sound; saves through the local server) and InstrumentLibrary (the sounds by name, changes "por guardar", which sound replaces which sample)
  - A sample with a sound that says `// substitui: folder:n` always plays that sound instead (AudioEngine.codedFor, with the sample's rate/cut/attack via codedNote and SoundFields.atRate); its file is never loaded. Samples without one (breaks, voices, field sounds) play their file. Each card carries the inst lines of the drums it plays.
- `src/lang`: the language itself. LiveCoder compiles, hot-swaps and rolls back code (and captures `fx()`, `params()` and `mute()`), LanguageApi is what code can call, plus CodeTools (the head lines: inst, params, fx, mute, hits), Layer, Loop, Iteration, Ring and Theory.
- `src/music`:
  - Genres: everything that makes each genre itself, in one table: tempo, intensity, where it tends to go, the sections it prefers and its layer cap, modes, progressions, chord length (`chordBars`), tape wow, role order, collage pool, and its **palette** (instruments per family) and **kits** (sample folders per family). The PARAMS row lays the listener's values over it.
  - GenreDrift: the slow journey between genres
  - Arc: the sections, fast and slow tension, the genres' section preferences
  - Harmony: key, mode, progression and chord length; a key change can wait for a calm moment
  - MelodyGen, Phrase, Melodies: evolving melodies
  - Generators: ChordGen, BassGen, CollageGen, DroneGen, MotifGen (behind `chords()`, `bassline()`, `collage()`, `drone()`, `motif()`)
  - Families: synths and sample folders that can stand in for each other
  - Variation: new values for a layer's `params()` (a version, a timbre move, a tweak); never touches the rest of the code
  - Memory: what the session has heard (fatigue per pattern, versions heard)
  - PatternLoader (reads `patterns/**/*.rad`), PatternBank
  - Composer: decides every move. Count changes come first, then a misfit for the genre, then one move drawn by score from: swap, new version, timbre, tweak, reset, dropout (dub drop for 1–4 bars), reharmonise, collage phrase, tempo push or drag. Scores depend on the variation knob, the section (`Composer.INTENT`), the genre, the PARAMS weights and the layer's age. Before a section changes there's a break or a fill. It shares the work out to:
    - Layers: the layers playing and their life (enter, fade out, replace, params, mute, lock, edits)
    - Transitions: genre hand-overs (through a quiet section), key changes when calm, fade times (replaced drums and bass stop at once)
    - Steering: what the listener does by hand (manual layers and tempo pick a section)
    - FxAuto: effect pads, delay jumps, breaks and fills
- `src/ui`: ControlPanel and ParamsBar (HTML: the top bar and the PARAMS row), Input (mouse and keys), CardGrid, CodeCard, CodeHighlighter, Hud, LogView, Spectrum, Theme, and the side panels
- `src/App.js`: wires everything and runs p5 in instance mode
- `patterns/<genre>/<id>.rad`: the bank, one file per pattern, listed in `patterns/index.txt` (made by `Scripts\indexar_padroes.py`)

---

## The prompt (copy everything below this line)

You are writing layers for an endless IDM radio. Each layer is a short program in a tiny
JavaScript live-coding language with Sonic Pi semantics. Write **N new patterns** with role
**ROLE** (`drums`, `perc`, `bass`, `keys`, `lead` or `texture`) for the genre **GENRE**
(one of `saw`, `acid`, `drill`, `boc`, `minimal`, `dub`, `space`, `dark`, `ae`; see the list
at the top of this file). Nothing EDM: no supersaws, hoovers, risers with drops, festival
stabs or "yeah" shouts. Melodies should not close like songs: use `melody()` with the style of
the genre (ostinato for saw/acid/drill, drift for boc/space, probability for ae, cells for
minimal/dub).

Write each pattern in 4-beat bars at its own genre's tempo.

### Output format
Return each pattern as a `.rad` file: a short header in comments, then the code. Name it
`<id>.rad` (it goes in `patterns/<genre>/`, and its path in `patterns/index.txt`).

```js
// role: perc
// genres: dub 1, minimal 0.3
// energy: 0.2-0.9
params({ rim: 'rs', odds: 3 })
fx({ lpf: 1800, rev: 0.45, crush: 0.2 })
loop('name', (i) => {
  sleep(0.75)
  if (!one_in(P.odds)) s(P.rim, { n: 0, amp: 0.12 })
  sleep(0.25)
})
```
- the file name (the id): prefixed with the genre (`saw_`, `acid_`, `drill_`, `boc_`, `min_`, `dub_`, `space_`, `dark_`, `ae_`), snake_case, unique.
- `role`: `drums`, `perc`, `bass`, `keys`, `lead` or `texture`.
- `genres`: how well the layer fits each genre, 0..1. Use crossover weights so layers can bridge between genres.
- `energy`: the min-max range of intensity (0..1) where it fits.
- `odd: true` (an extra header line) for patterns with odd-meter loops.
- `params({ ... })`: what the radio may vary. Name each instrument by its **family** and each sample folder by its **kit family** (see `src/music/Families.js`: `pad`, `bell`, `lead`, `sub`, `acid`... and `kick`, `snare`, `hat`, `rim`, `kit`, `perc`...), and read them in the code as `P.pad`, `P.kick`. The radio swaps them for others of the family that the genre playing allows (Genres: `palette`, `kits`). Numbers may vary too (`odds` for `one_in(P.odds)`). Sounds with no family stay written in the code.

### Language
- `loop('name', (i) => { ... })`: repeats forever, and `i` is the iteration count. **Each iteration must sleep a total of 1, 2, 4, 8 or 16 beats.**
- `sleep(beats)`: advances time.
- `s(folder, { n, amp, rate, pan, cut, begin, attack, release, reverse })`: plays a sample. `cut`, `attack` and `release` are in beats, and `begin` is 0..1. **Write `n` first**, e.g. `{ n: 3, amp: 0.4 }`.
- `synth(preset, note or [notes], { dur, amp, vel, cutoff, res, attack, release, pan, nudge, strum })`: `dur`, `attack`, `release`, `nudge` and `strum` are in beats.
  - `vel` (0..1) is how hard the note is played: quieter and darker when soft.
  - `nudge` plays it a little late (feel, rubato).
  - `strum` spreads a chord's notes (negative strums downwards).
- The presets:
  - **Pianos:** `piano`, `felt`, `grand`, `rhodes`, `broken_piano` (detuned, for dread), `toy_piano`
  - **Acid and FM:** `acid_303`, `acid_sq`, `acid_dirty`, `fm_sub`, `fm_metal`, `glitch_blip`, `clap_synth`, `stab`
  - **The city:** `voice_ah`, `voice_oo`, `traffic`, `metro_doors`, `metro_chime`, `alarm`, `door_slam`, `footstep`, `anvil`, `welder`, `steam`, `hum`
  - `strings`: detuned string ensemble (Gas)
  - `brass`: soft, slow horns (Gas)
  - `choir`: airy pad
  - `haze`: detuned warbling pad
  - `epiano`, `keys`: Rhodes-like electric piano
  - `bell`, `glass`: FM bells
  - `mono`: lead / flute-like line with vibrato
  - `pulse`: short resonant analog blip for sequences
  - `sub`, `drone`, `pluck`, `acid`
  - **Basses:** `sub808`, `fm_bass`
  - **Leads:** `sync_lead`, `chip`, `metal_lead`, `screech`
  - **Dark:** `dark_pad`, `horror`, `noise_drone`, `choir_dark`
  - **Synth drums:** `kick_synth`, `snare_synth`, `hat_synth`, `tom_synth`, `clank`, `zap`
  - **Industrial and city:** `grind`, `machine`, `metro_rumble`, `metro_brake`, `rail`
  - **Aphex Twin:** `prepared_piano` and `prepared_mute` (Drukqs prepared piano), `saw2_square` (SAW II), `tb303_saw`, `tb303_square`, `braindance_bass`, `aphex_lead`
  - **Boards of Canada** (everything wobbles a little out of tune): `boc_pad`, `boc_lead`, `boc_flute`, `boc_choir`
  - **Efdemin:** `efd_bell`, `efd_organ`, `efd_stab`, `efd_pad`
  - **Autechre:** `ae_fm_perc`, `ae_grain`, `ae_bass`, `ae_blip`
  - **Drill:** `drill_sub` (a clean slow sub under the breaks)
  - **FM, DX-style (Selected Ambient Works):** `dx_pad`, `dx_bell`, `dx_marimba`, `dx_brass`, `dx_bass`, `fm_glass`
  - **Analog:** `sh_lead`, `sh_bass` (SH-101), `warm_pad`, `juno_pad`, `string_machine`, `pwm_pad`, `soft_saw`
  - **Dub techno:** `dub_chord`, `dub_stab_m7`, `dub_pad_wash`, `dub_sub`, `dub_rim`, and the beds `hiss_bed`, `vinyl_bed`, `hum_bed` (one long note)
  - **Space:** `space_choir`, `space_drone_slow`, `shimmer_pad`, `glass_drone`, `cosmic_sweep`
  - **Tension (dread, suspense):** `dread_sub`, `dread_pad`, `low_brass`, `riser_slow` (climbs two octaves over 8 s), `tension_string` (tremolo), `metal_scrape`
  - **Collage (FSOL):** `radio_tune`, `tape_warble`, `formant_voice`, `shortwave`
- `fx({ lpf, res, rev, delay, amp, wobble, crush })`: the layer's filter, reverb send (0..0.7), delay send (0..0.6), level, tape wobble (0..0.9, pitch drift) and bit-crush (0..0.6). At the top level it sets the layer. Inside a loop it changes it at that moment.
- `inst('name', { osc: [...], attack, release, cutoff, ... })`: defines or changes a sound (the fields of `SoundFields`; `{ layers: [...] }` for a sound made of parts). A third argument `{ substitui: '808bd:5' }` makes it play instead of that sample (always). The radio writes these lines itself, so patterns don't need them. Every sound lives in its own file, `instrumentos/<instrument>/<group>/<name>.inst`.
- `setup({ bpm, key, mode, progression, chordBars })`: the tempo and harmony of a whole program. The full code starts with it; pasting the full code back ([COLAR]) applies it.
- `params({ name: value, ... })`: top level, what the radio may vary in this layer; the code reads `P.name`.
- **Harmony.** Always use these; never write note names.
  - `harm(octave, '' | '7' | '9')`: the current chord (it lasts the genre's chord length: 2-4 bars in saw and boc, 8-16 in acid, minimal, dub and ae).
  - `ROOT`: its root in the bass register. `QUAL`: `'minor'` or `'major'`.
  - `degree(d, octave)`: a note of the current mode, where 0 is the key's root.
  - `modal(octave, octaves)`: the mode's notes.
  - `KEY`, `MODE`.
  - `key_rate('c', ROOT)`: retunes a sample recorded in C.
- **Rhythm:** `spread(hits, steps, rotation)` (Euclidean), `ring(...).tick()` / `.look()`, `one_in(n)`, `choose([...])`, `rrand(a, b)`.
- **Never the same bar twice.** These keep their state per layer:
  - `phrase(name, { beats, density, octave, rest, evolve })` returns `[{ note, dur, vel, nudge, grace, last }]`: an evolving melody.
    - Motifs develop in an A A' B A'' form, change every few forms, and land on chord tones on strong beats.
    - They use triplets and dotted rhythms, leaps, passing notes and sequences.
    - `nudge` is rubato, `grace` is a neighbour note to flick into first (or null), and `last` marks the phrase's final note.
    - Play it like this:
    ```js
    for (const n of phrase('m', { beats: 4, density: 0.5 })) {
      if (n.grace) synth('piano', n.grace, { vel: n.vel * 0.5, nudge: n.nudge })
      if (n.note) synth('piano', n.note, { vel: n.vel, nudge: n.nudge + (n.grace ? 0.12 : 0) })
      sleep(n.dur)
    }
    ```
  - `vary(name, [options], bars)` returns a value held for about that many bars, then re-picked: grooves, voicings, densities, instruments.
  - `walk(name, lo, hi, speed)` returns a value that drifts smoothly, for filters, pans and rates.
  - `pad(id, beats)` fires an effect pad (`'dub'`, `'wash'`, `'warp'`, …) from the code.
  - `beat(name, { style, density })` returns one bar of 16th steps `[{ k, s, h, p, v }]` (kick, snare, hat, perc, velocity). It's an evolving drum pattern:
    - Styles: `four`, `break`, `halftime`, `dnb`, `broken`, `jungle`, `electro` and `ae` (16 steps).
    - For the genres: `drill` (snares everywhere; ratchet on top), `braindance` (syncopated 808, rolling hats), `boc_hiphop` (slow boom-bap), `efdemin` (dry 4/4, shuffled hats, no fills), `ae_live` (12–20 steps whose odds drift every bar).
    - For the references: `dubtechno` (soft 4/4, offbeat hats, ghost shakers, no fills), `saw808` (loose 808, busy hats), `halftime_dread`, `fsol_break` (chopped, with gaps), `pulse_sparse` (just a pulse), `downtempo`, `drift_free` (barely a pulse).
    - Odd meters: `seven` (7/8, 14 steps), `five` (5/4, 20), `eleven` (11/8, 22), `ritual` (12/8 hand drums, 24 steps) and `ae_odd` (11–19, changing). **Loop over `b.length`, not 16.**
    - Each bar re-samples a step or two. Every few bars a fill comes (roll, kicks, a drop, perc, stutter or flam).
    - Patterns with odd-meter loops are marked `odd: true`.
  - `swing(step, k, amount)` returns a swung step length for step `k`.
  - **Generators.** Each returns one bar of events (or `beats`); play them in order with `sleep(e.dur)`. Rests are events with nothing to play. Each holds an idea for a few bars, then varies it, now and then a lot:
    - `chords(name, { voicing, octave, rhythm, density })` returns `[{ notes, len, vel, dur }]`. These are chords over the current harmony.
      - `voicing`: `triad`, `m7`, `add9`, `sus2`, `sus4`, `dub` (root, 5th, 7th, 3rd up), `cluster`, `wide`, `quartal`, `fifths`.
      - `rhythm`: `stab` (dub techno offbeat hits), `offbeat`, `push` (anticipations), `long`.
    - `bassline(name, { style, octave })` returns `[{ note, len, vel, accent, slide, dur }]`.
      - `style`: `dub`, `sub`, `808`, `acid` (16ths with accents and slides), `walk`, `pedal`.
    - `collage(name, { pool, rate, beats })` returns `[{ s, n, rate, begin, pan, amp, dur }]`.
      - A scene of 2–4 sounds (voices, radio, field recordings) scattered over the bar; the scene changes one sound at a time. FSOL-style.
      - `pool` defaults to the genre's.
    - `drone(name, { voices, octave })` returns `{ notes, changed }`: chord tones held for minutes, with one voice moving a step now and then.
    - `motif(name, { beats, density, octave })` returns `[{ note, dur, vel }]`: a short melody that repeats and changes one detail at a time (Selected Ambient Works-style). Two motifs on alternate bars make a call and response.
    - `melody(name, { style, octave, beats, chord })` returns `[{ note, notes, len, vel, detune, ratchet, dur }]`. The melody styles, built on a bank of 63 original cells (`src/music/Melodies.js`):
      - `ostinato` (Aphex: saw, acid, drill): a short cell repeats, then rotates, transposes, swaps an octave or a note. Cells of 1.5, 2.5 or 3 beats run against the bar. `chord: true` follows the chord's root.
      - `drift` (Boards of Canada, space): long modal notes and rests, each with its own `detune` in cents. Pass it on: `synth(x, n.note, { detune: n.detune })`.
      - `probability` (Autechre): an odd-length step sequence where each step plays with its own chance; notes leave the mode, slightly detuned, now and then a `ratchet` (play it twice in the step).
      - `cells` (Efdemin, dub): two or three tiny bell figures each in its own cycle length; play `n.notes` (it can be several at once, or none).
    - `tape(name)` returns `{ level, wow, crackles }`: hiss level (drifts), a flutter episode now and then, and crackle clicks for the bar (play `hiss_bed` and `vinyl_bed` with them).
    ```js
    for (const c of chords('c', { voicing: 'dub', rhythm: 'stab' })) {
      if (c.notes) synth('stab', c.notes, { dur: c.len, amp: 0.36 * c.vel })
      sleep(c.dur)
    }
    ```
  - `params({ ... })` and `P`: see the output format above.
  - Loops may last 1, 2, 3, 4, 5, 6, 7, 8 or 16 beats. Odd lengths run against the 4-beat bar (polymeter).
- **Live values:** `ENERGY` (0..1, the current intensity), `BAR`, `BPM`, `SECTION` (`sparse`, `drift`, `build`, `tension`, `surge`, `peak`, `dread`, `suspense`, `release` or `collapse`).
  - After a euphoric, accelerating `peak` the radio usually `collapse`s: slower, darker and wetter.
  - After drill it tends to fall into dark or ae; acid leads into drill.

### Samples (Dirt-Samples folders; `n` picks a file)
- **Vintage drum machines:**
  - `dr2` (DR-110): 0 closed hat, 1 clap, 2 cymbal, 3 kick, 4 open hat, 5 snare
  - `drumtraks`: 0 cabasa, 1 claps, 4 closed hat, 5 open hat, 6 kick, 8 rim, 9 snare, 10 tambourine
  - `odx`: 0 kick, 1 snare, 2 shaker, 3 rim, 4 ride
  - `808bd` (25), `808sd` (25), `808` (n:1 closed hat)
- **Breaks:**
  - `amencutup`: 32 slices of the amen break (2 bars of 16ths), in order. At 170 BPM play one slice per `sleep(0.25)` with `rate: 1.25, cut: 0.25`.
  - `jungle`: 0 closed hat, 5 kick, 11 snare
- **Clean kit:** `bd` (24 kicks), `sn` (52 snares), `hh27` n:0 closed hat.
- **Pads:** `pad` (3 long pads, good for granular haze).
- **Abstract:** `glitch` / `glitch2` (0 BD, 3 HH, 7 SN, 2 FX), `click`, `metal`, `tok`, `industrial`.
- **Atmosphere:** `space`, `wind`, `birds`, `outdoor` (field recordings), `speech` and `mouth` (voices).
- **Tonal:** `juno` n:9, a C-minor pad. Use it only when `QUAL == 'minor'`, with `rate: key_rate('c', ROOT)`.

### Taste rules (no slop)
1. **Calm and repetitive.** One idea per layer. Variation comes from `i`, rings and `spread` rotation, not from randomness everywhere.
2. **Depth over detail:** low-pass most things, generous reverb, `wobble` on pads and leads. In `fog`, the kick is a soft thud under the haze (`lpf` ~500).
3. **Keep levels sane:** kicks 0.6–0.9, hats 0.05–0.25, percussion 0.1–0.3, synths 0.15–0.5.
4. **Stay in harmony:** `harm`, `degree`, `ROOT`, `modal` only.
5. **Leave space.** Silence is part of the groove.

Write the patterns now.
