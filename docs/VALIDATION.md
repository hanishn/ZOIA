# ZOIA Validation

Version: 0.2.0

Revision: 1

This document defines the validation gates for the ZOIA Emulator repository.

## Claim Boundary

The validation system proves only the behavior covered by deterministic tests and recorded machine-readable results.

It does not prove:

- complete ZOIA hardware emulation
- binary export fidelity
- full audio correctness
- redistribution rights for community patch binaries
- correctness for patch corpora that are not present during a given run

## Clone-Safe Gate

Run from a fresh clone:

```text
npm ci
npx playwright install chromium
npm test
```

`npm test` runs:

- HTML exhibit rebuild
- shared SSL package provenance checks
- parser no-magic-number lint
- Test Patches embedded selector browser assertion
- parser fixture gate
- staged audio gate when canonical staged patches are present
- optional community-audio packaging checks when the local evidence baseline is present

## Build Gate

Run:

```text
npm run zoia:build
```

The build reads:

```text
products/zoia/src/data/exhibit-manifest.json
products/zoia/src/index.template.html
products/zoia/src/styles/app.css
products/zoia/src/scripts/modules/
products/zoia/src/scripts/init.js
```

The build writes:

```text
products/zoia/dist/zoia-emulator.html
products/zoia/index.html
products/zoia/dist/build-manifest.json
```

## Staged Patch Gate

Run:

```text
npm run zoia:test:staged
```

The committed staged test patches are under:

```text
tests/workflow/canonical-patches/Test_Modules
```

The committed manifest is:

```text
tests/workflow/canonical-patches/Test_Modules.manifest.json
```

The generated HTML exhibit embeds these patches during `npm run zoia:build`. The `Test Patches` toolbar button works from direct file mode and from the repository server.

The focused browser assertion is:

```text
npm run zoia:test:playwright:test-patch-loader
```

Its evidence is written to:

```text
tests/workflow/evidence/q110-test-patch-loader
```

That assertion opens:

```text
products/zoia/dist/zoia-emulator.html
```

through a `file://` URL and verifies that 88 embedded test patch entries are available.

## Audio Gate

Run:

```text
npm run zoia:test:audio
```

This gate checks deterministic analyser evidence for staged/test patches. It does not prove full audio correctness. A patch can be classified instead of signal-present when it requires external input, MIDI, CV, unsupported routing, or intentionally silent behavior.

## Community Patch Gate

Community patch binaries are not committed.

The source references are:

```text
https://patchstorage.com/platform/zoia/
https://github.com/meanmedianmoge/zoia_lib
```

Prepare a local cache:

```text
npm run zoia:patch-library:prepare
```

Then run:

```text
npm run zoia:test:community
```

Generated local cache files are ignored under:

```text
tests/workflow/patch-library-cache/
```

## Push/Pull Staging Gate

Run:

```text
npm run zoia:stage:github
```

This creates:

```text
RepositoryValidation/push-candidate
RepositoryValidation/pull-candidate
```

The pull candidate runs validation from inside the simulated clone directory.

Results are written to:

```text
RepositoryValidation/repository-staging-result.json
RepositoryValidation/pull-candidate/repository-validation-result.json
```

## Required Review Evidence

Before a GitHub push, check:

- `git status --short`
- `npm run zoia:build`
- `npm test`
- `npm run zoia:stage:github`
- `RepositoryValidation/repository-staging-result.json`
- `RepositoryValidation/pull-candidate/repository-validation-result.json`

Do not treat generated evidence folders as source. Preserve accepted evidence baselines outside Git unless there is a specific approval to commit them.
