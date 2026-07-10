# Q-078 ZOIA Controls Evidence Slice

Version: 0.1.0
Revision: 1

Run from the repository root:

```powershell
npm run zoia:test:playwright:controls
```

Evidence is written to:

```text
tests/workflow/evidence/q078-controls-slice
```

Covered:

- parameter editing
- page navigation
- stomp switch and combo-stomp behavior
- MIDI keyboard interaction
- before/after state JSON
- screenshots
- DOM snapshots
- console logs
- machine-readable result JSON

Not covered:

- audio simulation tests
- SSL shared-library extraction
- public sharing
- emulator completeness claims
