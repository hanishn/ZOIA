# ZOIA Validation

Version: 0.4.0

Revision: 5

This document defines the validation gates for the ZOIA Emulator repository.

## Claim Boundary

The validation system proves only the behavior covered by deterministic tests and recorded machine-readable results.

It does not prove:

- complete ZOIA hardware emulation
- binary export fidelity
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
