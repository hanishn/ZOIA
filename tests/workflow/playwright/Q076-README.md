# Q-076 ZOIA Interaction Evidence Slice

Version: 0.1.0
Revision: 1

Run from the repository root:

```powershell
npm run zoia:test:playwright:interactions
```

Evidence is written to:

```text
tests/workflow/evidence/q076-interaction-slice
```

Covered:

- module add/search/variant behavior
- grid context menu copy/paste/delete behavior
- drag-connect behavior
- before/after state JSON
- screenshots
- DOM snapshots
- console logs
- machine-readable pass/fail JSON

Not covered:

- audio simulation tests
- SSL shared-library extraction
- public sharing
- emulator completeness claims
