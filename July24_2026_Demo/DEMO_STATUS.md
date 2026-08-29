# ZOIA 0.4.0 Generated-Patch Demo Status

## Scope

This is a local, project-owned demo bundle for bounded ZOIA 0.4.0 generated-patch/runtime evidence. It packages current evidence artifacts and a verifier for the best supported local generated-patch paths.

## Latest Accepted Evidence

- `tests/workflow/evidence/generated-patch-final-evidence-inventory/run-result.json`
- `tests/workflow/evidence/generated-patch-final-evidence-inventory-negative-controls/run-result.json`
- `tests/workflow/evidence/release-review-summary/run-result.json`
- `tests/workflow/evidence/v0.4-readiness/run-result.json`
- `tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json`
- `tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json`
- `tests/workflow/evidence/generated-patch-claim-boundary/run-result.json`
- `tests/workflow/evidence/generated-patch-text-prompt-runtime-rollup/run-result.json`
- `tests/workflow/evidence/generated-patch-audio/run-result.json`
- `tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json`
- `tests/workflow/evidence/generated-patch-filter-semantics/run-result.json`

## Supported Claims

- Delay-family generated prompt path can produce validated graph output, converted emulator patch JSON, browser runtime load evidence, WAV audio captures, signal-present classification, route semantics evidence, LFO/control trace evidence, expression-feedback route evidence, and negative controls for the tested fixtures.
- Static low-pass generated filter path can validate, convert, load in browser runtime, and produce measured low-pass audio behavior for the tested fixtures.
- Final bounded evidence inventory maps accepted local claims to evidence paths, gates, negative controls, excluded claims, release-review references, validation commands, and package-facing generated-patch/release/v0.4 scripts.
- Clean consumer smoke verifies local package-boundary behavior against copied JSON evidence without source-tree imports in installed commands.

## Deferred And Out Of Scope

- Not release readiness.
- Not ready_for_review.
- Not npm publication readiness.
- Not GitHub readiness.
- Not public release or publication evidence.
- Not broad text-to-ZOIA support.
- Not arbitrary prompt support.
- Not audible cutoff sweep.
- Not hardware parity.
- Not hardware export.
- Not full DSP accuracy.
- Not complete patch semantics.
- Not physical pedal behavior.
- Not complete filter resonance or all filter output mode semantics.
- Not modulation-only, reverb, synth, sequencer, MIDI, sampler, or arbitrary non-delay runtime support.

## Protected-Action Boundary

No source-control side effects are authorized by this demo. No GitHub, remote, push, tag, release, npm publish, public action, or source-control mutation should be performed without the exact human-only passcode.

## Verification

Run:

```powershell
.\July24_2026_Demo\run-demo.ps1
```

Direct verifier command:

```powershell
node .\July24_2026_Demo\verify-demo.mjs
```

The verifier fails if required copied artifacts are missing, key source evidence is missing or stale, key source/copy JSON values no longer match the accepted pass boundaries, or this status file contains overbroad claim wording. It also writes SHA-256 records for copied demo artifacts to `DEMO_MANIFEST.json`, records seeded negative controls, and exposes `seededControlInventory`, `seededControlRiskCategoryCounts`, `explicitSourceEvidenceCount`, `wrapperResultDiscoveryCheckCount`, `wrapperFullEvidenceCopySyncCheckCount`, `wrapperFullEvidenceCopyFreshnessCheckCount`, `wrapperFullEvidenceSmokeCheckCount`, `sourceEvidenceWarningDocumentAgreementCheckCount`, `audioManifestContentCoverageCheckCount`, `audioCapabilityClaimChainCheckCount`, `audioConsumedFieldArtifactCountCheckCount`, `audioArtifactGenerationFreshnessCheckCount`, `audioGenerationWindowSurfaceAgreementCheckCount`, `audioGenerationWindowMaxDeltaMs`, `audioGenerationWindowMinutes`, `audioClassificationWavContentCheckCount`, `lfoTraceWavContentCheckCount`, and `filterWavContentCheckCount` in `verification-result.json`.

Audio copied-artifact freshness uses a 10-minute audio generation window: each delay audio, LFO trace, and filter runtime group must keep its WAV files, classification log, run-result JSON, and stimulus manifest inside that window.

The `-RunFullEvidence` wrapper path is expected to copy refreshed final-inventory artifacts into `July24_2026_Demo/artifacts` before verification. A full-evidence smoke run reports `wrapperFullEvidenceSmokeCheckCount` for those three refreshed copy targets.

For `-RunFullEvidence`, do not parse wrapper stdout as the consumed result because npm commands can emit output before verification. After the command exits, read `July24_2026_Demo/verification-result.json`.

The verifier also checks 8 explicit source evidence files and reports the source evidence freshness window through `sourceEvidenceNextStaleAt`, `sourceEvidenceMinimumRemainingMs`, `oldestSourceEvidenceId`, `sourceEvidenceFreshnessLimitHours`, `sourceEvidenceRefreshRecommended`, and `sourceEvidenceWarningThresholdHours`. A `sourceEvidenceRefreshRecommended` value of `true` means the demo is still passing but source evidence is inside the configured 8-hour refresh-warning window; the stale boundary remains the 48-hour freshness limit.

Verification result path:

```text
July24_2026_Demo/verification-result.json
```

Manifest path:

```text
July24_2026_Demo/DEMO_MANIFEST.json
```
