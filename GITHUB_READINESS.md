# ZOIA GitHub Readiness Boundary

Version: 1.0

Revision: 1

## Current State

The project has repeatable local gates for parser fixtures, shared SSL provenance, staged audio, and Q106 community-audio packaging consistency.

Q110 recorded that the project was not yet a Git repository. Q111 initializes the local repository and prepares the first source-boundary commit.

## Commit by Default

- `.github/workflows/zoia-ci.yml`
- `README.md`
- `GITHUB_READINESS.md`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `ParserHarness/`
- `SharedSSL/`
- `TestWorkflow/audio-fixtures/`
- `TestWorkflow/playwright/`
- `TestWorkflow/scripts/`
- `TestWorkflow/canonical-patches/Test_Modules.manifest.json`
- `ZOIA emulator/ZOIA_Patch_Simulator_v5_2_21_2026.html`

## Do Not Commit by Default

- `node_modules/`
- `ParserHarness/zoia-parser-fixture-harness/results/`
- `TestWorkflow/evidence/`
- `TestWorkflow/logs/`
- `TestWorkflow/patch-library-cache/`
- `TestWorkflow/canonical-patches/Test_Modules/`
- `Reports/`
- installer and archive files such as `.zip`

## Required Local Gates

```text
npm ci
npm run zoia:test:ci
```

## Publication Gate

Before public repository publication, run:

```text
npm run zoia:test:publication
```

Publication gate scope:

- local CI gates
- patch-library preparation
- full community audio classification

## Claim Boundaries

Do not claim binary export fidelity.

Do not claim full audio correctness beyond deterministic analyser evidence.

Do not publish community patch binaries, extracted patch-library cache files, or generated evidence unless rights and size policy are explicitly approved.

Do not claim the HTML exhibit runtime executes shared SSL package browser assets until a runtime-loadable shared candidate is implemented and gated.
