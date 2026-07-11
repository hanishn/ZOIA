# GitHub Readiness Boundary

Version: 0.2.0

Revision: 4

## Current Status

The repository is organized as a ZOIA `0.2.0` product repository with test harnesses and evidence workflows as supporting assets.

`0.2.0` is ready for local source/build/test review after staging validation passes. It is not a complete emulator release.

## Source To Commit

- `products/zoia/`
- `shared/ssl/`
- `tests/parser-harness/`
- `tests/workflow/audio-fixtures/`
- `tests/workflow/canonical-patches/Test_Modules/`
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
- `Reports/`
- local installer archives and ZIP/RAR/7Z files

## Required Clone Commands

```text
npm ci
npx playwright install chromium
npm run zoia:build
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

## Version Scope

Included:

- buildable source tree under `products/zoia/src/`
- module-split browser source under `products/zoia/src/scripts/modules/`
- prebuilt HTML exhibit under `products/zoia/dist/`
- committed staged/test patches under `tests/workflow/canonical-patches/Test_Modules/`
- parser harness and Playwright validation harness
- repository push/pull staging validation scripts

Excluded:

- community patch binaries
- generated evidence folders
- local patch-library cache
- installer/archive files
- `node_modules`

## Claim Boundaries

- No binary export fidelity claim.
- No full audio correctness claim beyond deterministic analyser evidence.
- No public distribution rights claim for community patch binaries.
- No emulator completeness claim.
- Shared SSL package migration is proven for current package assets, but broader SSL source extraction remains future work.
