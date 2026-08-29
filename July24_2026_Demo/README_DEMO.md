# ZOIA 0.4.0 Generated-Patch Demo

This directory is a local demo bundle for the current bounded generated-patch evidence. It includes the verification script and documentation. Generated demo outputs are local artifacts and are ignored by Git. It is not a release artifact.

## Quick Verification

Best current demo artifact: `July24_2026_Demo/verification-result.json`.

From the ZOIA project root:

```powershell
.\July24_2026_Demo\run-demo.ps1
```

In default verification mode, the wrapper emits verifier JSON on stdout, so automation can pipe it to `jq` or read the locally generated `July24_2026_Demo/verification-result.json` after the command exits.

Equivalent direct command:

```powershell
node .\July24_2026_Demo\verify-demo.mjs
```

This checks that the local demo artifacts exist, key source evidence is still fresh, key JSON results still pass, WAV/trace artifacts are present, copied artifacts have SHA-256 manifest records, the README artifact table matches manifest-derived counts, seeded tamper/staleness/manifest-omission/table-drift controls fail on the expected surfaces, and `DEMO_STATUS.md` preserves the claim boundary.

The verifier writes ignored local outputs `verification-result.json` and `DEMO_MANIFEST.json` in this directory. Key verifier fields for this demo are `copiedPatchCheckCount`, `runtimeConsumedArtifactCheckCount`, `seededNegativeControlPassingCount`, `seededControlInventory`, `seededControlRiskCategoryCounts`, `consumedMarkdownSectionCheckCount`, `wrapperJsonOutputBoundaryCheckCount`, `wrapperResultDiscoveryCheckCount`, `wrapperFullEvidenceCopySyncCheckCount`, `wrapperFullEvidenceCopyFreshnessCheckCount`, `wrapperFullEvidenceSmokeCheckCount`, `sourceEvidenceWarningDocumentAgreementCheckCount`, `manifestArtifactHashCheckCount`, `audioCaptureMappingCheckCount`, `audioManifestContentCoverageCheckCount`, `audioCapabilityClaimChainCheckCount`, `audioConsumedFieldArtifactCountCheckCount`, `audioArtifactGenerationFreshnessCheckCount`, `audioGenerationWindowSurfaceAgreementCheckCount`, `audioGenerationWindowMaxDeltaMs`, `audioGenerationWindowMinutes`, `audioClassificationAgreementCheckCount`, `audioClassificationWavContentCheckCount`, `lfoTraceWavContentCheckCount`, `filterWavContentCheckCount`, `explicitSourceEvidenceCount`, and `copiedClaimedArtifactCount`.

Audio copied-artifact freshness is bounded by a 10-minute audio generation window: each delay audio, LFO trace, and filter runtime group must keep its WAV files, classification log, run-result JSON, and stimulus manifest inside that window.

## Full Local Evidence Commands

Run these from the ZOIA project root only when a longer local refresh is intended:

```powershell
npm run zoia:generate:patch:text-prompt-runtime-rollup
npm run zoia:generate:patch:final-evidence-inventory
npm run zoia:generate:patch:final-evidence-inventory:negative-controls
npm run zoia:release:review-summary
npm run zoia:verify:v04
npm run zoia:generate:patch:claim-boundary
npm run zoia:test:playwright:generated-patch-audio
npm run zoia:test:playwright:generated-patch-lfo-semantics
npm run zoia:test:playwright:generated-patch-filter-semantics
```

If `run-demo.ps1 -RunFullEvidence` is used instead, the npm commands may emit their own command output before the verifier writes the result file. Do not parse `-RunFullEvidence` stdout as the consumed result; after the command exits, read `July24_2026_Demo/verification-result.json`. The `-RunFullEvidence` wrapper path regenerates source evidence and copies refreshed local artifacts into `July24_2026_Demo/artifacts` before verification. A full-evidence smoke run reports `wrapperFullEvidenceSmokeCheckCount` for the refreshed copy targets.

`zoia:generate:patch:text-prompt-runtime-rollup` demonstrates the strongest supported delay-family prompt path: graph generation, emulator conversion, browser runtime load, WAV capture, signal-present audio classification, delay-route semantics, LFO/control trace evidence, expression-feedback route evidence, and negative controls.

`zoia:generate:patch:final-evidence-inventory` demonstrates the current bounded claim inventory and checks release-review, clean-smoke, claim-boundary, documented-evidence, validation-command, and package-script surface categorization.

`zoia:generate:patch:final-evidence-inventory:negative-controls` demonstrates seeded failures for overclaims, stale dependencies, uncategorized evidence, uncategorized release-review validation commands, and uncategorized package-facing scripts.

## Included Artifact Copies

The ignored local `DEMO_MANIFEST.json` records SHA-256 hashes for 31 required demo files:

| Category | Manifested files | Contents |
| --- | ---: | --- |
| Demo files | 3 | README, status, and wrapper script |
| Generated patch JSON | 3 | Copied emulator-loadable generated patch JSON files |
| Final inventory evidence | 2 | Bounded claim inventory and run-result JSON |
| Review/readiness JSON | 4 | Negative-control, release-review, v0.4, and claim-boundary run-result JSON |
| Delay audio evidence | 7 | Run-result JSON, classification log, stimulus manifest, and WAV captures |
| LFO trace evidence | 6 | Run-result JSON, classification log, stimulus manifest, and trace WAVs |
| Filter runtime evidence | 6 | Run-result JSON, classification log, stimulus manifest, and WAV captures |

- `artifacts/generated-patch-audio`: delay-family audio gate results, stimulus manifest, classification log, and WAV captures.
- `artifacts/generated-patch-lfo-semantics`: LFO semantics result, stimulus manifest, classification log, and positive LFO trace WAVs.
- `artifacts/generated-patch-filter-runtime`: static low-pass filter runtime result, stimulus manifest, classification log, and WAV captures.
- `artifacts/generated-patch-final-evidence-inventory`: final bounded claim inventory result and claim inventory JSON.
- `artifacts/generated-patch-final-evidence-inventory-negative-controls`: seeded final-inventory negative-control result.
- `artifacts/release-review-summary`: current release-review summary result.
- `artifacts/v0.4-readiness`: current v0.4 readiness result.
- `artifacts/generated-patch-claim-boundary`: current generated-patch claim-boundary result.

## Source Evidence Dependencies

The demo verifier also checks 8 explicit source evidence files under `tests/workflow/evidence/...` for freshness and expected pass values. These paths are listed in `verification-result.json` under `sourceEvidenceDependencies` with source/copy hashes, timestamp age, the 48-hour freshness limit, and expected missing/stale failure surfaces. The summary fields `sourceEvidenceNextStaleAt`, `sourceEvidenceMinimumRemainingMs`, `oldestSourceEvidenceId`, and `sourceEvidenceFreshnessLimitHours` show when the next source dependency crosses the freshness boundary. The fields `sourceEvidenceRefreshRecommended` and `sourceEvidenceWarningThresholdHours` show when the demo is still passing but inside the 8-hour refresh-warning window. The copied demo artifacts are still required and hash-recorded; the verifier includes a seeded missing copied JSON evidence control so source evidence cannot hide an incomplete copied demo bundle.

For a relocated demo copy, set `ZOIA_DEMO_SOURCE_ROOT` or pass `-SourceEvidenceRoot` to the wrapper so the eight source evidence dependencies remain explicit and the copied demo artifacts are still resolved from the relocated demo folder.

Intentional source evidence dependencies:

- `tests/workflow/evidence/generated-patch-final-evidence-inventory/run-result.json`
- `tests/workflow/evidence/generated-patch-final-evidence-inventory-negative-controls/run-result.json`
- `tests/workflow/evidence/release-review-summary/run-result.json`
- `tests/workflow/evidence/v0.4-readiness/run-result.json`
- `tests/workflow/evidence/generated-patch-claim-boundary/run-result.json`
- `tests/workflow/evidence/generated-patch-audio/run-result.json`
- `tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json`
- `tests/workflow/evidence/generated-patch-filter-semantics/run-result.json`

## Boundary

Use `DEMO_STATUS.md` as the claim boundary, evidence summary, and limitations list for this bundle. It identifies the supported claims, deferred and out-of-scope claims, protected-action boundary, and repeatable verification command.
