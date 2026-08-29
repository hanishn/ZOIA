# ZOIA Patch Generation

Version: 0.5.0-planning
Revision: 3

## Current Capability

The first generation checkpoint is verified template selection from a human description. It ranks existing community patches from the verified coverage index and rejects unverified candidates.

The second checkpoint is pre-export generated candidate validation. It validates an intermediate patch graph and requirement trace before any binary export path is allowed.

The third checkpoint connects template selection to graph drafting. It consumes selected measured candidates and emits graph and requirement-trace drafts that must pass pre-export validation.

The fourth checkpoint adds a selection metadata guard. Draft generation must fail before writing export-looking candidates when selected candidate metadata is missing required verification evidence.

The fifth checkpoint adds generated-patch readiness to release validation. The generated path now has a rollup that is required by the v0.4 readiness gate.

The generated-patch readiness rollup does not claim binary export, full novel synthesis, or runtime audio behavior for generated output.

The sixth checkpoint verifies provenance consistency from selected measured candidates into generated graph and requirement-trace drafts.

The seventh checkpoint runs a prompt smoke matrix. Multiple human descriptions must produce measured template selections, generated graph and trace drafts, and passing pre-export validation. Delay, reverb, and synth-loop smoke prompts must also report concrete core module resolution for `Delay Line`, `Reverb Lite`, and `Synth Voice`.

The eighth checkpoint runs generated-patch readiness negative controls. Degraded provenance evidence, degraded prompt-smoke evidence, missing prompt-smoke concrete-core summary evidence, and degraded human-description workflow evidence must each block generated-patch readiness in isolated evidence paths.

The ninth checkpoint adds a one-command human-description workflow. It runs template selection, graph and requirement-trace draft generation, and pre-export validation from one description input. It remains a selection-based draft workflow and does not claim binary export or full novel synthesis.

The tenth checkpoint adds human-description workflow negative controls. An unmatched description must block with selection evidence rather than producing a passing generated candidate or leaving stale graph/trace drafts behind.

The eleventh checkpoint adds export-boundary negative controls. Export-looking payload fields must be rejected by pre-export validation while binary export support is not implemented.

The twelfth checkpoint adds a generated candidate review summary. It lists draft source evidence, source-to-graph family and module-role comparison, intent-to-graph modality comparison, graph and trace paths, validation status, graph size, requirement count, and export-field count for reviewer inspection.

The thirteenth checkpoint adds selector scoring regression evidence. Measured-signal bonuses must not select candidates unless the human description has at least one lexical or modality match.

Command:

```powershell
npm run zoia:generate:patch:select -- --description "ambient delay with slow modulation and expression pedal feedback control"
```

Selector scoring regression command:

```powershell
npm run zoia:generate:patch:select:regression
```

Selector scoring regression evidence:

```text
tests\workflow\evidence\generated-patch-selector-scoring-regression\run-result.json
```

Evidence output:

```text
tests\workflow\evidence\generated-patch-selection\run-result.json
```

Pre-export graph validation command:

```powershell
npm run zoia:generate:patch:validate
npm run zoia:generate:patch:trace-evidence:negative-controls
```

Validation evidence output:

```text
tests\workflow\evidence\generated-patch-validation\run-result.json
tests\workflow\evidence\generated-patch-trace-evidence-negative-controls\run-result.json
```

Draft graph generation command:

```powershell
npm run zoia:generate:patch:draft-from-selection -- --limit 3
```

Draft evidence output:

```text
tests\workflow\evidence\generated-patch-drafts\run-result.json
```

Draft validation command:

```powershell
npm run zoia:generate:patch:validate -- --fixture-root tests/workflow/generated-patches/from-selection --no-negative-fixtures
```

Draft provenance command:

```powershell
npm run zoia:generate:patch:provenance
```

Draft provenance evidence:

```text
tests\workflow\evidence\generated-patch-draft-provenance\run-result.json
```

Prompt smoke command:

```powershell
npm run zoia:generate:patch:prompt-smoke
```

Prompt smoke evidence:

```text
tests\workflow\evidence\generated-patch-prompt-smoke\run-result.json
```

Prompt smoke records required concrete-core prompt count, concrete core module type count, unresolved template-core abstraction count, and per-graph core summaries.

Human-description workflow command:

```powershell
npm run zoia:generate:patch:from-description
```

Human-description workflow evidence:

```text
tests\workflow\evidence\generated-patch-from-description\run-result.json
```

Human-description workflow negative-control command:

```powershell
npm run zoia:generate:patch:from-description:negative-controls
```

Human-description workflow negative-control evidence:

```text
tests\workflow\evidence\generated-patch-from-description-negative-controls\run-result.json
```

Export-boundary negative-control command:

```powershell
npm run zoia:generate:patch:export-boundary:negative-controls
```

Export-boundary negative-control evidence:

```text
tests\workflow\evidence\generated-patch-export-boundary-negative-controls\run-result.json
```

Generated candidate review command:

```powershell
npm run zoia:generate:patch:candidate-review
npm run zoia:generate:patch:candidate-review:negative-controls
```

Generated candidate review evidence:

```text
tests\workflow\evidence\generated-patch-candidate-review\run-result.json
tests\workflow\evidence\generated-patch-candidate-review-negative-controls\run-result.json
```

Negative selection guard evidence:

```text
tests\workflow\evidence\generated-patch-draft-guard-negative\run-result.json
```

Generated-patch readiness command:

```powershell
npm run zoia:generate:patch:readiness
```

Generated-patch readiness evidence:

```text
tests\workflow\evidence\generated-patch-readiness\run-result.json
```

Generated-patch readiness negative-control command:

```powershell
npm run zoia:generate:patch:readiness:negative-controls
```

Generated-patch readiness negative-control evidence:

```text
tests\workflow\evidence\generated-patch-readiness-negative-controls\run-result.json
```

v0.4 readiness negative-control command:

```powershell
npm run zoia:verify:v04:negative-controls
```

v0.4 readiness negative-control evidence:

```text
tests\workflow\evidence\v0.4-readiness-negative-controls\run-result.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness.json
tests\workflow\evidence\v0.4-readiness-negative-controls\blocked-v04-readiness-release-review.json
```

Release-review summary command:

```powershell
npm run zoia:release:review-summary
npm run zoia:release:review-summary:negative-controls
npm run zoia:release:review-summary:doc-evidence-negative-controls
npm run zoia:release:review-summary:quality-negative-controls
```

Release-review summary evidence:

```text
tests\workflow\evidence\release-review-summary\run-result.json
tests\workflow\evidence\release-review-freshness-negative-controls\run-result.json
tests\workflow\evidence\release-review-documented-evidence-negative-controls\run-result.json
tests\workflow\evidence\release-review-summary-quality-negative-controls\run-result.json
```

The v0.4 readiness command also requires this generated-patch readiness evidence:

```powershell
npm run zoia:verify:v04
```

## Claim Boundary

This checkpoint does not export a novel patch. It selects verified existing templates and records the evidence paths that make each candidate usable as a starting point.

The current claim is:

- A human description can produce ranked, verified template candidates.
- Measured-signal scoring bonuses cannot select candidates without lexical or modality matches.
- Each candidate includes prior import, render, simulator, and modality evidence.
- The command fails if no verified candidate is found.
- A generated intermediate graph and requirement trace can be accepted or rejected before export.
- The validator rejects missing modules, missing ports, invalid parameter ranges, missing audio routes for audio candidates, and unsatisfied requirement references.
- The validator rejects requirement traces that reference missing expected evidence paths.
- The validator rejects generated modules that occupy the same page/grid position.
- The validator rejects unsupported generated module types and missing required ports or params for supported generated module types.
- The validator rejects unsupported generated module semantics before export.
- The validator rejects unsupported generated module params before export.
- The validator rejects non-normalized generated module parameter values before export.
- The validator rejects out-of-range generated module parameter values before export.
- The validator rejects unsupported generated module ports before export.
- The validator rejects duplicate generated module port names before export.
- The validator rejects incompatible generated connection signal kinds before export.
- The validator rejects non-normalized generated connection gain values before export.
- The validator rejects out-of-range generated connection gain values before export.
- The validator rejects duplicate generated connection endpoint pairs before export.
- The validator rejects unsupported generated module self-routes before export.
- The validator rejects generated graphs with declared CV or control modalities but no connected CV or control route before export.
- The validator rejects generated graphs whose requirement traces do not cover every module and connection before export.
- The validator rejects blocked generated requirements before export.
- The validator rejects generated graphs whose requirement traces do not cover declared audio, CV, and control modalities before export.
- The validator rejects generated effect or synth graphs whose audio route bypasses the generated processor before export.
- The validator rejects unsupported generated audio feedback cycles before export.
- The validator rejects oversized generated pre-export graphs before export.
- The validator rejects unsupported generated trace verification methods before export.
- The validator rejects orphan generated audio processors before export.
- The validator rejects orphan generated modules before export.
- The validator rejects connected generated routes that omit their expected modality before export.
- The validator rejects generated effect or synth graphs that omit the audio modality before export.
- The validator rejects generated synth graphs that do not contain a concrete synth core before export.
- The validator rejects generated MIDI modality before a supported generated MIDI module contract exists.
- Selected measured candidates can produce intermediate graph and requirement-trace drafts.
- Drafts from selected measured candidates can pass the same pre-export validator.
- Malformed selection results that omit required candidate evidence are rejected before draft graph files are treated as generated candidates.
- The generated-patch selection, draft, validation, and negative guard path is included in generated-patch readiness and the v0.4 readiness gate.
- Each generated graph and trace draft must preserve the selected measured candidate pair ID, patch ID, and source evidence path.
- Multiple human descriptions must pass selection, draft generation, and pre-export validation before generated-patch readiness passes.
- Prompt smoke must record concrete core module resolution for the delay and reverb smoke prompts before generated-patch readiness passes.
- A one-command human-description workflow must pass selection, draft generation, and pre-export validation before generated-patch readiness passes.
- An unmatched human description must block the one-command workflow and leave zero draft files before generated-patch readiness passes.
- Unmatched-description negative-control evidence must stay isolated from canonical positive from-description evidence.
- Export-looking payload fields must be rejected before generated-patch readiness passes.
- Generated candidate review evidence must list draft source, source-to-graph family and module-role comparison, intent-to-graph modality comparison, graph, trace, validation status, and export-field count before generated-patch readiness passes.
- Generated candidate review evidence must report zero source-to-graph family mismatches and zero source-to-graph module-role mismatches before generated-patch readiness passes.
- Generated candidate review evidence must report zero intent-to-graph modality mismatches before generated-patch readiness passes.
- Generated candidate review evidence must report zero trace-to-graph coverage gaps before generated-patch readiness passes.
- Generated candidate review evidence records unresolved template-core abstractions before generated-patch readiness passes.
- Generated candidate review must fail when a draft source evidence path is missing, source-to-graph family evidence is mismatched, source-to-graph module-role evidence is mismatched, trace-to-graph coverage is incomplete, or graph modalities are unsupported by intent and matched selection evidence, and generated-patch readiness must block on that failed review. The module-role negative control must include a role-only case that keeps source-family support present.
- Generated-patch readiness must block when provenance, prompt-smoke, prompt-smoke concrete-core summary, or human-description workflow evidence is degraded or missing.
- Prompt-smoke evidence must run the same one-command human-description workflow used by `npm run zoia:generate:patch:from-description`.
- v0.4 readiness must block when generated-patch readiness evidence is degraded.
- v0.4 readiness must block when generated abstraction disclosure is missing from generated-patch readiness evidence.
- v0.4 readiness must block when release-review summary evidence is degraded.
- The release-review summary must list changed files by capability area, evidence paths, validation commands, claim boundaries, protected GitHub/source-control action boundary, upstream generated-patch evidence freshness, and v0.4 readiness negative-control freshness.
- Stale generated candidate-review evidence must block release-review summary and v0.4 readiness through isolated negative-control evidence.
- Stale generated validation evidence must block release-review summary and v0.4 readiness through isolated negative-control evidence.
- Documented generated evidence paths must exist before the release-review summary passes.
- Reviewer-summary quality failures must block release-review summary and v0.4 readiness through isolated negative-control evidence.
- Human-facing release-review summaries must not imply release readiness, broad text-to-ZOIA support, audible cutoff sweep success, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support, or complete patch semantics.
- Human-facing package-boundary summaries must not imply npm publication readiness, GitHub readiness, copied evidence bundle publication, release readiness, package artifact publication, or broader publication readiness.
- Release-review and v0.4 workflows must not invoke Git, GitHub, tag, release, or npm publication commands without exact human-only passcode evidence.

The current claim is not:

- Full novel patch synthesis.
- Exported binary patch generation.
- hardware-realizable module graphs while template-core abstractions remain unresolved.
- Audio-correctness proof for arbitrary descriptions.
- Release readiness, broad text-to-ZOIA support, audible cutoff sweep success, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support, or complete patch semantics.

## Full Generation Path

1. Add an intermediate patch graph representation with module, parameter, route, page, and layout constraints.
2. Translate verified community patches into the intermediate graph.
3. Build adapters from selected templates into modified candidate graphs.
4. Export generated candidates to the patch format.
5. Run import, render, simulator initialization, modality, and requirement-trace verification.
6. Present only candidates with passing verification evidence.

## Required Verification For Generated Patches

Generated patches must pass:

- patch graph schema validation
- parser import
- render test
- simulator initialization
- expected modality check
- requirement-to-module trace check
- route validity check
- parameter bounds check
- measured output check for audio-generating descriptions

Static proof is acceptable only when the human description intentionally requests a non-audio, MIDI, CV, control, empty, or structural patch.
