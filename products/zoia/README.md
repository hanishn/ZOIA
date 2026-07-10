# ZOIA Product Source

Version: 0.1.0

Revision: 2

This directory owns the ZOIA emulator product source and prebuilt HTML exhibit.

`0.1.0` is a source-review and validation baseline. It provides a buildable HTML exhibit and deterministic tests, but it is not a complete hardware emulator.

## Source

```text
products/zoia/src/index.template.html
products/zoia/src/styles/app.css
products/zoia/src/scripts/app.js
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

## Build

```text
npm run zoia:build
```

The build command assembles the template, CSS, JS, and JSON-defined source manifest into the prebuilt output and compatibility entrypoint, then writes `products/zoia/dist/build-manifest.json`.

## Current Capability Boundary

Implemented for `0.1.0`:

- source-to-prebuilt HTML assembly
- browser loading of the emulator exhibit
- patch import/render validation through Playwright
- staged/test patch validation
- deterministic evidence output for validation runs

Not claimed for `0.1.0`:

- complete ZOIA hardware emulation
- complete audio behavior accuracy
- binary export fidelity
- public distribution rights for community patches
- modularized production JavaScript architecture

## Refactor Boundary

The emulator runtime still has a large JavaScript file. The next source cleanup should split `products/zoia/src/scripts/app.js` into smaller product-owned modules while preserving current Playwright and audio evidence gates.
