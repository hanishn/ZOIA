# ZOIA Playwright Evidence Tests

Version: 0.1.0
Revision: 1

This folder contains the first browser evidence test slice for the ZOIA emulator.

## Command

From `G:\Projects\MusicAndMidi\ZOIA`:

```powershell
npm run zoia:test:playwright
```

## Scope

Covered in Q-069:

- simulator load
- hardware view render
- schematic view render
- console capture
- DOM snapshots
- state snapshots
- screenshots
- deterministic machine-readable result JSON

Not covered in Q-069:

- audio simulation tests
- binary export fidelity tests
- shared SSL library extraction
- emulator completeness claims

## Evidence Output

The runner writes a stable evidence folder:

`G:\Projects\MusicAndMidi\ZOIA\TestWorkflow\playwright\evidence\q069-first-slice`

Each test gets its own subfolder containing:

- `screenshot.png`
- `dom.html`
- `state.json`
- `console.json`
- `result.json`

If a test fails, it also writes failure artifacts where possible:

- `failure-screenshot.png`
- `failure-dom.html`
- `failure-state.json`
- `failure-console.json`
- `failure-result.json`

The overall run summary is:

`G:\Projects\MusicAndMidi\ZOIA\TestWorkflow\playwright\evidence\q069-first-slice\run-result.json`
