# ZOIA Validation

Version: 0.4.0

Revision: 7

This document defines the validation gates for the ZOIA Emulator repository.

## Claim Boundary

The validation system proves only the behavior covered by deterministic tests and recorded machine-readable results.

Documented generated evidence paths must exist before the release-review summary passes.

It does not prove:

- complete ZOIA hardware emulation
- binary export fidelity
- generated-patch binary export
- full novel patch synthesis from natural language
- runtime audio behavior for generated graph drafts
- full audio correctness
- redistribution rights for community patch binaries
- correctness for patch corpora that are not present during a given run
- measured audio output for community patches that are explicitly classified as empty, no-audio-output, no-audio-routing, no-source-to-output-route, or MIDI/control-only for master-audio purposes
- audible speaker output beyond analyser evidence and recorded machine-readable signal features

## Clone-Safe Gate

Run from a fresh clone:

```text
npm ci
npx playwright install chromium
npm test
```

`npm test` runs:

- HTML exhibit rebuild
- shared SSL package provenance checks
- parser no-magic-number lint
- Test Patches embedded selector browser assertion
- parser fixture gate
- staged audio gate when canonical staged patches are present
- optional community-audio packaging checks when the local evidence baseline is present

## Build Gate

Run:

```text
npm run zoia:build
```

The build reads:

```text
products/zoia/src/data/exhibit-manifest.json
products/zoia/src/index.template.html
products/zoia/src/styles/app.css
products/zoia/src/scripts/modules/
products/zoia/src/scripts/init.js
```

The build writes:

```text
products/zoia/dist/zoia-emulator.html
products/zoia/index.html
products/zoia/dist/build-manifest.json
```

## Staged Patch Gate

Run:

```text
npm run zoia:test:staged
```

The committed staged test patches are under:

```text
tests/workflow/canonical-patches/Test_Modules
```

The committed manifest is:

```text
tests/workflow/canonical-patches/Test_Modules.manifest.json
```

The generated HTML exhibit embeds these patches during `npm run zoia:build`. The `Test Patches` toolbar button works from direct file mode and from the repository server.

The focused browser assertion is:

```text
npm run zoia:test:playwright:test-patch-loader
```

Its evidence is written to:

```text
tests/workflow/evidence/q110-test-patch-loader
```

That assertion opens:

```text
products/zoia/dist/zoia-emulator.html
```

through a `file://` URL and verifies that 88 embedded test patch entries are available.

## Audio Gate

Run:

```text
npm run zoia:test:audio
```

This gate checks deterministic analyser evidence for staged/test patches. It does not prove full audio correctness. A patch can be classified instead of signal-present when it requires external input, MIDI, CV, unsupported routing, or intentionally silent behavior.

## v0.4 Stimulus Gates

Run the committed test-patch stimulus gate:

```text
npm run zoia:verify:test-patches:stimulus
```

Current local evidence path:

```text
tests/workflow/evidence/v0.4-test-patch-stimulus/run-result.json
```

Current local result:

```text
24 fixtures
24 pass
0 fail
```

Run the community stimulus gate after preparing the local community patch cache:

```text
npm run zoia:verify:community:stimulus
```

If a long run is interrupted after writing per-patch result files, resume without deleting existing per-patch evidence:

```text
npm run zoia:verify:community:stimulus:resume
```

Current local evidence path:

```text
tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-playability-full-r1/run-result.json
```

Current local result:

```text
1884 fixtures
1370 pass
514 classified
0 fail
```

Current classification counts:

```text
signal-present: 1368
low-level-waveform-present: 2
external-cv-midi-control-required: 77
no-audio-source-to-output-route: 78
no-audio-output-module: 266
empty-or-blank-patch: 65
midi-output-patch-no-master-audio-source: 6
sample-or-loop-content-required: 14
no-audio-routing-present: 3
q097-non-audio-unsupported-or-malformed-patch-data: 4
patch-requires-control-interaction: 1
```

Current playability backlog evidence:

```text
tests/workflow/evidence/v0.4-community-playability-backlog/run-result.json
tests/workflow/evidence/v0.4-community-playability-backlog/backlog.csv
```

Current playability backlog result:

```text
514 classified items
0 hard failures
0 deterministic-stimulus-applied-no-qualifying-signal entries
```

Run the classified community modality rollup after the cohort-specific modality gates:

```text
npm run zoia:verify:community:modality-rollup
```

Current classified community modality rollup evidence:

```text
tests/workflow/evidence/v0.4-community-modality-rollup/run-result.json
```

Current classified community modality rollup result:

```text
514 source backlog patches
514 covered
219 measured signal
295 static/classified structural proofs
0 problems
0 missing pairs
0 duplicate pairs
0 unexpected pairs
```

Current refreshed modality evidence by source classification:

```text
external-cv-midi-control-required: 77 covered, 10 measured signal, 67 static
patch-requires-control-interaction: 1 covered, 0 measured signal, 1 static
no-audio-routing-present: 3 covered, 1 measured signal, 2 static
no-audio-output-module: 266 covered, 141 measured signal, 125 static
empty-or-blank-patch: 65 covered, 0 measured signal, 65 static
q097-non-audio-unsupported-or-malformed-patch-data: 4 covered, 0 measured signal, 4 static
no-audio-source-to-output-route: 78 covered, 53 measured signal, 25 static
sample-or-loop-content-required: 14 covered, 14 measured signal, 0 static
midi-output-patch-no-master-audio-source: 6 covered, 0 measured signal, 6 static
```

The four `q097-non-audio-unsupported-or-malformed-patch-data` source items are no longer source-format blockers in the current local parser path. They import, render, enter playability state, and classify as `no-audio-routing-present` under the refreshed modality gate.

## Generated-Patch Readiness Gates

The generated-patch path is gated as a pre-export capability. It currently covers verified template selection from a human description, selector scoring regression evidence, one-command human-description workflow coverage, unmatched-description negative controls with zero stale draft files and isolated evidence paths, export-boundary negative controls, generated candidate review evidence with source-to-graph family comparison, source-to-graph module-role comparison, intent-to-graph modality comparison, trace-to-graph coverage, intermediate graph and requirement-trace draft generation, pre-export graph validation with supported-module contracts, provenance consistency, prompt smoke coverage that runs the one-command workflow for delay, reverb, and synth-loop prompts, claim-boundary checks, and negative controls.

Run the template selection gate:

```text
npm run zoia:generate:patch:select -- --description "ambient delay with slow modulation and expression pedal feedback control"
npm run zoia:generate:patch:select:regression
```

Current local evidence path:

```text
tests/workflow/evidence/generated-patch-selection/run-result.json
tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json
```

Current local result:

```text
8 verified candidates
8 measured-signal candidates
0 candidates missing evidence
```

Run the draft-generation and validation gates:

```text
npm run zoia:generate:patch:draft-from-selection -- --limit 3
npm run zoia:generate:patch:validate -- --fixture-root tests/workflow/generated-patches/from-selection --no-negative-fixtures
npm run zoia:generate:patch:trace-evidence:negative-controls
npm run zoia:generate:patch:provenance
```

Current local evidence paths:

```text
tests/workflow/evidence/generated-patch-drafts/run-result.json
tests/workflow/evidence/generated-patch-validation/run-result.json
tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json
tests/workflow/evidence/generated-patch-draft-provenance/run-result.json
```

Current local result:

```text
3 graph/trace drafts
3 validated drafts
3 provenance-consistent drafts
0 provenance problems
```

Run the prompt-smoke and claim-boundary gates:

```text
npm run zoia:generate:patch:prompt-smoke
npm run zoia:generate:patch:from-description
npm run zoia:generate:patch:from-description:negative-controls
npm run zoia:generate:patch:export-boundary:negative-controls
npm run zoia:generate:patch:candidate-review
npm run zoia:generate:patch:candidate-review:negative-controls
npm run zoia:generate:patch:claim-boundary
```

Current local evidence paths:

```text
tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json
tests/workflow/evidence/generated-patch-from-description/run-result.json
tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json
tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json
tests/workflow/evidence/generated-patch-candidate-review/run-result.json
tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json
tests/workflow/evidence/generated-patch-claim-boundary/run-result.json
```

Prompt smoke must report required concrete-core prompt count, concrete core module type count, unresolved template-core abstraction count, and per-graph summaries. The current concrete prompt families are `Delay Line`, `Reverb Lite`, and `Synth Voice`.

Current local result:

```text
3 prompts
3 prompts passed selection, draft generation, and pre-export validation
0 claim-boundary problems
```

Run the generated-patch negative controls:

```text
npm run zoia:generate:patch:readiness:negative-controls
```

Current local evidence path:

```text
tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json
```

Current local result:

```text
3 negative-control cases
3 pass
0 problems
degraded provenance blocks generated-patch readiness
degraded prompt smoke blocks generated-patch readiness
missing prompt-smoke concrete-core summary evidence blocks generated-patch readiness
degraded human-description workflow blocks generated-patch readiness
```

Run the v0.4 readiness negative controls:

```text
npm run zoia:verify:v04:negative-controls
```

Current local evidence paths:

```text
tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json
tests/workflow/evidence/v0.4-readiness-negative-controls/blocked-v04-readiness.json
tests/workflow/evidence/v0.4-readiness-negative-controls/blocked-v04-readiness-release-review.json
```

Current local result:

```text
status: pass
problemCount: 0
caseCount: 2
degraded generated-patch readiness blocks v0.4 readiness
missing generated abstraction disclosure blocks v0.4 readiness
degraded release-review summary blocks v0.4 readiness
canonical v0.4 readiness evidence remains separate
```

Run the generated-patch readiness rollup:

```text
npm run zoia:generate:patch:readiness
```

Current local evidence path:

```text
tests/workflow/evidence/generated-patch-readiness/run-result.json
```

Current local result:

```text
status: pass
blockerCount: 0
```

Generated-patch readiness does not claim binary export, full novel synthesis, hardware-realizable module graphs, or runtime audio behavior for generated output. It is a pre-export readiness gate for selection, selector scoring regression, one-command human-description workflow coverage, unmatched-description negative controls with zero stale draft files and isolated evidence paths, export-boundary negative controls, candidate review evidence, source-to-graph family and module-role mismatch checks, intent-to-graph modality mismatch checks, trace-to-graph coverage checks, unresolved template-core abstraction disclosure, candidate-review negative controls for missing source evidence, source-family mismatch, bundled source-role mismatch, isolated source-role mismatch without source-family mismatch, incomplete trace-to-graph coverage, and intent-modality mismatch, graph/trace draft generation, validation, graph page/grid collision rejection, unsupported module semantic rejection, unsupported module param rejection, non-normalized module parameter rejection, out-of-range module parameter rejection, unsupported module port rejection, duplicate module port name rejection, incompatible connection signal-kind rejection, non-normalized connection gain rejection, out-of-range connection gain rejection, duplicate connection endpoint-pair rejection, unsupported module self-route rejection, declared CV/control route rejection, requirement trace coverage rejection, blocked generated requirement rejection, declared modality trace coverage rejection, audio route processor-bypass rejection, unsupported generated audio feedback cycle rejection, oversized generated graph rejection, unsupported generated trace verification method rejection, orphan generated audio processor rejection, orphan generated module rejection, undeclared connected generated modality rejection, effect/synth audio modality requirement rejection, declared synth role concrete-core rejection, unsupported MIDI modality rejection until a generated MIDI module contract exists, provenance, one-command prompt smoke with concrete-core evidence, prompt-smoke concrete-core negative controls, claim-boundary consistency, and negative-control behavior.

Generated trace validation rejects requirement traces that reference missing expected evidence paths.

Generated graph validation rejects generated modules that occupy the same page/grid position.

Release-review freshness negative controls prove stale generated candidate-review evidence and stale generated validation evidence block release-review summary and v0.4 readiness through isolated evidence paths.

Run the release-review summary:

```text
npm run zoia:release:review-summary
npm run zoia:release:review-summary:negative-controls
npm run zoia:release:review-summary:doc-evidence-negative-controls
npm run zoia:release:review-summary:quality-negative-controls
```

Current local evidence path:

```text
tests/workflow/evidence/release-review-summary/run-result.json
tests/workflow/evidence/release-review-freshness-negative-controls/run-result.json
tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json
tests/workflow/evidence/release-review-summary-quality-negative-controls/run-result.json
```

The summary must list changed files by capability area, evidence paths, validation commands, claim boundaries, protected GitHub/source-control action boundary, upstream generated-patch evidence freshness, v0.4 readiness negative-control freshness, documented evidence-path existence, and reviewer-summary quality checks.

Run the v0.4 readiness gate:

```text
npm run zoia:verify:v04
```

Current local evidence path:

```text
tests/workflow/evidence/v0.4-readiness/run-result.json
```

Current local result:

```text
status: pass
blockerCount: 0
community modality covered: 514
community modality measured signal: 219
community modality static/classified: 295
community modality problems: 0
```

## Trace Gates

The v0.3 trace gates collect import, model, render, signal-flow, and audio-state evidence.

Run the committed test-patch trace gate:

```text
npm run zoia:trace:test-patches
npm run zoia:trace:validate
```

Current local evidence paths:

```text
tests/workflow/evidence/v0.3-trace-baseline/run-result.json
tests/workflow/evidence/v0.3-trace-baseline/test-patches
tests/workflow/evidence/v0.3-trace-baseline/summaries
```

Current test-patch trace result:

```text
88 patches
88 traceable
88 pass
0 hard failures
0 unknown modules
0 invalid model connections
```

Run the community trace gate after preparing the local community patch cache:

```text
npm run zoia:trace:community
npm run zoia:trace:validate:community
```

Current local evidence paths:

```text
tests/workflow/evidence/v0.3-trace-baseline/community-run-result.json
tests/workflow/evidence/v0.3-trace-baseline/community-patches
tests/workflow/evidence/v0.3-trace-baseline/community-summaries
```

Current community trace result:

```text
1884 cache entries
1881 traceable ZOIA patch binaries
3 classified non-patch AppleDouble resource-fork files
0 hard trace failures
0 signal-flow issue entries in failure-summary.json
```

The three classified non-patch files are:

```text
112362/112362.bin
133506/133506_v1.bin
133506/133506_v2.bin
```

Current community audio and playability classification counts:

```text
invalid-audio-connection: 1708
audio-output-unreachable: 382
external-input-required: 648
no-audio-output: 335
no-audio-source: 214
audio-path-reachable: 6
```

Current unsupported community module counts:

```text
unsupportedModuleTypeCount: 0
```

The current blockers for any claim that all community patches produce correct audible output are the audio and playability classification counts above.

## Community Patch Gate

Community patch binaries are not committed.

The source references are:

```text
https://patchstorage.com/platform/zoia/
https://github.com/meanmedianmoge/zoia_lib
```

Prepare a local cache:

```text
npm run zoia:patch-library:prepare
```

Then run:

```text
npm run zoia:test:community
```

For trace classification, run:

```text
npm run zoia:trace:community
npm run zoia:trace:validate:community
```

Generated local cache files are ignored under:

```text
tests/workflow/patch-library-cache/
```

## Push/Pull Staging Gate

Run:

```text
npm run zoia:stage:github
```

This creates:

```text
RepositoryValidation/push-candidate
RepositoryValidation/pull-candidate
```

The pull candidate runs validation from inside the simulated clone directory.

Results are written to:

```text
RepositoryValidation/repository-staging-result.json
RepositoryValidation/pull-candidate/repository-validation-result.json
```

## Required Review Evidence

Before a GitHub push, check:

- `git status --short`
- `npm run zoia:build`
- `npm test`
- `npm run zoia:trace:test-patches`
- `npm run zoia:trace:validate`
- `npm run zoia:trace:community`
- `npm run zoia:trace:validate:community`
- `npm run zoia:stage:github`
- `RepositoryValidation/repository-staging-result.json`
- `RepositoryValidation/pull-candidate/repository-validation-result.json`

Do not treat generated evidence folders as source. Preserve accepted evidence baselines outside Git unless there is a specific approval to commit them.
