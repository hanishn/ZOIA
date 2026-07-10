# ZOIA Product Source

Version: 1.0

Revision: 1

This directory owns the ZOIA emulator product entrypoint.

## Entry Point

```text
products/zoia/index.html
```

Run it through the repository server:

```text
npm run zoia:serve
```

Open:

```text
http://127.0.0.1:5173/products/zoia/index.html
```

## Current Source Shape

The emulator is still a single HTML exhibit-derived runtime. Product ownership has been moved here so future source cleanup can extract stable modules under this product tree without mixing product source with test workflow assets.

## Refactor Boundary

The next source cleanup should extract stable code from `index.html` into product-owned JavaScript and CSS files while preserving current Playwright and audio evidence gates.
