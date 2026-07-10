# ZOIA Parser Fixture Harness

Version: 0.1.0
Revision: 1

This is the ZOIA-owned sibling-product parser/model fixture harness promoted under Q-064 from reviewed Q-022 through Q-033 artifacts.

## Scope

- Owns ZOIA parser/model fixture validation only.
- Does not implement UI behavior.
- Does not implement audio simulation.
- Does not claim binary export fidelity.
- Does not extract shared SSL libraries; that remains a separate approval.

## Fixture Policy

The staged `.bin` and `.json` fixture files are not copied into this harness. They remain read-only by manifest reference through `fixtures/manifests/zoia-fixture-manifest.json`.

The manifest points at:

`G:\Projects\MigrationProcess\ArchiveExtractionStaging\2026-07-06\zoia_emulator_v4.0\backup_2026-02-20_v4.0.54\Test_Modules`

## Quarantine Policy

`C_Modulation/C09_Ensemble_Chorus` remains quarantined as fixture-data divergence under `fixtures/quarantine/zoia-fixture-quarantine-q033.json`, with supporting evidence in `evidence/zoia-c09-ensemble-chorus-quarantine-evidence-q033.json`.

Parser policy must not silently normalize this divergence.

## Commands

```powershell
npm run zoia:lint:no-magic
npm run zoia:fixtures:all
```

Expected promoted full-category gate:

- fixtures: 87
- pass: 86
- quarantined: 1
- blocked: 0

## Promoted Artifact Layout

- `scripts/zoia-fixture-runner.mjs`
- `scripts/zoia-no-magic-number-lint.mjs`
- `schemas/zoia-normalized-patch.schema.json`
- `schemas/zoia-parser-diagnostics.schema.json`
- `fixtures/manifests/zoia-fixture-manifest.json`
- `fixtures/quarantine/zoia-fixture-quarantine-q033.json`
- `evidence/zoia-c09-ensemble-chorus-quarantine-evidence-q033.json`
- `results/`
