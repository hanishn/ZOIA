# ZOIA Active Test Workflow

Version: 1.0

Revision: 1

## Scope

This repository contains the active ZOIA parser, exhibit test workflow, shared SSL provenance package, and deterministic evidence runners.

It does not contain public release approval for community patch binaries, generated evidence archives, installer zips, or binary export fidelity claims.

## Primary Commands

```text
npm ci
npm run zoia:test:ci
```

## Publication Gate

```text
npm run zoia:test:publication
```

This runs local CI gates, prepares the patch-library cache, and runs the full community audio classification gate.

## Current Evidence Baselines

- Parser harness: 86 pass, 1 quarantined, 0 blocked.
- Staged audio: 88 fixtures, 63 signal-present, 25 classified, 0 failures.
- Community audio packaging baseline: 1884 fixtures, 1123 signal-present, 761 classified, 0 failures.
- Shared SSL package provenance: 2 migrated assets, 0 hash failures.

## Shared SSL Package

Local package:

```text
SharedSSL/zoia-shared-ssl
```

Current migrated candidates:

- `constants.js`
- `midi.js`

The active test workflow imports the package for provenance and rebaseline proof. The HTML exhibit runtime does not yet execute these migrated browser assets.

## Repository Boundaries

Commit source, scripts, manifests, workflows, and package metadata.

Do not commit generated evidence, parser result outputs, patch-library cache files, canonical patch binaries, installer zips, `node_modules`, or generated PDFs/HTML by default.

See:

```text
GITHUB_READINESS.md
```

## Claim Boundaries

Do not claim binary export fidelity.

Do not claim full audio correctness beyond deterministic analyser evidence.

Do not claim public distribution rights for community patches.

Do not claim the HTML exhibit runtime consumes shared SSL browser assets until that runtime path is implemented and gated.
