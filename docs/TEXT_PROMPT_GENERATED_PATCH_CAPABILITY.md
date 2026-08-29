# Text-Prompt Generated Patch Capability Specification

Version: 0.1.0-local
Revision: 1

## Active Feature

Text-prompt generated patches moving from validated graph output to emulator-loadable and runtime-tested patches.

Active sprint:

```text
sprint-1784765236496-0xn97l
```

Active todo:

```text
todo-1784765279823-habvrm
```

## Latest Validated Checkpoint

The latest local checkpoint for this feature is package-boundary export evidence in clean consumer smoke, v0.4 readiness, and claim-boundary verification.

Command:

```powershell
npm run zoia:release:review-summary
npm run zoia:release:review-summary:clean-consumer-smoke-negative-controls
npm run zoia:release:review-summary:negative-controls
npm run zoia:verify:v04:clean-consumer-smoke
npm run zoia:verify:v04:negative-controls
npm run zoia:verify:v04
npm run zoia:generate:patch:claim-boundary
```

Evidence path:

```text
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\run-result.json
tests\workflow\evidence\release-review-freshness-negative-controls\run-result.json
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Result:

```text
releaseReviewSummary status: pass
releaseReviewSummary blockerCount: 0
releaseReviewCleanConsumerSmokeNegativeControls status: pass
releaseReviewCleanConsumerSmokeNegativeControls caseCount: 2
releaseReviewCleanConsumerSmokeNegativeControls passingCaseCount: 2
releaseReviewFreshnessNegativeControls status: pass
releaseReviewFreshnessNegativeControls caseCount: 3
releaseReviewFreshnessNegativeControls passingCaseCount: 3
cleanConsumerSmoke status: pass
cleanConsumerSmoke problemCount: 0
cleanConsumerSmoke installedCommandAuditCount: 5
cleanConsumerSmoke installedCommandSourceTreeFindingCount: 0
cleanConsumerSmoke sourceTreeImportsUsedByInstalledCommands: false
cleanConsumerSmoke missingInstalledReadinessScriptBlocked: true
cleanConsumerSmoke missingInstalledCapabilityDocBlockedStatus: fail
v0.4 readiness negative controls status: pass
v0.4 readiness negative controls caseCount: 10
v0.4 readiness negative controls passingCaseCount: 10
v0.4 readiness status: pass
v0.4 readiness blockerCount: 0
claimBoundary status: pass
claimBoundary problemCount: 0
claimBoundary v04ReadinessStatus: pass
```

Active command/process at the time this specification was written:

```text
none
```

## User-Visible Behavior

A local user can provide a text description for a ZOIA-style patch and receive generated artifacts that can be inspected and tested locally:

1. A selected-template evidence result.
2. Generated graph JSON and requirement trace JSON.
3. Converted emulator patch JSON.
4. Playwright load evidence proving the converted patch is accepted by the emulator runtime.
5. Audio signal evidence for the delay prompt path.
6. Delay-window semantics evidence for deterministic generated delay fixtures.
7. Modulation-route semantics evidence for deterministic generated delay fixtures.
8. Actual generated LFO waveform semantics evidence for stabilized generated delay fixtures.
9. Expression-pedal feedback semantics evidence for stabilized generated delay fixtures.
10. Unmodified generated patch modulated timing classification with original generated parameters and connections preserved.
11. Unmodified timing classifier corrupted-route negative controls.
12. Fresh prompt-to-runtime rollup evidence that regenerates the prompt path and runs the browser/audio gates under a run-scoped evidence root.
13. Prompt-breadth rollup evidence that separates delay-family runtime support from non-delay and unsupported prompt controls.
14. Prompt-corpus rollup evidence that tests delay, filter, modulation-only, and unsupported prompt classes through fresh text-prompt paths with explicit boundaries.
15. Prompt-repeatability rollup evidence that repeats the delay-family runtime route-semantics path across two fresh prompt variants and blocks an unsupported prompt variant.
16. Prompt-repeatability seeded negative controls that prove stale child evidence, missing runtime audio evidence, and unsupported-prompt mislabeling fail on the expected surfaces.
17. Prompt-corpus seeded negative controls that prove filter, modulation-only, and unsupported prompt classes cannot be mislabeled as delay-family runtime support.
18. Filter runtime semantics evidence that proves one fresh filter prompt path converts, loads, and attenuates high-frequency stimulus in the emulator runtime.
19. Filter modulation route/trace semantics evidence that proves the generated LFO-to-cutoff route is present and control-traced, with disconnected and wrong-target controls.
20. Filter audible cutoff-sweep blocker evidence that prevents claiming audible sweep behavior until current CV scaling produces measurable output change.
21. Non-delay boundary controls evidence that inventories reachable non-delay classes and prevents out-of-scope classes from being mislabeled as delay or filter runtime support.
22. Filter repeatability rollup evidence that repeats the fresh filter prompt path across four variants under the current low-pass-only runtime and LFO/cutoff trace boundary.
23. Filter repeatability seeded negative controls that prove stale LFO/cutoff trace evidence and missing trace evidence fail on the expected surfaces.
24. CV-to-filter-frequency scaling deferral evidence that preserves the current low-pass-only filter boundary after an attempted scaling change regressed consumed static filter evidence.
25. Runtime-audio classification seeded negative controls that reject silent required-audio results, missing captures, stale evidence, unsupported MIDI runtime modules, and classified-only signal results.
26. Generated-patch readiness integration that blocks if runtime-audio negative-control evidence is degraded.
27. v0.4 readiness integration that blocks if generated-patch readiness omits or degrades runtime-audio negative-control evidence.
28. Release-review summary integration that categorizes generated-patch runtime/audio evidence, accepts wildcard consumed evidence references, blocks stale child evidence, and feeds the v0.4 readiness gate.
29. Release-review overclaim negative controls that reject human-facing summary text implying release readiness, broad text-to-ZOIA support, audible cutoff sweep success, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support, or complete patch semantics.
30. Clean consumer smoke evidence that installs the local package artifact into a clean consumer directory, runs installed-package readiness gates against copied JSON evidence, and explicitly blocks release-review regeneration outside a git worktree.
31. Release-review freshness negative controls that prove stale clean consumer smoke evidence blocks release-review summary and v0.4 readiness.
32. Release-review clean consumer smoke negative controls that prove missing and stale clean-smoke evidence block directly through release-review summary with protected claim-boundary text still present.
33. Installed-package source-tree dependency audit evidence that distinguishes intentional copied JSON evidence from accidental installed-command use of source-tree paths.
34. Stale-package-artifact negative controls that prove clean consumer smoke cannot pass when installed package artifacts omit the current readiness script or required patch-generation doc.
35. Package-boundary export evidence that proves required package-owned docs and workflow scripts are included in the local package artifact before install, package metadata and script references survive install, and copied evidence bundle omissions are blocked.
36. Package-boundary overclaim controls that reject human-facing summaries implying npm publication readiness, GitHub readiness, copied evidence bundle publication, release readiness, package artifact publication, or broader publication readiness.
37. Publication-protection negative controls that scan release-review and v0.4 local workflows for protected Git, GitHub, tag, release, and npm publication commands and prove seeded protected commands are detected.
38. Final bounded evidence inventory controls that map accepted 0.4.0 claims to current evidence and reject overbroad doc or release-review text in seeded fixtures.

The current implemented user-visible path is:

```powershell
npm run zoia:generate:patch:from-description -- --description "ambient delay with slow modulation and expression pedal feedback control" --draft-root tests/workflow/generated-patches/manual-test --result-path tests/workflow/evidence/manual-text-prompt-test/run-result.json
npm run zoia:generate:patch:convert-emulator -- --graph-root tests/workflow/generated-patches/manual-test --output-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/manual-text-prompt-emulator-conversion/run-result.json
npm run zoia:build
npm run zoia:test:playwright:generated-patch-load -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/manual-text-prompt-generated-patch-load/run-result.json
```

## In-Scope Systems

- Text prompt to measured-template selection.
- Generated graph and trace drafting.
- Static generated graph validation.
- Generated graph to emulator patch JSON conversion.
- Browser runtime loading through `window.ZOIA.loadPatch`.
- Playwright state assertions for loaded patch name, module count, connection count, page count, and rendered hardware grid.
- Playwright audio assertions for deterministic delay-route and modulation-route fixtures derived from generated emulator patch JSON.
- Structured evidence JSON for each stage.
- Negative controls for converter rejection of invalid generated graph output.
- Negative controls for silent audio, bypassed delay routes, disconnected modulation routes, and wrong-target modulation routes.

## Out-of-Scope Systems

- ZOIA hardware `.bin` export.
- Claims that generated output is hardware-loadable.
- Public release, GitHub push, tags, or remote source-control side effects.
- Arbitrary full novel synthesis from unrestricted text prompts.
- MIDI generated-patch runtime behavior until a supported MIDI graph and runtime contract exists.
- Subjective musical quality assessment.

## Preserved Behavior

- Existing parser, community-patch, staged-patch, and CI evidence workflows must continue to run.
- Existing emulator loading through parsed `.bin` patches must remain unchanged.
- Existing `window.ZOIA.loadPatch` object contract remains the runtime target for this local feature.
- Static generated-patch validation remains a pre-export gate and must not be weakened to make runtime loading pass.
- Current claim boundaries must remain explicit in generated evidence.

## Capability Claims And Acceptance Criteria

### Claim 1: Text Prompt Produces Validated Graph Drafts

Acceptance criteria:

- The description workflow exits with `status: pass`.
- `selectedCandidateCount` is greater than zero.
- `measuredCandidateCount` is greater than zero.
- `draftCount` is greater than zero.
- `validatedDraftCount` equals `draftCount`.
- Result claim boundaries do not assert binary export or runtime audio.

Required evidence:

```text
tests\workflow\evidence\manual-text-prompt-test\run-result.json
```

### Claim 2: Validated Graph Drafts Convert To Emulator Patch JSON

Acceptance criteria:

- Converter exits with `status: pass`.
- `convertedPatchCount` equals the number of source graph files.
- Each converted patch has `moduleCount`, `modules`, `connections`, and `pages`.
- Each generated module maps to an explicit emulator `typeIdx` and block layout.
- Unsupported modules or ports produce structured blockers.

Required evidence:

```text
tests\workflow\evidence\manual-text-prompt-emulator-conversion\run-result.json
```

### Claim 3: Converted Generated Patches Load In The Emulator Runtime

Acceptance criteria:

- Playwright load evidence exits with `status: pass`.
- `loadedPatchCount` equals `patchCount`.
- Each loaded patch state reports the expected name, module count, connection count, and page count.
- The hardware grid renders with 80 buttons.
- Screenshots are produced for loaded generated patches.
- Result claim boundaries do not assert runtime audio or binary export.

Required evidence:

```text
tests\workflow\evidence\manual-text-prompt-generated-patch-load\run-result.json
```

### Claim 4: Invalid Generated Graph Output Is Rejected Before Emulator Load

Acceptance criteria:

- Negative-control command exits with `status: pass`.
- The unsupported-module fixture blocks conversion.
- The expected blocker ID `unsupported-generated-module` is observed.
- No converted patch is emitted for the invalid fixture.

Required evidence:

```text
tests\workflow\evidence\generated-patch-emulator-conversion-negative-controls\run-result.json
```

### Claim 5: Generated Delay Patch Runtime Audio Signal Is Measured

Acceptance criteria:

- A generated-patch audio evidence script loads generated emulator patch JSON into browser-loaded ZOIA simulation factories.
- The evidence records the stimulus source, render settings, signal metrics, thresholds, and classification per patch.
- Audio success requires measured RMS, peak, and post-input tail peak above threshold.
- WAV captures are written for each generated patch and for the silent negative control.
- The silent negative control must classify as expected silence and must not count as signal-present success.
- Classified or blocked audio is not counted as audio success unless the claim boundary explicitly says classified.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-audio\run-result.json
tests\workflow\evidence\generated-patch-audio\stimulus-manifest.json
tests\workflow\evidence\generated-patch-audio\classification-log.json
tests\workflow\evidence\generated-patch-audio\captures\*.wav
```

Current result:

```text
status: pass
patchCount: 3
signalPresentCount: 3
classifiedSilenceCount: 1
captureCount: 4
```

Current claim boundary:

```text
This proves deterministic impulse-stimulus signal presence through generated delay-path emulator patches. It does not prove musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 6: Generated Delay Path Can Produce A Deterministic Delayed Window

Acceptance criteria:

- A separate delay-semantics evidence script derives deterministic fixtures from generated delay-path emulator patch JSON.
- A positive fixture must contain a generated `Delay Line` module; reverb, synth, sampler, MIDI, or generic template modules cannot satisfy this delay claim.
- The derived fixture disconnects generated CV/control modulation into the delay module.
- The derived fixture sets delay time to 100 ms, feedback to 0, and mix to wet-only.
- Positive fixtures produce no immediate-window peak above silence threshold.
- Positive fixtures produce delayed-window peak above threshold near the expected 100 ms window.
- A bypassed-delay negative control produces signal but no delayed-window peak and classifies as bypassed.
- WAV captures are written for each positive fixture and the bypassed-delay negative control.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-delay-semantics\run-result.json
tests\workflow\evidence\generated-patch-delay-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-delay-semantics\classification-log.json
tests\workflow\evidence\generated-patch-delay-semantics\captures\*.wav
```

Current result:

```text
status: pass
patchCount: 3
delayWindowPresentCount: 3
bypassedDelayClassifiedCount: 1
captureCount: 4
```

Current measured values for each positive deterministic delay fixture:

```text
rms: 0.0068430664389349015
immediateWindowPeak: 0
delayedWindowPeak: 0.7729963064193726
delayedWindowPeakIndex: 4538
expectedDelaySeconds: 0.1
```

Bypassed-delay negative control:

```text
classification: bypassed-delay-classified
rms: 0.005050762722761054
immediateWindowPeak: 0.75
delayedWindowPeak: 0
```

Current claim boundary:

```text
This proves a deterministic fixture derived from generated delay-path patch JSON can produce a delayed-window signal when generated modulation is neutralized. It does not prove generated CV modulation behavior, exact behavior of the original unmodified generated patch, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 7: Generated Time Modulation Route Can Shift Delay Timing Under Deterministic CV

Acceptance criteria:

- A separate modulation-semantics evidence script identifies a generated `LFO` output to `Delay Line` `time_cv` route in each generated delay patch.
- The derived fixture preserves the generated delay signal path and generated modulation target route.
- The derived fixture fixes base delay time to 100 ms, feedback to 0, and mix to wet-only.
- For the positive fixture, the generated route target is driven with deterministic constant CV equivalent to a 50 ms delay-time offset.
- Positive fixtures produce no baseline-window peak above silence threshold at 100 ms.
- Positive fixtures produce a shifted-window peak above threshold near 150 ms.
- Disconnected modulation negative controls preserve baseline 100 ms output and do not produce the shifted 150 ms peak.
- Wrong-target feedback negative controls preserve baseline 100 ms output and do not produce the shifted 150 ms peak.
- WAV captures, fixture copies, stimulus manifest, classification log, and run result are written.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-modulation-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-modulation-semantics\classification-log.json
tests\workflow\evidence\generated-patch-modulation-semantics\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-modulation-semantics\captures\*.wav
```

Current result:

```text
status: pass
patchCount: 3
modulationShiftCount: 3
disconnectedControlClassifiedCount: 3
wrongTargetClassifiedCount: 3
captureCount: 9
```

Current measured values for each positive deterministic modulation fixture:

```text
rms: 0.007213225375630608
baselineWindowPeak: 0
shiftedWindowPeak: 0.7729963064193726
shiftedWindowPeakIndex: 6743
expectedBaseDelaySeconds: 0.1
expectedShiftedDelaySeconds: 0.15000000000000002
```

Disconnected modulation negative controls:

```text
classification: modulation-disconnected-classified
rms: 0.007213225375630608
baselineWindowPeak: 0.7729963064193726
shiftedWindowPeak: 0
```

Wrong-target feedback negative controls:

```text
classification: wrong-target-classified
rms: 0.007231318857962942
baselineWindowPeak: 0.7729963064193726
shiftedWindowPeak: 0
```

Current claim boundary:

```text
This proves that the generated LFO-to-Delay-Line-time route target can shift delay-window timing when driven by deterministic constant CV in fixtures derived from generated patch JSON. It does not prove actual generated LFO waveform semantics, expression-pedal feedback semantics, original unmodified patch timing under modulation, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 8: Actual Generated LFO Waveform Can Modulate Delay Timing In A Stabilized Fixture

Route under test:

```text
generated mod-source-1 LFO output -> generated delay-1 Delay Line time_cv input
```

Acceptance criteria:

- A separate LFO-semantics evidence script identifies the generated `LFO` output to `Delay Line` `time_cv` route in each generated delay patch.
- The generated LFO module, generated LFO rate parameter, generated LFO depth parameter, and generated LFO-to-delay-time connection strength are preserved.
- The fixture fixes only the delay core and stimulus for measurement: base delay time 250 ms, feedback 0, wet-only mix, and four deterministic impulse events.
- Positive fixtures capture the generated LFO output trace and assert LFO trace RMS above threshold.
- Positive fixtures estimate the LFO frequency from trace zero crossings and assert it matches the generated rate parameter within tolerance.
- Positive fixtures assert delayed audio peaks are measurable and their peak timing moves relative to the stabilized baseline.
- Disconnected-route negative controls preserve the generated LFO waveform but remove only the LFO-to-delay-time route; they must keep baseline delay timing.
- Muted-LFO negative controls preserve the audio path and route but zero the LFO output; they must keep baseline delay timing.
- Wrong-target feedback controls preserve the LFO waveform but route it to feedback instead of delay time; they must keep baseline delay timing.
- Audio captures, LFO trace WAV captures, fixture copies, stimulus manifest, classification log, and run result are written.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-lfo-semantics\run-result.json
tests\workflow\evidence\generated-patch-lfo-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-lfo-semantics\classification-log.json
tests\workflow\evidence\generated-patch-lfo-semantics\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-lfo-semantics\captures\*.wav
tests\workflow\evidence\generated-patch-lfo-semantics\traces\*.lfo.wav
```

Current result:

```text
status: pass
patchCount: 3
lfoWaveformRouteCount: 3
disconnectedControlClassifiedCount: 3
mutedControlClassifiedCount: 3
wrongTargetClassifiedCount: 3
captureCount: 12
traceCount: 12
```

Current measured values for each positive LFO fixture:

```text
lfoTraceRms: 0.24990589441045222
lfoTraceEstimatedFrequencyHz: 3.2085950573569715
audioRms: 0.011369023761650183
peakTimeDeltasSeconds: 0.07657596371882086, 0.10546485260770966, -0.060793650793650844, null
```

Disconnected-route negative controls:

```text
classification: lfo-route-disconnected-classified
lfoTraceRms: 0.24990589441045222
lfoTraceEstimatedFrequencyHz: 3.2085950573569715
audioRms: 0.00885484925439267
peakTimeDeltasSeconds: 0.0029024943310657636, 0.002902494331065708, 0.002902494331065819, 0.002902494331065819
```

Muted-LFO negative controls:

```text
classification: lfo-output-muted-classified
lfoTraceRms: 0
audioRms: 0.00885484925439267
peakTimeDeltasSeconds: 0.0029024943310657636, 0.002902494331065708, 0.002902494331065819, 0.002902494331065819
```

Wrong-target feedback negative controls:

```text
classification: lfo-wrong-target-classified
lfoTraceRms: 0.24990589441045222
lfoTraceEstimatedFrequencyHz: 3.2085950573569715
audioRms: 0.009027886273115019
peakTimeDeltasSeconds: 0.0029024943310657636, 0.002902494331065708, 0.002902494331065819, 0.002902494331065819
```

Current claim boundary:

```text
This proves that the actual generated LFO waveform is present at the generated rate/depth, and that the generated LFO-to-Delay-Line-time route moves delay output timing in stabilized fixtures derived from generated patch JSON. It does not prove the original unmodified generated patch timing under all modulation states, expression-pedal feedback semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 9: Generated Expression Control Can Drive Delay Feedback Tail In A Stabilized Fixture

Route under test:

```text
generated control-source-1 Cport Exp/CV output -> generated delay-1 Delay Line feedback_cv input
```

Acceptance criteria:

- A separate expression-feedback evidence script identifies the generated `Cport Exp/CV` output to `Delay Line` `feedback_cv` route in each generated delay patch.
- The generated Cport Exp/CV module, generated feedback target route, and generated connection strength are preserved for the positive fixture.
- The fixture fixes only the delay core and stimulus for measurement: delay time 100 ms, base feedback 0, wet-only mix, unrelated LFO time modulation removed, and one deterministic impulse event.
- Positive fixtures set deterministic expression value to `1`, capture the expression trace, and assert expression trace RMS above threshold.
- Positive fixtures assert the first delayed peak is present and feedback repeats produce tail peak and tail-to-first ratio above threshold.
- Disconnected-route negative controls preserve high expression input but remove only the expression-to-feedback route; they must produce no feedback tail.
- Low-expression negative controls preserve the expression-to-feedback route but set expression to `0`; they must produce no feedback tail.
- Inverted-feedback negative controls preserve the feedback target route shape but drive deterministic negative CV; they must produce a measurable opposite-polarity repeat rather than count as positive feedback success.
- Wrong-target mix controls preserve high expression input but route expression to mix instead of feedback; they must produce no feedback tail.
- Audio captures, expression trace WAV captures, fixture copies, stimulus manifest, classification log, and run result are written.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-expression-feedback-semantics\run-result.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\classification-log.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\captures\*.wav
tests\workflow\evidence\generated-patch-expression-feedback-semantics\traces\*.expression.wav
```

Current result:

```text
status: pass
patchCount: 3
expressionFeedbackTailCount: 3
disconnectedControlClassifiedCount: 3
lowExpressionControlClassifiedCount: 3
invertedControlClassifiedCount: 3
wrongTargetMixClassifiedCount: 3
captureCount: 15
traceCount: 15
```

Current measured values for each positive expression-feedback fixture:

```text
expressionTraceRms: 1
expressionTraceMin: 0
expressionTraceMax: 1
firstPeak: 0.7729963064193726
tailPeak: 0.4765298068523407
tailToFirstPeakRatio: 0.6164710010836839
repeat2PeakValue: 0.4765298068523407
repeat3PeakValue: 0.2321808934211731
```

Disconnected-route negative controls:

```text
classification: expression-feedback-disconnected-classified
expressionTraceRms: 1
firstPeak: 0.7729963064193726
tailPeak: 0
tailToFirstPeakRatio: 0
```

Low-expression negative controls:

```text
classification: low-expression-feedback-classified
expressionTraceRms: 0
firstPeak: 0.7729963064193726
tailPeak: 0
tailToFirstPeakRatio: 0
```

Inverted-feedback negative controls:

```text
classification: inverted-expression-feedback-classified
expressionTraceRms: 1
firstPeak: 0.7729963064193726
tailPeak: 0.4765297472476959
tailToFirstPeakRatio: 0.6164709239751075
repeat2PeakValue: -0.4765297472476959
```

Wrong-target mix negative controls:

```text
classification: expression-wrong-target-mix-classified
expressionTraceRms: 1
firstPeak: 0.7729963064193726
tailPeak: 0
tailToFirstPeakRatio: 0
```

Current claim boundary:

```text
This proves that deterministic expression input through the generated Cport Exp/CV-to-Delay-Line-feedback route creates measurable feedback-tail repeats in stabilized fixtures derived from generated patch JSON. It does not prove physical expression pedal hardware behavior, the original unmodified generated patch timing under all modulation states, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 10: Original Generated Patch Timing Is Classified Under Deterministic Stimuli

Route scope:

```text
original generated delay patch JSON with generated parameters and generated connections preserved
```

Acceptance criteria:

- A separate unmodified timing evidence script loads each generated emulator patch JSON without changing generated delay parameters or generated connections.
- The script requires the generated `LFO -> Delay Line time_cv` route and generated `Cport Exp/CV -> Delay Line feedback_cv` route to exist.
- The script renders each patch with deterministic impulse stimuli, expression values `0` and `1`, a repeated high-expression deterministic baseline input, and a muted-audio runtime-input negative control.
- The script captures audio WAVs, LFO trace WAVs, expression trace WAVs, fixture copies, stimulus manifest, classification log, and run result.
- Each non-muted original run must classify as `stable measured modulation behavior`, `measurable but unstable modulation behavior`, `signal-present only`, or `blocked with exact cause: ...`.
- Muted-audio runtime controls must classify separately and must not count as modulation success.
- Passing status requires all original generated patch fixtures and runtime-input controls to classify without runtime blockers.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\run-result.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\stimulus-manifest.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\classification-log.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\captures\*.wav
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\traces\*.lfo.wav
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\traces\*.expression.wav
```

Current result:

```text
status: pass
patchCount: 3
fixtureCount: 12
classifiedCount: 12
stableMeasuredModulationCount: 9
unstableModulationCount: 0
signalPresentOnlyCount: 0
blockedClassificationCount: 0
feedbackTailCount: 9
mutedAudioControlClassifiedCount: 3
captureCount: 12
lfoTraceCount: 12
expressionTraceCount: 12
```

Current classification for all nine non-muted fixtures:

```text
classification: stable measured modulation behavior
```

Current measured values for default-expression fixtures:

```text
expressionValue: 0
baseDelaySeconds: 0.725004577706569
baseFeedbackNormalized: 0.5600061036087587
baseMixNormalized: 0.48000305180437935
lfoTraceRms: 0.24647236715101245
lfoEstimatedFrequencyHz: 3.2085269696335836
expressionTraceRms: 0
firstPeakCount: 3
maxAbsPeakDeltaSeconds: 0.12426979871066468
maxRepeatToFirstRatio: 1
audioRms: 0.005315988365446979
```

Current measured values for high-expression fixtures:

```text
expressionValue: 1
baseDelaySeconds: 0.725004577706569
baseFeedbackNormalized: 0.5600061036087587
baseMixNormalized: 0.48000305180437935
lfoTraceRms: 0.24647236715101245
lfoEstimatedFrequencyHz: 3.2085269696335836
expressionTraceRms: 1
firstPeakCount: 3
maxAbsPeakDeltaSeconds: 0.12426979871066468
maxRepeatToFirstRatio: 1
audioRms: 0.005616946991880203
```

Current muted-audio runtime-input controls:

```text
classification: muted audio input negative control
expressionValue: 1
lfoTraceRms: 0.24647236715101245
lfoEstimatedFrequencyHz: 3.2085269696335836
expressionTraceRms: 1
firstPeakCount: 0
maxAbsPeakDeltaSeconds: 0
maxRepeatToFirstRatio: 0
audioRms: 0
```

Current claim boundary:

```text
This classifies the original generated emulator patch JSON under deterministic runtime inputs with generated parameters and connections preserved. It proves these original generated patches produce measurable audio, LFO traces, expression traces, stable measured modulation behavior, and feedback-tail behavior in the browser runtime under the tested inputs. It also proves muted audio input controls do not falsely classify as modulation success. It does not prove musical quality, preferred timing stability, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 11: Unmodified Timing Classifier Responds To Corrupted Routes

Route scope:

```text
generated patch fixtures derived from original generated emulator patch JSON with targeted route/control corruptions
```

Acceptance criteria:

- A separate negative-control evidence script starts from each generated emulator patch JSON and writes corrupted fixture copies.
- The script records the original generated patch path, source route metadata, corrupted fixture path, WAV capture, LFO trace, expression trace, classification log, stimulus manifest, and run result.
- Removing the generated `LFO -> Delay Line time_cv` route must not remain classified as unchanged stable measured modulation behavior; the timing movement must drop below the route-loss threshold.
- Removing the generated expression-feedback route may remain tailing only if evidence records that base delay feedback dominates the current patch state.
- Disabling feedback sources by zeroing base feedback and removing the expression-feedback route must remove the feedback-tail metric.
- Removing the generated `Audio Input -> Delay Line audio_in` route must remove measurable generated-patch output signal.
- Passing status requires every corrupted fixture to classify without runtime blockers and `unchangedStableClassificationCount` to remain `0`.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\stimulus-manifest.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\classification-log.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\captures\*.wav
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\traces\*.lfo.wav
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\traces\*.expression.wav
```

Current result:

```text
status: pass
patchCount: 3
fixtureCount: 12
classifiedCount: 12
lfoRouteControlClassifiedCount: 3
expressionRouteDominanceCount: 3
feedbackTailLostCount: 3
audioInputRouteSignalLostCount: 3
unchangedStableClassificationCount: 0
blockedClassificationCount: 0
captureCount: 12
lfoTraceCount: 12
expressionTraceCount: 12
```

Current removed-LFO-route negative controls:

```text
classification: corrupted-lfo-route-classified
lfoTraceRms: 0.24647236715101245
lfoEstimatedFrequencyHz: 3.2085269696335836
expressionTraceRms: 1
firstPeakCount: 1
maxAbsPeakDeltaSeconds: 0.002909254492977409
maxRepeatToFirstRatio: 0.7132009382949581
```

Current removed-expression-feedback-route negative controls:

```text
classification: corrupted-expression-route-classified-base-feedback-dominates
sourceBaseFeedbackNormalized: 0.5600061036087587
expressionTraceRms: 1
firstPeakCount: 1
maxAbsPeakDeltaSeconds: 0.0271722930417303
maxRepeatToFirstRatio: 0.05677332849047779
```

Current disabled-feedback-source negative controls:

```text
classification: corrupted-feedback-route-classified-tail-lost
baseFeedbackNormalized: 0
expressionTraceRms: 1
firstPeakCount: 1
maxAbsPeakDeltaSeconds: 0.0271722930417303
maxRepeatToFirstRatio: 0
```

Current removed-audio-input-route negative controls:

```text
classification: corrupted-audio-input-route-classified-signal-lost
audioRms: 0
peak: 0
firstPeakCount: 0
maxAbsPeakDeltaSeconds: 0
maxRepeatToFirstRatio: 0
```

Current claim boundary:

```text
This proves the unmodified timing classifier changes, records route irrelevance, removes the expected tail metric, or loses generated-patch output signal when targeted generated LFO, expression, feedback, and audio input routes are corrupted in derived fixtures. It does not prove original generated patch musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 12: Prompt-To-Runtime Evidence Can Be Regenerated Under One Fresh Run Root

Route scope:

```text
one text prompt to generated graph drafts, converted emulator patches, browser load, audio gates, semantics gates, unmodified timing classification, and corrupted-route negative controls
```

Acceptance criteria:

- A single rollup command creates a new run-scoped evidence root.
- Prompt graph generation writes fresh graph evidence and generated graph files under the run root.
- Graph-to-emulator conversion reads the run-scoped graph root and writes run-scoped emulator patch JSON.
- Browser load, audio signal, delay semantics, deterministic modulation semantics, LFO semantics, expression feedback semantics, unmodified timing classification, and unmodified timing negative controls all read the run-scoped emulator patch root.
- The rollup fails if any child command exits non-zero, any child result is not `status: pass`, any child result path is missing, or not all expected child gates execute.
- Passing status requires all child gates to pass in one rollup run.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\prompt-graph\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\convert-emulator\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\playwright-load\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\audio-signal\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\delay-semantics\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\lfo-semantics\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\expression-feedback\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\unmodified-timing\run-result.json
tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z\corrupted-route-negative-controls\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
stepCount: 10
executedStepCount: 10
passedStepCount: 10
runRoot: tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-2026-07-23T01-27-35-836Z
```

Current child gate summaries:

```text
prompt-graph: selectedCandidateCount 8, measuredCandidateCount 8, draftCount 3, validatedDraftCount 3
convert-emulator: convertedPatchCount 3
playwright-load: patchCount 3, loadedPatchCount 3
audio-signal: patchCount 3, signalPresentCount 3, classifiedSilenceCount 1
delay-semantics: patchCount 3, delayWindowPresentCount 3, bypassedDelayClassifiedCount 1
modulation-semantics: patchCount 3, modulationShiftCount 3, disconnectedControlClassifiedCount 3, wrongTargetClassifiedCount 3
lfo-semantics: patchCount 3, lfoWaveformRouteCount 3, disconnectedControlClassifiedCount 3, mutedControlClassifiedCount 3, wrongTargetClassifiedCount 3
expression-feedback: patchCount 3, expressionFeedbackTailCount 3, disconnectedControlClassifiedCount 3, lowExpressionControlClassifiedCount 3, invertedControlClassifiedCount 3, wrongTargetMixClassifiedCount 3
unmodified-timing: patchCount 3, stableMeasuredModulationCount 9, mutedAudioControlClassifiedCount 3
corrupted-route-negative-controls: patchCount 3, lfoRouteControlClassifiedCount 3, expressionRouteDominanceCount 3, feedbackTailLostCount 3, audioInputRouteSignalLostCount 3
```

Current claim boundary:

```text
This proves the delay prompt path can be regenerated and runtime-tested through the current local gates with fresh run-scoped evidence. It does not prove arbitrary prompt coverage, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 13: Prompt Breadth Is Bounded By Runtime-Supported And Unsupported Classifications

Route scope:

```text
multiple text prompts classified into delay-family runtime-supported, graph-supported runtime-unsupported, and unmatched unsupported cases
```

Acceptance criteria:

- A single prompt-breadth rollup command creates a new run-scoped evidence root.
- The delay-family variant prompt runs through fresh graph generation, conversion, emulator load, audio signal, delay semantics, modulation semantics, LFO semantics, expression feedback, unmodified timing, and corrupted-route negative controls.
- The non-delay synth and reverb prompts may produce validated generated graph evidence, but must block before emulator-loadable/runtime-tested delay evidence if they use unsupported generated modules.
- MIDI and sampler prompt families must block at validation until supported generated graph contracts exist.
- The unmatched prompt must block at selection and must not leave generated graph draft files.
- The gate fails if child evidence is stale, if a non-delay prompt is mislabeled as validated delay runtime evidence, if a validation-blocked prompt passes, if the unmatched prompt passes, or if the delay-family case lacks consumed WAV/audio or control trace evidence.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\prompt-manifest.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\classification-log.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\delay-family-variant\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\synth-supported-graph-runtime-unsupported\prompt-graph\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\synth-supported-graph-runtime-unsupported\convert-emulator\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\reverb-supported-graph-runtime-unsupported\prompt-graph\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\reverb-supported-graph-runtime-unsupported\convert-emulator\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\midi-validation-blocked\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\sampler-validation-blocked\run-result.json
tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z\unsupported-unmatched-prompt\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
caseCount: 6
passingCaseCount: 6
delayRuntimeSupportedCount: 1
graphSupportedRuntimeUnsupportedCount: 2
validationBlockedUnsupportedPromptCount: 2
blockedUnsupportedPromptCount: 1
runRoot: tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-2026-07-23T01-42-16-643Z
```

Current classifications:

```text
delay-family-variant: delay-runtime-supported; child stepCount 10; passedStepCount 10; includes audio-signal, unmodified-timing, and corrupted-route negative-control evidence
synth-supported-graph-runtime-unsupported: graph-supported-runtime-unsupported; graph validatedDraftCount 1; conversion blockerCount 3; convertedPatchCount 0; unsupported-generated-module Synth Voice
reverb-supported-graph-runtime-unsupported: graph-supported-runtime-unsupported; graph validatedDraftCount 1; conversion blockerCount 5; convertedPatchCount 0; unsupported-generated-module Reverb Lite
midi-validation-blocked: validation-blocked-unsupported-prompt; draftCount 1; validatedDraftCount 0; description-validation-not-ready recorded
sampler-validation-blocked: validation-blocked-unsupported-prompt; draftCount 1; validatedDraftCount 0; description-validation-not-ready recorded
unsupported-unmatched-prompt: blocked-unsupported-prompt; selectedCandidateCount 0; expected selection blocker recorded; draftFileCount 0
```

Current claim boundary:

```text
This proves the current prompt-driven runtime claim is bounded to delay-family prompts with consumed runtime/audio evidence. It proves synth and reverb prompts are not silently mislabeled as delay runtime evidence, MIDI and sampler prompt families block at validation, and an unmatched prompt blocks at selection. It does not prove arbitrary prompt coverage, non-delay runtime/audio semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 14: Prompt Corpus Classes Have Explicit Runtime Or Blocker Boundaries

Route scope:

```text
fresh text-prompt graph generation across delay, filter, modulation-only, and intentionally unsupported prompt classes
```

Acceptance criteria:

- A single prompt-corpus rollup command writes a corpus manifest before running cases.
- The delay class runs through fresh graph generation, emulator conversion, browser load, audio signal, delay semantics, unmodified timing, and corrupted-route negative controls.
- The filter class uses the text-prompt path to draft a graph and must block at validation until a supported filter runtime contract exists.
- The modulation-only class uses the text-prompt path to draft a graph and must block at validation until a supported CV-only runtime contract exists.
- The intentionally unsupported class must block at selection and leave no graph draft files.
- Unsupported classes cannot satisfy emulator-load, audio signal-present, route-semantics, or delay-family runtime claims.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\corpus-manifest.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\classification-log.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\delay-runtime-semantics\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\filter-validation-blocked\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\modulation-only-validation-blocked\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\unsupported-selection-blocked\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
caseCount: 4
passingCaseCount: 4
delayRouteSemanticsSupportedCount: 1
deterministicBlockerCount: 3
emulatorLoadOnlyCount: 0
audioSignalPresentCount: 0
runRoot: tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z
```

Current classifications:

```text
delay-runtime-semantics: delay-runtime-route-semantics-supported; child stepCount 10; passedStepCount 10; includes audio-signal, delay-semantics, unmodified-timing, and corrupted-route child evidence
filter-validation-blocked: filter-runtime-unsupported-validation-blocked; draftCount 1; validatedDraftCount 0; validation rejectedCandidateCount 1
modulation-only-validation-blocked: modulation-only-runtime-unsupported-validation-blocked; draftCount 1; validatedDraftCount 0; validation rejectedCandidateCount 1
unsupported-selection-blocked: unsupported-selection-blocked; selectedCandidateCount 0; draftFileCount 0
```

Current claim boundary:

```text
This proves a representative four-class prompt corpus is bounded by explicit runtime or blocker claims. Only the delay class has runtime/audio/route-semantics evidence. Filter and modulation-only classes are deterministic validation blockers, and the intentionally unsupported prompt is a selection blocker. It does not prove filter runtime semantics, modulation-only runtime semantics, arbitrary prompt coverage, musical quality, full DSP accuracy, hardware parity, complete patch semantics, or hardware binary export.
```

### Claim 15: Delay Prompt Repeatability Has Fresh Runtime Evidence Across Variants

Route scope:

```text
fresh text-prompt graph generation for two delay-family prompt variants plus one intentionally unsupported prompt variant
```

Acceptance criteria:

- A single prompt-repeatability rollup command creates a new run-scoped evidence root.
- Each supported delay-family variant runs fresh graph generation, emulator conversion, browser load, audio signal, delay semantics, modulation semantics, LFO semantics, expression feedback, unmodified timing, and corrupted-route negative controls.
- Each delay-family variant records the generated module family and requires `Audio Input`, `Delay Line`, `Audio Output`, `LFO`, and `Cport Exp/CV` modules in every generated emulator patch.
- Child evidence must be written under the current run root and must include consumed WAV, control trace, classification, and negative-control evidence before route-semantics support is counted.
- The unsupported prompt variant must block at selection and leave no generated graph drafts.
- The gate fails if unsupported variants are mislabeled as delay-family runtime support, if stale child evidence is reused, or if a delay variant reports pass without required runtime/audio/control evidence.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\repeatability-manifest.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\classification-log.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z\delay-ambient-expression\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z\delay-dub-feedback\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z\unsupported-selection-blocked\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
caseCount: 3
passingCaseCount: 3
delayVariantCount: 2
delayVariantPassCount: 2
unsupportedBlockedCount: 1
staleEvidenceFailureCount: 0
missingRuntimeEvidenceFailureCount: 0
runRoot: tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z
```

Current classifications:

```text
delay-ambient-expression: delay-runtime-route-semantics-supported; child stepCount 10; passedStepCount 10; module family Audio Input, Delay Line, Audio Output, LFO, Cport Exp/CV
delay-dub-feedback: delay-runtime-route-semantics-supported; child stepCount 10; passedStepCount 10; module family Audio Input, Delay Line, Audio Output, LFO, Cport Exp/CV
unsupported-selection-blocked: unsupported-selection-blocked; selectedCandidateCount 0; draftFileCount 0
```

Current claim boundary:

```text
This proves the current delay-family route-semantics workflow repeats across two fresh prompt variants and that one unsupported prompt variant remains blocked. It does not prove arbitrary prompt coverage, non-delay runtime semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 16: Repeatability Gate Fails On Seeded False-Pass Inputs

Route scope:

```text
seeded repeatability-rollup failure controls for stale child evidence, missing runtime audio evidence, and unsupported-prompt mislabeling
```

Acceptance criteria:

- A single prompt-repeatability negative-control command runs seeded variants of the repeatability rollup.
- The stale child evidence seed must make the child repeatability rollup fail with a `freshness` assertion failure.
- The missing runtime evidence seed must make the child repeatability rollup fail with an `audio-evidence` assertion failure.
- The unsupported-prompt mislabel seed must make the child repeatability rollup fail with a `prompt-boundary` assertion failure.
- The negative-control gate passes only if every seeded child rollup fails and records the expected failure surface.
- The negative-control gate does not count as positive prompt-repeatability evidence.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\stale-delay-evidence\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\missing-runtime-audio-evidence\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\mislabel-unsupported-as-delay\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
caseCount: 3
passingCaseCount: 3
seededFailureCount: 3
expectedFailureFoundCount: 3
```

Current seeded-control classifications:

```text
stale-delay-evidence: childStatus fail; expectedSurface freshness; expectedFailureFound true
missing-runtime-audio-evidence: childStatus fail; expectedSurface audio-evidence; expectedFailureFound true
mislabel-unsupported-as-delay: childStatus fail; expectedSurface prompt-boundary; expectedFailureFound true
```

Current claim boundary:

```text
This proves the repeatability gate is sensitive to three seeded false-pass modes: stale child evidence, missing runtime audio evidence, and unsupported-prompt mislabeling. It does not prove additional prompt variants, arbitrary prompt coverage, non-delay runtime semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 17: Non-Delay Corpus Classes Fail If Mislabeled As Delay Runtime Support

Route scope:

```text
seeded prompt-corpus failure controls for filter, modulation-only, and unsupported prompt classes mislabeled as delay-family runtime support
```

Acceptance criteria:

- A single prompt-corpus negative-control command runs seeded variants of the prompt-corpus rollup.
- The filter mislabel seed must make the child corpus rollup fail with a `prompt-boundary` assertion failure.
- The modulation-only mislabel seed must make the child corpus rollup fail with a `prompt-boundary` assertion failure.
- The unsupported prompt mislabel seed must make the child corpus rollup fail with a `prompt-boundary` assertion failure.
- The negative-control gate passes only if every seeded child corpus rollup fails and records the expected failure surface.
- The negative-control gate does not count as positive non-delay runtime evidence.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\mislabel-filter-as-delay\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\mislabel-modulation-only-as-delay\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\mislabel-unsupported-as-delay\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
caseCount: 3
passingCaseCount: 3
seededFailureCount: 3
expectedFailureFoundCount: 3
```

Current seeded-control classifications:

```text
mislabel-filter-as-delay: childStatus fail; expectedSurface prompt-boundary; expectedFailureFound true
mislabel-modulation-only-as-delay: childStatus fail; expectedSurface prompt-boundary; expectedFailureFound true
mislabel-unsupported-as-delay: childStatus fail; expectedSurface prompt-boundary; expectedFailureFound true
```

Current claim boundary:

```text
This proves the corpus gate rejects three non-delay false-pass modes where filter, modulation-only, or unsupported prompt classes are mislabeled as delay-family runtime support. It does not prove filter runtime semantics, modulation-only runtime semantics, arbitrary prompt coverage, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 18: Generated Filter Prompt Produces Measured Low-Pass Runtime Behavior

Route scope:

```text
fresh text-prompt graph generation for one filter prompt, generated graph validation, emulator conversion, browser load, and Playwright audio semantics for generated State Variable Filter mapped to emulator SV Filter
```

Acceptance criteria:

- The filter prompt path must select measured templates, draft one graph, and validate the generated `State Variable Filter` graph.
- The converter must map `State Variable Filter` to emulator `SV Filter` type `0` using the 1-in/1-out low-pass output variant.
- The generated emulator patch must load in the browser runtime.
- A deterministic two-tone stimulus must render through the generated filter patch in OfflineAudioContext and write WAV capture evidence.
- The positive generated filter patch must produce measurable signal and classify as low-pass by high-frequency to low-frequency magnitude ratio.
- The bypass-filter negative control must produce signal but fail the low-pass classification.
- The high-pass wrong-output negative control must produce signal but fail the low-pass classification.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-filter-runtime\prompt-graph\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\convert-emulator\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\playwright-load\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\classification-log.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\captures\01-107507.wav
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\captures\01-107507-bypass-filter-control.wav
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\captures\01-107507-highpass-output-control.wav
```

Current result:

```text
prompt graph status: pass; validatedDraftCount: 1
conversion status: pass; convertedPatchCount: 1
browser load status: pass; loadedPatchCount: 1
filter semantics status: pass
patchCount: 1
lowpassClassifiedCount: 1
bypassControlClassifiedCount: 1
highpassControlClassifiedCount: 1
captureCount: 3
```

Current classifications:

```text
01-107507: lowpass-filter-present; highLowRatio 0.0016384264628184096
01-107507-bypass-filter-control: bypass-filter-classified; highLowRatio 0.9999999999982566
01-107507-highpass-output-control: wrong-output-highpass-classified; highLowRatio 4.327511359098377
```

Current claim boundary:

```text
This proves one generated filter prompt path can validate, convert, load, and produce measured low-pass spectral behavior in the emulator runtime. It does not prove cutoff modulation semantics, resonance semantics, all SV Filter output modes, arbitrary filter prompts, modulation-only runtime semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 19: Generated Filter LFO Route Targets Cutoff With Control Trace Evidence

Route scope:

```text
generated filter emulator patch fixture derived from the fresh filter prompt path, with generated LFO output routed to generated SV Filter frequency/cutoff input
```

Acceptance criteria:

- The Playwright gate must load the generated filter emulator patch and derive positive, disconnected, resonance wrong-target, and output-gain wrong-target fixtures.
- Each fixture must render a generated LFO output trace as WAV/PCM evidence.
- The positive fixture must preserve the generated LFO output to generated filter cutoff route and classify as `lfo-cutoff-route-traced`.
- The disconnected control must preserve the generated LFO waveform but remove the cutoff modulation route.
- The wrong-target controls must preserve the generated LFO waveform but route it away from cutoff.
- The generated LFO trace must exceed RMS threshold and match the generated rate parameter within tolerance.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-filter-modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-modulation-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-filter-modulation-semantics\classification-log.json
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-positive-cutoff-route.lfo.wav
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-disconnected-cutoff-route.lfo.wav
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-wrong-target-resonance.lfo.wav
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-wrong-target-output-gain.lfo.wav
```

Current result:

```text
status: pass
blockerCount: 0
fixtureCount: 4
lfoCutoffRouteClassifiedCount: 1
disconnectedControlClassifiedCount: 1
wrongTargetControlClassifiedCount: 2
traceCount: 4
```

Current classifications:

```text
01-107507-positive-cutoff-route: lfo-cutoff-route-traced; traceRms 0.24715674536433738; estimatedFrequencyHz 3.2; expectedFrequencyHz 3.208522011139085
01-107507-disconnected-cutoff-route: disconnected-cutoff-route-classified; traceRms 0.24715674536433738; estimatedFrequencyHz 3.2
01-107507-wrong-target-resonance: wrong-target-resonance-classified; traceRms 0.24715674536433738; estimatedFrequencyHz 3.2
01-107507-wrong-target-output-gain: wrong-target-output-gain-classified; traceRms 0.24715674536433738; estimatedFrequencyHz 3.2
```

Current claim boundary:

```text
This proves the generated filter patch includes a measurable generated LFO waveform routed to the generated filter cutoff/frequency target, and that disconnected or wrong-target controls do not satisfy the cutoff-route claim. It does not prove audible cutoff sweep depth, resonance semantics, all SV Filter output modes, arbitrary filter prompts, modulation-only runtime semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 20: Generated Filter Audible Cutoff Sweep Is Deterministically Blocked

Route scope:

```text
generated filter emulator patch fixture derived from the fresh filter prompt path, comparing disconnected cutoff route, generated LFO-to-cutoff route, and exaggerated seeded cutoff route under deterministic audio stimulus
```

Acceptance criteria:

- The Playwright gate must render disconnected, generated, and exaggerated cutoff-route fixtures in the browser runtime.
- Each fixture must write a WAV capture under the evidence root.
- The generated LFO-to-cutoff fixture must have output difference from the disconnected fixture below the audible-sweep blocker threshold.
- The exaggerated seeded cutoff-route fixture must have output difference from the disconnected fixture above the measurable-sweep threshold.
- The gate must classify the current generated audible cutoff sweep as blocked, not successful.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\run-result.json
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\stimulus-manifest.json
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\classification-log.json
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\captures\01-107507-disconnected-cutoff-route.wav
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\captures\01-107507-generated-cutoff-route.wav
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\captures\01-107507-exaggerated-cutoff-route.wav
```

Current result:

```text
status: pass
blockerCount: 0
fixtureCount: 3
captureCount: 3
generatedDiffRms: 0.0005722353133105269
exaggeratedDiffRms: 0.3596596323947025
classification: audible-cutoff-sweep-blocked-by-current-cv-scaling
```

Current claim boundary:

```text
This proves the current generated filter LFO-to-cutoff route does not produce a measurable audible cutoff sweep under the gate threshold, while an exaggerated seeded route does produce a measurable output difference. It blocks audible cutoff-sweep claims. It does not disprove route/trace evidence, and it does not prove resonance semantics, all SV Filter output modes, arbitrary filter prompts, modulation-only runtime semantics, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 21: Reachable Non-Delay Prompt Classes Have Explicit Runtime Or Blocker Boundaries

Route scope:

```text
non-delay prompt class inventory for filter, reverb, synth, sequencer, modulation-only, MIDI, sampler, and unsupported prompt classes
```

Acceptance criteria:

- The rollup must write a prompt manifest before running cases.
- Filter must remain the only in-scope non-delay runtime class and must reference existing consumed browser/audio/control evidence.
- Reverb and synth may produce validated generated graph evidence but must block at conversion/runtime boundary.
- Sequencer, modulation-only, MIDI, and sampler must block at validation before conversion or runtime evidence.
- Unmatched unsupported prompt must block at selection and produce no graph drafts.
- Every out-of-scope class must have seeded mislabel controls proving it cannot be counted as delay-family runtime support or filter runtime support.

Required evidence paths:

```text
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-result.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\prompt-manifest.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\classification-log.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z\reverb-runtime-unsupported\prompt-graph\run-result.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z\reverb-runtime-unsupported\convert-emulator\run-result.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z\synth-runtime-unsupported\prompt-graph\run-result.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z\synth-runtime-unsupported\convert-emulator\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
classCount: 8
passingClassCount: 8
inScopeRuntimeClassCount: 1
graphSupportedRuntimeUnsupportedCount: 2
validationBlockedCount: 4
selectionBlockedCount: 1
seededMislabelControlCount: 14
seededMislabelFailureDetectedCount: 14
runRoot: tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z
```

Current classifications:

```text
filter-lowpass-runtime-supported: runtime-lowpass-supported; inScopeForV040 true
reverb-runtime-unsupported: graph-supported-runtime-unsupported; unsupported module Reverb Lite
synth-runtime-unsupported: graph-supported-runtime-unsupported; unsupported module Synth Voice
sequencer-validation-blocked: validation-blocked
modulation-only-validation-blocked: validation-blocked
midi-validation-blocked: validation-blocked
sampler-validation-blocked: validation-blocked
unsupported-selection-blocked: selection-blocked
```

Current claim boundary:

```text
This proves reachable non-delay prompt classes are inventoried and mapped to explicit runtime or blocker boundaries. Filter is the only in-scope non-delay runtime class, and only within the previously documented low-pass and route/trace boundaries. Reverb and synth remain graph-supported but runtime-unsupported. Sequencer, modulation-only, MIDI, and sampler remain validation blockers. Unsupported unmatched prompts remain selection blockers. This does not prove arbitrary prompt coverage, reverb runtime semantics, synth runtime semantics, sequencer runtime semantics, modulation-only runtime semantics, MIDI or sampler behavior, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 22: Filter Low-Pass Runtime Support Repeats Across Prompt Variants

Route scope:

```text
fresh text-prompt graph generation, emulator conversion, browser load, WAV capture, spectral low-pass classification, bypass control, high-pass wrong-output control, and LFO/cutoff trace evidence for four filter prompt variants
```

Acceptance criteria:

- The rollup must write a prompt manifest before running cases.
- Each filter prompt variant must produce one validated generated graph draft.
- Each filter prompt variant must convert to one emulator patch containing `Audio Input`, `SV Filter`, `Audio Output`, and `LFO`.
- Each converted filter patch must load in the browser runtime.
- Each filter variant must run the Playwright filter semantics gate and write three WAV captures.
- Each filter variant must run the Playwright filter modulation semantics gate and write four LFO trace captures.
- Each positive filter variant must classify as low-pass runtime behavior.
- Each bypass control must classify as bypass behavior.
- Each high-pass wrong-output control must classify as wrong-output behavior.
- The rollup must not claim audible cutoff sweep, resonance semantics, arbitrary filter prompt support, or hardware export.

Required evidence:

```text
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\prompt-manifest.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\classification-log.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-resonant-cutoff-modulation\filter-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-resonant-cutoff-modulation\filter-modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-lowpass-lfo-sweep\filter-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-lowpass-lfo-sweep\filter-modulation-semantics\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
caseCount: 4
passingCaseCount: 4
filterVariantCount: 4
filterVariantPassCount: 4
lowpassRuntimeSupportedCount: 4
missingRuntimeEvidenceFailureCount: 0
missingTraceEvidenceFailureCount: 0
staleTraceEvidenceFailureCount: 0
negativeControlFailureCount: 0
```

Current classifications:

```text
filter-resonant-cutoff-modulation: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
filter-lowpass-lfo-sweep: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
filter-bright-lowpass-motion: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
filter-dark-resonant-sweep: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
```

Current claim boundary:

```text
This proves the low-pass filter runtime path repeats across four fresh generated filter prompt variants with browser load, WAV capture, spectral low-pass assertions, LFO/cutoff trace evidence, and local bypass/high-pass/disconnected/wrong-target controls. It does not prove audible cutoff sweep, resonance semantics, all SV Filter output modes, arbitrary filter prompts, reverb runtime support, synth runtime support, modulation-only runtime support, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 23: Filter Repeatability Gate Fails On Seeded Trace Evidence Controls

Route scope:

```text
seeded filter-repeatability failure controls for stale LFO/cutoff trace evidence and missing trace evidence
```

Acceptance criteria:

- A single negative-control command must run seeded variants of the filter repeatability rollup.
- The stale trace evidence seed must make the child rollup fail with a `freshness` assertion failure.
- The missing trace evidence seed must make the child rollup fail with a `control-trace` assertion failure.
- The negative-control command must classify both seeded failures as expected and must not count them as filter runtime support.

Required evidence:

```text
tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\stale-trace-evidence\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\missing-trace-evidence\run-result.json
```

Current result:

```text
status: pass
blockerCount: 0
controlCount: 2
passingControlCount: 2
seededFailureCount: 2
expectedFailureFoundCount: 2
```

Current seeded-control classifications:

```text
stale-trace-evidence: childStatus fail; expectedSurface freshness; expectedFailureFound true
missing-trace-evidence: childStatus fail; expectedSurface control-trace; expectedFailureFound true
```

Current claim boundary:

```text
This proves the filter repeatability gate is sensitive to seeded stale LFO/cutoff trace evidence and missing trace evidence. It does not prove additional filter prompt variants, audible cutoff sweep, resonance semantics, arbitrary filter prompts, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 24: CV-To-Filter-Frequency Scaling Is Deferred For This Hardening Pass

Route scope:

```text
local code-evidence decision for v0.4.0 filter runtime support after an attempted CV-to-filter-frequency scaling change
```

Acceptance criteria:

- The current audible cutoff-sweep blocker evidence must remain the active boundary for generated filter cutoff modulation.
- Any attempted scaling change must not be accepted if it regresses the existing static low-pass filter runtime gate.
- After reverting the attempted scaling change, the static filter runtime gate must pass again with WAV captures, low-pass classification, bypass control, and high-pass wrong-output control.
- The capability boundary must continue to claim low-pass runtime support and LFO/cutoff route trace evidence only. It must not claim audible cutoff-sweep success.

Required evidence:

```text
tests\workflow\evidence\generated-patch-filter-audible-sweep-after-scaling\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics-after-scaling\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics-after-scaling-attempt-reverted-fixed\run-result.json
```

Current result:

```text
audible-sweep-after-scaling status: fail
filter-semantics-after-scaling status: fail
filter-semantics-after-scaling-attempt-reverted-fixed status: pass
lowpassClassifiedCount: 1
bypassControlClassifiedCount: 1
highpassControlClassifiedCount: 1
captureCount: 3
```

Current claim boundary:

```text
This records CV-to-filter-frequency scaling as deferred for local ZOIA 0.4.0 hardening because the attempted scaling path did not produce valid audible sweep evidence and regressed the existing consumed static filter evidence. It preserves the prior low-pass runtime and LFO/cutoff route-trace claims. It does not prove audible cutoff sweep, resonance semantics, all SV Filter output modes, arbitrary filter prompts, musical quality, full DSP accuracy, hardware parity, complete patch semantics, hardware binary export, or release readiness.
```

### Claim 25: Runtime Audio Classification Rejects Seeded False Passes

Route scope:

```text
seeded negative controls over generated-patch runtime audio evidence
```

Acceptance criteria:

- The gate must validate the source generated-patch audio evidence object before applying seeded controls.
- Silent required-audio evidence must fail on measured audio feature thresholds.
- Missing capture evidence must fail on capture validation and summary consistency.
- Stale evidence must fail on freshness validation.
- Unsupported MIDI runtime modules must fail if counted as required audio evidence.
- Classified-only signal results must fail if counted as signal-present runtime audio success.

Required evidence:

```text
tests\workflow\evidence\generated-patch-runtime-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\silent-required-audio-fixture.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\missing-capture.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\stale-capture-evidence.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\unsupported-midi-counted-as-audio.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\classified-only-counted-as-signal.json
```

Current result:

```text
status: pass
blockerCount: 0
controlCount: 5
passingControlCount: 5
seededFailureCount: 5
expectedFailureFoundCount: 5
```

Current seeded-control classifications:

```text
silent-required-audio-fixture: expectedSurface audio-features; expectedFailureFound true
missing-capture: expectedSurface capture; expectedFailureFound true
stale-capture-evidence: expectedSurface freshness; expectedFailureFound true
unsupported-midi-counted-as-audio: expectedSurface unsupported-runtime; expectedFailureFound true
classified-only-counted-as-signal: expectedSurface classification; expectedFailureFound true
```

Current claim boundary:

```text
This proves the runtime audio evidence validator rejects seeded false passes for missing or invalid consumed evidence. It does not create new audio behavior evidence, prove musical quality, prove hardware parity, prove MIDI runtime support, or prove complete patch semantics.
```

### Claim 26: Generated-Patch Readiness Consumes Runtime-Audio Negative Controls

Route scope:

```text
generated-patch readiness rollup and readiness negative-control suite
```

Acceptance criteria:

- The generated-patch readiness rollup must require `tests\workflow\evidence\generated-patch-runtime-negative-controls\run-result.json`.
- Readiness must block with `generated-runtime-audio-negative-controls-not-ready` if runtime-audio negative-control evidence is degraded.
- The readiness negative-control suite must include a degraded runtime-audio negative-control case.
- The readiness negative-control suite must pass only if the degraded runtime-audio case exits nonzero, writes blocked readiness evidence, and records the expected blocker.

Required evidence:

```text
tests\workflow\evidence\generated-patch-readiness\run-result.json
tests\workflow\evidence\generated-patch-readiness-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-readiness-negative-controls\degraded-runtime-audio-negative-controls.json
tests\workflow\evidence\generated-patch-readiness-negative-controls\blocked-readiness-runtime-audio-negative-controls.json
```

Current result:

```text
readiness status: pass
readiness blockerCount: 0
readiness-negative-controls status: pass
caseCount: 5
passingCaseCount: 5
failingCaseCount: 0
problemCount: 0
```

Current claim boundary:

```text
This proves generated-patch readiness now consumes runtime-audio negative-control evidence and blocks when that evidence is degraded. It does not mark the feature ready for review, prove new audio behavior, prove hardware parity, or prove complete patch semantics.
```

### Claim 27: v0.4 Readiness Consumes Generated-Patch Runtime-Audio Dependency

Route scope:

```text
v0.4 readiness gate and seeded v0.4 readiness negative controls
```

Acceptance criteria:

- v0.4 readiness must inspect the generated-patch readiness summary for runtime-audio negative-control status and counts.
- v0.4 readiness must block if generated-patch readiness has degraded runtime-audio negative-control dependency evidence, even if generated-patch readiness itself reports `status: pass`.
- The v0.4 readiness negative-control suite must include a runtime-audio dependency case.
- The v0.4 readiness negative-control suite must observe `generated-patch-readiness-failed` for the degraded runtime-audio dependency case.
- The v0.4 readiness negative-control suite must include a clean consumer smoke case where release-review regeneration blocker evidence is missing.
- The v0.4 readiness negative-control suite must observe `clean-consumer-smoke-failed` for missing clean consumer release-review regeneration blocker evidence.
- The v0.4 readiness negative-control suite must block missing clean-smoke evidence, source-tree import leakage, package-manifest omission, package metadata/script/evidence omission, missing installed v0.4 readiness evidence, and missing installed claim-boundary evidence.

Required evidence:

```text
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\degraded-generated-patch-readiness-runtime-audio-dependency.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-runtime-audio-dependency.json
tests\workflow\evidence\v0.4-readiness-negative-controls\degraded-clean-consumer-smoke-missing-regeneration-blocker.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-clean-consumer-smoke-missing-regeneration-blocker.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-missing-clean-consumer-smoke.json
tests\workflow\evidence\v0.4-readiness-negative-controls\degraded-clean-consumer-smoke-source-tree-import.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-clean-consumer-smoke-source-tree-import.json
tests\workflow\evidence\v0.4-readiness-negative-controls\degraded-clean-consumer-smoke-missing-installed-v04.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-clean-consumer-smoke-missing-installed-v04.json
tests\workflow\evidence\v0.4-readiness-negative-controls\degraded-clean-consumer-smoke-missing-installed-claim-boundary.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-clean-consumer-smoke-missing-installed-claim-boundary.json
```

Current result:

```text
v0.4 readiness status: pass
v0.4 readiness negative controls status: pass
caseCount: 10
passingCaseCount: 10
problemCount: 0
runtimeAudioDependencyCommandExitCode: 1
runtimeAudioDependencyBlockedV04Status: blocked
expectedRuntimeAudioDependencyBlockerFound: true
cleanConsumerSmokeCommandExitCode: 1
cleanConsumerSmokeBlockedV04Status: blocked
expectedCleanConsumerSmokeBlockerFound: true
cleanConsumerSmokeMissingRegenerationBlockerCommandExitCode: 1
cleanConsumerSmokeMissingRegenerationBlockerBlockedV04Status: blocked
expectedCleanConsumerSmokeMissingRegenerationBlockerFound: true
missingCleanConsumerSmokeCommandExitCode: 1
missingCleanConsumerSmokeBlockedV04Status: blocked
expectedMissingCleanConsumerSmokeBlockerFound: true
cleanConsumerSmokeSourceTreeImportCommandExitCode: 1
cleanConsumerSmokeSourceTreeImportBlockedV04Status: blocked
expectedCleanConsumerSmokeSourceTreeImportBlockerFound: true
cleanConsumerSmokeMissingInstalledV04CommandExitCode: 1
cleanConsumerSmokeMissingInstalledV04BlockedV04Status: blocked
expectedCleanConsumerSmokeMissingInstalledV04BlockerFound: true
cleanConsumerSmokeMissingInstalledClaimBoundaryCommandExitCode: 1
cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedV04Status: blocked
expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlockerFound: true
```

Current claim boundary:

```text
This proves the v0.4 readiness gate now blocks when generated-patch runtime-audio dependency evidence, clean consumer smoke evidence, clean consumer release-review regeneration blocker evidence, package-boundary source-tree audit evidence, package-manifest evidence, package metadata/script/evidence bundle checks, installed v0.4 evidence, or installed claim-boundary evidence is degraded. It does not mark the release ready, prove new audio behavior, prove hardware parity, or prove complete patch semantics.
```

### Claim 28: Release-Review Summary Consumes Current Generated-Patch Runtime Evidence

Route scope:

```text
release-review summary, release-review negative-control suites, v0.4 readiness, and generated-patch claim-boundary verifier
```

Acceptance criteria:

- Release-review summary must categorize current generated-patch runtime/audio scripts, fixtures, generated patch artifacts, text-prompt capability docs, and affected emulator runtime files.
- Release-review documented-evidence checks must resolve consumed evidence references, including simple wildcard references such as `captures\*.wav` and trace/fixture artifacts.
- Release-review summary must block stale child evidence instead of accepting old generated-patch or release-review results.
- Release-review freshness, documented-evidence, and summary-quality negative-control suites must pass after the evidence refresh.
- v0.4 readiness must consume the passing release-review summary and block when a degraded release-review summary is supplied.
- Claim-boundary verification must pass after release-review and v0.4 readiness are current.

Required evidence:

```text
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\release-review-freshness-negative-controls\run-result.json
tests\workflow\evidence\release-review-documented-evidence-negative-controls\run-result.json
tests\workflow\evidence\release-review-summary-quality-negative-controls\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
release-review summary status: pass
release-review summary blockerCount: 0
release freshness negative controls: status pass; caseCount 3; passingCaseCount 3
release documented-evidence negative controls: status pass; caseCount 1; passingCaseCount 1
release summary-quality negative controls: status pass; caseCount 22; passingCaseCount 22
v0.4 readiness status: pass
v0.4 readiness blockerCount: 0
claim-boundary status: pass
claim-boundary problemCount: 0
```

Current claim boundary:

```text
This proves release-review and v0.4 readiness gates consume the current generated-patch runtime/audio evidence chain and block stale, missing, uncategorized, or degraded release-review evidence. It does not mark the release ready, authorize source-control actions, prove broad text-to-ZOIA support, or expand the audio/filter claim boundaries.
```

### Claim 29: Release-Review Overclaim Negative Controls Reject Human-Facing Overclaims

Route scope:

```text
release-review overclaim classifier, seeded summary fixtures, release-review summary integration, v0.4 readiness integration, and generated-patch claim-boundary verifier
```

Acceptance criteria:

- The overclaim gate must consume release-review summary text and generated-patch capability documents.
- The gate must verify documented claim boundaries, deferred audible cutoff sweep language, negative-control evidence, and protected source-control/publication boundary presence.
- Seeded summaries must fail on the expected overclaim surfaces for `ready_for_review` or release-ready wording, broad text-to-ZOIA support, audible cutoff sweep success, unsupported non-delay runtime support, and hardware export/parity/full DSP/complete-semantics claims.
- Release-review summary must require the overclaim negative-control result.
- v0.4 readiness must require the overclaim negative-control result.
- Generated-patch claim-boundary verification must require the overclaim negative-control result.

Required evidence:

```text
tests\workflow\evidence\release-review-overclaim-negative-controls\run-result.json
tests\workflow\evidence\release-review-overclaim-negative-controls\seeded-summary-manifest.json
tests\workflow\evidence\release-review-overclaim-negative-controls\classification-log.json
tests\workflow\evidence\release-review-overclaim-negative-controls\seeded-summaries\*.json
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
overclaim negative controls status: pass
baselineBoundaryStatus: pass
caseCount: 5
passingCaseCount: 5
seededFailureCount: 5
expectedFailureFoundCount: 5
release-review summary status: pass
v0.4 readiness status: pass
claim-boundary status: pass
```

Current seeded-control classifications:

```text
ready-for-review-overclaim: expectedSurface release-readiness; expectedFailureFound true
broad-text-to-zoia-overclaim: expectedSurface prompt-boundary; expectedFailureFound true
audible-cutoff-sweep-overclaim: expectedSurface blocked-audio-claim; expectedFailureFound true
unsupported-non-delay-runtime-overclaim: expectedSurface unsupported-runtime; expectedFailureFound true
hardware-export-parity-overclaim: expectedSurface hardware-boundary; expectedFailureFound true
```

Current claim boundary:

```text
This proves human-facing release-review overclaim text is rejected for the seeded surfaces and that release-review, v0.4 readiness, and claim-boundary verification consume the overclaim gate. It does not mark the release ready, authorize source-control actions, prove broad text-to-ZOIA support, prove audible cutoff sweep success, prove unsupported runtime support, prove hardware export/parity, or expand complete patch semantics.
```

### Claim 30: Clean Consumer Smoke Runs Installed Local Package Gates Against A Copied Evidence Bundle

Route scope:

```text
local package artifact creation, clean temporary consumer install, selected JSON evidence bundle copied into the installed package, installed v0.4 readiness, installed generated-patch claim-boundary verification, and seeded missing/stale evidence controls
```

Acceptance criteria:

- The smoke gate must create a fresh run-scoped evidence root under `tests\workflow\evidence\v0.4-clean-consumer-smoke`.
- The gate must install from a local package artifact into a clean consumer directory rather than importing workflow scripts from the source tree.
- The local package artifact manifest must include six package-owned paths before install: `package.json`, generated-patch docs, v0.4 readiness script, and claim-boundary script.
- Package-manifest seeded controls must prove omitted `docs\PATCH_GENERATION.md` and omitted `tests\workflow\scripts\run-zoia-v04-readiness.mjs` are detected by the manifest checker.
- The installed package must contain the required docs, workflow scripts, generated-patch readiness evidence path, and release-review summary evidence path after the selected JSON evidence bundle is copied into the installed package boundary.
- Installed-package v0.4 readiness must pass with blockerCount `0`.
- Installed-package generated-patch claim-boundary verification must pass with problemCount `0`.
- A missing generated-patch readiness evidence control must block v0.4 readiness.
- A stale or degraded release-review summary evidence control must block v0.4 readiness.
- The gate must record whether release-review summary regeneration depends on source-tree or git-worktree context.
- Installed release-review summary regeneration outside a git worktree must either pass with a consumed result or block with a deterministic `release-review-regeneration-git-worktree-required` blocker artifact.
- The installed command audit must inspect installed v0.4 readiness, installed claim-boundary verification, missing-evidence control, stale-release-review control, and release-review regeneration probe commands.
- The installed command audit must report five audited installed commands and zero source-tree findings.
- Removing the installed v0.4 readiness script from the package boundary must make the installed v0.4 readiness command fail.
- Removing the installed `docs\PATCH_GENERATION.md` file from the package boundary must make installed claim-boundary verification fail with missing patch-generation document evidence.

Required evidence:

```text
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

The run-specific package artifact, installed result paths, and release-review regeneration blocker artifact are recorded in the canonical clean-smoke `run-result.json`.

Current result:

```text
clean consumer smoke status: pass
problemCount: 0
packageManifestRequiredPathCount: 6
packageManifestMissingPathCount: 0
packageManifestNegativeControlCount: 2
packageManifestPassingNegativeControlCount: 2
installedRequiredPathCount: 8
installedMissingPathCount: 0
copiedJsonEvidenceCount: 36
sourceTreeImportsUsedByInstalledCommands: false
installedCommandAuditCount: 5
installedCommandSourceTreeFindingCount: 0
missingInstalledReadinessScriptExitCode: 1
missingInstalledReadinessScriptBlocked: true
missingInstalledCapabilityDocExitCode: 1
missingInstalledCapabilityDocBlockedStatus: fail
installed v0.4 readiness status: pass
installed v0.4 readiness blockerCount: 0
installed v0.4 clean consumer bootstrap: true
installed v0.4 release-review summary skipped for bootstrap: true
installed v0.4 clean-smoke skipped for bootstrap: true
installed claim-boundary status: pass
installed claim-boundary problemCount: 0
installed claim-boundary clean consumer bootstrap: true
installed claim-boundary clean-smoke skipped for bootstrap: true
missing generated-patch evidence control exitCode: 1
missing generated-patch evidence status: blocked
stale release-review evidence control exitCode: 1
stale release-review evidence status: blocked
release-review regeneration probe exitCode: 1
release-review regeneration git-worktree blocker found: true
```

Current source-tree dependency finding:

```text
Installed package can consume packaged release-review summary evidence through v0.4 readiness, but release-review summary regeneration blocks outside a git worktree with `release-review-regeneration-git-worktree-required`.
```

Current claim boundary:

```text
This proves the local package artifact can be installed into a clean consumer directory and can run installed v0.4/generated-patch readiness gates against a selected JSON evidence bundle copied into the installed package. It also proves installed release-review regeneration is explicitly blocked outside a git worktree. It does not prove npm publication readiness, GitHub readiness, release-review regeneration outside a git worktree, broad prompt support, hardware export, hardware parity, full DSP accuracy, or release readiness.
```

### Claim 31: Release-Review Freshness Negative Controls Include Clean Consumer Smoke

Route scope:

```text
release-review freshness negative controls, release-review summary freshness classifier, and v0.4 readiness release-review dependency gate
```

Acceptance criteria:

- The release-review summary must accept an isolated clean-smoke evidence path through `ZOIA_CLEAN_CONSUMER_SMOKE_PATH`.
- A stale clean-smoke fixture must make release-review summary block with `release-review-evidence-stale` for `cleanConsumerSmoke`.
- v0.4 readiness must block when pointed at the release-review summary produced from stale clean-smoke evidence.
- The freshness negative-control suite must still prove stale generated candidate-review and generated-validation evidence are blocked.
- The suite must report three passing seeded cases and zero problems.

Required evidence:

```text
tests\workflow\evidence\release-review-freshness-negative-controls\run-result.json
tests\workflow\evidence\release-review-freshness-negative-controls\degraded-clean-consumer-smoke.json
tests\workflow\evidence\release-review-freshness-negative-controls\blocked-release-review-summary-stale-clean-smoke.json
tests\workflow\evidence\release-review-freshness-negative-controls\blocked-v04-readiness-stale-clean-smoke.json
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
release-review freshness negative controls status: pass
problemCount: 0
caseCount: 3
passingCaseCount: 3
cleanSmokeReleaseReviewCommandExitCode: 1
blockedCleanSmokeReleaseReviewStatus: blocked
cleanConsumerSmokeStaleBlockerFound: true
cleanSmokeV04CommandExitCode: 1
blockedCleanSmokeV04Status: blocked
cleanSmokeV04ReleaseReviewBlockerFound: true
```

Current claim boundary:

```text
This proves release-review and v0.4 readiness gates reject stale clean consumer smoke evidence through isolated evidence paths. It does not prove npm publication readiness, release-review regeneration outside a git worktree, broad prompt support, hardware export, hardware parity, full DSP accuracy, complete patch semantics, or release readiness.
```

### Claim 32: Release-Review Directly Rejects Missing Or Stale Clean Consumer Smoke Evidence

Route scope:

```text
release-review summary dependency on clean consumer smoke evidence, missing clean-smoke evidence control, stale clean-smoke evidence control, release-review quality boundary text, and protected source-control boundary text
```

Acceptance criteria:

- The release-review summary must block when the clean consumer smoke evidence path is missing.
- The missing-evidence control must report `missing-release-review-evidence` for the clean consumer smoke path.
- The missing-evidence control must also report summary quality problem `reviewer-summary-clean-consumer-smoke-missing`.
- The release-review summary must block when supplied a stale clean consumer smoke fixture.
- The stale-evidence control must report `release-review-evidence-stale` for `cleanConsumerSmoke`.
- Both blocked release-review outputs must preserve protected source-control boundary text.
- The negative-control suite must report two passing seeded cases and zero problems.

Required evidence:

```text
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\run-result.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\degraded-stale-clean-consumer-smoke.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\blocked-release-review-summary-missing-clean-smoke.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\blocked-release-review-summary-stale-clean-smoke.json
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
release-review clean consumer smoke negative controls status: pass
problemCount: 0
caseCount: 2
passingCaseCount: 2
missingReleaseReviewCommandExitCode: 1
missingReleaseReviewStatus: blocked
missingCleanConsumerSmokeEvidenceBlockerFound: true
missingCleanConsumerSmokeQualityBlockerFound: true
missingCleanConsumerSmokeEvidenceMarkerFound: true
missingProtectedBoundaryFound: true
staleReleaseReviewCommandExitCode: 1
staleReleaseReviewStatus: blocked
staleCleanConsumerSmokeEvidenceBlockerFound: true
staleCleanConsumerSmokeEvidenceMarkerFound: true
staleProtectedBoundaryFound: true
```

Current claim boundary:

```text
This proves release-review summary directly rejects missing or stale clean consumer smoke evidence before v0.4 readiness consumes the summary. It does not prove npm publication readiness, release-review regeneration outside a git worktree, broad prompt support, hardware export, hardware parity, full DSP accuracy, complete patch semantics, or release readiness.
```

### Claim 33: Installed-Package Gates Audit Source-Tree Dependency Surfaces

Route scope:

```text
clean consumer installed-package command cwd and output audit, intentional copied JSON evidence boundary, v0.4 readiness clean-smoke dependency, and generated-patch claim-boundary clean-smoke dependency
```

Acceptance criteria:

- Clean consumer smoke must record `installedCommandAudit` entries for installed v0.4 readiness, installed claim-boundary verification, missing generated-patch evidence control, stale release-review evidence control, and release-review regeneration probe.
- Each audited installed command must run from the installed package boundary and must not include the source root in command text, stdout, or stderr.
- The clean-smoke summary must report `sourceTreeImportsUsedByInstalledCommands: false`, `installedCommandAuditCount: 5`, and `installedCommandSourceTreeFindingCount: 0`.
- v0.4 readiness must block if clean-smoke evidence omits or degrades the installed-command audit fields.
- Generated-patch claim-boundary verification must block if clean-smoke evidence omits or degrades the installed-command audit fields.
- v0.4 readiness negative controls must still prove source-tree import leakage blocks with the expected clean-smoke blocker surface.

Required evidence:

```text
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
clean consumer smoke status: pass
sourceTreeImportsUsedByInstalledCommands: false
installedCommandAuditCount: 5
installedCommandSourceTreeFindingCount: 0
v0.4 readiness negative controls status: pass
v0.4 readiness negative controls caseCount: 10
v0.4 readiness negative controls passingCaseCount: 10
cleanConsumerSmokeSourceTreeImportCommandExitCode: 1
cleanConsumerSmokeSourceTreeImportBlockedV04Status: blocked
expectedCleanConsumerSmokeSourceTreeImportBlockerFound: true
v0.4 readiness status: pass
claim-boundary status: pass
```

Current claim boundary:

```text
This proves installed-package readiness commands are audited for source-tree path dependence and that v0.4 readiness and claim-boundary verification require the audit result. It does not prove npm publication readiness, release-review regeneration outside a git worktree, GitHub readiness, broad prompt support, hardware export/parity, full DSP accuracy, complete patch semantics, or release readiness.
```

### Claim 34: Clean Consumer Smoke Rejects Stale Package Artifacts Missing Required Installed Files

Route scope:

```text
temporary installed-package mutation controls, missing installed readiness script control, missing installed patch-generation doc control, clean consumer smoke summary, v0.4 readiness dependency, and generated-patch claim-boundary dependency
```

Acceptance criteria:

- Clean consumer smoke must first prove the unmodified installed package passes installed v0.4 readiness and installed claim-boundary verification.
- After the positive checks, the smoke must remove only the installed `tests\workflow\scripts\run-zoia-v04-readiness.mjs` file in the temporary package boundary, run installed v0.4 readiness, and assert a nonzero command exit.
- After restoring the readiness script, the smoke must remove only the installed `docs\PATCH_GENERATION.md` file in the temporary package boundary, run installed claim-boundary verification, and assert a nonzero command exit with `missing-patchGenerationDoc`.
- The smoke must restore the positive installed claim-boundary result before copying installed result artifacts into the run-scoped evidence root.
- v0.4 readiness and generated-patch claim-boundary verification must require the stale-package negative-control fields from clean-smoke evidence.

Required evidence:

```text
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-*\installed-results\v0.4-clean-consumer-smoke-negative-controls\blocked-missing-installed-patch-generation-doc.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
clean consumer smoke status: pass
problemCount: 0
missingInstalledReadinessScriptExitCode: 1
missingInstalledReadinessScriptBlocked: true
missingInstalledCapabilityDocExitCode: 1
missingInstalledCapabilityDocBlockedStatus: fail
v0.4 readiness status: pass
claim-boundary status: pass
```

Current claim boundary:

```text
This proves clean consumer smoke rejects installed package artifacts that are missing the current readiness script or required patch-generation doc inside the installed package boundary. It does not prove npm publication readiness, GitHub readiness, release-review regeneration outside a git worktree, broad prompt support, hardware export/parity, full DSP accuracy, complete patch semantics, or release readiness.
```

### Claim 35: Clean Consumer Smoke Verifies Package Boundary Exports Required Docs, Scripts, Metadata, And Evidence

Route scope:

```text
npm pack manifest file list, package-owned clean-smoke docs and workflow scripts, installed package metadata, package script references, copied JSON evidence bundle controls, clean consumer smoke summary, v0.4 readiness dependency, release-review summary dependency, and generated-patch claim-boundary dependency
```

Acceptance criteria:

- Clean consumer smoke must inspect the `npm pack --json` file list before install.
- The package manifest must include six package-owned paths: `package.json`, `docs\PATCH_GENERATION.md`, `docs\TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md`, `docs\TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md`, `tests\workflow\scripts\run-zoia-v04-readiness.mjs`, and `tests\workflow\scripts\verify-patch-generation-claim-boundary.mjs`.
- The package manifest check must remain separate from the selected JSON evidence bundle copied into the installed package after install.
- Seeded manifest controls must remove the patch-generation doc and readiness script from the manifest fixture and classify both omissions as blocked.
- Installed package metadata must report `zoia-emulator` version `0.4.0`.
- Installed package scripts must reference the clean-smoke verifier, v0.4 readiness, release-review summary, and claim-boundary verifier scripts.
- Copied evidence bundle controls must prove omitted generated-patch readiness JSON, release-review summary JSON, and package-boundary overclaim negative-control JSON are detected as blocked.
- Release-review summary, v0.4 readiness, and generated-patch claim-boundary verification must require the package-boundary export summary fields.

Required evidence:

```text
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current result:

```text
clean consumer smoke status: pass
packageManifestRequiredPathCount: 6
packageManifestMissingPathCount: 0
packageManifestNegativeControlCount: 2
packageManifestPassingNegativeControlCount: 2
packageMetadataValid: true
packageScriptReferenceCount: 4
packageScriptMissingReferenceCount: 0
copiedEvidenceNegativeControlCount: 4
copiedEvidencePassingNegativeControlCount: 4
v0.4 negative controls caseCount: 13
v0.4 negative controls passingCaseCount: 13
expectedCleanConsumerSmokePackageManifestBlockerFound: true
expectedCleanConsumerSmokePackageBoundaryExportBlockerFound: true
expectedReleaseReviewPublicationProtectionBlockerFound: true
```

Current claim boundary:

```text
This proves the local package artifact manifest includes required package-owned docs and workflow scripts for the clean-smoke dependency, installed package metadata and script references are intact, copied evidence bundle omissions are detected, and downstream release-review, v0.4, and claim-boundary gates require those fields. It does not prove npm publication readiness, GitHub readiness, copied evidence bundle publication, release-review regeneration outside a git worktree, broad prompt support, hardware export/parity, full DSP accuracy, complete patch semantics, or release readiness.
```

### Claim 36: Package-Boundary Overclaim Controls Reject Publication Claims

Route scope:

```text
release-review package-boundary overclaim classifier, seeded package-boundary summary fixtures, release-review summary integration, v0.4 readiness integration, and generated-patch claim-boundary verifier
```

Acceptance criteria:

- The package-boundary overclaim gate must consume the current release-review summary, clean consumer smoke package-boundary fields, generated-patch capability specification, and test matrix.
- The baseline must prove protected source-control/publication boundary text is present.
- The baseline must prove clean consumer smoke reports package metadata, package script references, and copied evidence bundle negative controls.
- Seeded summaries must fail on the expected overclaim surfaces for npm package ready/publishable wording, published evidence bundle wording, release-ready wording, GitHub/npm publication proof wording, and broader publication-readiness wording.
- Release-review summary, v0.4 readiness, and generated-patch claim-boundary verification must require the package-boundary overclaim negative-control result.

Required evidence:

```text
tests\workflow\evidence\release-review-package-boundary-overclaim-negative-controls\run-result.json
tests\workflow\evidence\release-review-package-boundary-overclaim-negative-controls\seeded-summary-manifest.json
tests\workflow\evidence\release-review-package-boundary-overclaim-negative-controls\classification-log.json
tests\workflow\evidence\release-review-package-boundary-overclaim-negative-controls\seeded-summaries\*.json
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current expected result:

```text
package-boundary overclaim negative controls status: pass
baselineBoundaryStatus: pass
caseCount: 5
passingCaseCount: 5
seededFailureCount: 5
expectedFailureFoundCount: 5
problemCount: 0
```

Seeded controls:

```text
npm-package-ready-publishable: expectedSurface npm-publication-readiness; expectedFailureFound true
evidence-bundle-published: expectedSurface evidence-bundle-publication; expectedFailureFound true
release-ready: expectedSurface release-readiness; expectedFailureFound true
package-artifact-proves-github-npm-publication: expectedSurface publication-proof; expectedFailureFound true
clean-consumer-smoke-proves-publication-readiness: expectedSurface broader-publication-readiness; expectedFailureFound true
```

Current claim boundary:

```text
This proves human-facing package-boundary overclaim text is rejected for the seeded publication-readiness surfaces and that release-review, v0.4 readiness, and claim-boundary verification consume the package-boundary overclaim gate. It does not prove npm publication readiness, GitHub readiness, copied evidence bundle publication, package artifact publication, release readiness, broad prompt support, hardware export/parity, full DSP accuracy, or complete patch semantics. It is not release readiness and not GitHub readiness.
```

### Claim 37: Publication-Protection Negative Controls Block Protected Commands

Route scope:

```text
release-review/v0.4 npm scripts, release-review validation command list, workflow command scanner, seeded protected-command fixtures, v0.4 readiness integration, and generated-patch claim-boundary verifier
```

Acceptance criteria:

- Release-review and v0.4 workflows must not invoke Git, GitHub, tag, release, or npm publication commands without exact human-only passcode evidence.
- The publication-protection gate must inspect required release-review/v0.4 package scripts and release-review validation commands.
- The command audit must report zero protected commands in the current local validation workflow.
- Seeded protected command fixtures must be detected for Git push, Git tag, GitHub release creation, npm publish, npm version, and npm dist-tag command surfaces.
- v0.4 readiness and generated-patch claim-boundary verification must require the publication-protection negative-control result.
- v0.4 negative controls must prove degraded publication-protection evidence blocks v0.4 readiness.

Required evidence:

```text
tests\workflow\evidence\release-review-publication-protection-negative-controls\run-result.json
tests\workflow\evidence\release-review-publication-protection-negative-controls\command-audit.json
tests\workflow\evidence\release-review-publication-protection-negative-controls\seeded-command-manifest.json
tests\workflow\evidence\release-review-publication-protection-negative-controls\seeded-commands\*.json
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

Current expected result:

```text
publication-protection negative controls status: pass
problemCount: 0
actualCommandCount: 38
protectedActualCommandCount: 0
scriptTextFindingCount: 0
seededControlCount: 6
passingSeededControlCount: 6
expectedFailureFoundCount: 6
protectedBoundaryPresent: true
sourceControlSideEffectsPerformed: false
v0.4 negative controls caseCount: 13
v0.4 negative controls passingCaseCount: 13
expectedReleaseReviewPublicationProtectionBlockerFound: true
```

Seeded controls:

```text
git-push-command: expectedSurface git-push; expectedFailureFound true
git-tag-command: expectedSurface git-tag; expectedFailureFound true
github-release-command: expectedSurface github-release; expectedFailureFound true
npm-publish-command: expectedSurface npm-publish; expectedFailureFound true
npm-version-command: expectedSurface npm-version; expectedFailureFound true
npm-dist-tag-command: expectedSurface npm-dist-tag; expectedFailureFound true
```

Current claim boundary:

```text
This proves current local release-review and v0.4 validation workflows do not invoke protected Git, GitHub, tag, release, or npm publication commands and that seeded protected command strings are detected. It does not prove GitHub readiness, npm publication readiness, package publication, release readiness, remote repository state, tag correctness, registry metadata, or human passcode authorization behavior.
```

### Claim 38: Final Evidence Inventory Boundary Controls Reject Overbroad Claims

Route scope:

```text
final generated-patch evidence inventory, generated inventory report, isolated review-surface doc fixtures, isolated release-review fixture, README, changelog, GitHub readiness boundary, community coverage, feature coverage, validation, generated-patch capability specification, generated-patch test matrix, generated-patch evidence inventory, and release-review summary boundaries
```

Acceptance criteria:

- The final evidence inventory must map each accepted local 0.4.0 generated-patch claim to at least one current evidence path, one required gate, one negative-control mapping, and explicit excluded claims.
- The inventory must consume current release-review summary, generated-patch claim-boundary, and clean consumer smoke evidence and block if any required dependency is stale or not passing.
- The inventory must scan review-surface docs and release-review boundary text for overbroad claims.
- The inventory must require limitation coverage across the combined review-surface doc corpus, not in every short document.
- The inventory must verify that every human-facing Markdown path in clean consumer package manifest checks and installed-path checks is represented in the scanner doc path list.
- The negative-control gate must seed overbroad doc or release-review text in isolated fixtures and prove the inventory blocks those fixtures.
- The negative-control gate must seed package-boundary and installed-package Markdown paths that are absent from the scanner and prove the inventory blocks those fixtures.
- The negative-control gate must seed stale release-review, stale generated-patch claim-boundary, and stale clean-smoke dependencies and prove the inventory blocks before it can pass.
- The inventory must categorize every evidence path consumed by release-review summary, v0.4 readiness, and generated-patch claim-boundary as inventory claim evidence, required dependency evidence, or explicit support evidence.
- The inventory must categorize every release-review documented evidence reference as inventory claim evidence, inventory claim artifact evidence, required dependency evidence, or explicit support evidence.
- The inventory must categorize every release-review validation command as a repeatable package script command.
- The negative-control gate must seed uncategorized consumed evidence paths through release-review, v0.4 readiness, and generated-patch claim-boundary fixtures and prove the inventory blocks those fixtures.
- The negative-control gate must seed an uncategorized release-review documented evidence reference and prove the inventory blocks that fixture.
- The negative-control gate must seed an uncategorized release-review validation command and prove the inventory blocks that fixture.
- Seeded negative controls must cover release-ready wording, production readiness paraphrases, broad text-to-ZOIA support wording, arbitrary prompt support wording, unbounded text-prompt paraphrases, audible cutoff sweep success wording, npm publication readiness wording, package publication paraphrases, GitHub readiness wording, hardware export wording, hardware equivalence paraphrases, full DSP accuracy wording, and complete patch semantics wording.

Required evidence:

```text
tests\workflow\evidence\generated-patch-final-evidence-inventory\run-result.json
tests\workflow\evidence\generated-patch-final-evidence-inventory\claim-inventory.json
docs\TEXT_PROMPT_GENERATED_PATCH_EVIDENCE_INVENTORY.md
tests\workflow\evidence\generated-patch-final-evidence-inventory-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-final-evidence-inventory-negative-controls\fixtures\*\inventory-result.json
```

Current expected result:

```text
final evidence inventory status: pass
problemCount: 0
claimCount: 38
evidencePathCount: 47
docPathCount: 12
packageBoundaryDocPathCount: 3
packageBoundaryDocMissingFromScannerCount: 0
releaseReviewStatus: pass
cleanConsumerSmokeStatus: pass
claimBoundaryStatus: pass
releaseReviewBlockerCount: 0
dependencyFreshnessCheckCount: 3
dependencyFreshnessProblemCount: 0
consumedEvidencePathCount: 73
consumedEvidenceUncategorizedCount: 0
documentedEvidenceReferenceCount: 435
documentedEvidenceUncategorizedCount: 0
validationCommandCount: 26
validationCommandUncategorizedCount: 0
packageScriptSurfaceCount: 33
packageScriptUncategorizedCount: 0
final evidence inventory negative controls status: pass
caseCount: 25
passingCaseCount: 25
expectedFailureFoundCount: 25
```

Seeded controls:

```text
doc-release-ready-overclaim: expectedSurface release-ready-positive; expectedFailureFound true
doc-broad-text-to-zoia-overclaim: expectedSurface broad-text-to-zoia-positive; expectedFailureFound true
doc-audible-cutoff-sweep-overclaim: expectedSurface audible-sweep-positive; expectedFailureFound true
readme-arbitrary-prompt-overclaim: expectedSurface arbitrary-prompt-positive; expectedFailureFound true
changelog-npm-publication-overclaim: expectedSurface npm-publication-positive; expectedFailureFound true
github-readiness-overclaim: expectedSurface github-readiness-positive; expectedFailureFound true
validation-full-dsp-overclaim: expectedSurface full-dsp-positive; expectedFailureFound true
feature-coverage-complete-semantics-overclaim: expectedSurface complete-semantics-positive; expectedFailureFound true
release-review-hardware-export-overclaim: expectedSurface hardware-export-positive; expectedFailureFound true
readme-arbitrary-text-prompts-paraphrase: expectedSurface arbitrary-text-prompts-positive; expectedFailureFound true
changelog-publishable-package-paraphrase: expectedSurface publishable-package-positive; expectedFailureFound true
validation-hardware-equivalent-output-paraphrase: expectedSurface hardware-equivalent-output-positive; expectedFailureFound true
release-review-production-ready-release-paraphrase: expectedSurface production-ready-release-positive; expectedFailureFound true
clean-smoke-package-manifest-unscanned-doc: expectedSurface package-boundary-doc-not-in-inventory-scanner; expectedFailureFound true
clean-smoke-installed-unscanned-doc: expectedSurface package-boundary-doc-not-in-inventory-scanner; expectedFailureFound true
stale-release-review-dependency: expectedSurface releaseReview; expectedFailureFound true
stale-claim-boundary-dependency: expectedSurface generatedPatchClaimBoundary; expectedFailureFound true
stale-clean-smoke-dependency: expectedSurface cleanConsumerSmoke; expectedFailureFound true
release-review-uncategorized-evidence: expectedSurface uncategorized-generated-patch-runtime; expectedFailureFound true
v04-uncategorized-evidence: expectedSurface uncategorized-v04-runtime; expectedFailureFound true
claim-boundary-uncategorized-evidence: expectedSurface uncategorized-claim-boundary-runtime; expectedFailureFound true
release-review-documented-uncategorized-evidence: expectedSurface uncategorized-documented-review-evidence; expectedFailureFound true
release-review-uncategorized-validation-command: expectedSurface zoia:unknown:drift; expectedFailureFound true
package-json-uncategorized-review-surface-script: expectedSurface zoia:generate:patch:uncategorized-review-surface; expectedFailureFound true
demo-status-release-ready-overclaim: expectedSurface release-ready-positive; expectedFailureFound true
```

Current claim boundary:

```text
This proves the current local 0.4.0 generated-patch evidence inventory maps accepted claims to evidence paths, gates, negative controls, and excluded claims, rejects seeded overbroad doc or release-review text across exact and paraphrased excluded-claim wording, scans the July 24 demo README and status docs, blocks demo-doc release-readiness overclaims, blocks package-boundary Markdown docs that are not represented in the scanner, blocks stale release-review, claim-boundary, or clean-smoke dependencies before final inventory can pass, blocks uncategorized evidence consumed by release-review, v0.4 readiness, or generated-patch claim-boundary, blocks uncategorized release-review documented evidence references, blocks release-review validation commands that do not resolve to package scripts, and blocks package-facing generated-patch/release/v0.4 scripts that are not categorized as claim gates, release-review validation commands, or explicit support scripts. It does not prove release readiness, npm publication readiness, GitHub readiness, broad text-to-ZOIA support, arbitrary prompt support, audible cutoff sweep success, hardware parity/export, full DSP accuracy, complete patch semantics, or remote publication behavior.
```

## Risks And Failure Modes

- Static graph validity can pass while runtime audio remains silent.
- A generated graph can map to the wrong emulator block index and still load.
- A converter can silently drop unsupported semantic ports unless rejection is enforced.
- Playwright load checks can pass without proving audio behavior.
- Evidence can become stale if a later run reads old result files.
- Generated `Synth Voice` may still require expansion into lower-level emulator modules before runtime audio is meaningful.
- Reverb generated params may not map one-to-one to emulator `Reverb Lite` blocks.
- Prompt breadth can be overstated if graph-supported non-delay prompts are counted as delay runtime/audio evidence.
- The accepted local evidence does not prove broad text-to-ZOIA support.
- Delay-family repeatability is still bounded to two tested prompt variants even with seeded controls for stale evidence, missing runtime evidence, and unsupported-prompt mislabeling.
- Modulation-only, MIDI, sampler, and uncontracted non-delay prompt classes remain deterministic blockers, not runtime/audio-supported classes.
- Filter runtime support is limited to one generated filter prompt and low-pass spectral classification; cutoff modulation and resonance semantics remain unproven.
- Filter modulation route support proves generated LFO trace and target wiring, but not audible cutoff sweep magnitude.
- Current generated filter cutoff modulation is blocked for audible sweep claims by measured low output difference under current CV scaling.
- Non-delay class inventory is bounded to currently recognized prompt families and must be updated if generator recognition changes.
- Filter repeatability is bounded to four prompt variants, low-pass spectral behavior, and LFO/cutoff trace evidence; resonance, audible cutoff sweep, and wider filter prompt coverage remain unproven.
- CV-to-filter-frequency scaling remains deferred because the first implementation attempt regressed existing static filter audio evidence. Future scaling work must rerun the static filter gate before any stronger filter modulation claim is accepted.
- Runtime audio evidence can overclaim if silent required-audio results, missing captures, stale captures, unsupported runtime modules, or classified-only records are counted as signal-present success.
- Higher-level readiness can overclaim if it does not consume lower-level runtime-audio negative-control evidence.
- Release-line readiness can overclaim if it trusts generated-patch readiness status without checking the generated-patch runtime-audio dependency summary.
- Release-review evidence can overclaim if new generated-patch/runtime files remain uncategorized, wildcard consumed-evidence references are treated as missing, or stale child evidence is accepted.
- Human-facing release-review summaries can overclaim if future wording uses a new phrase outside the current seeded overclaim classifier.
- Clean consumer smoke can overclaim if the copied evidence bundle is mistaken for npm publication readiness or if release-review summary regeneration is implied outside the current git-worktree boundary.
- Release-review freshness can overclaim if future package-boundary evidence is added without a matching stale-evidence negative control.
- Release-review summary can overclaim if future clean consumer smoke dependency changes are not covered by direct missing and stale release-review negative controls.
- Installed-package smoke can overclaim if future commands are added without extending the installed command source-tree dependency audit.
- Clean consumer smoke can overclaim if future required installed files are added without a matching stale-package-artifact negative control.
- Package-manifest evidence can overclaim if future package-owned docs or scripts become required for clean-smoke consumers without being added to the manifest path list and seeded omission controls.
- Package-boundary summary evidence can overclaim if future publication-readiness wording is added without extending the package-boundary overclaim classifier and seeded summaries.
- Final inventory evidence can overclaim if release-review, generated-patch claim-boundary, or clean-smoke dependencies are reused after they become stale without rerunning the final inventory dependency-order smoke.
- Final inventory evidence can overclaim if future release-review, v0.4 readiness, or claim-boundary inputs consume new evidence paths without adding them to the claim inventory or explicit support-evidence categories.
- Final inventory evidence can overclaim if future release-review documented evidence references point to new paths without adding them to the claim inventory, claim artifact roots, required dependency list, or explicit support categories.
- Final inventory evidence can overclaim if future release-review validation commands are added without a matching package script or explicit command category.
- MIDI behavior remains unsupported and must stay blocked until a real generated MIDI runtime contract exists.

## Required Evidence Before Stronger Readiness Claims

Before claiming prompt-driven generated patches are runtime-tested, the feature must have:

- Positive text prompt workflow evidence.
- Positive graph-to-emulator conversion evidence.
- Positive Playwright emulator-load evidence.
- Positive generated audio signal evidence or explicitly blocked generated audio evidence.
- Positive delay-semantics evidence or explicitly blocked delay-semantics evidence.
- Converter/runtime negative-control evidence.
- A capability-to-test matrix linking every claim to repeatable tests.
- A false-pass review identifying the next highest-risk hardening item after each validation pass.

