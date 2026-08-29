# Text-Prompt Generated Patch Capability-To-Test Matrix

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

Inventory boundary:

```text
The final evidence inventory does not prove npm publication readiness, does not prove GitHub readiness, does not prove copied evidence bundle publication, does not prove release readiness, does not prove broad text-to-ZOIA support, does not prove arbitrary prompt support, does not prove audible cutoff sweep success, does not prove hardware parity, and does not prove complete patch semantics.
```

## Matrix

| Capability claim | Repeatable test | Test type | Assertions | Evidence path | Current status |
| --- | --- | --- | --- | --- | --- |
| Final bounded 0.4.0 generated-patch evidence inventory maps accepted claims to current evidence, gates, negative controls, and excluded claims. | `npm run zoia:generate:patch:final-evidence-inventory` | Node inventory/report generator plus review-surface docs, July 24 demo docs, release-review boundary scanner, clean-smoke package-boundary doc audit, dependency freshness checks, consumed-evidence source manifest audit, release-review documented-evidence category audit, release-review validation-command manifest audit, and package-script surface audit | Inventory `status: pass`; `claimCount == 38`; `docPathCount == 12`; `packageBoundaryDocPathCount == 3`; `packageBoundaryDocMissingFromScannerCount == 0`; `dependencyFreshnessCheckCount == 3`; `dependencyFreshnessProblemCount == 0`; `consumedEvidencePathCount == 73`; `consumedEvidenceUncategorizedCount == 0`; `documentedEvidenceReferenceCount == 435`; `documentedEvidenceUncategorizedCount == 0`; `validationCommandCount == 26`; `validationCommandUncategorizedCount == 0`; `packageScriptSurfaceCount == 33`; `packageScriptUncategorizedCount == 0`; every claim has a required gate, evidence path, negative-control mapping, and excluded claims; release-review summary, generated-patch claim-boundary, and clean consumer smoke are passing and fresh enough for the final inventory boundary; review-surface docs, demo docs, and release-review boundary text do not exceed the inventory. | `tests\workflow\evidence\generated-patch-final-evidence-inventory\run-result.json`; `tests\workflow\evidence\generated-patch-final-evidence-inventory\claim-inventory.json`; `docs\TEXT_PROMPT_GENERATED_PATCH_EVIDENCE_INVENTORY.md` | Passing locally |
| Final evidence inventory rejects overbroad doc/release-review text, stale dependency ordering, uncategorized evidence, uncategorized validation commands, uncategorized package-facing scripts, and demo-doc overclaims. | `npm run zoia:generate:patch:final-evidence-inventory:negative-controls` | Node seeded negative controls with isolated review-surface doc, demo doc, release-review, v0.4 readiness, claim-boundary, clean-smoke, and package.json fixtures | Negative controls `status: pass`; `caseCount == 25`; `passingCaseCount == 25`; seeded release-ready, production-readiness paraphrase, broad text-to-ZOIA support, arbitrary prompt support, unbounded text-prompt paraphrase, audible cutoff sweep success, npm publication readiness, package-publication paraphrase, GitHub readiness, full DSP accuracy, complete patch semantics, hardware export, hardware-equivalence paraphrase, package-manifest unscanned doc, installed-package unscanned doc, stale release-review dependency, stale claim-boundary dependency, stale clean-smoke dependency, release-review uncategorized evidence, v0.4 uncategorized evidence, claim-boundary uncategorized evidence, release-review documented uncategorized evidence, release-review uncategorized validation command, package.json uncategorized review-surface script, and demo status release-ready overclaim fail on expected inventory boundary surfaces. | `tests\workflow\evidence\generated-patch-final-evidence-inventory-negative-controls\run-result.json`; `tests\workflow\evidence\generated-patch-final-evidence-inventory-negative-controls\fixtures\*\inventory-result.json` | Passing locally |
| Text prompt selects measured templates and produces validated graph drafts. | `npm run zoia:generate:patch:from-description -- --description "ambient delay with slow modulation and expression pedal feedback control" --draft-root tests/workflow/evidence/generated-patches/manual-test --result-path tests/workflow/evidence/manual-text-prompt-test/run-result.json` | Node workflow | `status: pass`; `selectedCandidateCount > 0`; `measuredCandidateCount > 0`; `draftCount > 0`; `validatedDraftCount == draftCount`; claim boundaries reject export/audio claims. | `tests\workflow\evidence\manual-text-prompt-test\run-result.json` | Passing locally |
| Validated generated graph drafts convert into emulator patch JSON. | `npm run zoia:generate:patch:convert-emulator -- --graph-root tests/workflow/evidence/generated-patches/manual-test --output-root tests/workflow/evidence/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/manual-text-prompt-emulator-conversion/run-result.json` | Node workflow | `status: pass`; `blockerCount == 0`; converted count equals graph count; each patch has runtime module and connection objects; claim boundaries reject load/audio/export claims. | `tests\workflow\evidence\manual-text-prompt-emulator-conversion\run-result.json` | Passing locally |
| Converted generated patch artifacts load in emulator UI/runtime. | `npm run zoia:test:playwright:generated-patch-load -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/manual-text-prompt-generated-patch-load/run-result.json` | Playwright | `status: pass`; `loadedPatchCount == patchCount`; loaded patch name, module count, connection count, and page count match source patch JSON; hardware grid renders 80 buttons; screenshots are written. | `tests\workflow\evidence\manual-text-prompt-generated-patch-load\run-result.json` | Passing locally |
| Invalid generated graph output is rejected before emulator loading. | `npm run zoia:generate:patch:convert-emulator:negative-controls` | Node negative control | Unsupported generated module fixture blocks conversion; expected blocker ID `unsupported-generated-module` appears; converted patch count is zero for invalid fixture. | `tests\workflow\evidence\generated-patch-emulator-conversion-negative-controls\run-result.json` | Added in this enforcement pass |
| Generated delay patch produces runtime audio under deterministic stimulus. | `npm run zoia:test:playwright:generated-patch-audio -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-audio/run-result.json` | Playwright plus audio analysis | `status: pass`; `signalPresentCount == 3`; `classifiedSilenceCount == 1`; WAV captures exist; RMS, peak, and post-input tail peak exceed thresholds for generated patches; silent negative control classifies as expected silence. | `tests\workflow\evidence\generated-patch-audio\run-result.json` | Passing locally |
| Deterministic generated delay fixture produces expected delayed-window timing. | `npm run zoia:test:playwright:generated-patch-delay-semantics -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-delay-semantics/run-result.json` | Playwright plus audio analysis | `status: pass`; `delayWindowPresentCount == 3`; `bypassedDelayClassifiedCount == 1`; positive fixtures require a generated `Delay Line` module; positive fixtures have `immediateWindowPeak <= 0.000001` and `delayedWindowPeak >= 0.2`; bypassed-delay negative has immediate signal but delayed-window peak `0`. | `tests\workflow\evidence\generated-patch-delay-semantics\run-result.json` | Passing locally |
| Generated time modulation route shifts delay timing under deterministic CV. | `npm run zoia:test:playwright:generated-patch-modulation-semantics -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-modulation-semantics/run-result.json` | Playwright plus audio analysis | `status: pass`; `modulationShiftCount == 3`; `disconnectedControlClassifiedCount == 3`; `wrongTargetClassifiedCount == 3`; positive fixtures have `baselineWindowPeak <= 0.000001` and `shiftedWindowPeak >= 0.2`; disconnected and wrong-target negative controls preserve baseline peak and have shifted peak `0`. | `tests\workflow\evidence\generated-patch-modulation-semantics\run-result.json` | Passing locally |
| Actual generated LFO waveform modulates delay timing in a stabilized fixture. | `npm run zoia:test:playwright:generated-patch-lfo-semantics -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json` | Playwright plus audio and control trace analysis | `status: pass`; `lfoWaveformRouteCount == 3`; `disconnectedControlClassifiedCount == 3`; `mutedControlClassifiedCount == 3`; `wrongTargetClassifiedCount == 3`; LFO trace RMS exceeds threshold; estimated LFO frequency matches generated rate parameter; positive peak timing moves from baseline; controls preserve baseline timing. | `tests\workflow\evidence\generated-patch-lfo-semantics\run-result.json` | Passing locally |
| Generated expression control drives delay feedback tail in a stabilized fixture. | `npm run zoia:test:playwright:generated-patch-expression-feedback-semantics -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-expression-feedback-semantics/run-result.json` | Playwright plus audio and control trace analysis | `status: pass`; `expressionFeedbackTailCount == 3`; `disconnectedControlClassifiedCount == 3`; `lowExpressionControlClassifiedCount == 3`; `invertedControlClassifiedCount == 3`; `wrongTargetMixClassifiedCount == 3`; positive expression trace RMS is `1`; positive feedback tail ratio exceeds threshold; disconnected, low-expression, and wrong-target controls produce no tail; inverted feedback produces opposite-polarity repeat. | `tests\workflow\evidence\generated-patch-expression-feedback-semantics\run-result.json` | Passing locally |
| Original generated patches classify under deterministic stimuli with generated parameters and connections preserved. | `npm run zoia:test:playwright:generated-patch-unmodified-modulated-timing -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-unmodified-modulated-timing/run-result.json` | Playwright plus audio and control trace classification | `status: pass`; `classifiedCount == 12`; `stableMeasuredModulationCount == 9`; `mutedAudioControlClassifiedCount == 3`; `unstableModulationCount == 0`; `signalPresentOnlyCount == 0`; `blockedClassificationCount == 0`; original generated LFO-time and expression-feedback routes exist; original generated delay parameters and connections are preserved; audio WAVs, LFO trace WAVs, expression trace WAVs, manifest, and classification log are written. | `tests\workflow\evidence\generated-patch-unmodified-modulated-timing\run-result.json` | Passing locally |
| Unmodified timing classifier responds to corrupted route controls. | `npm run zoia:test:playwright:generated-patch-corrupted-route-negative-controls -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-corrupted-route-negative-controls/run-result.json` | Playwright plus audio and control trace negative controls | `status: pass`; `classifiedCount == 12`; `lfoRouteControlClassifiedCount == 3`; `expressionRouteDominanceCount == 3`; `feedbackTailLostCount == 3`; `audioInputRouteSignalLostCount == 3`; `unchangedStableClassificationCount == 0`; `blockedClassificationCount == 0`; corrupted fixtures produce WAV captures, LFO traces, expression traces, manifest, fixture copies, and classification log. | `tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\run-result.json` | Passing locally |
| One command regenerates prompt-to-runtime evidence under a fresh run root. | `npm run zoia:generate:patch:text-prompt-runtime-rollup -- --description "ambient delay with slow modulation and expression pedal feedback control" --result-path tests/workflow/evidence/generated-patch-text-prompt-runtime-rollup/run-result.json` | Node orchestration plus Playwright child gates | `status: pass`; `stepCount == 10`; `executedStepCount == 10`; `passedStepCount == 10`; child gates include prompt graph, conversion, load, audio signal, delay semantics, modulation semantics, LFO semantics, expression feedback, unmodified timing, and corrupted-route negative controls; child evidence is written under one run-scoped root. | `tests\workflow\evidence\generated-patch-text-prompt-runtime-rollup\run-result.json` | Passing locally |
| Prompt breadth is bounded by runtime-supported and unsupported classifications. | `npm run zoia:generate:patch:prompt-breadth-rollup -- --result-path tests/workflow/evidence/generated-patch-prompt-breadth-rollup/run-result.json` | Node orchestration plus child Playwright/runtime gates and unsupported-prompt negative controls | `status: pass`; `caseCount == 6`; `delayRuntimeSupportedCount == 1`; `graphSupportedRuntimeUnsupportedCount == 2`; `validationBlockedUnsupportedPromptCount == 2`; `blockedUnsupportedPromptCount == 1`; delay variant includes fresh audio-signal, unmodified-timing, and corrupted-route evidence; synth and reverb graphs block conversion with `unsupported-generated-module`; MIDI and sampler prompts block at validation; unmatched prompt blocks at selection and leaves no graph drafts. | `tests\workflow\evidence\generated-patch-prompt-breadth-rollup\run-result.json` | Passing locally |
| Representative prompt corpus classes have explicit runtime or blocker boundaries. | `npm run zoia:generate:patch:prompt-corpus-rollup -- --result-path tests/workflow/evidence/generated-patch-prompt-corpus-rollup/run-result.json` | Node orchestration plus child Playwright/runtime gates and deterministic blockers | `status: pass`; `caseCount == 4`; `delayRouteSemanticsSupportedCount == 1`; `deterministicBlockerCount == 3`; `emulatorLoadOnlyCount == 0`; `audioSignalPresentCount == 0`; delay class includes fresh audio-signal, delay-semantics, unmodified-timing, and corrupted-route evidence; filter and modulation-only classes draft one graph each and block validation; unsupported prompt blocks selection and leaves no graph drafts. | `tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-result.json` | Passing locally |
| Delay-family prompt runtime support repeats across fresh prompt variants while unsupported variants block. | `npm run zoia:generate:patch:prompt-repeatability-rollup -- --result-path tests/workflow/evidence/generated-patch-prompt-repeatability-rollup/run-result.json` | Node orchestration plus child Playwright/runtime/audio/control gates and unsupported-prompt blocker | `status: pass`; `caseCount == 3`; `passingCaseCount == 3`; `delayVariantCount == 2`; `delayVariantPassCount == 2`; `unsupportedBlockedCount == 1`; `staleEvidenceFailureCount == 0`; `missingRuntimeEvidenceFailureCount == 0`; each delay variant includes fresh audio-signal, delay-semantics, modulation-semantics, LFO-semantics, expression-feedback, unmodified-timing, and corrupted-route child evidence; unsupported prompt blocks at selection and leaves no graph drafts. | `tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-result.json` | Passing locally |
| Prompt-repeatability false-pass checks fail on seeded stale evidence, missing runtime audio evidence, and unsupported-prompt mislabeling. | `npm run zoia:generate:patch:prompt-repeatability-rollup:negative-controls -- --result-path tests/workflow/evidence/generated-patch-prompt-repeatability-rollup-negative-controls/run-result.json` | Node seeded negative controls over repeatability rollup | `status: pass`; `caseCount == 3`; `passingCaseCount == 3`; `seededFailureCount == 3`; `expectedFailureFoundCount == 3`; seeded stale evidence child fails on `freshness`; seeded missing runtime audio evidence child fails on `audio-evidence`; seeded unsupported-prompt mislabel child fails on `prompt-boundary`. | `tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\run-result.json` | Passing locally |
| Non-delay prompt corpus classes cannot be mislabeled as delay-family runtime support. | `npm run zoia:generate:patch:prompt-corpus-rollup:negative-controls -- --result-path tests/workflow/evidence/generated-patch-prompt-corpus-rollup-negative-controls/run-result.json` | Node seeded negative controls over corpus rollup | `status: pass`; `caseCount == 3`; `passingCaseCount == 3`; `seededFailureCount == 3`; `expectedFailureFoundCount == 3`; seeded filter mislabel child fails on `prompt-boundary`; seeded modulation-only mislabel child fails on `prompt-boundary`; seeded unsupported-prompt mislabel child fails on `prompt-boundary`. | `tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\run-result.json` | Passing locally |
| Generated filter prompt path produces measured low-pass runtime behavior. | `npm run zoia:generate:patch:from-description -- --description "resonant filter with slow cutoff modulation" --selection-limit 8 --draft-limit 1 --draft-root tests/workflow/generated-patches/filter-test --result-path tests/workflow/evidence/generated-patch-filter-runtime/prompt-graph/run-result.json`; `npm run zoia:generate:patch:convert-emulator -- --graph-root tests/workflow/generated-patches/filter-test --output-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-runtime/convert-emulator/run-result.json`; `npm run zoia:test:playwright:generated-patch-load -- --patch-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-runtime/playwright-load/run-result.json`; `npm run zoia:test:playwright:generated-patch-filter-semantics -- --patch-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-runtime/filter-semantics/run-result.json` | Node graph/conversion plus Playwright browser load and audio spectral analysis | Prompt graph `status: pass`; `validatedDraftCount == 1`; conversion `status: pass`; `convertedPatchCount == 1`; browser load `status: pass`; `loadedPatchCount == 1`; filter semantics `status: pass`; `lowpassClassifiedCount == 1`; `bypassControlClassifiedCount == 1`; `highpassControlClassifiedCount == 1`; positive high/low magnitude ratio `0.0016384264628184096`; bypass ratio `0.9999999999982566`; high-pass wrong-output ratio `4.327511359098377`; three WAV captures written. | `tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics\run-result.json` | Passing locally |
| Generated filter LFO route targets cutoff and has measured control trace evidence. | `npm run zoia:test:playwright:generated-patch-filter-modulation-semantics -- --patch-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-modulation-semantics/run-result.json` | Playwright control trace plus route negative controls | `status: pass`; `fixtureCount == 4`; `lfoCutoffRouteClassifiedCount == 1`; `disconnectedControlClassifiedCount == 1`; `wrongTargetControlClassifiedCount == 2`; `traceCount == 4`; positive trace RMS `0.24715674536433738`; positive estimated frequency `3.2 Hz`; expected frequency `3.208522011139085 Hz`; disconnected and wrong-target controls preserve LFO trace but cannot satisfy cutoff-route classification. | `tests\workflow\evidence\generated-patch-filter-modulation-semantics\run-result.json` | Passing locally |
| Generated filter audible cutoff sweep is blocked under current CV scaling. | `npm run zoia:test:playwright:generated-patch-filter-audible-sweep-blocker -- --patch-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-audible-sweep-blocker/run-result.json` | Playwright audio blocker evidence with seeded measurable-sweep control | `status: pass`; `fixtureCount == 3`; `captureCount == 3`; `classification == audible-cutoff-sweep-blocked-by-current-cv-scaling`; generated route diff RMS `0.0005722353133105269`, below blocker threshold; exaggerated seeded route diff RMS `0.3596596323947025`, above measurable-sweep threshold. | `tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\run-result.json` | Passing locally as blocker evidence |
| Reachable non-delay prompt classes have explicit runtime or blocker boundaries and cannot be mislabeled as delay or filter runtime support. | `npm run zoia:generate:patch:non-delay-boundary-controls -- --result-path tests/workflow/evidence/generated-patch-non-delay-boundary-controls/run-result.json` | Node orchestration inventory plus graph, conversion, blocker, and seeded mislabel controls | `status: pass`; `classCount == 8`; `passingClassCount == 8`; `inScopeRuntimeClassCount == 1`; `graphSupportedRuntimeUnsupportedCount == 2`; `validationBlockedCount == 4`; `selectionBlockedCount == 1`; `seededMislabelControlCount == 14`; `seededMislabelFailureDetectedCount == 14`; filter is the only in-scope non-delay runtime class and references consumed browser/audio/control evidence; reverb and synth block conversion; sequencer, modulation-only, MIDI, and sampler block validation; unsupported prompt blocks selection. | `tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-result.json` | Passing locally |
| Filter low-pass runtime support repeats across fresh prompt variants. | `npm run zoia:generate:patch:filter-repeatability-rollup -- --result-path tests/workflow/evidence/generated-patch-filter-repeatability-rollup/run-result.json` | Node orchestration plus graph, conversion, Playwright browser load, WAV capture, spectral low-pass assertions, LFO/cutoff trace evidence, and local negative controls | `status: pass`; `caseCount == 4`; `passingCaseCount == 4`; `filterVariantCount == 4`; `filterVariantPassCount == 4`; `lowpassRuntimeSupportedCount == 4`; `missingRuntimeEvidenceFailureCount == 0`; `missingTraceEvidenceFailureCount == 0`; `staleTraceEvidenceFailureCount == 0`; `negativeControlFailureCount == 0`; each variant validates one graph, converts one emulator patch, loads one patch, writes three WAV captures, writes four LFO trace captures, classifies the positive as low-pass, and classifies bypass, high-pass wrong-output, disconnected cutoff, and wrong-target controls. | `tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-result.json` | Passing locally |
| Filter repeatability rejects seeded stale and missing trace evidence. | `npm run zoia:generate:patch:filter-repeatability:negative-controls -- --result-path tests/workflow/evidence/generated-patch-filter-repeatability-negative-controls/run-result.json` | Node seeded negative controls over filter repeatability rollup | `status: pass`; `controlCount == 2`; `passingControlCount == 2`; `seededFailureCount == 2`; `expectedFailureFoundCount == 2`; stale trace evidence child fails on `freshness`; missing trace evidence child fails on `control-trace`; seeded failures do not count as filter runtime support. | `tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\run-result.json` | Passing locally |
| CV-to-filter-frequency scaling is deferred while static filter support is preserved. | `npm run zoia:test:playwright:generated-patch-filter-semantics -- --patch-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-runtime/filter-semantics-after-scaling-attempt-reverted-fixed/run-result.json` | Playwright regression recovery gate plus failed scaling evidence review | Scaling attempt evidence records failure at `tests\workflow\evidence\generated-patch-filter-audible-sweep-after-scaling\run-result.json` and `tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics-after-scaling\run-result.json`; reverted static gate records `status: pass`; `lowpassClassifiedCount == 1`; `bypassControlClassifiedCount == 1`; `highpassControlClassifiedCount == 1`; `captureCount == 3`; no audible cutoff-sweep success claim is allowed. | `tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics-after-scaling-attempt-reverted-fixed\run-result.json` | Passing locally as deferral/recovery evidence |
| Runtime audio classification does not count invalid consumed evidence as success. | `npm run zoia:generate:patch:runtime-negative-controls -- --result-path tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json` | Node seeded negative controls over runtime audio evidence | `status: pass`; `controlCount == 5`; `passingControlCount == 5`; `seededFailureCount == 5`; `expectedFailureFoundCount == 5`; silent required-audio fixture fails on `audio-features`; missing capture fails on `capture`; stale capture evidence fails on `freshness`; unsupported MIDI counted as audio fails on `unsupported-runtime`; classified-only signal fails on `classification`. | `tests\workflow\evidence\generated-patch-runtime-negative-controls\run-result.json` | Passing locally |
| Generated-patch readiness consumes runtime-audio negative-control evidence. | `npm run zoia:generate:patch:readiness`; `npm run zoia:generate:patch:readiness:negative-controls` | Node readiness rollup plus seeded readiness negative controls | Readiness `status: pass`; `blockerCount == 0`; readiness summary includes `runtimeAudioNegativeControls`; negative controls `status: pass`; `caseCount == 5`; `passingCaseCount == 5`; degraded runtime-audio negative-control case finds blocker `generated-runtime-audio-negative-controls-not-ready`. | `tests\workflow\evidence\generated-patch-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-readiness-negative-controls\run-result.json` | Passing locally |
| v0.4 readiness consumes generated-patch runtime-audio dependency evidence. | `npm run zoia:verify:v04`; `npm run zoia:verify:v04:negative-controls` | Node v0.4 readiness rollup plus seeded v0.4 negative controls | v0.4 readiness `status: pass`; v0.4 negative controls `status: pass`; `caseCount == 13`; `passingCaseCount == 13`; degraded generated-patch runtime-audio dependency, degraded clean consumer smoke, missing clean-smoke, source-tree import leakage, package-manifest omission, package metadata/script/evidence omission, missing installed v0.4 readiness, missing installed claim-boundary, and degraded publication-protection cases exit nonzero, write blocked v0.4 evidence, and find the expected blocker surface. | `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json` | Passing locally |
| Release-review summary consumes current generated-patch runtime evidence and feeds v0.4 readiness. | `npm run zoia:release:review-summary`; `npm run zoia:release:review-summary:negative-controls`; `npm run zoia:release:review-summary:clean-consumer-smoke-negative-controls`; `npm run zoia:release:review-summary:doc-evidence-negative-controls`; `npm run zoia:release:review-summary:quality-negative-controls`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node release-review rollup plus seeded release-review/v0.4 negative controls | Release-review summary `status: pass`; `blockerCount == 0`; freshness negative controls `caseCount == 3`; direct clean-smoke negative controls `caseCount == 2`; documented-evidence negative controls `caseCount == 1`; quality negative controls `caseCount == 22`; v0.4 readiness `status: pass`; claim-boundary `status: pass`; wildcard consumed evidence references resolve; stale generated-patch, generated-validation, clean-smoke, missing clean-smoke, and release-review child evidence blocks until refreshed. | `tests\workflow\evidence\release-review-summary\run-result.json`; `tests\workflow\evidence\release-review-freshness-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-documented-evidence-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-summary-quality-negative-controls\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |
| Release-review human-facing summary overclaims are rejected. | `npm run zoia:release:review-summary:overclaim-negative-controls`; `npm run zoia:release:review-summary`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node seeded overclaim classifier plus release-review/v0.4/claim-boundary integration | Overclaim negative controls `status: pass`; `baselineBoundaryStatus == pass`; `caseCount == 5`; `passingCaseCount == 5`; `expectedFailureFoundCount == 5`; seeded summaries fail on release-readiness, prompt-boundary, blocked-audio-claim, unsupported-runtime, and hardware-boundary surfaces; release-review summary, v0.4 readiness, and claim-boundary verification require the overclaim gate. | `tests\workflow\evidence\release-review-overclaim-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-overclaim-negative-controls\classification-log.json`; `tests\workflow\evidence\release-review-summary\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |
| Release-review freshness controls reject stale clean consumer smoke evidence. | `npm run zoia:release:review-summary:negative-controls`; `npm run zoia:release:review-summary`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node seeded release-review freshness control | Freshness negative controls `status: pass`; `caseCount == 3`; `passingCaseCount == 3`; stale clean-smoke fixture makes release-review summary block with `release-review-evidence-stale` for `cleanConsumerSmoke`; v0.4 readiness blocks when supplied the blocked summary. | `tests\workflow\evidence\release-review-freshness-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-freshness-negative-controls\degraded-clean-consumer-smoke.json`; `tests\workflow\evidence\release-review-freshness-negative-controls\blocked-release-review-summary-stale-clean-smoke.json`; `tests\workflow\evidence\release-review-freshness-negative-controls\blocked-v04-readiness-stale-clean-smoke.json` | Passing locally |
| Clean consumer smoke blocks installed release-review regeneration outside a git worktree. | `npm run zoia:verify:v04:clean-consumer-smoke`; `npm run zoia:release:review-summary`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node package-boundary smoke plus deterministic blocker artifact | Clean smoke `status: pass`; `problemCount == 0`; `releaseReviewRegenerationProbeExitCode == 1`; `releaseReviewRegenerationGitWorktreeBlockerFound == true`; installed blocker artifact status `blocked` with blocker `release-review-regeneration-git-worktree-required`; release-review summary and v0.4 readiness require the blocker field. | `tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json`; `tests\workflow\evidence\v0.4-clean-consumer-smoke\run-2026-07-23T07-26-31-588Z\installed-results\v0.4-clean-consumer-smoke-negative-controls\release-review-regeneration-blocker.json`; `tests\workflow\evidence\release-review-summary\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally as blocker evidence |
| Installed-package gates audit source-tree dependency surfaces. | `npm run zoia:verify:v04:clean-consumer-smoke`; `npm run zoia:verify:v04:negative-controls`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node package-boundary audit plus v0.4 and claim-boundary dependency checks | Clean smoke `status: pass`; `sourceTreeImportsUsedByInstalledCommands == false`; `installedCommandAuditCount == 5`; `installedCommandSourceTreeFindingCount == 0`; v0.4 readiness and claim-boundary verification require those fields; v0.4 negative controls prove seeded source-tree import leakage blocks with the expected clean-smoke blocker. | `tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json`; `tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |
| Clean consumer smoke rejects stale package artifacts missing required installed files. | `npm run zoia:verify:v04:clean-consumer-smoke`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node package-boundary mutation controls plus v0.4 and claim-boundary dependency checks | Clean smoke `status: pass`; `missingInstalledReadinessScriptExitCode == 1`; `missingInstalledReadinessScriptBlocked == true`; `missingInstalledCapabilityDocExitCode == 1`; `missingInstalledCapabilityDocBlockedStatus == fail`; v0.4 readiness and claim-boundary verification require those fields. | `tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |
| Clean consumer smoke verifies package boundary exports required docs, scripts, metadata, and evidence. | `npm run zoia:verify:v04:clean-consumer-smoke`; `npm run zoia:verify:v04:negative-controls`; `npm run zoia:release:review-summary`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node package manifest check plus seeded manifest, package metadata/script, and copied-evidence omission controls | Clean smoke `status: pass`; `packageManifestRequiredPathCount == 6`; `packageManifestMissingPathCount == 0`; `packageMetadataValid == true`; `packageScriptReferenceCount == 4`; `packageScriptMissingReferenceCount == 0`; `copiedEvidenceNegativeControlCount == 4`; `copiedEvidencePassingNegativeControlCount == 4`; v0.4 negative controls `caseCount == 13`; `expectedCleanConsumerSmokePackageManifestBlockerFound == true`; `expectedCleanConsumerSmokePackageBoundaryExportBlockerFound == true`; release-review, v0.4 readiness, and claim-boundary verification require those fields. | `tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json`; `tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-summary\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |
| Release-review package-boundary summary overclaims are rejected. | `npm run zoia:release:review-summary:package-boundary-overclaim-negative-controls`; `npm run zoia:release:review-summary`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node seeded package-boundary overclaim classifier plus release-review/v0.4/claim-boundary integration | Package-boundary overclaim negative controls `status: pass`; `baselineBoundaryStatus == pass`; `caseCount == 5`; `passingCaseCount == 5`; `expectedFailureFoundCount == 5`; seeded summaries fail on npm-publication-readiness, evidence-bundle-publication, release-readiness, publication-proof, and broader-publication-readiness surfaces; release-review summary, v0.4 readiness, and claim-boundary verification require the package-boundary overclaim gate. | `tests\workflow\evidence\release-review-package-boundary-overclaim-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-package-boundary-overclaim-negative-controls\classification-log.json`; `tests\workflow\evidence\release-review-summary\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |
| Release-review and v0.4 workflows do not invoke protected publication commands. | `npm run zoia:release:review-summary:publication-protection-negative-controls`; `npm run zoia:verify:v04:negative-controls`; `npm run zoia:release:review-summary`; `npm run zoia:verify:v04`; `npm run zoia:generate:patch:claim-boundary` | Node command audit plus seeded protected-command fixtures and v0.4 degraded-evidence control | Publication-protection negative controls `status: pass`; `actualCommandCount == 38`; `protectedActualCommandCount == 0`; `scriptTextFindingCount == 0`; `seededControlCount == 6`; `passingSeededControlCount == 6`; `expectedFailureFoundCount == 6`; v0.4 negative controls `expectedReleaseReviewPublicationProtectionBlockerFound == true`; release-review summary, v0.4 readiness, and claim-boundary verification require the publication-protection gate. | `tests\workflow\evidence\release-review-publication-protection-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-publication-protection-negative-controls\command-audit.json`; `tests\workflow\evidence\release-review-publication-protection-negative-controls\seeded-command-manifest.json`; `tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json`; `tests\workflow\evidence\release-review-summary\run-result.json`; `tests\workflow\evidence\v0.4-readiness\run-result.json`; `tests\workflow\evidence\generated-patch-claim-boundary\run-result.json` | Passing locally |

## First Playwright Runtime Check

Implemented runtime load check:

```text
tests\workflow\playwright\run-zoia-playwright-generated-patch-load-evidence.mjs
```

Command:

```powershell
npm run zoia:test:playwright:generated-patch-load -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/manual-text-prompt-generated-patch-load/run-result.json
```

Evidence path:

```text
tests\workflow\evidence\manual-text-prompt-generated-patch-load\run-result.json
```

Runtime state assertions:

- `patchName` equals the converted patch name.
- Loaded module count equals converted patch module count.
- Loaded connection count equals converted patch connection count.
- Page count is non-zero.
- Hardware view renders 80 grid buttons.

## Audio Evidence Gate Definition

Audio signal-present behavior for the delay prompt path is now measured. The gate writes these artifacts:

```text
tests\workflow\evidence\generated-patch-audio\run-result.json
tests\workflow\evidence\generated-patch-audio\stimulus-manifest.json
tests\workflow\evidence\generated-patch-audio\classification-log.json
tests\workflow\evidence\generated-patch-audio\captures\*.wav
```

Required audio assertions:

- The test identifies the generated patch path and prompt lineage.
- The test records the stimulus source and duration.
- The test records WAV/PCM capture metrics.
- Signal-present success requires RMS, peak, and post-input tail peak above threshold.
- Silence, missing capture, simulation failure, unsupported source, or unsupported MIDI are structured blockers.
- Classified or blocked cases are not success unless the claim being tested is explicitly a classification claim.

Current measured values for each generated delay patch:

```text
rms: 0.0034763742609671233
peak: 0.8104369640350342
postInputTailPeak: 0.08356381952762604
```

Silent negative control:

```text
classification: expected-silence-classified
rms: 0
peak: 0
```

## Delay-Semantics Evidence Gate Definition

Delay-window behavior is measured in a separate gate because the unmodified generated patches include CV/control modulation into the delay module. The deterministic semantics gate derives a fixture from generated patch JSON, disconnects generated modulation/control connections into the delay, sets delay time to 100 ms, disables feedback, and sets mix to wet-only.

Artifacts:

```text
tests\workflow\evidence\generated-patch-delay-semantics\run-result.json
tests\workflow\evidence\generated-patch-delay-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-delay-semantics\classification-log.json
tests\workflow\evidence\generated-patch-delay-semantics\captures\*.wav
```

Required assertions:

- Positive derived fixtures must produce no immediate-window peak above `0.000001`.
- Positive derived fixtures must produce delayed-window peak above `0.2` in the 100 ms window.
- Bypassed-delay negative control must produce immediate signal and no delayed-window signal.
- The result must preserve the boundary that generated modulation semantics are not claimed.

Current positive measured values:

```text
rms: 0.0068430664389349015
immediateWindowPeak: 0
delayedWindowPeak: 0.7729963064193726
delayedWindowPeakIndex: 4538
```

Current bypassed-delay negative control:

```text
classification: bypassed-delay-classified
rms: 0.005050762722761054
immediateWindowPeak: 0.75
delayedWindowPeak: 0
```

## Modulation-Semantics Evidence Gate Definition

Generated time-modulation route behavior is measured in a separate gate because the prior delay-semantics gate neutralizes generated modulation. The modulation-semantics gate derives fixtures from generated patch JSON, identifies the generated `LFO` output to `Delay Line` `time_cv` route, fixes base delay time to 100 ms, disables feedback, sets mix to wet-only, and drives the route target with deterministic constant CV equivalent to a 50 ms delay-time shift.

Artifacts:

```text
tests\workflow\evidence\generated-patch-modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-modulation-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-modulation-semantics\classification-log.json
tests\workflow\evidence\generated-patch-modulation-semantics\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-modulation-semantics\captures\*.wav
```

Required assertions:

- Positive modulation fixtures must produce no baseline-window peak above `0.000001` at 100 ms.
- Positive modulation fixtures must produce shifted-window peak above `0.2` at 150 ms.
- Disconnected modulation negative controls must preserve the 100 ms baseline peak and produce no 150 ms shifted peak.
- Wrong-target feedback negative controls must preserve the 100 ms baseline peak and produce no 150 ms shifted peak.
- The result must preserve the boundary that actual generated LFO waveform semantics are not claimed.

Current positive measured values:

```text
rms: 0.007213225375630608
baselineWindowPeak: 0
shiftedWindowPeak: 0.7729963064193726
shiftedWindowPeakIndex: 6743
```

Current disconnected modulation negative controls:

```text
classification: modulation-disconnected-classified
rms: 0.007213225375630608
baselineWindowPeak: 0.7729963064193726
shiftedWindowPeak: 0
```

Current wrong-target feedback negative controls:

```text
classification: wrong-target-classified
rms: 0.007231318857962942
baselineWindowPeak: 0.7729963064193726
shiftedWindowPeak: 0
```

## LFO-Semantics Evidence Gate Definition

Actual generated LFO waveform behavior is measured in a separate gate because the prior modulation-semantics gate used deterministic constant CV. The LFO-semantics gate derives fixtures from generated patch JSON, identifies the generated `LFO` output to `Delay Line` `time_cv` route, preserves the generated LFO module and generated LFO parameters, fixes only the delay core for measurement, and records both audio captures and LFO trace captures.

Artifacts:

```text
tests\workflow\evidence\generated-patch-lfo-semantics\run-result.json
tests\workflow\evidence\generated-patch-lfo-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-lfo-semantics\classification-log.json
tests\workflow\evidence\generated-patch-lfo-semantics\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-lfo-semantics\captures\*.wav
tests\workflow\evidence\generated-patch-lfo-semantics\traces\*.lfo.wav
```

Required assertions:

- Positive fixtures must capture generated LFO trace RMS above `0.05`.
- Positive fixtures must estimate LFO frequency from trace zero crossings and match the generated rate parameter within tolerance.
- Positive fixtures must produce measurable delayed audio peaks and peak timing movement of at least `0.005` seconds relative to the stabilized baseline.
- Disconnected-route controls must preserve the generated LFO trace while preserving baseline delay timing.
- Muted-LFO controls must remove LFO trace output while preserving baseline delay timing.
- Wrong-target feedback controls must preserve generated LFO trace while preserving baseline delay timing.
- The result must preserve the boundary that original unmodified generated patch timing and expression-pedal feedback semantics are not claimed.

Current positive measured values:

```text
lfoTraceRms: 0.24990589441045222
lfoTraceEstimatedFrequencyHz: 3.2085950573569715
audioRms: 0.011369023761650183
peakTimeDeltasSeconds: 0.07657596371882086, 0.10546485260770966, -0.060793650793650844, null
```

Current disconnected-route negative controls:

```text
classification: lfo-route-disconnected-classified
lfoTraceRms: 0.24990589441045222
lfoTraceEstimatedFrequencyHz: 3.2085950573569715
audioRms: 0.00885484925439267
peakTimeDeltasSeconds: 0.0029024943310657636, 0.002902494331065708, 0.002902494331065819, 0.002902494331065819
```

Current muted-LFO negative controls:

```text
classification: lfo-output-muted-classified
lfoTraceRms: 0
audioRms: 0.00885484925439267
peakTimeDeltasSeconds: 0.0029024943310657636, 0.002902494331065708, 0.002902494331065819, 0.002902494331065819
```

Current wrong-target feedback negative controls:

```text
classification: lfo-wrong-target-classified
lfoTraceRms: 0.24990589441045222
lfoTraceEstimatedFrequencyHz: 3.2085950573569715
audioRms: 0.009027886273115019
peakTimeDeltasSeconds: 0.0029024943310657636, 0.002902494331065708, 0.002902494331065819, 0.002902494331065819
```

## Expression-Feedback Evidence Gate Definition

Expression-pedal feedback behavior is measured in a separate gate because the prior LFO-semantics gate does not exercise the generated expression route. The expression-feedback gate derives fixtures from generated patch JSON, identifies the generated `Cport Exp/CV` output to `Delay Line` `feedback_cv` route, preserves the generated Cport module and generated feedback connection strength, fixes only the delay core for measurement, and records both audio captures and expression trace captures.

Artifacts:

```text
tests\workflow\evidence\generated-patch-expression-feedback-semantics\run-result.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\classification-log.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-expression-feedback-semantics\captures\*.wav
tests\workflow\evidence\generated-patch-expression-feedback-semantics\traces\*.expression.wav
```

Required assertions:

- Positive fixtures must set deterministic expression value to `1` and capture expression trace RMS at `1`.
- Positive fixtures must produce a first delayed peak above threshold and a feedback tail ratio above `0.05`.
- Disconnected-route controls must preserve high expression trace while producing no feedback tail.
- Low-expression controls must preserve the feedback route with expression value `0` and produce no feedback tail.
- Inverted-feedback controls must preserve the feedback target route shape and produce an opposite-polarity repeat.
- Wrong-target mix controls must preserve high expression trace while producing no feedback tail.
- The result must preserve the boundary that physical pedal hardware behavior and original unmodified generated patch timing are not claimed.

Current positive measured values:

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

Current disconnected-route negative controls:

```text
classification: expression-feedback-disconnected-classified
expressionTraceRms: 1
firstPeak: 0.7729963064193726
tailPeak: 0
tailToFirstPeakRatio: 0
```

Current low-expression negative controls:

```text
classification: low-expression-feedback-classified
expressionTraceRms: 0
firstPeak: 0.7729963064193726
tailPeak: 0
tailToFirstPeakRatio: 0
```

Current inverted-feedback negative controls:

```text
classification: inverted-expression-feedback-classified
expressionTraceRms: 1
firstPeak: 0.7729963064193726
tailPeak: 0.4765297472476959
tailToFirstPeakRatio: 0.6164709239751075
repeat2PeakValue: -0.4765297472476959
```

Current wrong-target mix negative controls:

```text
classification: expression-wrong-target-mix-classified
expressionTraceRms: 1
firstPeak: 0.7729963064193726
tailPeak: 0
tailToFirstPeakRatio: 0
```

## Unmodified Modulated Timing Evidence Gate Definition

Original generated patch timing is classified in a separate gate because the prior semantics gates stabilize selected parts of the delay path. This gate uses the generated emulator patch JSON without changing generated delay parameters or generated connections. It runs deterministic impulse stimuli with expression values `0` and `1`, records audio and control traces, and classifies the observed timing rather than asserting musical correctness.

Artifacts:

```text
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\run-result.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\stimulus-manifest.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\classification-log.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\captures\*.wav
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\traces\*.lfo.wav
tests\workflow\evidence\generated-patch-unmodified-modulated-timing\traces\*.expression.wav
```

Required assertions:

- The generated LFO-to-delay-time route must exist.
- The generated expression-to-feedback route must exist.
- The generated delay parameters and generated connections are preserved.
- LFO trace RMS must exceed `0.05`.
- Deterministic impulse output must contain at least one measurable delayed peak.
- Every non-muted original fixture must classify as `stable measured modulation behavior`, `measurable but unstable modulation behavior`, `signal-present only`, or `blocked with exact cause: ...`.
- Muted-audio runtime-input controls must classify as muted controls and must not count as modulation success.
- The result must preserve the boundary that classification is not musical quality, hardware parity, full DSP accuracy, complete patch semantics, or binary export.

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

Current default-expression measured values:

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

Current high-expression measured values:

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

## Unmodified Timing Negative-Control Gate Definition

The unmodified timing classifier has a separate corrupted-route negative-control gate. It starts from generated emulator patch JSON, writes derived corrupted fixtures, and verifies the classifier changes classification, records route irrelevance, or removes the expected metric instead of silently preserving the positive unmodified timing classification.

Artifacts:

```text
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\stimulus-manifest.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\classification-log.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\fixtures\*.patch.json
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\captures\*.wav
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\traces\*.lfo.wav
tests\workflow\evidence\generated-patch-corrupted-route-negative-controls\traces\*.expression.wav
```

Required assertions:

- Removed LFO-time route controls must not remain unchanged stable measured modulation behavior.
- Removed LFO-time route controls must reduce timing movement below `0.05` seconds.
- Removed expression-feedback route controls may keep feedback tail only if source base feedback dominance is recorded.
- Disabled feedback-source controls must remove the feedback-tail metric.
- Removed audio-input route controls must lose generated-patch output signal.
- No corrupted fixture may classify as unchanged stable measured modulation behavior.

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

Current removed-LFO-route controls:

```text
classification: corrupted-lfo-route-classified
lfoTraceRms: 0.24647236715101245
lfoEstimatedFrequencyHz: 3.2085269696335836
expressionTraceRms: 1
firstPeakCount: 1
maxAbsPeakDeltaSeconds: 0.002909254492977409
maxRepeatToFirstRatio: 0.7132009382949581
```

Current removed-expression-feedback controls:

```text
classification: corrupted-expression-route-classified-base-feedback-dominates
sourceBaseFeedbackNormalized: 0.5600061036087587
expressionTraceRms: 1
firstPeakCount: 1
maxAbsPeakDeltaSeconds: 0.0271722930417303
maxRepeatToFirstRatio: 0.05677332849047779
```

Current disabled-feedback-source controls:

```text
classification: corrupted-feedback-route-classified-tail-lost
baseFeedbackNormalized: 0
expressionTraceRms: 1
firstPeakCount: 1
maxAbsPeakDeltaSeconds: 0.0271722930417303
maxRepeatToFirstRatio: 0
```

Current removed-audio-input controls:

```text
classification: corrupted-audio-input-route-classified-signal-lost
audioRms: 0
peak: 0
firstPeakCount: 0
maxAbsPeakDeltaSeconds: 0
maxRepeatToFirstRatio: 0
```

## Fresh Rollup Evidence Gate Definition

The prompt-to-runtime rollup creates one fresh run root, regenerates generated graphs from the text prompt, converts those graphs to emulator patch JSON, and runs the browser/audio gates against that run-scoped emulator patch root. This gate exists to reduce stale-evidence and path-mismatch risk across the generated-patch workflow.

Artifacts:

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

Required assertions:

- Prompt graph generation must pass and write run-scoped generated graph drafts.
- Conversion must pass and write run-scoped emulator patch JSON.
- All browser/audio child gates must read the run-scoped emulator patch root.
- All 10 child gates must execute and pass.
- The rollup must fail on missing child result, non-pass child result, non-zero child command exit, or incomplete child gate coverage.

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

## Prompt Breadth Rollup Gate Definition

The prompt-breadth rollup checks that the current runtime claim generalizes only inside the supported delay-family boundary. It also checks that graph-supported non-delay prompts and unmatched prompts are not silently counted as validated delay runtime evidence.

Artifacts:

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

Required assertions:

- The delay-family variant must pass fresh prompt-to-runtime rollup evidence and include consumed audio and control-trace child evidence.
- The non-delay synth and reverb prompts must not become emulator-loadable delay runtime evidence; current expected result is converter `blocked` with `unsupported-generated-module` for `Synth Voice` and `Reverb Lite`.
- MIDI and sampler prompt families must block at validation until supported generated graph contracts exist.
- The unmatched prompt must block at selection, record the expected selection blocker, and leave no generated graph drafts.
- The rollup fails if stale child evidence is reused, if any unsupported/non-delay prompt is mislabeled as validated delay runtime evidence, or if a validation-blocked prompt passes.

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
delay-family-variant: delay-runtime-supported; child stepCount 10; passedStepCount 10
synth-supported-graph-runtime-unsupported: graph-supported-runtime-unsupported; validatedDraftCount 1; conversion blockerCount 3; convertedPatchCount 0; unsupported-generated-module Synth Voice
reverb-supported-graph-runtime-unsupported: graph-supported-runtime-unsupported; validatedDraftCount 1; conversion blockerCount 5; convertedPatchCount 0; unsupported-generated-module Reverb Lite
midi-validation-blocked: validation-blocked-unsupported-prompt; draftCount 1; validatedDraftCount 0
sampler-validation-blocked: validation-blocked-unsupported-prompt; draftCount 1; validatedDraftCount 0
unsupported-unmatched-prompt: blocked-unsupported-prompt; selectedCandidateCount 0; draftFileCount 0
```

## Prompt Corpus Rollup Gate Definition

The prompt-corpus rollup checks a small representative corpus through fresh text-prompt paths. Each class has an explicit expected boundary before execution: delay claims route semantics, filter and modulation-only claim deterministic validation blockers, and the intentionally unsupported prompt claims a selection blocker.

Artifacts:

```text
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\corpus-manifest.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\classification-log.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\delay-runtime-semantics\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\filter-validation-blocked\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\modulation-only-validation-blocked\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup\run-2026-07-23T02-41-21-670Z\unsupported-selection-blocked\run-result.json
```

Required assertions:

- The corpus manifest must declare prompt class, prompt text, expected boundary, and expected classification before cases run.
- Delay must pass the fresh prompt-to-runtime rollup and include consumed audio, delay-semantics, control-trace, and corrupted-route child evidence.
- Filter must generate one fresh draft through the text-prompt path and then block at validation with zero validated drafts.
- Modulation-only must generate one fresh draft through the text-prompt path and then block at validation with zero validated drafts.
- The intentionally unsupported prompt must block at selection and leave no generated graph drafts.
- Filter, modulation-only, and unsupported prompt classes must not count as emulator-load, audio signal-present, route-semantics, or delay runtime success.

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
delay-runtime-semantics: delay-runtime-route-semantics-supported; child stepCount 10; passedStepCount 10
filter-validation-blocked: filter-runtime-unsupported-validation-blocked; draftCount 1; validatedDraftCount 0; rejectedCandidateCount 1
modulation-only-validation-blocked: modulation-only-runtime-unsupported-validation-blocked; draftCount 1; validatedDraftCount 0; rejectedCandidateCount 1
unsupported-selection-blocked: unsupported-selection-blocked; selectedCandidateCount 0; draftFileCount 0
```

## Prompt Repeatability Rollup Gate Definition

The prompt-repeatability rollup checks that the current delay-family runtime claim repeats across fresh prompt variants. It also checks that an intentionally unsupported prompt remains a deterministic blocker and cannot be counted as delay-family runtime/audio evidence.

Artifacts:

```text
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\repeatability-manifest.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\classification-log.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z\delay-ambient-expression\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z\delay-dub-feedback\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup\run-2026-07-23T02-47-25-028Z\unsupported-selection-blocked\run-result.json
```

Required assertions:

- The repeatability manifest must declare prompt class, prompt text, expected boundary, and expected classification before cases run.
- Each delay-family prompt variant must pass the fresh text-prompt runtime rollup and include consumed audio, delay-semantics, modulation-semantics, LFO-semantics, expression-feedback, unmodified-timing, and corrupted-route child evidence.
- Each generated emulator patch in a delay-family variant must include `Audio Input`, `Delay Line`, `Audio Output`, `LFO`, and `Cport Exp/CV`.
- Child evidence paths must live under the current run root, not a stale evidence root.
- The unsupported prompt must block at selection and leave no generated graph drafts.
- Unsupported variants must not count as emulator-load, audio signal-present, route-semantics, or delay runtime success.

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

## Prompt Repeatability Negative-Control Gate Definition

The prompt-repeatability negative-control gate checks that seeded false-pass modes are rejected by the repeatability rollup. It proves the positive repeatability gate is sensitive to stale child evidence, missing runtime audio evidence, and unsupported-prompt mislabeling.

Artifacts:

```text
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\stale-delay-evidence\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\missing-runtime-audio-evidence\run-result.json
tests\workflow\evidence\generated-patch-prompt-repeatability-rollup-negative-controls\mislabel-unsupported-as-delay\run-result.json
```

Required assertions:

- The negative-control command must run the repeatability rollup with `--seed-stale-delay-evidence`, `--seed-missing-runtime-evidence`, and `--seed-mislabel-unsupported-as-delay`.
- Each seeded child repeatability rollup must exit non-zero and write `status: fail`.
- The stale-evidence seed must record an assertion failure with surface `freshness`.
- The missing-runtime-evidence seed must record an assertion failure with surface `audio-evidence`.
- The unsupported-mislabel seed must record an assertion failure with surface `prompt-boundary`.
- The negative-control gate must not count these seeded failures as positive repeatability evidence.

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

## Prompt Corpus Negative-Control Gate Definition

The prompt-corpus negative-control gate checks that non-delay corpus classes cannot be mislabeled as delay-family runtime support. It preserves filter, modulation-only, and unsupported prompt classes as deterministic blockers until separate runtime contracts exist.

Artifacts:

```text
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\mislabel-filter-as-delay\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\mislabel-modulation-only-as-delay\run-result.json
tests\workflow\evidence\generated-patch-prompt-corpus-rollup-negative-controls\mislabel-unsupported-as-delay\run-result.json
```

Required assertions:

- The negative-control command must run the corpus rollup with `--seed-mislabel-filter-as-delay`, `--seed-mislabel-modulation-only-as-delay`, and `--seed-mislabel-unsupported-as-delay`.
- Each seeded child corpus rollup must exit non-zero and write `status: fail`.
- The filter mislabel seed must record an assertion failure with surface `prompt-boundary`.
- The modulation-only mislabel seed must record an assertion failure with surface `prompt-boundary`.
- The unsupported-prompt mislabel seed must record an assertion failure with surface `prompt-boundary`.
- The negative-control gate must not count these seeded failures as non-delay runtime evidence.

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

## Filter Runtime Semantics Gate Definition

The filter runtime semantics gate checks the first supported non-delay runtime contract. It verifies that a fresh filter prompt path generates a validated `State Variable Filter` graph, converts it to emulator `SV Filter`, loads it in the browser runtime, and produces measured low-pass spectral behavior under deterministic audio stimulus.

Artifacts:

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

Required assertions:

- The prompt graph command must pass with `validatedDraftCount == 1`.
- The conversion command must pass with `convertedPatchCount == 1`.
- The browser load command must pass with `loadedPatchCount == 1`.
- The filter semantics command must render a two-tone stimulus and write WAV captures for the positive filter patch, bypass negative control, and high-pass wrong-output negative control.
- The positive generated filter patch must classify as `lowpass-filter-present`.
- The bypass negative control must classify as `bypass-filter-classified`.
- The high-pass wrong-output negative control must classify as `wrong-output-highpass-classified`.
- The gate does not claim cutoff modulation semantics, resonance semantics, all filter output modes, or full DSP accuracy.

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

## Filter Modulation Semantics Gate Definition

The filter modulation semantics gate checks the generated `LFO -> State Variable Filter cutoff_cv` route as control-route and trace evidence. It does not claim audible cutoff sweep magnitude.

Artifacts:

```text
tests\workflow\evidence\generated-patch-filter-modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-modulation-semantics\stimulus-manifest.json
tests\workflow\evidence\generated-patch-filter-modulation-semantics\classification-log.json
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-positive-cutoff-route.lfo.wav
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-disconnected-cutoff-route.lfo.wav
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-wrong-target-resonance.lfo.wav
tests\workflow\evidence\generated-patch-filter-modulation-semantics\traces\01-107507-wrong-target-output-gain.lfo.wav
```

Required assertions:

- The positive fixture must preserve generated LFO output routed to generated filter frequency/cutoff input.
- The disconnected fixture must preserve the generated LFO trace but remove the cutoff route.
- The wrong-target fixtures must preserve the generated LFO trace but route it to resonance or output gain instead of cutoff.
- Every fixture must write a trace WAV.
- LFO trace RMS must exceed threshold and estimated frequency must match generated rate within tolerance.

Current result:

```text
status: pass
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

## Filter Audible Sweep Blocker Gate Definition

The filter audible sweep blocker gate checks whether the generated filter LFO-to-cutoff route produces a measurable audio change. The current result is deterministic blocker evidence: generated cutoff modulation remains below the audible-sweep threshold, while an exaggerated seeded route proves the measurement can detect a large sweep effect.

Artifacts:

```text
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\run-result.json
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\stimulus-manifest.json
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\classification-log.json
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\captures\01-107507-disconnected-cutoff-route.wav
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\captures\01-107507-generated-cutoff-route.wav
tests\workflow\evidence\generated-patch-filter-audible-sweep-blocker\captures\01-107507-exaggerated-cutoff-route.wav
```

Required assertions:

- The disconnected, generated, and exaggerated cutoff-route fixtures must render in browser OfflineAudioContext and write WAV captures.
- Generated cutoff-route output difference from disconnected output must stay below audible-sweep blocker threshold.
- Exaggerated cutoff-route output difference from disconnected output must exceed measurable-sweep threshold.
- The classification must remain blocker evidence and must not satisfy an audible cutoff-sweep success claim.

Current result:

```text
status: pass
fixtureCount: 3
captureCount: 3
generatedDiffRms: 0.0005722353133105269
exaggeratedDiffRms: 0.3596596323947025
classification: audible-cutoff-sweep-blocked-by-current-cv-scaling
```

## Non-Delay Boundary Controls Gate Definition

The non-delay boundary controls gate inventories reachable non-delay prompt families and records one explicit boundary per class before evaluating evidence. It keeps filter as the only currently supported non-delay runtime class and proves out-of-scope classes cannot be counted as delay-family or filter runtime support.

Artifacts:

```text
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-result.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\prompt-manifest.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\classification-log.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z\reverb-runtime-unsupported\convert-emulator\run-result.json
tests\workflow\evidence\generated-patch-non-delay-boundary-controls\run-2026-07-23T03-33-47-363Z\synth-runtime-unsupported\convert-emulator\run-result.json
```

Required assertions:

- The prompt manifest must predeclare prompt class, description, expected boundary, and v0.4.0 runtime scope before class evidence is evaluated.
- Filter must be the only in-scope non-delay runtime class and must reference existing consumed browser load, WAV/audio, spectral, and control-trace evidence.
- Reverb and synth must draft validated generated graphs but block conversion before emulator load with unsupported module blockers.
- Sequencer, modulation-only, MIDI, and sampler must block at generated graph validation until separate runtime contracts exist.
- The unsupported prompt must block at selection and leave no generated graph drafts.
- Every out-of-scope class must include seeded mislabel controls for delay-family runtime support and filter runtime support.
- Seeded mislabel controls must detect all seeded failures and must not count as runtime evidence.

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
filter-lowpass-runtime-supported: runtime-lowpass-supported; in scope for v0.4.0
reverb-runtime-unsupported: graph-supported-runtime-unsupported; unsupported module Reverb Lite
synth-runtime-unsupported: graph-supported-runtime-unsupported; unsupported module Synth Voice
sequencer-validation-blocked: validation-blocked
modulation-only-validation-blocked: validation-blocked
midi-validation-blocked: validation-blocked
sampler-validation-blocked: validation-blocked
unsupported-selection-blocked: selection-blocked
```

## Filter Repeatability Rollup Gate Definition

The filter repeatability rollup checks whether the current low-pass filter runtime contract repeats across fresh prompt variants. It also requires LFO/cutoff route trace evidence for each variant and preserves the existing blocker that audible cutoff sweep is not proven.

Artifacts:

```text
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\prompt-manifest.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\classification-log.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-resonant-cutoff-modulation\filter-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-resonant-cutoff-modulation\filter-modulation-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-lowpass-lfo-sweep\filter-semantics\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z\filter-lowpass-lfo-sweep\filter-modulation-semantics\run-result.json
```

Required assertions:

- The manifest must predeclare the filter prompt variants and the low-pass-only runtime boundary.
- Each prompt variant must produce one validated generated graph draft.
- Each prompt variant must convert to one emulator patch containing `Audio Input`, `SV Filter`, `Audio Output`, and `LFO`.
- Each converted patch must load in the browser runtime.
- Each filter semantics child gate must write WAV captures for the positive patch, bypass control, and high-pass wrong-output control.
- Each filter modulation child gate must write LFO trace captures for the positive route, disconnected route, resonance wrong-target, and output-gain wrong-target controls.
- Each positive patch must classify as `filter-lowpass-runtime-supported`.
- Bypass and high-pass wrong-output controls must classify separately and must not count as low-pass positive evidence.
- Trace evidence must be fresh and present for each supported variant.

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
runRoot: tests\workflow\evidence\generated-patch-filter-repeatability-rollup\run-2026-07-23T03-46-18-938Z
```

Current classifications:

```text
filter-resonant-cutoff-modulation: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
filter-lowpass-lfo-sweep: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
filter-bright-lowpass-motion: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
filter-dark-resonant-sweep: filter-lowpass-runtime-supported; validatedDraftCount 1; convertedPatchCount 1; loadedPatchCount 1; lowpassClassifiedCount 1; captureCount 3; traceCount 4
```

## Filter Repeatability Negative-Control Gate Definition

The filter repeatability negative-control gate checks that seeded stale LFO/cutoff trace evidence and missing trace evidence are rejected. It proves the repeatability rollup cannot pass from old or absent trace evidence.

Artifacts:

```text
tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\stale-trace-evidence\run-result.json
tests\workflow\evidence\generated-patch-filter-repeatability-negative-controls\missing-trace-evidence\run-result.json
```

Required assertions:

- The negative-control command must run filter repeatability with `--seed-stale-trace-evidence` and `--seed-missing-trace-evidence`.
- Each seeded child rollup must exit non-zero and write `status: fail`.
- The stale trace evidence seed must record an assertion failure with surface `freshness`.
- The missing trace evidence seed must record an assertion failure with surface `control-trace`.
- Seeded failures must not count as filter runtime support.

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

## CV-To-Filter-Frequency Scaling Deferral Gate Definition

The CV-to-filter-frequency scaling deferral gate records the current v0.4.0 decision: scaling is not accepted in this hardening pass because the attempted implementation did not produce valid audible sweep evidence and temporarily regressed the existing static filter audio gate.

Artifacts:

```text
tests\workflow\evidence\generated-patch-filter-audible-sweep-after-scaling\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics-after-scaling\run-result.json
tests\workflow\evidence\generated-patch-filter-runtime\filter-semantics-after-scaling-attempt-reverted-fixed\run-result.json
```

Required assertions:

- A scaling change cannot be accepted from route trace evidence alone.
- A scaling change cannot be accepted if generated audible-sweep evidence fails to render valid audio stimulus or fails the generated-route threshold.
- A scaling change cannot be accepted if the static low-pass filter runtime gate regresses.
- The recovered static filter gate must pass with positive low-pass classification, bypass control classification, high-pass wrong-output classification, and WAV captures.
- The active claim boundary must remain low-pass runtime support plus LFO/cutoff route trace evidence, not audible cutoff-sweep support.

Current result:

```text
generated-patch-filter-audible-sweep-after-scaling: status fail
generated-patch-filter-runtime\filter-semantics-after-scaling: status fail
generated-patch-filter-runtime\filter-semantics-after-scaling-attempt-reverted-fixed: status pass
lowpassClassifiedCount: 1
bypassControlClassifiedCount: 1
highpassControlClassifiedCount: 1
captureCount: 3
```

## Runtime Audio Classification Negative-Control Gate Definition

The runtime audio classification negative-control gate validates generated-patch audio evidence directly and proves seeded invalid consumed evidence cannot satisfy signal-present or runtime-audio claims.

Artifacts:

```text
tests\workflow\evidence\generated-patch-runtime-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\silent-required-audio-fixture.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\missing-capture.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\stale-capture-evidence.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\unsupported-midi-counted-as-audio.json
tests\workflow\evidence\generated-patch-runtime-negative-controls\classified-only-counted-as-signal.json
```

Required assertions:

- Source runtime audio evidence must pass baseline validation before seeded controls are accepted.
- Silent required-audio evidence must fail on measured RMS, peak, or tail thresholds.
- Missing capture evidence must fail on capture existence and summary consistency.
- Stale evidence must fail on freshness.
- Unsupported MIDI runtime modules must fail if counted as audio success.
- A `classified` result must not count as `signal-present` success for required audio.

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

## Generated-Patch Readiness Runtime-Audio Integration Gate Definition

The generated-patch readiness runtime-audio integration gate makes the higher-level readiness rollup consume the standalone runtime-audio negative-control result. It proves readiness blocks if the runtime-audio negative-control evidence is degraded.

Artifacts:

```text
tests\workflow\evidence\generated-patch-readiness\run-result.json
tests\workflow\evidence\generated-patch-readiness-negative-controls\run-result.json
tests\workflow\evidence\generated-patch-readiness-negative-controls\degraded-runtime-audio-negative-controls.json
tests\workflow\evidence\generated-patch-readiness-negative-controls\blocked-readiness-runtime-audio-negative-controls.json
```

Required assertions:

- Generated-patch readiness must require runtime-audio negative-control evidence.
- Generated-patch readiness must summarize runtime-audio negative-control status and counts.
- Degraded runtime-audio negative-control evidence must cause readiness to block.
- The readiness negative-control suite must observe blocker `generated-runtime-audio-negative-controls-not-ready`.

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

## v0.4 Readiness Runtime-Audio Dependency Gate Definition

The v0.4 readiness runtime-audio dependency gate checks that release-line readiness consumes the generated-patch runtime-audio dependency summary, not only the aggregate generated-patch readiness status.

Artifacts:

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

Required assertions:

- v0.4 readiness must inspect `generatedPatchReadiness.summary.runtimeAudioNegativeControls`.
- v0.4 readiness must require runtime-audio negative-control status `pass`, five controls, five passing controls, five seeded failures, five expected failure detections, and zero blockers.
- A generated-patch readiness fixture with degraded runtime-audio dependency summary must block v0.4 readiness.
- The seeded v0.4 case must find blocker `generated-patch-readiness-failed`.
- A clean consumer smoke fixture missing release-review regeneration blocker evidence must block v0.4 readiness.
- The seeded clean consumer case must find blocker `clean-consumer-smoke-failed`.
- Missing clean-smoke evidence must block with `missing-cleanConsumerSmoke`.
- Source-tree import leakage, package-manifest omission, missing installed v0.4 readiness evidence, and missing installed claim-boundary evidence must block with `clean-consumer-smoke-failed`.

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

## Clean Consumer Smoke From Local Package Boundary

Capability specification:

```text
The local package artifact can be installed into a clean consumer directory and can run installed-package v0.4/generated-patch readiness gates against a selected JSON evidence bundle copied into the installed package boundary.
```

Test implementation:

```text
npm run zoia:verify:v04:clean-consumer-smoke
```

Artifacts:

```text
tests\workflow\evidence\v0.4-clean-consumer-smoke\run-result.json
tests\workflow\evidence\v0.4-readiness\run-result.json
tests\workflow\evidence\generated-patch-claim-boundary\run-result.json
```

The run-specific package artifact, installed result paths, and release-review regeneration blocker artifact are recorded in the canonical clean-smoke `run-result.json`.

Required assertions:

- `npm pack` must create a local package artifact.
- The package artifact must install into a clean consumer directory under the OS temp root.
- Package manifest required paths must include `package.json`, generated-patch docs, v0.4 readiness script, and claim-boundary script before install.
- Package manifest omission controls must classify omitted patch-generation doc and omitted readiness script as blocked.
- Installed package metadata must report `zoia-emulator` version `0.4.0`.
- Installed package scripts must reference the clean-smoke verifier, v0.4 readiness, release-review summary, and claim-boundary verifier scripts.
- Copied evidence bundle omission controls must classify omitted generated-patch readiness JSON and omitted release-review summary JSON as blocked.
- Installed required paths must include `package.json`, generated-patch docs, v0.4 readiness script, claim-boundary script, generated-patch readiness evidence, and release-review summary evidence after the selected JSON evidence bundle is copied into the installed package.
- Installed v0.4 readiness must pass with blockerCount `0`.
- Installed generated-patch claim-boundary verification must pass with problemCount `0`.
- Missing generated-patch readiness evidence must block v0.4 readiness.
- Stale or degraded release-review summary evidence must block v0.4 readiness.
- Installed release-review summary regeneration outside a git worktree must block with a deterministic blocker artifact.
- Installed command audit must cover installed v0.4 readiness, installed claim-boundary verification, missing generated-patch evidence control, stale release-review evidence control, and release-review regeneration probe.
- Installed command audit must report five audited commands and zero source-tree findings.
- Missing installed readiness script control must exit nonzero.
- Missing installed patch-generation doc control must exit nonzero and classify as `fail`.

Current result:

```text
status: pass
problemCount: 0
packageManifestRequiredPathCount: 6
packageManifestMissingPathCount: 0
packageManifestNegativeControlCount: 2
packageManifestPassingNegativeControlCount: 2
packageMetadataValid: true
packageScriptReferenceCount: 4
packageScriptMissingReferenceCount: 0
copiedEvidenceNegativeControlCount: 4
copiedEvidencePassingNegativeControlCount: 4
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
missingGeneratedEvidenceExitCode: 1
missingGeneratedEvidenceBlockedStatus: blocked
staleReleaseReviewExitCode: 1
staleReleaseReviewBlockedStatus: blocked
releaseReviewRegenerationProbeExitCode: 1
releaseReviewRegenerationGitWorktreeBlockerFound: true
```

Negative controls:

```text
missing-generated-patch-evidence: v0.4 readiness blocks with missing-generatedPatchReadiness
stale-release-review-evidence: v0.4 readiness blocks with release-review-summary-failed
release-review-regeneration-without-git-worktree: installed release-review regeneration blocks with release-review-regeneration-git-worktree-required
source-tree-import-leakage: v0.4 readiness negative controls block with clean-consumer-smoke-failed when clean-smoke evidence reports source-tree imports
package-manifest-omission: v0.4 readiness negative controls block with clean-consumer-smoke-failed when clean-smoke evidence reports missing required package manifest paths
package-boundary-export-omission: v0.4 readiness negative controls block with clean-consumer-smoke-failed when clean-smoke evidence reports missing package metadata, script references, or copied evidence controls
missing-installed-readiness-script: installed v0.4 readiness command fails from installed package boundary
missing-installed-patch-generation-doc: installed claim-boundary verification fails with missing-patchGenerationDoc
```

## Release-Review Clean Consumer Smoke Negative Controls

Capability specification:

```text
Release-review summary directly rejects missing or stale clean consumer smoke evidence and preserves protected claim-boundary text in the blocked outputs.
```

Test implementation:

```text
npm run zoia:release:review-summary:clean-consumer-smoke-negative-controls
```

Artifacts:

```text
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\run-result.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\degraded-stale-clean-consumer-smoke.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\blocked-release-review-summary-missing-clean-smoke.json
tests\workflow\evidence\release-review-clean-consumer-smoke-negative-controls\blocked-release-review-summary-stale-clean-smoke.json
```

Required assertions:

- Missing clean consumer smoke evidence must make release-review summary exit nonzero and write a blocked result.
- The missing case must include `missing-release-review-evidence` for the clean-smoke path and quality problem `reviewer-summary-clean-consumer-smoke-missing`.
- Stale clean consumer smoke evidence must make release-review summary exit nonzero and write a blocked result.
- The stale case must include `release-review-evidence-stale` for `cleanConsumerSmoke`.
- Both blocked outputs must retain protected source-control boundary text.
- The suite must report two passing seeded cases and zero problems.

Current result:

```text
status: pass
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

## False-Pass Review For Current Runtime Load Result

The implemented Playwright load result proves that converted generated patch JSON is accepted by `window.ZOIA.loadPatch` and renders the hardware grid. The audio gate proves deterministic impulse-stimulus signal presence through the generated delay-path emulator patches. The delay-semantics gate proves a derived deterministic fixture from generated delay-path patch JSON can produce a delayed-window signal and that a bypassed-delay negative control cannot satisfy the timing claim. The modulation-semantics gate proves that the generated LFO-to-delay-time route target can shift delay timing when driven by deterministic constant CV, while disconnected and wrong-target negative controls cannot satisfy that timing-shift claim. The LFO-semantics gate proves that the actual generated LFO waveform is present at the generated rate/depth and that the generated LFO-to-delay-time route moves delay peak timing in stabilized fixtures. The expression-feedback gate proves that deterministic expression input through the generated Cport-to-feedback route creates measurable feedback-tail repeats in stabilized fixtures. The unmodified timing gate classifies the original generated patch JSON with generated parameters and connections preserved as stable measured modulation behavior under default, high-expression, and repeated high-expression deterministic inputs, while muted audio runtime controls do not count as modulation success. The corrupted-route negative-control gate proves targeted route corruptions change classification, record base-feedback dominance, remove tail evidence, or lose output signal instead of silently preserving the positive classification. The prompt-breadth rollup proves that one delay-family prompt variant reaches fresh runtime/audio evidence, graph-supported synth and reverb prompts block before runtime, MIDI and sampler prompts block at validation, and an unmatched prompt blocks at selection. The prompt-corpus rollup adds a four-class corpus with explicit delay route-semantics success, filter validation blocker, modulation-only validation blocker, and unsupported selection blocker. The prompt-repeatability rollup proves two delay-family prompt variants reach fresh route-semantics runtime evidence while an unsupported prompt remains selection-blocked. The prompt-repeatability negative-control gate proves seeded stale evidence, missing runtime audio evidence, and unsupported-prompt mislabeling are rejected. The prompt-corpus negative-control gate proves filter, modulation-only, and unsupported prompt classes cannot be mislabeled as delay-family runtime support. The filter runtime semantics gate proves one fresh filter prompt path validates, converts, loads, and produces measured low-pass spectral behavior with bypass and high-pass wrong-output negative controls. The filter modulation semantics gate proves the generated LFO waveform is present and routed to the generated filter cutoff/frequency target while disconnected and wrong-target controls cannot satisfy the cutoff-route classification. The audible sweep blocker gate proves current generated filter cutoff modulation does not produce a measurable audible sweep under the threshold, while an exaggerated seeded route does. The non-delay boundary controls gate inventories filter, reverb, synth, sequencer, modulation-only, MIDI, sampler, and unsupported prompt classes, keeps filter as the only in-scope non-delay runtime class, and proves out-of-scope classes cannot be mislabeled as delay or filter runtime support. The filter repeatability rollup proves the low-pass filter runtime path repeats across four fresh generated filter prompt variants with browser load, WAV capture, spectral low-pass assertions, LFO/cutoff traces, bypass controls, disconnected cutoff controls, high-pass wrong-output controls, and wrong-target controls. The filter repeatability negative-control gate proves stale trace evidence and missing trace evidence fail on expected surfaces. The CV-to-filter-frequency scaling deferral gate records that a scaling attempt is not accepted because it failed the audible sweep evidence and regressed static filter runtime evidence before recovery. The runtime audio classification negative-control gate proves silent required-audio fixtures, missing captures, stale evidence, unsupported MIDI runtime modules, and classified-only signal records cannot satisfy runtime audio success. The generated-patch readiness integration gate proves the higher-level readiness rollup blocks when runtime-audio negative-control evidence is degraded. The v0.4 readiness runtime-audio dependency gate proves the release-line readiness rollup blocks when the generated-patch runtime-audio dependency summary is degraded. The clean consumer smoke proves a local package artifact can be installed into a clean consumer directory and can run installed v0.4 and claim-boundary gates against a selected JSON evidence bundle, while missing generated-patch evidence and stale release-review evidence block as expected. These gates do not prove physical expression pedal hardware behavior, hardware-export validity, arbitrary prompt coverage, audible cutoff sweep success, resonance semantics, reverb runtime support, synth runtime support, sequencer runtime support, modulation-only runtime support, MIDI runtime support, sampler runtime support, npm publication readiness, release-review regeneration outside a git worktree, musical quality, full DSP accuracy, or release readiness.

Highest-risk remaining false pass:

```text
The non-delay inventory is bounded to currently reachable prompt families and generator behavior. Filter low-pass runtime support now repeats across four generated prompt variants, and runtime-audio false passes for silent, missing, stale, unsupported, and classified-only evidence are blocked. Audible cutoff sweep success remains explicitly blocked. Resonance behavior, broader filter prompt coverage, reverb runtime support, synth runtime support, and other non-delay runtime contracts remain unproven.
```

Next highest-risk hardening item:

```text
Next hardening item: add direct human-facing summary checks that package-manifest evidence is stated without implying npm publication readiness or copied evidence bundle publication.
```

