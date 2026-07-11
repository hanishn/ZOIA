# Changelog

## 0.2.0

Source organization and validation baseline update.

Included:

- split the browser emulator runtime into module files under `products/zoia/src/scripts/modules/`
- updated the exhibit build manifest so the prebuilt HTML is assembled from the module list
- updated pulled-repository validation to verify manifest-declared source inputs
- added a `Test Patches` toolbar button for loading committed canonical test patches
- added a focused Playwright gate for the test-patch selector
- documented validation gates and claim boundaries for local review

Not included:

- complete ZOIA hardware emulation claim
- binary export fidelity claim
- full audio correctness claim
- community patch binary redistribution

## 0.1.0

Initial ZOIA Emulator evaluation baseline.

Included:

- browsable source tree for the HTML emulator exhibit
- build script for the prebuilt HTML exhibit
- prebuilt HTML exhibit output
- committed staged/test patches
- parser, Playwright, and staged audio validation harnesses
- push-candidate and pull-candidate staging validation workflow
- Apache License 2.0

Not included:

- community patch binaries
- public release claim
- full ZOIA hardware emulation claim
- binary export fidelity claim
- full audio correctness claim
