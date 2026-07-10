# ZOIA Emulator Feature Evidence Architecture

Version: 0.1.0
Revision: 1

## Scope

This document defines the test evidence architecture for ZOIA Emulator features. Q-066 wires parser/model tests into the active workflow and creates the feature-test backlog. It does not implement every future UI, audio, interaction, export/import, or emulation behavior test.

## Required Evidence Classes

| Feature class | Primary tool | Required deterministic evidence |
| --- | --- | --- |
| Parser/model | Node.js or Python | result JSON, normalized patch snapshot, mismatch list, schema validation log |
| UI rendering | Playwright | screenshot, DOM snapshot, console log, trace on failure |
| Interaction | Playwright | action log, before/after state JSON, screenshot, event assertion log |
| Audio behavior | Python and/or Playwright | generated or captured WAV, audio hash/fingerprint, measured duration/RMS/peak/spectral facts, log |
| Import/export | Python or Node.js | input hash, output hash, normalized decoded state, explicit unsupported-fidelity flag where applicable |
| Simulation/emulation behavior | Python and/or Playwright | deterministic input event stream, state trace, module output samples or numeric assertions |

## Current Active Parser Gate

The active parser/model gate is:

```powershell
npm run zoia:lint:no-magic
npm run zoia:fixtures:all
```

Expected current result:

- fixtures: 87
- passed: 86
- quarantined: 1
- blocked: 0

The quarantined fixture is `C_Modulation/C09_Ensemble_Chorus` and remains fixture-data divergence evidence, not parser policy.

## Feature Inventory

The initial inventory is derived from the current project assets:

- Promoted parser harness under `tests/parser-harness`.
- ZOIA Patch Simulator HTML under `products\\zoia\\index.html`.

### Product Surfaces

| Feature area | Capabilities requiring tests | Proposed tool | Evidence |
| --- | --- | --- | --- |
| Patch binary import | Load `.bin`, parse patch name, modules, blocks, connections, pages | Node.js/Python | JSON result, input hash, normalized state |
| Patch JSON save/export | Save current patch as JSON | Playwright/Node.js | downloaded JSON, normalized schema check, hash |
| Patch binary serialization/export | Serialize current patch to binary-like buffer where implemented | Python/Node.js | output hash, decoded state comparison; no fidelity claim unless separately proven |
| Demo patch loading | Load built-in demo patch | Playwright | DOM/state snapshot, screenshot |
| Hardware view | 8x5 grid, OLED display, encoder input, page selector, page left/right, back, shift | Playwright | screenshot, DOM snapshot, state JSON |
| Schematic view | Module list, module details, connection overlay, connection type toggles, zoom | Playwright | screenshot, SVG/DOM snapshot, state JSON |
| Console panel | Open/close console, clear output, retain logs | Playwright | screenshot, console text snapshot |
| Patch summary/sidebar | Module count, connection count, page count, module details | Playwright | DOM snapshot, screenshot |
| Module add popup | Search modules, select module, select variant, add at grid position | Playwright | action log, state JSON, screenshot |
| Grid context menu | Rename, select, copy, paste, disconnect, delete | Playwright | before/after state JSON, screenshot |
| Grid drag connection | Drag from source block to destination block, reject invalid routes | Playwright | event log, state JSON, screenshot |
| Stompswitches | Select, scroll, bypass, select+scroll, scroll+bypass | Playwright | action log, state JSON |
| MIDI keyboard | Octave change, note press/release, readout | Playwright | screenshot, event log, state trace |
| Patch library browser | Import files, categorize/filter, list metadata, clear library | Playwright | screenshot, local storage/state JSON |
| Simulation toggle | Start/stop simulation mode | Playwright | state trace, screenshot, console log |
| Module simulation | Web Audio/CV/gate module factories and pass-through fallback | Python/Playwright | deterministic input stream, numeric state/audio evidence |

### Module Database Features

Each module type requires at least one parser/model assertion and, where applicable, a simulation or UI interaction assertion.

| Category | Type IDs and module names | Count |
| --- | --- | --- |
| Audio | 0 SV Filter; 7 VCA; 8 Audio Multiply; 9 Bit Crusher; 12 Tone Control; 13 Delay Line; 14 Oscillator; 24 Multi Filter; 38 Noise; 53 Stereo Spread; 57 Audio Panner; 62 Looper; 64 Audio Balance; 65 Inverter; 73 EQ; 76 Audio Mixer; 78 Granular; 79 Audio Balance; 83 Granular; 87 Pitch Shifter; 89 All Pass Filter; 33 Audio In Switch; 34 Audio Out Switch | 23 |
| Effect | 3 Aliaser; 11 OD & Distortion; 23 Compressor; 25 Plate Reverb; 26 Hall Reverb; 27 Shimmer; 28 Flanger; 29 Chorus; 30 Vibrato; 36 Reverb; 42 Ring Mod; 61 Phaser; 66 Fuzz; 67 Ghostverb; 68 Grain Delay; 69 Ping Pong; 71 Tremolo; 72 Cabinet Sim; 80 Diffuser; 82 Reverb Lite; 85 Delay; 86 Delay w/Mod; 91 Env Filter; 94 Reverb Lite Stro | 24 |
| CV | 4 Sequencer; 5 LFO; 6 ADSR; 10 Sample & Hold; 17 CV Invert; 18 Steps; 19 Slew Limiter; 22 Multiplier; 31 In Switch; 32 Out Switch; 35 Gate; 37 Rhythm; 39 Random; 45 Value; 46 CV Delay; 47 CV Loop; 48 CV Filter; 49 Clock Divider; 50 Comparator; 51 CV Rectify; 52 Trigger; 63 CV Abs; 70 Quantizer; 74 CV Min/Max; 75 Gate Inverter; 77 CV Flip Flop; 100 Tap Tempo; 103 Byte Splitter; 104 CV Mixer; 105 Logic Gate; 40 Env Follower; 41 Pitch Detect; 60 Onset Detect | 33 |
| Interface | 1 Audio Input; 2 Audio Output; 15 Pushbutton; 16 Keyboard; 44 Stompswitch; 54 Cport Exp/CV; 56 UI Button; 58 Pixel; 81 Pixel | 9 |
| MIDI | 20 MIDI Note In; 21 MIDI CC In; 43 MIDI Note Out; 55 MIDI Pressure; 59 MIDI CC Out; 101 MIDI PC In; 102 MIDI PC Out; 106 MIDI Clock In; 107 MIDI Clock Out | 9 |

## Test Backlog Rules

- Every feature receives a stable test ID.
- Every test records exact input artifacts and hashes where files are involved.
- Every UI test stores screenshots under a deterministic evidence path.
- Every audio test stores generated/captured audio plus measured facts, not just "sounds right".
- Every export/import test separates structural round-trip evidence from binary fidelity claims.
- Every unsupported or quarantined behavior must be explicit and evidence-backed.

## Initial Backlog

| ID | Feature | Tool | Initial status | Evidence output |
| --- | --- | --- | --- | --- |
| ZOIA-PARSER-001 | Full promoted fixture manifest parser/model gate | Node.js | implemented | `tests/parser-harness/results/zoia-fixture-runner-result-q064-promoted-full-category-quarantined.json` |
| ZOIA-LINT-001 | No magic numbers in parser harness | Node.js | implemented | `tests/parser-harness/results/zoia-no-magic-number-lint-result-q064.json` |
| ZOIA-UI-001 | Hardware view renders grid/OLED/page controls | Playwright | planned | screenshot, DOM snapshot |
| ZOIA-UI-002 | Schematic view renders modules/connections/toggles | Playwright | planned | screenshot, SVG/DOM snapshot |
| ZOIA-UI-003 | Module add/search/variant flow | Playwright | planned | action log, screenshot, state JSON |
| ZOIA-UI-004 | Context menu rename/copy/paste/delete/disconnect | Playwright | planned | before/after state JSON, screenshots |
| ZOIA-UI-005 | Stompswitch and combo-stomp behavior | Playwright | planned | event log, state JSON |
| ZOIA-UI-006 | MIDI keyboard note and octave interaction | Playwright | planned | event log, screenshot, state trace |
| ZOIA-IO-001 | JSON save/export schema and hash evidence | Playwright/Node.js | planned | downloaded JSON, schema log, hash |
| ZOIA-IO-002 | Binary import fixture-to-state evidence | Node.js/Python | implemented for staged fixtures | fixture result JSON, hash manifest |
| ZOIA-IO-003 | Binary export structural evidence | Python/Node.js | planned | output hash, decoded state comparison, no fidelity claim |
| ZOIA-AUDIO-001 | Simulation toggle and Web Audio graph startup | Playwright | planned | console log, state trace, screenshot |
| ZOIA-AUDIO-002 | Oscillator deterministic audio sample | Python/Playwright | planned | WAV, hash/fingerprint, RMS/peak facts |
| ZOIA-AUDIO-003 | Filter deterministic response sample | Python/Playwright | planned | WAV or numeric impulse response, measured facts |
| ZOIA-AUDIO-004 | Delay/reverb deterministic response sample | Python/Playwright | planned | WAV, duration/decay/fingerprint facts |
| ZOIA-SIM-001 | CV module deterministic state trace | Python/Playwright | planned | JSON trace |
| ZOIA-SIM-002 | Gate/trigger module deterministic state trace | Python/Playwright | planned | JSON trace |
| ZOIA-SIM-003 | MIDI module deterministic event trace | Playwright/Python | planned | event trace JSON |
| ZOIA-MOD-AUDIO | All Audio module definitions | Node.js/Python plus targeted Playwright | planned | per-type state/audio evidence |
| ZOIA-MOD-EFFECT | All Effect module definitions | Node.js/Python plus targeted Playwright | planned | per-type state/audio evidence |
| ZOIA-MOD-CV | All CV module definitions | Node.js/Python plus targeted Playwright | planned | per-type state trace |
| ZOIA-MOD-INTERFACE | All Interface module definitions | Playwright/Python | planned | interaction trace and screenshot |
| ZOIA-MOD-MIDI | All MIDI module definitions | Playwright/Python | planned | MIDI event trace JSON |
