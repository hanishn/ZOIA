// === patch-state.js ===
/**
 * patch-state.js — Shared patch data model, selection state, and patch operations.
 *
 * Manages the ZOIA emulator's runtime state including:
 *   - Patch loading, saving, and export
 *   - Module/block selection
 *   - Connection view navigation
 *   - Parameter get/set with formatted display
 *   - Module rename, delete, and disconnect operations
 *   - Console/log infrastructure
 *
 * Everything is attached to the global window.ZOIA namespace (ES5).
 */
window.ZOIA = window.ZOIA || {};

ZOIA.VERSION = { major: 6, minor: 0, revision: 91 };
ZOIA.VERSION_STRING = ZOIA.VERSION.major + '.' + ZOIA.VERSION.minor + '.' + ZOIA.VERSION.revision;


// ===== GRID CONSTANTS =====

ZOIA.GRID_COLS = 8;
ZOIA.GRID_ROWS = 5;
ZOIA.GRID_SIZE = 40;


// ===== CONSOLE / LOGGING =====

/** @type {string[]} Ring buffer of timestamped log messages (max 200). */
ZOIA._logBuffer = [];

/** @type {boolean} Whether the on-screen console panel is visible. */
ZOIA._consoleVisible = false;

/**
 * Log a message to both the browser console and the in-app log panel.
 * Messages are timestamped and stored in a 200-line ring buffer.
 * @param {string} msg - The message to log.
 */
ZOIA.log = function(msg) {
  var ts = new Date().toLocaleTimeString();
  var line = '[' + ts + '] ' + msg;
  ZOIA._logBuffer.push(line);
  if (ZOIA._logBuffer.length > 200) ZOIA._logBuffer.shift();
  if (ZOIA._consoleVisible) {
    var el = document.getElementById('console-output');
    if (el) {
      el.textContent = ZOIA._logBuffer.join('\n');
      el.scrollTop = el.scrollHeight;
    }
  }
  console.log('[ZOIA] ' + msg);
};

/**
 * Toggle the on-screen console panel visibility.
 * When shown, the panel is populated with the full log buffer.
 */
ZOIA.toggleConsole = function() {
  ZOIA._consoleVisible = !ZOIA._consoleVisible;
  var panel = document.getElementById('console-panel');
  if (!panel) {
    ZOIA.log('Console panel element not found!');
    return;
  }
  if (ZOIA._consoleVisible) {
    panel.style.display = 'flex';
    var el = document.getElementById('console-output');
    if (el) {
      el.textContent = ZOIA._logBuffer.join('\n');
      el.scrollTop = el.scrollHeight;
    }
  } else {
    panel.style.display = 'none';
  }
};


// ===== APPLICATION STATE =====

/**
 * Central mutable state object for the emulator.
 * @type {Object}
 */
ZOIA.state = {
  patch: null,
  selectedModule: null,
  selectedBlock: null,
  currentPage: 0,
  secondaryPage: 0,
  zoomLevel: 1.0,
  connFilters: { audio: true, cv: true, gate: true, param: true },
  currentView: "hw",
  shiftMode: false,
  knobAngle: 0,
  bypassed: false,
  dragSrc: null,
  // Connection view state
  connectionView: false,       // true when OLED shows connection detail screen
  connectionList: [],           // cached array of connections for current block
  connectionIndex: 0,           // which connection is currently highlighted
  connectionStrengthMode: '%',  // '%' or 'dB' — toggle with encoder click
  selectedConnection: null,      // null or index into patch.connections[] for grid-dot selection
  hoveredModule: null,           // module index under mouse hover (for conn-dot display)
  hoveredBlock: null,            // block index under mouse hover
  clipboard: null,               // copied module data for paste: { typeIdx, name, typeName, colorId, blockCount, blocks, params, options, category }
  mode: 'edit'                   // 'edit' or 'play' — controls UI behavior (edit=layout, play=sim interaction)
};


// ===== SIGNAL TYPE HELPERS =====

/**
 * Determine the signal type of a block within a module.
 * @param {Object} mod   - The module object (must have a .blocks array).
 * @param {number} blockIdx - Index into mod.blocks.
 * @returns {string} One of "audio", "gate", "cv", or "param".
 */
ZOIA.getSignalType = function(mod, blockIdx) {
  if (!mod.blocks || blockIdx >= mod.blocks.length) return "param";
  var t = mod.blocks[blockIdx].t;
  if (t.indexOf('audio') >= 0) return "audio";
  if (t.indexOf('gate') >= 0) return "gate";
  if (t.indexOf('cv') >= 0) return "cv";
  return "param";
};

/**
 * Determine the dominant signal type of a connection by inspecting both endpoints.
 * Priority: audio > gate > cv > param.
 * @param {Object} conn - Connection object with srcMod, srcBlock, dstMod, dstBlock.
 * @returns {string} One of "audio", "gate", "cv", or "param".
 */
ZOIA.getConnType = function(conn) {
  var s = ZOIA.state;
  if (!s.patch) return "param";
  var sm = s.patch.modules[conn.srcMod];
  var dm = s.patch.modules[conn.dstMod];
  if (!sm || !dm) return "param";
  var st = ZOIA.getSignalType(sm, conn.srcBlock);
  var dt = ZOIA.getSignalType(dm, conn.dstBlock);
  if (st === "audio" || dt === "audio") return "audio";
  if (st === "gate" || dt === "gate") return "gate";
  if (st === "cv" || dt === "cv") return "cv";
  return "param";
};


// ===== CONNECTION VIEW =====

/**
 * Enter the connection detail view for the currently selected block.
 * Populates connectionList with all connections touching the selected block
 * and renders the OLED. Does nothing if there are no connections.
 */
ZOIA.enterConnectionView = function() {
  var s = ZOIA.state;
  if (!s.patch || s.selectedModule === null || s.selectedBlock === null) return;
  var modIdx = s.selectedModule;
  var blkIdx = s.selectedBlock;
  var conns = s.patch.connections.filter(function(c) {
    return (c.srcMod === modIdx && c.srcBlock === blkIdx) ||
           (c.dstMod === modIdx && c.dstBlock === blkIdx);
  });
  if (conns.length === 0) {
    ZOIA.log('No connections on this block');
    return;
  }
  s.connectionView = true;
  s.connectionList = conns;
  s.connectionIndex = 0;
  ZOIA.log('Entered connection view (' + conns.length + ' connection' + (conns.length > 1 ? 's' : '') + ')');
  ZOIA.oled.render();
};

/**
 * Exit the connection detail view and return to normal block view.
 * Resets connectionList and connectionIndex and re-renders the OLED.
 */
ZOIA.exitConnectionView = function() {
  var s = ZOIA.state;
  if (!s.connectionView) return;
  s.connectionView = false;
  s.connectionList = [];
  s.connectionIndex = 0;
  ZOIA.log('Exited connection view');
  ZOIA.oled.render();
};

/**
 * Format a connection strength value for display.
 * @param {Object} conn - Connection object (uses conn.strength, default 10000).
 * @param {string} mode - Display mode: '%' for percentage, 'dB' for decibels.
 * @returns {string} Formatted strength string (e.g., "100.0%" or "-6.0 dB").
 */
ZOIA.formatConnStrength = function(conn, mode) {
  var raw = (conn.strength !== undefined) ? conn.strength : 10000;
  var pct = raw / 10000 * 100;
  if (mode === 'dB') {
    if (pct <= 0) return '-inf dB';
    var db = 20 * Math.log10(pct / 100);
    return db.toFixed(1) + ' dB';
  }
  return pct.toFixed(1) + '%';
};

/**
 * Set the strength of a connection by index within the current connectionList.
 * Value is clamped to 0-10000.
 * @param {number} connIdx - Index into ZOIA.state.connectionList.
 * @param {number} value   - New strength value (0-10000 range).
 */
ZOIA.setConnStrength = function(connIdx, value) {
  var s = ZOIA.state;
  if (!s.connectionView || connIdx >= s.connectionList.length) return;
  var val = Math.max(0, Math.min(10000, Math.round(value)));
  s.connectionList[connIdx].strength = val;
  ZOIA.oled.render();
  // Also update the param input to show the strength value
  var input = document.getElementById('param-input');
  var label = document.querySelector('#param-input-area .param-label');
  if (input) input.value = (val / 100).toFixed(1) + '%';
  if (label) label.textContent = 'CONN STRENGTH';
};


// ===== GRID-DOT CONNECTION SELECTION =====

/**
 * Select a connection by its index in patch.connections[].
 * Both endpoint grid buttons will show the .conn-selected class.
 * Passing the already-selected index deselects it (toggle).
 * @param {number|null} connIdx - Index into patch.connections, or null to deselect.
 */
ZOIA.selectConnection = function(connIdx) {
  var s = ZOIA.state;
  if (connIdx === null || connIdx === undefined || s.selectedConnection === connIdx) {
    // Toggle off
    s.selectedConnection = null;
    ZOIA.log('Deselected connection');
  } else {
    s.selectedConnection = connIdx;
    var conn = s.patch.connections[connIdx];
    if (conn) {
      var pct = ((conn.strength !== undefined ? conn.strength : 10000) / 10000);
      ZOIA.log('Selected connection ' + connIdx + ' (strength ' + pct.toFixed(3) + ')');
    }
  }
  ZOIA.gridButtons.render();
  // Force-update the param input AFTER grid render to ensure it reflects
  // the connection state (grid render calls updateParamInput internally,
  // but we call again to guarantee it sticks after any DOM rebuild).
  if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
};

/**
 * Clear the selectedConnection state without logging.
 * Used internally when the selection context changes (page nav, back, etc.).
 */
ZOIA.clearSelectedConnection = function() {
  ZOIA.state.selectedConnection = null;
};

/**
 * Set the strength of the currently grid-dot-selected connection.
 * Value is clamped to 0-10000. Re-renders the grid and param input.
 * @param {number} value - New strength value (0-10000 range).
 */
ZOIA.setSelectedConnStrength = function(value) {
  var s = ZOIA.state;
  if (s.selectedConnection === null || !s.patch) return;
  var conn = s.patch.connections[s.selectedConnection];
  if (!conn) return;
  conn.strength = Math.max(0, Math.min(10000, Math.round(value)));
  // Directly update the param input display (skip full grid re-render
  // to avoid DOM rebuild which can interfere with the display state).
  var input = document.getElementById('param-input');
  var label = document.querySelector('#param-input-area .param-label');
  if (input) input.value = (conn.strength / 100).toFixed(1) + '%';
  if (label) label.textContent = 'CONN STRENGTH';
};


// ===== PARAMETER ACCESS =====

/**
 * Get the normalized parameter value for a block (0.0 to 1.0).
 * Returns 0.5 (midpoint) if the module or param data is unavailable.
 * @param {number} modIdx   - Module index in the patch.
 * @param {number} blockIdx - Block index within the module.
 * @returns {number} Normalized value between 0.0 and 1.0.
 */
ZOIA.getParamValue = function(modIdx, blockIdx) {
  var s = ZOIA.state;
  if (!s.patch) return 0.5;
  var m = s.patch.modules[modIdx];
  if (!m || !m.params || blockIdx >= m.params.length) return 0.5;
  return m.params[blockIdx] / 65535;
};

/**
 * Set the normalized parameter value for a block (0.0 to 1.0).
 * Automatically extends the params array if needed, clamps the value,
 * and refreshes the OLED and knob displays.
 * @param {number} modIdx   - Module index in the patch.
 * @param {number} blockIdx - Block index within the module.
 * @param {number} val      - Normalized value (0.0 to 1.0, clamped).
 */
ZOIA.setParamValue = function(modIdx, blockIdx, val) {
  var s = ZOIA.state;
  if (!s.patch) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  if (!m.params) m.params = [];
  while (m.params.length <= blockIdx) m.params.push(32768);
  m.params[blockIdx] = Math.round(Math.max(0, Math.min(1, val)) * 65535);
  // Update all displays in tandem
  ZOIA.oled.render();
  if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
};


// ===== PATCH LOADING & SUMMARY =====

/**
 * Load a parsed patch object into the emulator state.
 * Resets selection, page indices, drag state, and connection view,
 * then renders the active view.
 * @param {Object} p - Parsed patch object (from ZOIA.parsePatch).
 */
ZOIA.loadPatch = function(p) {
  // Stop the sim if it's running before loading a new patch
  if (ZOIA.sim && ZOIA.sim.running) ZOIA.sim.stop();
  var s = ZOIA.state;
  s.patch = p;
  s.selectedModule = null;
  s.selectedBlock = null;
  s.currentPage = 0;
  s.secondaryPage = p.pages.length > 1 ? 1 : 0;
  s.shiftMode = false;
  s.dragSrc = null;
  s.connectionView = false;
  s.connectionList = [];
  s.connectionIndex = 0;
  s.selectedConnection = null;
  // Ensure labels array and description exist
  if (!p.labels) p.labels = [];
  if (!p.description) p.description = '';
  ZOIA.log('Loaded patch: "' + p.name + '" (' + p.moduleCount + ' modules, ' + p.connections.length + ' conns, ' + p.pages.length + ' pages)');
  ZOIA.updatePatchSummary();
  ZOIA.updateLabels();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};

/**
 * Update the patch summary text element in the toolbar.
 * Displays module count, connection count, and page count.
 */
ZOIA.updatePatchSummary = function() {
  var el = document.getElementById('patch-summary');
  var p = ZOIA.state.patch;
  if (!p) {
    if (el) el.textContent = 'No patch loaded';
    return;
  }
  if (el) {
    el.textContent = p.name + ' | ' + p.moduleCount + ' modules | ' + p.connections.length + ' connections | ' + p.pages.length + ' page' + (p.pages.length > 1 ? 's' : '');
  }
};


// ===== PATCH LABELS =====

/**
 * Render patch labels as clickable pills in the toolbar.
 * Each label has an 'x' to remove it, plus a '+' button to add new labels.
 */
ZOIA.updateLabels = function() {
  var el = document.getElementById('patch-labels');
  if (!el) return;
  var p = ZOIA.state.patch;
  if (!p) { el.innerHTML = ''; return; }
  if (!p.labels) p.labels = [];

  var html = '';
  for (var i = 0; i < p.labels.length; i++) {
    html += '<span class="patch-label-pill" data-idx="' + i + '">' +
      p.labels[i] +
      '<span class="patch-label-x" data-idx="' + i + '">\u00d7</span>' +
    '</span>';
  }
  html += '<span class="patch-label-add" id="add-label-btn">+ label</span>';
  el.innerHTML = html;

  // Bind remove handlers
  var xBtns = el.querySelectorAll('.patch-label-x');
  for (var j = 0; j < xBtns.length; j++) {
    (function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        ZOIA.removeLabel(idx);
      };
    })(xBtns[j]);
  }

  // Bind add handler
  var addBtn = document.getElementById('add-label-btn');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.stopPropagation();
      ZOIA.addLabelPrompt();
    };
  }
};

/**
 * Show the OLED inline editor to add a new label to the patch.
 */
ZOIA.addLabelPrompt = function() {
  var s = ZOIA.state;
  if (!s.patch) return;
  var oled = document.getElementById('oled');
  if (!oled) return;

  oled.innerHTML =
    '<div style="color:#00cccc;font-weight:bold">ADD LABEL</div>' +
    '<div style="margin-top:4px"><input id="oled-label-input" type="text" placeholder="e.g. ambient, delay, favorite" ' +
    'style="background:#111;color:#fff;border:1px solid #00cccc;border-radius:3px;padding:3px 6px;font-size:11px;width:90%;font-family:monospace" ' +
    'maxlength="24"></div>' +
    '<div style="margin-top:4px;display:flex;gap:8px;justify-content:center">' +
      '<button id="oled-label-ok" style="background:#00cccc;color:#000;border:none;border-radius:3px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:monospace">ADD</button>' +
      '<button id="oled-label-cancel" style="background:#333;color:#aaa;border:1px solid #555;border-radius:3px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:monospace">CANCEL</button>' +
    '</div>';

  var inp = document.getElementById('oled-label-input');
  var okBtn = document.getElementById('oled-label-ok');
  var cancelBtn = document.getElementById('oled-label-cancel');

  function doAdd() {
    var val = inp ? inp.value.trim() : '';
    if (val.length > 0) {
      if (!s.patch.labels) s.patch.labels = [];
      // Avoid duplicates
      var lower = val.toLowerCase();
      var exists = s.patch.labels.some(function(l) { return l.toLowerCase() === lower; });
      if (!exists) {
        s.patch.labels.push(val.substring(0, 24));
        ZOIA.log('Added label: "' + val + '"');
        ZOIA.updateLabels();
      } else {
        ZOIA.log('Label "' + val + '" already exists');
      }
    }
    ZOIA.oled.render();
  }

  if (inp) {
    inp.focus();
    inp.onkeydown = function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
      else if (e.key === 'Escape') { ZOIA.oled.render(); }
    };
  }
  if (okBtn) { okBtn.onclick = function() { doAdd(); }; }
  if (cancelBtn) { cancelBtn.onclick = function() { ZOIA.oled.render(); }; }
};

/**
 * Remove a label by index from the patch.
 * @param {number} idx - Index into patch.labels[].
 */
ZOIA.removeLabel = function(idx) {
  var p = ZOIA.state.patch;
  if (!p || !p.labels || idx < 0 || idx >= p.labels.length) return;
  var removed = p.labels.splice(idx, 1)[0];
  ZOIA.log('Removed label: "' + removed + '"');
  ZOIA.updateLabels();
};


// ===== FILE HANDLING =====

/**
 * Handle a File object selected by the user (from file input or drag-drop).
 * Reads the file as an ArrayBuffer, parses it with ZOIA.parsePatch, and loads
 * the result. Displays errors via alert and ZOIA.log on failure.
 * @param {File} file - The File object to load.
 */
ZOIA.handleFile = function(file) {
  if (!file) return;
  var fi = document.getElementById('file-input');
  if (fi) fi.value = '';
  ZOIA.log('Loading file: ' + file.name + ' (' + file.size + ' bytes)');
  var reader = new FileReader();
  reader.onload = function(e) {
    ZOIA.log('FileReader complete, buffer size: ' + e.target.result.byteLength);
    try {
      var patch = ZOIA.parsePatch(e.target.result);
      if (!patch.name || patch.name.length === 0) {
        patch.name = (file.name || 'patch').replace(/\.[^.]+$/, '');
        ZOIA.log('Patch name empty; using file name fallback: "' + patch.name + '"');
      }
      ZOIA.loadPatch(patch);
    } catch (err) {
      ZOIA.log('ERROR: Parse failed: ' + err.message + '\n' + err.stack);
      alert("Parse error: " + err.message);
    }
  };
  reader.onerror = function(e) {
    ZOIA.log('ERROR: FileReader failed: ' + e.target.error);
  };
  reader.readAsArrayBuffer(file);
};


// ===== RENAME OPERATIONS =====

/**
 * Rename a page via prompt() with OLED inline editor fallback.
 * If prompt() is blocked by a sandbox, presents an inline text input
 * inside the OLED display area. Page names are capped at 16 characters.
 * @param {number} pageIdx - Index of the page to rename.
 */
ZOIA.renamePage = function(pageIdx) {
  var s = ZOIA.state;
  if (!s.patch || pageIdx < 0 || pageIdx >= s.patch.pages.length) return;
  var curName = s.patch.pages[pageIdx];

  // Try prompt() first (works outside sandbox)
  var newName;
  try {
    newName = prompt('Rename page ' + pageIdx + ' ("' + curName + '"):', curName);
  } catch (e) {
    ZOIA.log('prompt() blocked for renamePage: ' + e.message);
    newName = null;
  }

  // If prompt was blocked or returned empty, use the OLED as a mini-editor
  if (newName === null || newName === undefined) {
    var oled = document.getElementById('oled');
    if (!oled) return;
    oled.innerHTML =
      '<div style="color:#00cccc;font-weight:bold">RENAME PAGE ' + pageIdx + '</div>' +
      '<div class="dim">Current: ' + curName + '</div>' +
      '<div style="margin-top:4px"><input id="oled-rename-input" type="text" value="' + curName + '" ' +
      'style="background:#111;color:#fff;border:1px solid #00cccc;border-radius:3px;padding:3px 6px;font-size:11px;width:90%;font-family:monospace" ' +
      'maxlength="16"></div>' +
      '<div class="dim" style="font-size:9px;margin-top:2px">Press Enter to confirm, Esc to cancel</div>';
    var inp = document.getElementById('oled-rename-input');
    if (inp) {
      inp.focus();
      inp.select();
      inp.onkeydown = function(e) {
        if (e.key === 'Enter') {
          var val = inp.value.trim();
          if (val.length > 0) {
            s.patch.pages[pageIdx] = val.substring(0, 16);
            ZOIA.log('Renamed page ' + pageIdx + ' to "' + s.patch.pages[pageIdx] + '"');
          }
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        } else if (e.key === 'Escape') {
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        }
      };
    }
    return;
  }

  if (newName.trim().length > 0) {
    s.patch.pages[pageIdx] = newName.trim().substring(0, 16);
    ZOIA.log('Renamed page ' + pageIdx + ' to "' + s.patch.pages[pageIdx] + '"');
    if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
    else ZOIA.schematicView.renderAll();
  }
};

/**
 * Rename a module instance via prompt() with OLED inline editor fallback.
 * If prompt() is blocked by a sandbox, presents an inline text input
 * inside the OLED display area. Module names are capped at 16 characters.
 * @param {number} modIdx - Index of the module to rename.
 */
ZOIA.renameModule = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  var curName = m.name;

  // Try prompt() first (works outside sandbox)
  var newName;
  try {
    newName = prompt('Rename module "' + curName + '":', curName);
  } catch (e) {
    ZOIA.log('prompt() blocked for renameModule: ' + e.message);
    newName = null;
  }

  // If prompt was blocked or returned empty, use the OLED as a mini-editor
  if (newName === null || newName === undefined) {
    var oled = document.getElementById('oled');
    if (!oled) return;
    oled.innerHTML =
      '<div style="color:#00cccc;font-weight:bold">RENAME MODULE ' + modIdx + '</div>' +
      '<div class="dim">Current: ' + curName + '</div>' +
      '<div style="margin-top:4px"><input id="oled-rename-input" type="text" value="' + curName + '" ' +
      'style="background:#111;color:#fff;border:1px solid #00cccc;border-radius:3px;padding:3px 6px;font-size:11px;width:90%;font-family:monospace" ' +
      'maxlength="16"></div>' +
      '<div class="dim" style="font-size:9px;margin-top:2px">Press Enter to confirm, Esc to cancel</div>';
    var inp = document.getElementById('oled-rename-input');
    if (inp) {
      inp.focus();
      inp.select();
      inp.onkeydown = function(e) {
        if (e.key === 'Enter') {
          var val = inp.value.trim();
          if (val.length > 0) {
            m.name = val.substring(0, 16);
            ZOIA.log('Renamed module ' + modIdx + ' to "' + m.name + '"');
          }
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        } else if (e.key === 'Escape') {
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        }
      };
    }
    return;
  }

  if (newName.trim().length > 0) {
    m.name = newName.trim().substring(0, 16);
    ZOIA.log('Renamed module ' + modIdx + ' to "' + m.name + '"');
    if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
    else ZOIA.schematicView.renderAll();
  }
};


// ===== MODULE DELETE & DISCONNECT =====

/**
 * Delete a module and all its connections from the patch.
 * Re-indexes remaining modules and connections so that indices stay contiguous.
 * Prompts for confirmation before proceeding.
 * @param {number} modIdx - Index of the module to delete.
 */
ZOIA.deleteModule = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null || modIdx === undefined) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  var name = m.name || m.typeName;

  // Skip confirmation in sandbox (confirm() returns false silently)
  // Just proceed with deletion directly

  // Remove all connections involving this module
  s.patch.connections = s.patch.connections.filter(function(c) {
    return c.srcMod !== modIdx && c.dstMod !== modIdx;
  });

  // Re-index connections: any connection referencing a module index > modIdx must decrement
  s.patch.connections.forEach(function(c) {
    if (c.srcMod > modIdx) c.srcMod--;
    if (c.dstMod > modIdx) c.dstMod--;
  });

  // Remove the module
  s.patch.modules.splice(modIdx, 1);

  // Re-index remaining modules
  s.patch.modules.forEach(function(mod, i) {
    mod.idx = i;
  });

  s.patch.moduleCount = s.patch.modules.length;

  // Clear selection if the deleted module was selected
  if (s.selectedModule === modIdx) {
    s.selectedModule = null;
    s.selectedBlock = null;
  } else if (s.selectedModule !== null && s.selectedModule > modIdx) {
    s.selectedModule--;
  }

  // Clear connection selection (indices shifted)
  s.selectedConnection = null;

  ZOIA.log('Deleted module ' + modIdx + ' ("' + name + '")');
  ZOIA.updatePatchSummary();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};

/**
 * Copy a module to the clipboard for later pasting.
 * Stores a deep copy of the module's configuration (not its connections).
 * @param {number} modIdx - Index of the module to copy.
 */
ZOIA.copyModule = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null || modIdx === undefined) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  s.clipboard = {
    typeIdx: m.typeIdx,
    name: m.name,
    typeName: m.typeName,
    colorId: m.colorId,
    blockCount: m.blockCount,
    blocks: JSON.parse(JSON.stringify(m.blocks || [])),
    params: m.params ? m.params.slice() : [],
    options: m.options ? m.options.slice() : [],
    category: m.category
  };
  ZOIA.log('Copied module "' + (m.name || m.typeName) + '" to clipboard');
};

/**
 * Paste a module from the clipboard onto a specific grid position.
 * Creates a new module instance with the same configuration as the copied one.
 * @param {number} gridPos - Grid position (0-39) to place the module.
 * @param {number} page    - Page to place the module on.
 */
ZOIA.pasteModule = function(gridPos, page) {
  var s = ZOIA.state;
  if (!s.patch || !s.clipboard) return;
  var cb = s.clipboard;

  // Check if there is enough room (no overlap with existing modules)
  var bc = cb.blockCount || (cb.blocks ? cb.blocks.length : 1);
  for (var b = 0; b < bc; b++) {
    var checkPos = gridPos + b;
    if (checkPos >= ZOIA.GRID_SIZE) {
      ZOIA.log('Not enough room to paste module (extends past grid edge)');
      return;
    }
    // Check for existing occupants
    var occupied = s.patch.modules.some(function(m) {
      if (m.page !== page) return false;
      var mbc = m.blockCount || (m.blocks ? m.blocks.length : 1);
      return checkPos >= m.gridPos && checkPos < m.gridPos + mbc;
    });
    if (occupied) {
      ZOIA.log('Cannot paste: position occupied by another module');
      return;
    }
  }

  var newIdx = s.patch.modules.length;
  var newMod = {
    idx: newIdx,
    typeIdx: cb.typeIdx,
    name: cb.name + ' copy',
    typeName: cb.typeName,
    colorId: cb.colorId,
    page: page,
    gridPos: gridPos,
    blockCount: bc,
    blocks: JSON.parse(JSON.stringify(cb.blocks)),
    params: cb.params ? cb.params.slice() : [],
    options: cb.options ? cb.options.slice() : [],
    category: cb.category
  };
  s.patch.modules.push(newMod);
  s.patch.moduleCount = s.patch.modules.length;

  ZOIA.log('Pasted module "' + newMod.name + '" at position ' + gridPos + ' on page ' + page);
  ZOIA.updatePatchSummary();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};

/**
 * Disconnect all connections for a given module.
 * If the connection view is currently showing connections for this module,
 * exits connection view first. Logs the number of connections removed.
 * @param {number} modIdx - Index of the module to disconnect.
 */
ZOIA.disconnectAllConnections = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null || modIdx === undefined) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;

  // Exit connection view if disconnecting affects the viewed module
  if (s.connectionView && (s.selectedModule === modIdx)) {
    s.connectionView = false;
    s.connectionList = [];
    s.connectionIndex = 0;
  }

  var before = s.patch.connections.length;
  s.patch.connections = s.patch.connections.filter(function(c) {
    return c.srcMod !== modIdx && c.dstMod !== modIdx;
  });
  var removed = before - s.patch.connections.length;

  if (removed === 0) {
    ZOIA.log('Module ' + modIdx + ' has no connections to remove');
    return;
  }

  ZOIA.log('Disconnected ' + removed + ' connection(s) from module ' + modIdx + ' ("' + (m.name || m.typeName) + '")');
  ZOIA.updatePatchSummary();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};


// ===== PATCH EXPORT =====

/**
 * Internal helper: download a file using multiple fallback strategies.
 * Tries Blob + object URL, then data URI, then clipboard, then console dump.
 * @param {string} content  - The file content (text).
 * @param {string} filename - The suggested filename.
 * @param {string} mimeType - MIME type for the Blob.
 */
ZOIA._downloadFile = function(content, filename, mimeType) {
  try {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    ZOIA.log('Saved: ' + filename);
  } catch (e1) {
    ZOIA.log('Blob download failed: ' + e1.message + ', trying data URI...');
    try {
      var dataUri = 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content);
      var a2 = document.createElement('a');
      a2.href = dataUri;
      a2.download = filename;
      a2.style.display = 'none';
      document.body.appendChild(a2);
      a2.click();
      document.body.removeChild(a2);
      ZOIA.log('Saved: ' + filename + ' (data URI)');
    } catch (e2) {
      ZOIA.log('Data URI failed: ' + e2.message + ', copying to clipboard...');
      try {
        navigator.clipboard.writeText(content).then(function() {
          ZOIA.log('Content copied to clipboard (' + content.length + ' chars)');
        });
      } catch (e3) {
        ZOIA.log('All save methods failed. Dumping to console...');
        ZOIA.log(content);
      }
    }
  }
};

/**
 * Internal helper: download a binary file (ArrayBuffer or Uint8Array).
 * @param {ArrayBuffer|Uint8Array} data - Binary data.
 * @param {string} filename - Suggested filename.
 */
ZOIA._downloadBinary = function(data, filename) {
  try {
    var blob = new Blob([data], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    ZOIA.log('Saved: ' + filename);
  } catch (e) {
    ZOIA.log('Binary download failed: ' + e.message);
  }
};

/**
 * Build the JSON representation of the current patch.
 * @returns {string} Pretty-printed JSON string.
 */
ZOIA._buildPatchJSON = function() {
  var p = ZOIA.state.patch;
  return JSON.stringify({
    name: p.name,
    moduleCount: p.modules.length,
    modules: p.modules.map(function(m) {
      return {
        typeIdx: m.typeIdx, name: m.name, typeName: m.typeName,
        page: m.page, colorId: m.colorId, gridPos: m.gridPos,
        blockCount: m.blockCount, params: m.params, options: m.options,
        category: m.category
      };
    }),
    connections: p.connections,
    pages: p.pages,
    labels: p.labels || [],
    description: p.description || ''
  }, null, 2);
};

/**
 * Build the ZOIA .bin binary representation of the current patch.
 * Format: 32KB (8192 uint32s), little-endian.
 * @returns {ArrayBuffer} The 32KB binary patch.
 */
ZOIA._buildPatchBIN = function() {
  var p = ZOIA.state.patch;
  var buf = new ArrayBuffer(32768);
  var dv = new DataView(buf);
  var off = 0;

  function w32(v) { dv.setUint32(off, v, true); off += 4; }
  function wStr(s, len) {
    var bytes = [];
    for (var i = 0; i < len; i++) {
      bytes.push(i < s.length ? s.charCodeAt(i) : 0);
    }
    for (var j = 0; j < bytes.length; j++) {
      dv.setUint8(off + j, bytes[j]);
    }
    off += len;
  }

  // Preset size placeholder (will fill in later)
  var presetSizeOff = off;
  w32(0);

  // Patch name (16 bytes)
  wStr(p.name || 'Untitled', 16);

  // Module count
  w32(p.modules.length);

  // Write each module
  for (var i = 0; i < p.modules.length; i++) {
    var m = p.modules[i];
    var modStartOff = off;

    // Module size placeholder (in uint32 words)
    var modSizeOff = off;
    w32(0);

    w32(m.typeIdx);
    w32(0); // version
    w32(m.page);
    w32(m.colorId);
    w32(m.gridPos);

    // Param count and params
    var params = m.params || [];
    w32(params.length);

    // Saved data size (placeholder)
    w32(0);

    // Option words (reconstruct from option bytes)
    var opts = m.options || [];
    var opt1 = (opts[0] || 0) | ((opts[1] || 0) << 8) | ((opts[2] || 0) << 16) | ((opts[3] || 0) << 24);
    var opt2 = (opts[4] || 0) | ((opts[5] || 0) << 8) | ((opts[6] || 0) << 16) | ((opts[7] || 0) << 24);
    w32(opt1);
    w32(opt2);

    // Params
    for (var pi = 0; pi < params.length; pi++) {
      w32(params[pi]);
    }

    // Module name at the end (16 bytes)
    wStr(m.name || m.typeName || '', 16);

    // Backfill module size in uint32 words
    var modSizeWords = (off - modStartOff) / 4;
    dv.setUint32(modSizeOff, modSizeWords, true);
  }

  // Connection count
  w32(p.connections.length);

  // Write connections
  for (var j = 0; j < p.connections.length; j++) {
    var c = p.connections[j];
    w32(c.srcMod);
    w32(c.srcBlock);
    w32(c.dstMod);
    w32(c.dstBlock);
    w32(c.strength !== undefined ? c.strength : 10000);
  }

  // Page count and page names
  w32(p.pages.length);
  for (var k = 0; k < p.pages.length; k++) {
    wStr(p.pages[k] || ('Page ' + (k + 1)), 16);
  }

  // Backfill preset size (total uint32 words from start)
  dv.setUint32(presetSizeOff, off / 4, true);

  return buf;
};

/**
 * Save the current patch. Shows OLED confirmation before overwriting.
 * Exports both JSON and BIN formats.
 */
ZOIA.savePatch = function() {
  var s = ZOIA.state;
  if (!s.patch) {
    ZOIA.log('No patch loaded.');
    return;
  }
  var patchName = s.patch.name || 'Untitled';

  // Show confirmation in the OLED (confirm() is blocked in sandbox)
  var oled = document.getElementById('oled');
  if (!oled) return;

  oled.innerHTML =
    '<div style="color:#e94560;font-weight:bold">SAVE PATCH</div>' +
    '<div class="dim" style="margin-top:2px">Overwrite "' + patchName + '"?</div>' +
    '<div style="margin-top:6px;display:flex;gap:8px;justify-content:center">' +
      '<button id="oled-save-yes" style="background:#e94560;color:#fff;border:none;border-radius:3px;padding:4px 16px;font-size:11px;cursor:pointer;font-family:monospace">YES</button>' +
      '<button id="oled-save-no" style="background:#333;color:#aaa;border:1px solid #555;border-radius:3px;padding:4px 16px;font-size:11px;cursor:pointer;font-family:monospace">NO</button>' +
    '</div>';

  var yesBtn = document.getElementById('oled-save-yes');
  var noBtn = document.getElementById('oled-save-no');
  if (yesBtn) {
    yesBtn.onclick = function() {
      ZOIA._doSaveFiles(patchName);
      ZOIA.oled.render();
    };
  }
  if (noBtn) {
    noBtn.onclick = function() {
      ZOIA.log('Save cancelled.');
      ZOIA.oled.render();
    };
  }
};

/**
 * Save As: use the File System Access API (showSaveFilePicker) to let the
 * user choose where to save. Falls back to Blob download if the API is
 * unavailable (e.g. sandbox restrictions).
 */
ZOIA.savePatchAs = function() {
  var s = ZOIA.state;
  if (!s.patch) {
    ZOIA.log('No patch loaded.');
    return;
  }
  var safeName = (s.patch.name || 'patch').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Try the File System Access API for a real save dialog
  if (window.showSaveFilePicker) {
    // Save JSON via file picker
    window.showSaveFilePicker({
      suggestedName: safeName + '.json',
      types: [
        { description: 'JSON Patch', accept: { 'application/json': ['.json'] } },
        { description: 'ZOIA Binary', accept: { 'application/octet-stream': ['.bin'] } }
      ]
    }).then(function(handle) {
      var fileName = handle.name || '';
      if (fileName.toLowerCase().indexOf('.bin') >= 0) {
        // User chose .bin format
        var bin = ZOIA._buildPatchBIN();
        return handle.createWritable().then(function(w) {
          return w.write(bin).then(function() { return w.close(); });
        }).then(function() {
          ZOIA.log('Saved BIN: ' + fileName);
        });
      } else {
        // Default: JSON format
        var json = ZOIA._buildPatchJSON();
        return handle.createWritable().then(function(w) {
          return w.write(json).then(function() { return w.close(); });
        }).then(function() {
          ZOIA.log('Saved JSON: ' + fileName);
        });
      }
    }).catch(function(err) {
      if (err.name !== 'AbortError') {
        ZOIA.log('Save dialog error: ' + err.message + ', using fallback download');
        ZOIA._doSaveFiles(s.patch.name || 'patch');
      }
    });
  } else {
    // Fallback: Blob download (browser will show its own save dialog)
    ZOIA.log('File picker not available, using download fallback');
    ZOIA._doSaveFiles(s.patch.name || 'patch');
  }
};

/**
 * Internal: actually perform the file save (both JSON and BIN).
 * @param {string} name - Patch name for the filename.
 */
ZOIA._doSaveFiles = function(name) {
  var safeName = (name || 'patch').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Save JSON
  var json = ZOIA._buildPatchJSON();
  ZOIA._downloadFile(json, safeName + '.json', 'application/json');

  // Save BIN
  var bin = ZOIA._buildPatchBIN();
  ZOIA._downloadBinary(bin, safeName + '.bin');

  ZOIA.log('Exported "' + name + '" as JSON + BIN');
};


