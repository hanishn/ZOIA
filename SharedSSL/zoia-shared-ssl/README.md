# ZOIA Shared SSL Local Package

Version: 0.1.0

Revision: 1

This package is the first project-owned shared SSL source target for the ZOIA project.

Current scope:

- Stores reviewed shared SSL browser-global source candidates with provenance.
- Exposes deterministic provenance metadata to active ZOIA test workflow scripts.
- Does not claim the HTML exhibit runtime executes these shared browser assets yet.

Current migrated candidates:

- `browser-assets/constants.js`
- `browser-assets/midi.js`

Verification command:

```text
npm --prefix SharedSSL/zoia-shared-ssl run verify
```
