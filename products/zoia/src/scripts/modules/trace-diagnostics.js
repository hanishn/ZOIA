// === trace-diagnostics.js ===
// Deterministic trace collection for parser/model/render/signal/audio diagnostics.
window.ZOIA = window.ZOIA || {};

(function() {
  var AUDIO_SOURCE_TYPES = { 14: 1, 38: 1, 102: 1, 106: 1, 107: 1 };
  var EXTERNAL_AUDIO_INPUT_TYPES = { 1: 1 };
  var AUDIO_OUTPUT_TYPES = { 2: 1 };

  function blockType(mod, blockIdx) {
    if (!mod || !mod.blocks || !mod.blocks[blockIdx]) return "missing";
    return mod.blocks[blockIdx].t || "unknown";
  }

  function isAudioOut(mod, blockIdx) {
    return blockType(mod, blockIdx) === "audio_out";
  }

  function isAudioIn(mod, blockIdx) {
    return blockType(mod, blockIdx) === "audio_in";
  }

  function patch() {
    return ZOIA.state && ZOIA.state.patch ? ZOIA.state.patch : null;
  }

  function visible(selector) {
    var el = document.querySelector(selector);
    if (!el) return false;
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function collectImportTrace() {
    var p = patch();
    return p && p.trace ? p.trace : {
      schemaVersion: "zoia.import-trace.v1",
      error: "no patch import trace present"
    };
  }

  function collectModelTrace() {
    var p = patch();
    var trace = {
      schemaVersion: "zoia.model-trace.v1",
      patchName: p ? p.name : null,
      moduleCount: p ? p.modules.length : 0,
      declaredModuleCount: p ? p.moduleCount : 0,
      connectionCount: p ? p.connections.length : 0,
      pageCount: p ? p.pages.length : 0,
      unknownModules: [],
      invalidModules: [],
      invalidConnections: [],
      unsupportedAudioPathModules: []
    };
    if (!p) return trace;
    for (var i = 0; i < p.modules.length; i++) {
      var mod = p.modules[i];
      if (mod.category === "Unknown" || /^Type /.test(mod.typeName || "")) {
        trace.unknownModules.push({
          idx: mod.idx,
          rawTypeIdx: mod.rawTypeIdx,
          typeIdx: mod.typeIdx,
          name: mod.name,
          page: mod.page,
          gridPos: mod.gridPos
        });
      }
      if (mod.page < 0 || mod.page >= p.pages.length || mod.gridPos < 0 || mod.gridPos >= ZOIA.GRID_SIZE) {
        trace.invalidModules.push({
          idx: mod.idx,
          typeIdx: mod.typeIdx,
          page: mod.page,
          gridPos: mod.gridPos
        });
      }
    }
    for (var c = 0; c < p.connections.length; c++) {
      var conn = p.connections[c];
      var src = p.modules[conn.srcMod];
      var dst = p.modules[conn.dstMod];
      var reasons = [];
      if (!src) reasons.push("missing-source-module");
      if (!dst) reasons.push("missing-destination-module");
      if (src && !src.blocks[conn.srcBlock]) reasons.push("missing-source-block");
      if (dst && !dst.blocks[conn.dstBlock]) reasons.push("missing-destination-block");
      if (reasons.length) {
        trace.invalidConnections.push({
          idx: c,
          srcMod: conn.srcMod,
          srcBlock: conn.srcBlock,
          dstMod: conn.dstMod,
          dstBlock: conn.dstBlock,
          reasons: reasons
        });
      }
    }
    return trace;
  }

  function collectRenderTrace() {
    var p = patch();
    return {
      schemaVersion: "zoia.render-trace.v1",
      patchName: p ? p.name : null,
      currentView: visible("#sch-view") ? "schematic" : visible("#hw-view") ? "hardware" : "unknown",
      hardware: {
        gridButtonCount: document.querySelectorAll("#btn-grid .grid-btn, #dual-grid-area .grid-btn").length,
        occupiedButtonCount: document.querySelectorAll("#btn-grid .grid-btn.occupied, #dual-grid-area .grid-btn.occupied").length,
        patchSummary: document.querySelector("#patch-summary")?.textContent?.trim() || null,
        oledText: document.querySelector("#oled")?.textContent?.replace(/\s+/g, " ").trim() || null
      },
      schematic: {
        cellCount: document.querySelectorAll("#sch-grid .cell, #sch-grid-left .cell, #sch-grid-right .cell").length,
        occupiedCellCount: document.querySelectorAll("#sch-grid .cell.occupied, #sch-grid-left .cell.occupied, #sch-grid-right .cell.occupied").length,
        visiblePathCount: document.querySelectorAll("#sch-svg-overlay path").length,
        moduleListItems: document.querySelectorAll("#sch-module-list .module-item, #sch-module-list .mod-item").length
      }
    };
  }

  function collectSignalFlowTrace() {
    var p = patch();
    var trace = {
      schemaVersion: "zoia.signal-flow-trace.v1",
      patchName: p ? p.name : null,
      audioSources: [],
      externalAudioInputs: [],
      audioOutputs: [],
      audioConnections: [],
      invalidAudioConnections: [],
      outputReachableFromInternalSource: false,
      outputReachableFromExternalInput: false,
      disconnectedAudioOutputs: [],
      rootCauses: []
    };
    if (!p) {
      trace.rootCauses.push("no-patch-loaded");
      return trace;
    }
    var adjacency = {};
    function addEdge(src, dst) {
      if (!adjacency[src]) adjacency[src] = [];
      adjacency[src].push(dst);
    }
    for (var i = 0; i < p.modules.length; i++) {
      var mod = p.modules[i];
      if (AUDIO_SOURCE_TYPES[mod.typeIdx]) trace.audioSources.push({ idx: i, typeIdx: mod.typeIdx, name: mod.name, typeName: mod.typeName });
      if (EXTERNAL_AUDIO_INPUT_TYPES[mod.typeIdx]) trace.externalAudioInputs.push({ idx: i, typeIdx: mod.typeIdx, name: mod.name, typeName: mod.typeName });
      if (AUDIO_OUTPUT_TYPES[mod.typeIdx]) trace.audioOutputs.push({ idx: i, typeIdx: mod.typeIdx, name: mod.name, typeName: mod.typeName });
    }
    for (var c = 0; c < p.connections.length; c++) {
      var conn = p.connections[c];
      var src = p.modules[conn.srcMod];
      var dst = p.modules[conn.dstMod];
      if (!src || !dst) continue;
      if (isAudioOut(src, conn.srcBlock) && isAudioIn(dst, conn.dstBlock)) {
        trace.audioConnections.push({
          idx: c,
          srcMod: conn.srcMod,
          srcTypeIdx: src.typeIdx,
          srcBlock: conn.srcBlock,
          dstMod: conn.dstMod,
          dstTypeIdx: dst.typeIdx,
          dstBlock: conn.dstBlock,
          strength: conn.strength
        });
        addEdge(conn.srcMod, conn.dstMod);
      } else if (blockType(src, conn.srcBlock).indexOf("audio") >= 0 || blockType(dst, conn.dstBlock).indexOf("audio") >= 0) {
        trace.invalidAudioConnections.push({
          idx: c,
          srcMod: conn.srcMod,
          srcBlock: conn.srcBlock,
          srcBlockType: blockType(src, conn.srcBlock),
          dstMod: conn.dstMod,
          dstBlock: conn.dstBlock,
          dstBlockType: blockType(dst, conn.dstBlock)
        });
      }
    }
    function reachesOutput(startIdx) {
      var queue = [startIdx];
      var seen = {};
      while (queue.length) {
        var current = queue.shift();
        if (seen[current]) continue;
        seen[current] = true;
        var mod = p.modules[current];
        if (mod && AUDIO_OUTPUT_TYPES[mod.typeIdx]) return true;
        var next = adjacency[current] || [];
        for (var n = 0; n < next.length; n++) queue.push(next[n]);
      }
      return false;
    }
    for (var s = 0; s < trace.audioSources.length; s++) {
      if (reachesOutput(trace.audioSources[s].idx)) trace.outputReachableFromInternalSource = true;
    }
    for (var e = 0; e < trace.externalAudioInputs.length; e++) {
      if (reachesOutput(trace.externalAudioInputs[e].idx)) trace.outputReachableFromExternalInput = true;
    }
    for (var o = 0; o < trace.audioOutputs.length; o++) {
      var out = trace.audioOutputs[o];
      var reached = trace.outputReachableFromInternalSource || trace.outputReachableFromExternalInput;
      if (!reached) trace.disconnectedAudioOutputs.push(out);
    }
    if (trace.audioSources.length === 0 && trace.externalAudioInputs.length === 0) trace.rootCauses.push("no-audio-source");
    if (trace.audioOutputs.length === 0) trace.rootCauses.push("no-audio-output");
    if (!trace.outputReachableFromInternalSource && trace.outputReachableFromExternalInput) trace.rootCauses.push("external-input-required");
    if (!trace.outputReachableFromInternalSource && !trace.outputReachableFromExternalInput && trace.audioOutputs.length > 0) trace.rootCauses.push("audio-output-unreachable");
    if (trace.invalidAudioConnections.length > 0) trace.rootCauses.push("invalid-audio-connection");
    if (trace.rootCauses.length === 0) trace.rootCauses.push("audio-path-reachable");
    return trace;
  }

  function collectAudioTrace() {
    var sim = ZOIA.sim || {};
    return {
      schemaVersion: "zoia.audio-trace.v1",
      running: !!sim.running,
      audioContextState: sim.ctx ? sim.ctx.state : "not-created",
      sampleRate: sim.ctx ? sim.ctx.sampleRate : null,
      nodeCount: sim.nodes ? sim.nodes.length : 0,
      connectionGainCount: sim.connGains ? sim.connGains.length : 0,
      analyserPresent: !!sim.analyser,
      testToneActive: !!sim.testToneActive,
      claimBoundary: "audio trace records engine state and reachability only; it does not prove full audio correctness"
    };
  }

  function collectAll() {
    var model = collectModelTrace();
    var signal = collectSignalFlowTrace();
    return {
      schemaVersion: "zoia.trace-bundle.v1",
      generatedAt: new Date().toISOString(),
      importTrace: collectImportTrace(),
      modelTrace: model,
      renderTrace: collectRenderTrace(),
      signalFlowTrace: signal,
      audioTrace: collectAudioTrace(),
      summary: {
        patchName: model.patchName,
        unknownModuleCount: model.unknownModules.length,
        invalidConnectionCount: model.invalidConnections.length,
        signalRootCauses: signal.rootCauses.slice(),
        traceStatus: "pass"
      }
    };
  }

  function updatePanel() {
    var el = document.getElementById("diagnostics-panel");
    if (!el) return;
    var trace = collectAll();
    el.textContent = [
      "Trace: " + (trace.summary.patchName || "no patch"),
      "Unknown modules: " + trace.summary.unknownModuleCount,
      "Invalid connections: " + trace.summary.invalidConnectionCount,
      "Signal: " + trace.summary.signalRootCauses.join(", ")
    ].join(" | ");
  }

  ZOIA.traceDiagnostics = {
    collectImportTrace: collectImportTrace,
    collectModelTrace: collectModelTrace,
    collectRenderTrace: collectRenderTrace,
    collectSignalFlowTrace: collectSignalFlowTrace,
    collectAudioTrace: collectAudioTrace,
    collectAll: collectAll,
    updatePanel: updatePanel
  };
}());
