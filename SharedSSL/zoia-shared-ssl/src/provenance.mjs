export const SSL_SHARED_SOURCE_ROOT =
  "G:\\Projects\\MusicAndMidi\\SuperSynthLab\\RecoveredSource\\SSLS-from-exhibit-2026-06-07\\monorepo-skeleton\\shared\\assets";

export const ZOIA_SHARED_PACKAGE_ROOT =
  "G:\\Projects\\MusicAndMidi\\ZOIA\\SharedSSL\\zoia-shared-ssl";

export const SSL_SHARED_CANDIDATES = Object.freeze([
  Object.freeze({
    name: "constants.js",
    sourcePath:
      "G:\\Projects\\MusicAndMidi\\SuperSynthLab\\RecoveredSource\\SSLS-from-exhibit-2026-06-07\\monorepo-skeleton\\shared\\assets\\constants.js",
    packagePath:
      "G:\\Projects\\MusicAndMidi\\ZOIA\\SharedSSL\\zoia-shared-ssl\\browser-assets\\constants.js",
    sourceSha256: "15c32eef90002e293bb3d9d08cad105a8534817c7ecabab0cb02b866b6bac5a9",
    role: "shared SSL constants and browser-global SynthLab utility definitions",
    compatibility: "copied as browser-global source; not converted to exhibit runtime module in this slice",
  }),
  Object.freeze({
    name: "midi.js",
    sourcePath:
      "G:\\Projects\\MusicAndMidi\\SuperSynthLab\\RecoveredSource\\SSLS-from-exhibit-2026-06-07\\monorepo-skeleton\\shared\\assets\\midi.js",
    packagePath:
      "G:\\Projects\\MusicAndMidi\\ZOIA\\SharedSSL\\zoia-shared-ssl\\browser-assets\\midi.js",
    sourceSha256: "427bb14f023e744a2d6343b146c77f2cfb6e0b3256470a1843f86d292f5d779e",
    role: "shared SSL MIDI browser-global implementation",
    compatibility: "copied as browser-global source; ZOIA MIDI behavior remains locally implemented in the exhibit",
  }),
]);

export const SSL_SHARED_REBASELINE_POLICY = Object.freeze({
  firstSliceScope: "package-and-test-workflow-consumption",
  exhibitRuntimeConsumption: false,
  claim:
    "Active ZOIA test workflow consumes this local package for shared SSL provenance and rebaseline proof. The HTML exhibit does not yet execute migrated shared SSL browser assets.",
  nextSlice:
    "Convert one browser-global shared candidate into an exhibit-loadable module or build artifact with before/after Q104-Q106 gate evidence.",
});
