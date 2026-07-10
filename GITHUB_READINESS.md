# GitHub Readiness Boundary

Version: 1.1

Revision: 2

## Current Status

The repository is organized as a ZOIA product repository with test harnesses and evidence workflows as supporting assets.

## Source To Commit

- `products/zoia/`
- `shared/ssl/`
- `tests/parser-harness/`
- `tests/workflow/audio-fixtures/`
- `tests/workflow/canonical-patches/Test_Modules.manifest.json`
- `tests/workflow/playwright/`
- `tests/workflow/scripts/`
- `.github/workflows/`
- `package.json`
- `package-lock.json`
- `README.md`
- `LICENSE`

## Local Or Generated Data To Exclude

- `node_modules/`
- `tests/parser-harness/results/`
- `tests/workflow/evidence/`
- `tests/workflow/playwright/evidence/`
- `tests/workflow/logs/`
- `tests/workflow/patch-library-cache/`
- `tests/workflow/canonical-patches/Test_Modules/`
- `Reports/`
- local installer archives and ZIP/RAR/7Z files

## Required Clone Commands

```text
npm ci
npx playwright install chromium
npm run zoia:serve
npm run zoia:test:ci
```

## CI Gate

GitHub Actions runs:

```text
npm run zoia:test:ci
```

The workflow uploads local CI evidence from:

```text
tests/workflow/evidence/q109-ci-gate-integration
```

## License

The source is under Apache License 2.0.

## Claim Boundaries

- No binary export fidelity claim.
- No full audio correctness claim beyond deterministic analyser evidence.
- No public distribution rights claim for community patch binaries.
- No emulator completeness claim.
- Shared SSL package migration is proven for current package assets, but broader SSL source extraction remains future work.
