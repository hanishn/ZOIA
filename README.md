# ZOIA Emulator

Version: 0.1.0

Revision: 3

This repository contains the ZOIA Emulator `0.1.0` source tree, a prebuilt HTML exhibit, a local build script, committed staged test patches, and deterministic validation harnesses.

`0.1.0` is an evaluation baseline. It is not a complete ZOIA replacement and it does not claim binary export fidelity or full audio correctness.

## What This Version Does

- Provides a browsable source tree for the HTML emulator exhibit.
- Builds the prebuilt HTML exhibit from template, CSS, JavaScript, and JSON source files.
- Serves the prebuilt HTML exhibit locally.
- Loads and renders ZOIA patch data through the browser UI.
- Includes staged/test patches for repeatable validation.
- Runs clone-safe validation with `npm test`.
- Runs deeper local validation when optional private/generated inputs are present.
- Provides parser, Playwright, and audio-evidence harnesses used during development.

## What This Version Does Not Do

- Does not claim complete ZOIA hardware emulation.
- Does not claim binary export fidelity.
- Does not claim full audio correctness beyond deterministic analyser evidence already covered by tests.
- Does not include community patch binaries or patch-library cache files.
- Does not publish an npm package for external dependency use.
- Does not yet split the main emulator runtime into small JavaScript modules.
- Does not yet make the HTML runtime consume every migrated shared SSL browser asset.

## Repository Layout

```text
products/zoia/src/          Browsable source for the HTML exhibit
products/zoia/src/index.template.html
products/zoia/src/styles/app.css
products/zoia/src/scripts/app.js
products/zoia/src/scripts/init.js
products/zoia/src/data/exhibit-manifest.json
products/zoia/dist/         Prebuilt HTML exhibit output
products/zoia/index.html    Compatibility entrypoint generated from source
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
http://127.0.0.1:5173/products/zoia/dist/zoia-emulator.html
```

The prebuilt HTML exhibit is:

```text
products/zoia/dist/zoia-emulator.html
```

The source used to build it is:

```text
products/zoia/src/index.template.html
products/zoia/src/styles/app.css
products/zoia/src/scripts/app.js
products/zoia/src/scripts/init.js
products/zoia/src/data/exhibit-manifest.json
```

## Rebuild The HTML Exhibit

```text
npm run zoia:build
```

## Run The Core Test Gates

```text
npm test
```

This runs:

- HTML exhibit rebuild from the template, CSS, JS, and JSON source files under `products/zoia/src`
- shared SSL package provenance verification
- SSL rebaseline proof generation
- parser no-magic-number lint
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

Community patch binaries are not committed.

Community patch source references:

- PatchStorage ZOIA / Euroburo platform: `https://patchstorage.com/platform/zoia/`
- ZOIA Librarian project used for patch-library workflow context: `https://github.com/meanmedianmoge/zoia_lib`

To prepare the local patch-library cache, place `.ZoiaLibraryApp_2_8_2026.zip` at the repository root and run:

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

## Version Status

Current version: `0.1.0`

This version is suitable for source review, local emulator evaluation, rebuild validation, and test-harness review.

This version is not suitable as a public release claiming complete ZOIA compatibility.

## Private Fixture Inputs

Some deep gates require private or rights-sensitive patch inputs that are intentionally not committed:

- community patch-library cache files under `tests/workflow/patch-library-cache/`
- generated evidence baselines under `tests/workflow/evidence/`

`npm test` is the clone-safe gate. It verifies source wiring, package provenance, parser linting, and any local optional evidence inputs that are present.

The full private parser fixture gate is:

```text
npm run zoia:test:parser
```

That command requires the private staged fixture tree referenced by:

```text
tests/parser-harness/fixtures/manifests/zoia-fixture-manifest.json
```

## Committed Test Patches

The canonical staged test patch set is committed under:

```text
tests/workflow/canonical-patches/Test_Modules
```

The manifest is:

```text
tests/workflow/canonical-patches/Test_Modules.manifest.json
```

These fixtures are used by the staged audio and emulator validation workflows. They are separate from the community patch-library cache.

## Validate Push And Pull Staging

From the source repository:

```text
npm run zoia:stage:github
```

This creates:

```text
RepositoryValidation/push-candidate
RepositoryValidation/pull-candidate
```

Then it runs the pulled-repo validation from:

```text
RepositoryValidation/pull-candidate
```

A user can also run the pulled validation directly from a cloned repository:

```text
npm run zoia:validate:pulled
```

## Claim Boundaries

- No binary export fidelity claim.
- No full audio correctness claim beyond deterministic analyser evidence.
- No public distribution rights claim for community patch binaries.
- No emulator completeness claim.
- The HTML runtime does not yet execute all migrated shared SSL browser assets.

## License

Apache License 2.0. See `LICENSE`.
