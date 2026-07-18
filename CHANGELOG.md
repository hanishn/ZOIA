# Changelog

## 0.4.0

Deterministic stimulus and release-readiness validation update.

Included:

- added deterministic MIDI, CV, clock, and control stimulus evidence for committed test patches
- added v0.4 community patch stimulus classification for the local community patch cache
- added a v0.4 readiness gate that checks required evidence artifacts and blocker classifications
- added a feature coverage matrix document under `docs/FEATURE_COVERAGE.md`
- added schema metadata for patch verification result expectations
- improved simulator gate, MIDI, sequencer, and control-signal paths used by stimulus tests
- made community stimulus npm commands use Node CLI flags instead of PowerShell-only environment setup
- added full 1,884-entry community playability stimulus evidence with no runner failures and no unresolved no-signal bucket
- added community classifications for no audio source-to-output route, MIDI/control-only output routing, and sampler/looper content requirements
- ignored generated pulled-repository validation output

Current local evidence:

- committed test-patch stimulus: 24 pass, 0 fail
- community playability stimulus: 1884 fixtures, 1370 pass, 514 classified, 0 fail
- v0.4 readiness: pass, 0 blockers
- pulled-repository validation: pass

Not included:

- binary export fidelity claim
- complete ZOIA hardware emulation claim
- full DSP accuracy claim
- community patch binary redistribution

## 0.3.0

Traceability and source-readiness update.

Included:

- added trace evidence for import, normalized model, rendered UI state, signal flow, and audio-engine state
- added repeatable Playwright trace collection for committed staged/test patches
- added repeatable trace collection for the local community patch cache when present
- added Python validators for generated trace evidence
- expanded source organization for review and rebuild validation

Not included:

- full community patch audio correctness claim
- binary export fidelity claim
- complete ZOIA hardware emulation claim
- community patch binary redistribution

## 0.2.0

Source organization and validation baseline update.

Included:

- split the browser emulator runtime into module files under `products/zoia/src/scripts/modules/`
- updated the exhibit build manifest so the prebuilt HTML is assembled from the module list
- updated pulled-repository validation to verify manifest-declared source inputs
- added a `Test Patches` toolbar button for loading committed canonical test patches
- added a focused Playwright gate for the test-patch selector
- documented validation gates and claim boundaries for local review

Not included:

- complete ZOIA hardware emulation claim
- binary export fidelity claim
- full audio correctness claim
- community patch binary redistribution

## 0.1.0

Initial ZOIA Emulator evaluation baseline.

Included:

- browsable source tree for the HTML emulator exhibit
- build script for the prebuilt HTML exhibit
- prebuilt HTML exhibit output
- committed staged/test patches
- parser, Playwright, and staged audio validation harnesses
- push-candidate and pull-candidate staging validation workflow
- Apache License 2.0

Not included:

- community patch binaries
- public release claim
- full ZOIA hardware emulation claim
- binary export fidelity claim
- full audio correctness claim
