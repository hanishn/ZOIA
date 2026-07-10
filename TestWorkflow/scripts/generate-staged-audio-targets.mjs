#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
const CANONICAL_MANIFEST_PATH = resolve(PROJECT_ROOT, "TestWorkflow", "canonical-patches", "Test_Modules.manifest.json");
const TARGET_MANIFEST_PATH = resolve(PROJECT_ROOT, "TestWorkflow", "audio-fixtures", "q104-staged-patch-audio-all-targets.json");
const JSON_SPACES = 2;

const TEST_TONE_CATEGORIES = new Set([
  "A_Reverbs",
  "B_Delays",
  "C_Modulation",
  "D_Drive",
  "E_Dynamics",
  "F_Spatial",
  "G_Looping",
  "I_Creative",
  "J_Pedalboards"
]);

const KEYBOARD_CATEGORIES = new Set([
  "H_Synths",
  "K_Drums",
  "L_Touch_Synths"
]);

function classifyTarget(category, pairId) {
  if (pairId === "audit_batch") {
    return {
      expectedStimulus: "none",
      expectedOutput: "classified",
      expectedClassification: "empty-audit-fixture",
      reason: "Root audit fixture with zero modules and zero connections."
    };
  }
  if (category === "_prototype" && pairId.includes("Spring_Reverb")) {
    return {
      expectedStimulus: "test-tone",
      expectedOutput: "signal",
      reason: "Prototype external-input reverb/effect chain."
    };
  }
  if (category === "_prototype" && pairId.includes("Mono_Synth")) {
    return {
      expectedStimulus: "keyboard-midi-cv",
      expectedOutput: "classified",
      expectedClassification: "patch-requires-external-input-midi-cv",
      reason: "Prototype synth patch requires keyboard, MIDI, or CV stimulus."
    };
  }
  if (TEST_TONE_CATEGORIES.has(category)) {
    return {
      expectedStimulus: "test-tone",
      expectedOutput: "signal",
      reason: "External-input effect-style staged patch expected to pass signal from Audio Input to Audio Output."
    };
  }
  if (KEYBOARD_CATEGORIES.has(category)) {
    return {
      expectedStimulus: "keyboard-midi-cv",
      expectedOutput: "classified",
      expectedClassification: "patch-requires-external-input-midi-cv",
      reason: "Synth, drum, or touch-synth patch requires keyboard, MIDI, CV, clock, touch, or sequenced stimulus beyond the test-tone slice."
    };
  }
  return {
    expectedStimulus: "unknown",
    expectedOutput: "classified",
    expectedClassification: "stimulus-policy-required",
    reason: "No staged audio stimulus policy assigned."
  };
}

const canonical = JSON.parse(await readFile(CANONICAL_MANIFEST_PATH, "utf8"));
const files = Array.isArray(canonical.files) ? canonical.files : [];
const targets = files
  .filter((file) => String(file.relativePath).toLowerCase().endsWith(".bin"))
  .map((file) => {
    const parts = String(file.relativePath).split(/[\\/]/);
    const pairId = parts[parts.length - 1].replace(/\.bin$/i, "");
    const category = parts.length > 1 ? parts.slice(0, -1).join("/") : "_root";
    return {
      pairId,
      category,
      ...classifyTarget(category, pairId)
    };
  })
  .sort((a, b) => `${a.category}/${a.pairId}`.localeCompare(`${b.category}/${b.pairId}`));

const manifest = {
  schemaVersion: "zoia.patch-audio-target-manifest.v1",
  version: "1.0",
  revision: 1,
  packet: "Q104 staged patch-level audio all-target classification",
  sourceManifest: CANONICAL_MANIFEST_PATH,
  canonicalRoot: canonical.canonicalRoot,
  sourceArchive: canonical.sourceArchive,
  criteria: {
    minMasterRmsForSignal: 0.0005,
    minMasterPeakForSignal: 0.005,
    minTestToneConnections: 1,
    sampleDurationMs: 2500,
    sampleIntervalMs: 50
  },
  targetCount: targets.length,
  targets
};

await writeFile(TARGET_MANIFEST_PATH, `${JSON.stringify(manifest, null, JSON_SPACES)}\n`, "utf8");
console.log(JSON.stringify({ targetManifestPath: TARGET_MANIFEST_PATH, targetCount: targets.length }, null, JSON_SPACES));
