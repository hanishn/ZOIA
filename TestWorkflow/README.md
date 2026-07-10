# ZOIA Active Test Workflow

Version: 0.1.0
Revision: 1

This directory records the active ZOIA test workflow and feature evidence architecture.

## Current Active Commands

From `G:\Projects\MusicAndMidi\ZOIA`:

```powershell
npm run zoia:lint:no-magic
npm run zoia:fixtures:all
npm run zoia:test:parser
npm test
```

The current active implementation delegates parser/model validation to:

`G:\Projects\MusicAndMidi\ZOIA\ParserHarness\zoia-parser-fixture-harness`

## Evidence Principle

Every future feature test must produce deterministic artifacts that can be checked by a machine: JSON logs, structured assertions, screenshots, traces, audio fingerprints, exported file hashes, or normalized state snapshots.

Narrative-only pass/fail claims are not accepted evidence.
