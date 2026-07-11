# ZOIA Product Source

Version: 0.2.0

Revision: 3

This directory owns the ZOIA emulator product source and prebuilt HTML exhibit.

`0.2.0` is a source-review and validation baseline. It provides a buildable HTML exhibit, module-split browser source, and deterministic tests, but it is not a complete hardware emulator.

## Source

```text
products/zoia/src/index.template.html
products/zoia/src/styles/app.css
products/zoia/src/scripts/modules/
products/zoia/src/scripts/init.js
products/zoia/src/data/exhibit-manifest.json
```

## Prebuilt HTML Exhibit

```text
products/zoia/dist/zoia-emulator.html
```

## Compatibility Entry Point

```text
products/zoia/index.html
```

Run it through the repository server:

```text
npm run zoia:serve
```

Open:

```text
http://127.0.0.1:5173/products/zoia/dist/zoia-emulator.html
```

Use the `Test Patches` toolbar button to load embedded canonical test patches from the prebuilt HTML. This works from the direct file path:

```text
G:\Projects\MusicAndMidi\ZOIA\products\zoia\dist\zoia-emulator.html
```

The embedded patches are generated from:

```text
tests/workflow/canonical-patches/Test_Modules
```

## Build

```text
npm run zoia:build
```

The build command assembles the template, CSS, JS, and JSON-defined source manifest into the prebuilt output and compatibility entrypoint, then writes `products/zoia/dist/build-manifest.json`.

## Current Capability Boundary

Implemented for `0.2.0`:

- source-to-prebuilt HTML assembly
- module-split browser JavaScript source under `products/zoia/src/scripts/modules/`
- browser loading of the emulator exhibit
- toolbar loading for embedded canonical test patches
- patch import/render validation through Playwright
- staged/test patch validation
- deterministic evidence output for validation runs

Not claimed for `0.2.0`:

- complete ZOIA hardware emulation
- complete audio behavior accuracy
- binary export fidelity
- public distribution rights for community patches

## Refactor Boundary

The emulator runtime source is split into product-owned browser modules. The modules still share the `window.ZOIA` namespace to preserve current browser behavior and Playwright/audio evidence gates. A later refactor can move from namespace globals to imported ES modules after equivalent test coverage exists.
