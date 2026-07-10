# ZOIA Emulator

Version: 1.1

Revision: 2

This repository contains the ZOIA emulator source, a small shared SSL support package, and deterministic parser/browser/audio evidence tests.

## Repository Layout

```text
products/zoia/              Active ZOIA emulator product source
products/zoia/index.html    Browser entrypoint for the emulator
shared/ssl/                 Shared SSL package candidates used by ZOIA
tests/parser-harness/       Parser fixture harness, schemas, manifests, and no-magic-number linter
tests/workflow/             Playwright, audio, patch-library, CI, and evidence workflow scripts
.github/workflows/          GitHub Actions CI gates
```

## Requirements

- Node.js 22
- npm
- Playwright Chromium dependencies installed by `npx playwright install chromium`
- PowerShell for the patch-library cache preparation script

## Install

```text
npm ci
npx playwright install chromium
```

## Run The Emulator

```text
npm run zoia:serve
```

Open:

```text
http://127.0.0.1:5173/products/zoia/index.html
```

The active product entrypoint is also available at:

```text
products/zoia/index.html
```

## Run The Core Test Gates

```text
npm test
```

This runs:

- shared SSL package provenance verification
- SSL rebaseline proof generation
- parser harness and no-magic-number checks
- staged patch audio gate when canonical staged patches are present
- Q106 community-audio packaging verification when the local community evidence baseline is present

## Parser Harness

```text
npm run zoia:test:parser
```

The parser harness uses read-only fixture references from:

```text
tests/parser-harness/fixtures/manifests/zoia-fixture-manifest.json
```

Generated parser outputs are ignored under:

```text
tests/parser-harness/results/
```

## Patch Library Workflow

Community patch binaries are not committed. To prepare the local patch-library cache, place `.ZoiaLibraryApp_2_8_2026.zip` at the repository root and run:

```text
npm run zoia:patch-library:prepare
```

Generated cache files are ignored under:

```text
tests/workflow/patch-library-cache/
```

## Current Evidence Baselines

- Parser harness: 86 pass, 1 quarantined, 0 blocked.
- Staged audio: 88 fixtures, 63 signal-present, 25 classified, 0 failures.
- Community audio packaging baseline: 1884 fixtures, 1123 signal-present, 761 classified, 0 failures.
- Shared SSL package provenance: 2 migrated assets, 0 hash failures.

Generated evidence is ignored by Git and should be archived separately when it is used as a review baseline.

## Private Fixture Inputs

Some deep gates require private or rights-sensitive patch inputs that are intentionally not committed:

- canonical staged patch binaries under `tests/workflow/canonical-patches/Test_Modules/`
- community patch-library cache files under `tests/workflow/patch-library-cache/`
- generated evidence baselines under `tests/workflow/evidence/`

`npm test` is the clone-safe gate. It verifies source wiring, package provenance, parser linting, and any local optional evidence inputs that are present.

## Claim Boundaries

- No binary export fidelity claim.
- No full audio correctness claim beyond deterministic analyser evidence.
- No public distribution rights claim for community patch binaries.
- No emulator completeness claim.
- The HTML runtime does not yet execute all migrated shared SSL browser assets.

## License

Apache License 2.0. See `LICENSE`.
