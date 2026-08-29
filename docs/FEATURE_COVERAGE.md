# ZOIA Feature Coverage

Version: 0.4.0

Revision: 4

This document defines the 0.4 feature and capability coverage target. A feature is not release-ready until it has a deterministic Python, Playwright, or Node.js gate and machine-readable evidence.

## Claim Boundary

The 0.4 target is full local verification for committed test patches and the available community patch cache. It also includes pre-export generated-patch readiness for template selection and intermediate graph drafts. It does not claim ZOIA hardware fidelity, complete DSP accuracy, binary export fidelity, generated-patch binary export, full novel patch synthesis, redistribution rights for community patch binaries, or measured audio output for patches that are structurally empty, non-audio, no-route, or MIDI/control-only for master-audio purposes.

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
| Generated-patch template selection | Node.js | intent JSON, selected candidate evidence, measured-template provenance | implemented for selection-based drafts |
| Generated-patch selector scoring | Node.js | unmatched-description regression proving measured-signal bonus cannot select by itself | implemented |
| Generated-patch graph drafts | Node.js | graph JSON, requirement-trace JSON, pre-export validation result, trace expected-evidence negative control | implemented for intermediate drafts |
| Generated-patch description workflow | Node.js | selection result, draft result, validation result, workflow rollup JSON, unmatched-description negative control with zero stale draft files and isolated evidence paths | implemented for selection-based drafts |
| Generated-patch export boundary | Node.js | export-looking payload negative-control validation result JSON | implemented for pre-export drafts |
| Generated-patch candidate review | Node.js | draft source, source evidence existence, source-to-graph family and module-role comparison, intent-to-graph modality comparison, trace-to-graph coverage, graph path, trace path, validation status, graph size, requirement count, export-field count, missing-source and mismatch negative controls | implemented |
| Generated-patch provenance | Node.js | selection-to-draft provenance result JSON | implemented |
| Generated-patch prompt smoke | Node.js | per-prompt selection, draft, validation, concrete-core module, and unresolved-abstraction evidence | implemented for current smoke matrix |
| Generated-patch negative controls | Node.js | degraded-evidence blocked readiness result JSON | implemented |
| Release-review summary | Node.js | changed-file capability map, evidence list, documented evidence-path existence, reviewer-summary quality checks, commands, claim boundaries, protected-action boundary | implemented |
| v0.4 readiness negative controls | Node.js | degraded generated-patch readiness and release-review summary blocked v0.4 result JSON | implemented |
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
| Generated-patch pre-export path | template selection, graph/trace draft generation, validation, provenance, prompt smoke, claim-boundary, and negative-control evidence |

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

No local readiness blocker is recorded by the current v0.4 readiness gate. The remaining release risk is claim wording: public-facing text must distinguish measured-signal evidence from static structural proof and must describe generated-patch work as pre-export selection/draft readiness, not binary export or full novel synthesis.

## Current Generated-Patch Readiness Evidence

The current local generated-patch readiness rollup covers:

```text
template selection from human description
selector scoring regression
one-command human-description workflow
unmatched-description negative control
unmatched-description evidence isolation
export-boundary negative control
candidate review summary
source-to-graph family mismatch check
source-to-graph module-role mismatch check
intent-to-graph modality mismatch check
trace-to-graph coverage check
unresolved template-core abstraction disclosure
candidate-review missing-source negative control
candidate-review intent-modality mismatch negative control
v0.4 missing generated abstraction disclosure negative control
release-review stale generated validation negative control
intermediate graph and requirement-trace draft generation
pre-export graph validation
trace expected-evidence negative control
graph page/grid collision negative control
unsupported generated module semantics rejection
unsupported generated module params rejection
non-normalized generated module parameter rejection
unsupported generated module ports rejection
duplicate generated module port names rejection
incompatible generated connection signal-kind rejection
non-normalized generated connection gain rejection
out-of-range generated connection gain rejection
duplicate generated connection endpoint-pair rejection
unsupported generated module self-route rejection
declared CV/control route rejection
requirement trace coverage rejection
blocked generated requirement rejection
declared modality trace coverage rejection
audio route processor-bypass rejection
unsupported generated audio feedback cycle rejection
oversized generated graph rejection
unsupported generated trace verification method rejection
orphan generated audio processor rejection
orphan generated module rejection
undeclared connected generated modality rejection
effect/synth audio modality requirement rejection
declared synth role concrete-core rejection
unsupported MIDI modality rejection until a generated MIDI module contract exists
selection-to-draft provenance consistency
three-prompt smoke matrix
concrete-core prompt smoke for delay, reverb, and synth-loop prompts
claim-boundary consistency
negative controls for degraded provenance, prompt-smoke, missing prompt-smoke concrete-core summary evidence, and human-description workflow evidence
```

Current generated-patch readiness evidence:

```text
tests/workflow/evidence/generated-patch-readiness/run-result.json
```

Current generated-patch readiness result:

```text
status: pass
blockerCount: 0
selection candidates: 8
drafts: 3
validated drafts: 3
prompt-smoke prompts: 3
prompt-smoke required concrete-core prompts: 3
prompt-smoke concrete core module types: 3
prompt-smoke unresolved template-core abstractions: 0
negative-control cases: 4
```

Generated-patch readiness does not claim generated binary export, complete novel synthesis, or runtime audio behavior for generated drafts.

Current v0.4 readiness negative-control evidence:

```text
tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json
tests/workflow/evidence/v0.4-readiness-negative-controls/blocked-v04-readiness.json
```

Current v0.4 readiness negative-control result:

```text
status: pass
problemCount: 0
caseCount: 2
degraded generated-patch readiness blocks v0.4 readiness
degraded release-review summary blocks v0.4 readiness
```

Current release-review summary evidence:

```text
tests/workflow/evidence/release-review-summary/run-result.json
tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json
```

Current release-review summary result:

```text
status: pass
uncategorized changed files: 0
source-control side effects performed: false
```

The strict readiness gate is:

```text
npm run zoia:verify:v04
```

The gate writes:

```text
tests/workflow/evidence/v0.4-readiness/run-result.json
```
