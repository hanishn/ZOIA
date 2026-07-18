# ZOIA Feature Coverage

Version: 0.4.0

Revision: 2

This document defines the 0.4 feature and capability coverage target. A feature is not release-ready until it has a deterministic Python, Playwright, or Node.js gate and machine-readable evidence.

## Claim Boundary

The 0.4 target is full local verification for committed test patches and the available community patch cache. It does not claim ZOIA hardware fidelity, complete DSP accuracy, binary export fidelity, redistribution rights for community patch binaries, or measured audio output for patches that are structurally empty, non-audio, no-route, or MIDI/control-only for master-audio purposes.

## Required Feature Classes

| Feature class | Required tool | Required evidence | Current status |
| --- | --- | --- | --- |
| Patch import | Playwright and parser harness | input hash, normalized model JSON, console log, result JSON | implemented |
| Parser/model normalization | Node.js and Python | fixture result JSON, trace JSON, validator output | implemented |
| Module database coverage | Playwright and Python | unsupported type summary, block layout assertions, trace JSON | partial |
| Hardware view rendering | Playwright | screenshot, DOM snapshot, state JSON | implemented |
| Schematic view rendering | Playwright | screenshot, DOM snapshot, signal-flow JSON | implemented |
| Patch browser | Playwright | DOM/state snapshot, screenshot, browser API assertion | implemented |
| Test patch loader | Playwright | file-mode loader assertion, result JSON, screenshot | implemented |
| Parameter editing | Playwright | before/after state JSON, DOM snapshot, screenshot | implemented |
| Stomp switches | Playwright | event trace, before/after state JSON, screenshot | implemented |
| MIDI keyboard UI | Playwright | event trace, DOM/state snapshot, screenshot | implemented |
| Module add/search/variant | Playwright | action log, state JSON, screenshot | implemented |
| Grid context menu | Playwright | before/after state JSON, action log, screenshot | implemented |
| Drag-connect behavior | Playwright | before/after connection state, action log, screenshot | implemented |
| Simulation start/stop | Playwright | Web Audio state, console log, result JSON | implemented |
| Deterministic audio output | Playwright | analyser features, peak/RMS, quantized hash | implemented for measurable signal cohorts |
| External input stimulus | Playwright | test tone routing, audio features JSON | implemented for current community modality cohorts |
| MIDI/CV stimulus | Playwright and Python | deterministic event stream, output state/audio evidence | implemented where current emulator graph exposes measurable signal; otherwise static structural classification |
| Control/stomp stimulus | Playwright | deterministic action stream, output state/audio evidence | implemented where current emulator graph exposes measurable signal; otherwise static structural classification |
| Export/import boundaries | Node.js and Playwright | explicit unsupported-fidelity flag or round-trip evidence | partial |
| Error handling | Playwright | console/page error logs and failure classification | implemented |

## 0.4 Patch Corpus Exit Criteria

| Corpus | Required result |
| --- | --- |
| Committed test patches | 88 processed, 0 hard failures, 0 unproven stimulus blockers |
| Community patch cache | 1884 processed, 0 hard failures, 0 unclassified failures, 0 unproven stimulus blockers |
| Audio-output patches | deterministic analyser evidence with pass/fail criteria |
| External-input patches | deterministic test-tone stimulus evidence |
| MIDI/CV/control patches | deterministic stimulus evidence or explicit non-release blocker |
| Non-audio patches | explicit non-audio classification with model/UI/signal-flow evidence |

## Current Community Modality Evidence

The current local classified community modality rollup covers all 514 source backlog patches:

```text
514 covered
219 measured signal
295 static/classified structural proofs
0 problems
```

Static/classified structural proofs are used for patches that are empty, no-audio-output, no-audio-routing, no-source-to-output-route, or MIDI/control-only for master-audio purposes. These are meaningful verification results, but they are not measured audio-output claims.

## Current Known 0.4 Blockers

No local readiness blocker is recorded by the current v0.4 readiness gate. The remaining release risk is claim wording: public-facing text must distinguish measured-signal evidence from static structural proof.

The strict readiness gate is:

```text
npm run zoia:verify:v04
```

The gate writes:

```text
tests/workflow/evidence/v0.4-readiness/run-result.json
```
