// === grid-buttons.js ===
/**
 * grid-buttons.js -- 40-Button Grid, LED Effects, Drag-to-Connect, Context Menus
 *
 * Renders the 5-row x 8-column grid of buttons that represents a single
 * ZOIA page. Each button can be empty (available for module placement) or
 * occupied by one block of a module. Occupied buttons show the module
 * instance name, block function name, signal type dot, parameter value,
 * and connection indicators.
 *
 * Supports:
 *   - Single-grid mode (one page at a time)
 *   - Dual-grid mode (left + right pages side-by-side)
 *   - Drag-to-connect between blocks with a floating indicator
 *   - Right-click context menus on occupied and empty buttons
 *   - Connection toast notifications
 *
 * Namespace: window.ZOIA.gridButtons, window.ZOIA.gridContextMenu
 */
window.ZOIA = window.ZOIA || {};

// ===== ACTION LABELS (TOP ROW OVERLAY) =====

/**
 * Shift-mode action labels displayed on the top row of grid buttons.
 * Mirrors the ZOIA hardware's shift-button labels.
 */
ZOIA.ACTION_LABELS = [
  ["MOVE", "COPY", "EDIT", "DEL", "STAR", "VIEW", "SAVE", "RAND"],
];

// ===== CONTEXT MENU =====

/**
 * Right-click context menu for occupied grid buttons.
 * Offers rename, select, disconnect-all, and delete operations.
 */
ZOIA.gridContextMenu = {

  /** Cached menu DOM element (created on first use) */
  _menu: null,

  /**
   * Lazily create the context menu element and append it to the pedal.
   * @returns {HTMLElement} The menu element.
   */
  _ensureMenu: function() {
    if (this._menu) return this._menu;
    var menu = document.createElement('div');
    menu.id = 'grid-context-menu';
    document.getElementById('pedal').appendChild(menu);
    this._menu = menu;
    return menu;
  },

  /**
   * Display the context menu for a given module, positioned near the
   * triggering button element.
   * @param {number}      modIdx - Index of the module in patch.modules.
   * @param {HTMLElement}  btnEl  - The grid button element that was right-clicked.
   */
  show: function(modIdx, btnEl) {
    var s = ZOIA.state;
    if (!s.patch) return;
    var m = s.patch.modules[modIdx];
    if (!m) return;

    // Dismiss the module-add popup if it is open
    ZOIA.moduleAdd.hide();

    var menu = this._ensureMenu();

    // Count connections involving this module (for the "Disconnect All" label)
    var connCount = 0;
    s.patch.connections.forEach(function(c) {
      if (c.srcMod === modIdx || c.dstMod === modIdx) connCount++;
    });

    // ----- Build menu HTML -----
    var html = '';
    html += '<div class="ctx-header">' + (m.name || m.typeName) + '</div>';
    html += '<div class="ctx-item" data-action="rename"><span class="ctx-icon">Aa</span>Rename</div>';
    html += '<div class="ctx-item" data-action="select"><span class="ctx-icon">&#9654;</span>Select</div>';
    html += '<div class="ctx-item" data-action="copy"><span class="ctx-icon">&#9112;</span>Copy Module</div>';
    if (connCount > 0) {
      html += '<div class="ctx-sep"></div>';
      html += '<div class="ctx-item" data-action="disconnect"><span class="ctx-icon">&#10005;</span>Disconnect All (' + connCount + ')</div>';
    }
    html += '<div class="ctx-sep"></div>';
    html += '<div class="ctx-item danger" data-action="delete"><span class="ctx-icon">&#9746;</span>Delete Module</div>';
    menu.innerHTML = html;

    // ----- Position the menu near the button -----
    var rect = btnEl.getBoundingClientRect();
    var pedalRect = document.getElementById('pedal').getBoundingClientRect();
    var left = rect.left - pedalRect.left + rect.width + 2;
    var top = rect.top - pedalRect.top;

    // Clamp to keep menu within the pedal bounds
    if (left + 170 > pedalRect.width) left = rect.left - pedalRect.left - 170;
    if (top + 140 > pedalRect.height) top = pedalRect.height - 150;
    if (top < 0) top = 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    menu.classList.add('visible');

    // ----- Bind click handlers for each menu item -----
    var items = menu.querySelectorAll('.ctx-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        item.onclick = function(e) {
          e.stopPropagation();
          var action = item.getAttribute('data-action');
          ZOIA.gridContextMenu.hide();
          if (action === 'rename') {
            ZOIA.renameModule(modIdx);
          } else if (action === 'select') {
            ZOIA.hardwareView.selectModule(modIdx, 0);
          } else if (action === 'copy') {
            ZOIA.copyModule(modIdx);
          } else if (action === 'disconnect') {
            ZOIA.disconnectAllConnections(modIdx);
          } else if (action === 'delete') {
            ZOIA.deleteModule(modIdx);
          }
        };
      })(items[i]);
    }
  },

  /** Hide the context menu. */
  hide: function() {
    if (this._menu) this._menu.classList.remove('visible');
  }
};

// ===== INTERACTION MODE HELPER =====

/**
 * Determine how a grid button should behave when pressed/clicked.
 * Returns 'toggle', 'momentary', or 'none'.
 *
 * @param {number} modIdx   - Module index.
 * @param {number} blockIdx - Block index within the module.
 * @returns {string} 'toggle', 'momentary', or 'none'.
 */
function _getInteractionMode(modIdx, blockIdx) {
  ZOIA.log('[DIAG] _getInteractionMode: mod=' + modIdx + ' blk=' + blockIdx + ' mode=' + ZOIA.state.mode);
  var patch = ZOIA.state.patch;
  if (!patch || ZOIA.state.mode !== 'play' || !ZOIA.sim) {
    ZOIA.log('[DIAG] _getInteractionMode -> none (no patch/not play/no sim)');
    return 'none';
  }
  var mod = patch.modules[modIdx];
  if (!mod) {
    ZOIA.log('[DIAG] _getInteractionMode -> none (mod not found)');
    return 'none';
  }
  var node = ZOIA.sim.nodes[modIdx];

  // Looper blocks: Record/Play=toggle, Stop=momentary
  if (mod.typeIdx === 62) {
    if (!node) {
      ZOIA.log('[DIAG] _getInteractionMode -> none (looper node null)');
      return 'none';
    }
    if (blockIdx === node.recordIdx || blockIdx === node.playIdx) {
      ZOIA.log('[DIAG] _getInteractionMode -> toggle (looper rec/play, blockIdx=' + blockIdx + ' recIdx=' + node.recordIdx + ' playIdx=' + node.playIdx + ')');
      return 'toggle';
    }
    if (blockIdx === node.stopIdx) {
      ZOIA.log('[DIAG] _getInteractionMode -> momentary (looper stop, blockIdx=' + blockIdx + ' stopIdx=' + node.stopIdx + ')');
      return 'momentary';
    }
    ZOIA.log('[DIAG] _getInteractionMode -> none (looper block not rec/play/stop, blockIdx=' + blockIdx + ')');
    return 'none';
  }

  // Stompswitches: check what they connect to
  if (mod.typeIdx === 44 && node) {
    var conns = patch.connections;
    for (var ci = 0; ci < conns.length; ci++) {
      var conn = conns[ci];
      if (conn.srcMod === modIdx) {
        var dstMod = patch.modules[conn.dstMod];
        if (dstMod && dstMod.typeIdx === 62) {
          var dstNode = ZOIA.sim.nodes[conn.dstMod];
          if (dstNode) {
            if (conn.dstBlock === dstNode.recordIdx) {
              ZOIA.log('[DIAG] _getInteractionMode -> toggle (stomp->looper rec)');
              return 'toggle';
            }
            if (conn.dstBlock === dstNode.playIdx) {
              ZOIA.log('[DIAG] _getInteractionMode -> toggle (stomp->looper play)');
              return 'toggle';
            }
            if (conn.dstBlock === dstNode.stopIdx) {
              ZOIA.log('[DIAG] _getInteractionMode -> momentary (stomp->looper stop)');
              return 'momentary';
            }
          }
        }
      }
    }
    ZOIA.log('[DIAG] _getInteractionMode -> toggle (stomp default)');
    return 'toggle'; // default stompswitch behavior
  }

  // Existing momentary types (Pushbutton=15, UI Button=56, Tap Tempo=100)
  if (mod.typeIdx === 15 || mod.typeIdx === 56 || mod.typeIdx === 100) {
    ZOIA.log('[DIAG] _getInteractionMode -> momentary (type=' + mod.typeIdx + ')');
    return 'momentary';
  }

  ZOIA.log('[DIAG] _getInteractionMode -> none (default, type=' + mod.typeIdx + ')');
  return 'none';
}

// ===== GRID BUTTONS =====

ZOIA.gridButtons = {

  // ===== POSITION MAP BUILDER =====

  /**
   * Build a position map for a given page. Maps grid positions (0..39) to
   * the module/block occupying that slot, or leaves the key absent for
   * empty slots.
   *
   * @param {Object} patch - The current patch data.
   * @param {number} page  - The page index to map.
   * @returns {Object} posMap keyed by grid position.
   */
  buildPosMap: function(patch, page) {
    var posMap = {};
    if (!patch) return posMap;
    patch.modules.forEach(function(m) {
      if (m.page !== page) return;
      var blockCount = m.blockCount || (m.blocks ? m.blocks.length : 1);
      for (var b = 0; b < blockCount; b++) {
        var pos = m.gridPos + b;
        if (pos >= ZOIA.GRID_SIZE) break;
        var blockDef = (m.blocks && m.blocks[b])
          ? m.blocks[b]
          : { n: "Block " + b, t: "unknown" };
        posMap[pos] = {
          module: m,
          blockIndex: b,
          blockDef: blockDef,
          isFirst: b === 0,
          isLast: b === blockCount - 1,
          blockCount: blockCount
        };
      }
    });
    return posMap;
  },

  // ===== CONNECTION POSITION LOOKUP =====

  /**
   * Return a map of grid positions that are connected to a specific block,
   * keyed by position with signal type as the value.
   *
   * @param {Object} patch    - The current patch data.
   * @param {number} modIdx   - Module index.
   * @param {number} blockIdx - Block index within the module.
   * @returns {Object} Map of { gridPos: signalType }.
   */
  getConnectedPositions: function(patch, modIdx, blockIdx) {
    var connected = {};
    if (!patch) return connected;
    patch.connections.forEach(function(c) {
      // Skip connections referencing blocks beyond visible block count
      var sm = patch.modules[c.srcMod];
      var dm = patch.modules[c.dstMod];
      if (!sm || !dm) return;
      var smBc = sm.blockCount || (sm.blocks ? sm.blocks.length : 1);
      var dmBc = dm.blockCount || (dm.blocks ? dm.blocks.length : 1);
      if (c.srcBlock >= smBc || c.dstBlock >= dmBc) return;
      if (c.srcMod === modIdx && c.srcBlock === blockIdx) {
        connected[dm.gridPos + c.dstBlock] = ZOIA.getConnType(c);
      }
      if (c.dstMod === modIdx && c.dstBlock === blockIdx) {
        connected[sm.gridPos + c.srcBlock] = ZOIA.getConnType(c);
      }
    });
    return connected;
  },

  // ===== BLOCK CONNECTION MAP =====

  /**
   * Return a map of grid positions that have ANY connection, keyed by
   * position. Each value is an object { type, connIdx } where connIdx is
   * the index of the first connection found for that block in
   * patch.connections[].
   *
   * @param {Object} patch - The current patch data.
   * @param {number} page  - The page index to inspect.
   * @returns {Object} Map of { gridPos: { type: string, connIdx: number } }.
   */
  getBlockConnectionMap: function(patch, page) {
    var map = {};
    if (!patch) return map;
    patch.connections.forEach(function(c, ci) {
      var sm = patch.modules[c.srcMod];
      var dm = patch.modules[c.dstMod];
      if (!sm || !dm) return;
      // Skip connections referencing blocks beyond visible block count
      var smBc = sm.blockCount || (sm.blocks ? sm.blocks.length : 1);
      var dmBc = dm.blockCount || (dm.blocks ? dm.blocks.length : 1);
      if (c.srcBlock >= smBc || c.dstBlock >= dmBc) return;
      var connType = ZOIA.getConnType(c);
      if (sm.page === page) {
        var sPos = sm.gridPos + c.srcBlock;
        if (!map[sPos]) map[sPos] = { type: connType, connIdx: ci };
      }
      if (dm.page === page) {
        var dPos = dm.gridPos + c.dstBlock;
        if (!map[dPos]) map[dPos] = { type: connType, connIdx: ci };
      }
    });
    return map;
  },

  /**
   * Return a set of grid positions that are endpoints of the currently
   * selected connection (ZOIA.state.selectedConnection). Used to apply
   * the .conn-selected pulse class.
   *
   * @param {Object} patch - The current patch data.
   * @returns {Object} Map of { gridPos: true } for the two endpoints.
   */
  getSelectedConnEndpoints: function(patch) {
    var endpoints = {};
    var s = ZOIA.state;
    if (s.selectedConnection === null || !patch) return endpoints;
    var conn = patch.connections[s.selectedConnection];
    if (!conn) return endpoints;
    var sm = patch.modules[conn.srcMod];
    var dm = patch.modules[conn.dstMod];
    if (sm) endpoints[sm.gridPos + conn.srcBlock] = true;
    if (dm) endpoints[dm.gridPos + conn.dstBlock] = true;
    return endpoints;
  },

  // ===== GRID RENDERING =====

  /**
   * Render a full grid of buttons into the given container for the
   * specified page. This is the core rendering method and handles both
   * occupied and empty button states, drag-to-connect visuals, context
   * menus, and click handlers.
   *
   * @param {HTMLElement} container - The grid container element.
   * @param {number}      page      - The page index to render.
   * @param {boolean}     isPrimary - True if this is the primary (interactive) grid.
   */
  _renderGrid: function(container, page, isPrimary) {
    container.innerHTML = '';
    var s = ZOIA.state;

    // Toggle shift-mode CSS class
    if (s.shiftMode) container.classList.add('shift-mode');
    else container.classList.remove('shift-mode');

    // Build lookup maps for this page
    var posMap = this.buildPosMap(s.patch, page);
    var connPositions = {};
    if (s.selectedModule !== null && s.selectedBlock !== null && s.patch) {
      connPositions = this.getConnectedPositions(s.patch, s.selectedModule, s.selectedBlock);
    }
    // Also build conn positions for the hovered block (if different from selected)
    var hoverConnPositions = {};
    if (s.hoveredModule !== null && s.hoveredBlock !== null && s.patch) {
      if (s.hoveredModule !== s.selectedModule || s.hoveredBlock !== s.selectedBlock) {
        hoverConnPositions = this.getConnectedPositions(s.patch, s.hoveredModule, s.hoveredBlock);
      }
    }
    // Map of all blocks that have any connection (for conn-dot display)
    var blockConnMap = s.patch ? this.getBlockConnectionMap(s.patch, page) : {};
    // Endpoints of the currently selected connection (for .conn-selected pulse)
    var selConnEndpoints = s.patch ? this.getSelectedConnEndpoints(s.patch) : {};
    // Cross-module I/O highlight: when an Audio Input/Output (or MIDI) module block
    // is selected or hovered, highlight all other device I/O module blocks on this page
    var IO_TYPE_IDS = [1, 2]; // Audio Input, Audio Output
    var ioHighlight = {};
    function _buildIOHighlight(activeModIdx) {
      if (activeModIdx === null || !s.patch) return;
      var activeMod = s.patch.modules[activeModIdx];
      if (!activeMod) return;
      // Check by typeIdx OR by typeName/name containing "Audio Input"/"Audio Output"
      var tn = (activeMod.typeName || '').toLowerCase();
      var mn = (activeMod.name || '').toLowerCase();
      var isDeviceIO = IO_TYPE_IDS.indexOf(activeMod.typeIdx) >= 0 ||
                       tn.indexOf('audio input') >= 0 || tn.indexOf('audio output') >= 0 ||
                       mn.indexOf('audio in') >= 0 || mn.indexOf('audio out') >= 0 ||
                       tn.indexOf('midi') >= 0;
      if (!isDeviceIO) return;
      s.patch.modules.forEach(function(m) {
        if (m.page !== page) return;
        if (m.idx === activeModIdx) return;
        var mtn = (m.typeName || '').toLowerCase();
        var mmn = (m.name || '').toLowerCase();
        var mIsIO = IO_TYPE_IDS.indexOf(m.typeIdx) >= 0 ||
                    mtn.indexOf('audio input') >= 0 || mtn.indexOf('audio output') >= 0 ||
                    mmn.indexOf('audio in') >= 0 || mmn.indexOf('audio out') >= 0 ||
                    mtn.indexOf('midi') >= 0;
        if (mIsIO) {
          var bc = m.blockCount || (m.blocks ? m.blocks.length : 1);
          for (var b = 0; b < bc; b++) {
            ioHighlight[m.gridPos + b] = true;
          }
        }
      });
    }
    _buildIOHighlight(s.selectedModule);
    _buildIOHighlight(s.hoveredModule);

    for (var r = 0; r < ZOIA.GRID_ROWS; r++) {
      for (var c = 0; c < ZOIA.GRID_COLS; c++) {
        var pos = r * ZOIA.GRID_COLS + c;
        var btn = document.createElement('div');
        btn.className = 'grid-btn';
        btn.dataset.pos = pos;
        var entry = posMap[pos];

        // ---- Shift-mode action label (top row only) ----
        if (r === 0 && ZOIA.ACTION_LABELS[0] && ZOIA.ACTION_LABELS[0][c]) {
          var al = document.createElement('span');
          al.className = 'action-label';
          al.textContent = ZOIA.ACTION_LABELS[0][c];
          btn.appendChild(al);
        }

        if (entry) {
          // ============================================
          // OCCUPIED BUTTON SETUP
          // ============================================
          var mod = entry.module;
          var col = ZOIA.COLORS[mod.colorId] || '#666';

          btn.classList.add('occupied');
          btn.dataset.modIdx = mod.idx;  // For sim signal level visualization
          btn.style.background = col + '30';
          btn.style.borderColor = col;
          btn.style.boxShadow = '0 0 8px 2px ' + col + '40';

          // Highlight if this module is currently selected
          if (s.selectedModule === mod.idx) btn.classList.add('selected');

          // ---- Connection indicator dot ----
          // Show conn-dot when THIS BUTTON is selected/hovered and has connections,
          // or when connected to the selected/hovered block, or when part of selected connection,
          // or when highlighted as related I/O (device audio in/out pairing)
          var connMapEntry = blockConnMap[pos];
          var connType = connPositions[pos]; // connected to selected block
          var hoverConnType = hoverConnPositions[pos]; // connected to hovered block
          var isThisButtonSelected = s.selectedModule === mod.idx && s.selectedBlock === entry.blockIndex;
          var isThisButtonHovered = s.hoveredModule === mod.idx && s.hoveredBlock === entry.blockIndex;
          var isIOHighlighted = ioHighlight[pos];
          if ((connType || hoverConnType || selConnEndpoints[pos]) || (connMapEntry && (isThisButtonSelected || isThisButtonHovered)) || isIOHighlighted) {
            btn.classList.add('connected');
            var connDot = document.createElement('span');
            connDot.className = 'conn-dot';
            if (isIOHighlighted && !connType && !selConnEndpoints[pos]) {
              connDot.classList.add('io-highlight');
            }
            var dotType = connType || hoverConnType || (connMapEntry ? connMapEntry.type : 'audio');
            var connColor = ZOIA.CONN_STYLES[dotType] ? ZOIA.CONN_STYLES[dotType].color : '#fff';
            connDot.style.background = connColor;
            connDot.style.color = connColor;
            // Brighter pulse if this position is an endpoint of the selected connection
            if (selConnEndpoints[pos]) {
              connDot.classList.add('conn-selected');
            }
            // Click handler: select this block's first connection
            (function(gridPos, mapEntry, dotEl) {
              dotEl.addEventListener('click', function(e) {
                e.stopPropagation();
                ZOIA.moduleAdd.hide();
                ZOIA.gridContextMenu.hide();
                if (mapEntry) {
                  ZOIA.selectConnection(mapEntry.connIdx);
                }
              });
            })(pos, connMapEntry, connDot);
            btn.appendChild(connDot);
          }

          // ---- Drag-to-connect visual states ----
          if (s.dragSrc) {
            if (s.dragSrc.modIdx === mod.idx && s.dragSrc.blockIdx === entry.blockIndex) {
              // This button is the drag source
              btn.classList.add('drag-src');
            } else if (s.dragSrc.modIdx === mod.idx) {
              // Same module -- cannot connect to self; dim it
              btn.classList.add('drag-dim');
            }
          }

          // ---- Instance name label (double-click to rename) ----
          var instLabel = document.createElement('span');
          instLabel.className = 'ginst';
          instLabel.textContent = mod.name || mod.typeName;
          instLabel.title = 'Double-click to rename';
          (function(modIdx) {
            instLabel.addEventListener('dblclick', function(e) {
              e.stopPropagation();
              ZOIA.renameModule(modIdx);
            });
          })(mod.idx);
          btn.appendChild(instLabel);

          // ---- Block function name label ----
          var blkLabel = document.createElement('span');
          blkLabel.className = 'gblock';
          blkLabel.textContent = entry.blockDef.n;
          btn.appendChild(blkLabel);

          // ---- Signal type dot (audio/gate/cv/unknown) ----
          var dot = document.createElement('span');
          dot.className = 'signal-dot';
          var st = entry.blockDef.t || 'unknown';
          if (st.indexOf('audio') >= 0) dot.style.background = ZOIA.CONN_STYLES.audio.color;
          else if (st.indexOf('gate') >= 0) dot.style.background = ZOIA.CONN_STYLES.gate.color;
          else if (st.indexOf('cv') >= 0) dot.style.background = ZOIA.CONN_STYLES.cv.color;
          else dot.style.background = '#666';
          btn.appendChild(dot);

          // ---- Parameter value (only for cv_in blocks which are adjustable params) ----
          // audio_in, audio_out, gate_in, gate_out, cv_out are signal pass-throughs.
          // Only cv_in blocks (Frequency, Resonance, Level, Gain, etc.) have meaningful params.
          var bType = (entry.blockDef.t || '').toLowerCase();
          var isAdjustable = bType === 'cv_in';
          if (isAdjustable) {
            var paramVal = ZOIA.getParamValue(mod.idx, entry.blockIndex);
            var paramNum = document.createElement('span');
            paramNum.className = 'gparam-val';
            paramNum.textContent = ZOIA.formatParam(entry.blockDef.n, paramVal);
            btn.appendChild(paramNum);
          }

          // ---- Position label (row.col) ----
          var posLabel = document.createElement('span');
          posLabel.className = 'gpos';
          posLabel.textContent = r + '.' + c;
          btn.appendChild(posLabel);

          // ---- Looper recording/playing indicator ----
          if (ZOIA.state.mode === 'play' && ZOIA.sim && ZOIA.sim.nodes[mod.idx]) {
            var simNode = ZOIA.sim.nodes[mod.idx];
            if (simNode.type === 'looper') {
              if (simNode._recording && entry.blockIndex === simNode.recordIdx) {
                var recDot = document.createElement('span');
                recDot.className = 'rec-indicator';
                btn.appendChild(recDot);
                btn.classList.add('btn-recording');
              }
              if (simNode._playing && entry.blockIndex === simNode.playIdx) {
                var playDot = document.createElement('span');
                playDot.className = 'play-indicator';
                btn.appendChild(playDot);
                btn.classList.add('btn-playing');
              }
            }
          }

          // ---- Play mode interaction indicators ----
          if (ZOIA.state.mode === 'play') {
            var btnMode = _getInteractionMode(mod.idx, entry.blockIndex);
            if (btnMode === 'toggle') {
              btn.classList.add('btn-interactive', 'btn-toggle');
              // Check if this toggle is currently ON
              var simNode2 = ZOIA.sim ? ZOIA.sim.nodes[mod.idx] : null;
              if (simNode2) {
                var isOn = false;
                if (simNode2.type === 'looper') {
                  if (entry.blockIndex === simNode2.recordIdx && simNode2._recording) {
                    isOn = true;
                  } else if (entry.blockIndex === simNode2.playIdx && simNode2._playing) {
                    isOn = true;
                  }
                } else if (simNode2.type === 'stompswitch' || simNode2.type === 'pushbutton' || simNode2.type === 'ui_button') {
                  // Stompswitches and buttons: check if their output is currently high
                  if (simNode2._state !== undefined) {
                    isOn = !!simNode2._state;
                  }
                }
                if (isOn) {
                  btn.classList.add('btn-toggled-on');
                }
              }
            } else if (btnMode === 'momentary') {
              btn.classList.add('btn-interactive', 'btn-momentary');
            } else {
              btn.classList.add('btn-inactive');
            }
          }

          // ---- Tooltip with full module/block info ----
          var tipVal = isAdjustable ? ZOIA.formatParam(entry.blockDef.n, ZOIA.getParamValue(mod.idx, entry.blockIndex)) : '(n/a)';
          var tipParts = [
            mod.name + ' (' + mod.typeName + ')',
            'Block: ' + entry.blockDef.n + ' [' + (entry.blockDef.t || 'unknown') + ']',
            'Value: ' + tipVal,
            'Position: R' + r + ' C' + c + ' Page ' + page
          ];

          // List connections to/from this block
          var tipConns = [];
          if (ZOIA.state.patch && ZOIA.state.patch.connections) {
            var allConns = ZOIA.state.patch.connections;
            for (var ci = 0; ci < allConns.length; ci++) {
              var cc = allConns[ci];
              if (cc.srcMod === mod.idx && cc.srcBlock === entry.blockIndex) {
                var dMod = ZOIA.state.patch.modules[cc.dstMod];
                var dBlkName = (dMod && dMod.blocks && dMod.blocks[cc.dstBlock]) ? dMod.blocks[cc.dstBlock].n : 'block ' + cc.dstBlock;
                tipConns.push('-> ' + (dMod ? (dMod.name || dMod.typeName) : '?') + ':' + dBlkName);
              } else if (cc.dstMod === mod.idx && cc.dstBlock === entry.blockIndex) {
                var sMod = ZOIA.state.patch.modules[cc.srcMod];
                var sBlkName = (sMod && sMod.blocks && sMod.blocks[cc.srcBlock]) ? sMod.blocks[cc.srcBlock].n : 'block ' + cc.srcBlock;
                tipConns.push('<- ' + (sMod ? (sMod.name || sMod.typeName) : '?') + ':' + sBlkName);
              }
            }
          }
          if (tipConns.length > 0) {
            tipParts.push('--- Connections ---');
            for (var ti = 0; ti < tipConns.length; ti++) {
              tipParts.push(tipConns[ti]);
            }
          } else {
            tipParts.push('No connections');
          }

          if (ZOIA.state.mode === 'play') {
            var tipMode = _getInteractionMode(mod.idx, entry.blockIndex);
            if (tipMode === 'toggle') {
              tipParts.push('Click to toggle');
            } else if (tipMode === 'momentary') {
              tipParts.push('Hold to activate');
            } else {
              tipParts.push('Not interactive in Play mode');
            }
          } else {
            tipParts.push('Click to select, hold to drag-connect');
          }
          btn.title = tipParts.join('\n');

          // ---- Click handler: select this module/block + sim interaction ----
          (function(modIdx, blkIdx, typeIdx) {
            btn.onclick = function(e) {
              e.stopPropagation();
              ZOIA.log('[DIAG] onclick mod=' + modIdx + ' blk=' + blkIdx + ' type=' + typeIdx + ' mode=' + ZOIA.state.mode);
              ZOIA.moduleAdd.hide();
              ZOIA.gridContextMenu.hide();
              ZOIA.clearSelectedConnection();
              // Interactive button handling when sim is running
              if (ZOIA.state.mode === 'play') {
                var iMode = _getInteractionMode(modIdx, blkIdx);
                ZOIA.log('[DIAG] onclick iMode=' + iMode);
                if (iMode === 'toggle') {
                  var simNode = ZOIA.sim.nodes[modIdx];
                  if (simNode) {
                    if (simNode.pressBlock) {
                      ZOIA.log('[DIAG] onclick calling pressBlock(' + blkIdx + ')');
                      simNode.pressBlock(blkIdx);
                    } else if (simNode.toggle) {
                      ZOIA.log('[DIAG] onclick calling toggle()');
                      simNode.toggle();
                    }
                  }
                }
              }
              if (ZOIA.state.mode === 'edit') {
                ZOIA.hardwareView.selectModule(modIdx, blkIdx);
              }
            };
          })(mod.idx, entry.blockIndex, mod.typeIdx);

          // ---- Right-click: show context menu ----
          (function(modIdx, btnEl) {
            btnEl.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              e.stopPropagation();
              if (ZOIA.state.mode === 'play') {
                // no-op: layout editing disabled during playback
              } else {
                ZOIA.gridContextMenu.show(modIdx, btnEl);
              }
            });
          })(mod.idx, btn);

          // ============================================
          // DRAG-TO-CONNECT HANDLERS + SIM PRESS/RELEASE + HOVER
          // ============================================
          // mousedown: momentary sim press OR starts 200ms drag timer.
          // mouseup: momentary sim release OR completes drag connection.
          // mouseenter/mouseleave: hover feedback for drag AND conn-dots.
          (function(modIdx, blkIdx, btnEl, blockName, modName) {

            btnEl.addEventListener('mousedown', function(e) {
              if (e.button !== 0) return;
              if (e.target.classList && e.target.classList.contains('conn-dot')) return;

              // Momentary press when sim is running
              var pressMode = _getInteractionMode(modIdx, blkIdx);
              ZOIA.log('[DIAG] mousedown mod=' + modIdx + ' blk=' + blkIdx + ' pressMode=' + pressMode);
              if (pressMode === 'momentary') {
                var simNode = ZOIA.sim.nodes[modIdx];
                if (simNode) {
                  if (simNode.pressBlock) {
                    simNode.pressBlock(blkIdx);
                    btnEl._isPressing = true;
                    btnEl._pressBlockIdx = blkIdx;
                  } else if (simNode.press) {
                    simNode.press();
                    btnEl._isPressing = true;
                  }
                }
                return; // skip drag timer for momentary buttons
              }

              if (ZOIA.state.mode === 'edit') {
                btnEl._dragTimer = setTimeout(function() {
                  ZOIA.state.dragSrc = { modIdx: modIdx, blockIdx: blkIdx };
                  ZOIA.gridButtons.render();
                  ZOIA.gridButtons._showDragIndicator(modName, blockName, e.clientX, e.clientY);
                }, 200);
              }
            });

            btnEl.addEventListener('mouseup', function() {
              ZOIA.log('[DIAG] mouseup mod=' + modIdx + ' blk=' + blkIdx + ' isPressing=' + !!btnEl._isPressing);
              // Momentary release when sim is running
              if (btnEl._isPressing) {
                var simNode = ZOIA.sim.nodes[modIdx];
                if (simNode) {
                  if (simNode.releaseBlock && btnEl._pressBlockIdx != null) {
                    simNode.releaseBlock(btnEl._pressBlockIdx);
                  } else if (simNode.release) {
                    simNode.release();
                  }
                }
                btnEl._isPressing = false;
                btnEl._pressBlockIdx = null;
                return;
              }

              if (btnEl._dragTimer) { clearTimeout(btnEl._dragTimer); btnEl._dragTimer = null; }
              var ds = ZOIA.state.dragSrc;
              if (ds) {
                if (ds.modIdx !== modIdx || ds.blockIdx !== blkIdx) {
                  ZOIA.gridButtons._makeConnection(ds.modIdx, ds.blockIdx, modIdx, blkIdx);
                }
                ZOIA.state.dragSrc = null;
                ZOIA.gridButtons._hideDragIndicator();
                ZOIA.gridButtons.render();
              }
            });

            // Highlight as potential drop target during drag + show conn-dots on hover
            btnEl.addEventListener('mouseenter', function() {
              var ds = ZOIA.state.dragSrc;
              if (ds && (ds.modIdx !== modIdx || ds.blockIdx !== blkIdx)) {
                btnEl.classList.add('drag-target');
              }
              // Set hover state and re-render to show conn-dots (edit mode only)
              if (ZOIA.state.hoveredModule !== modIdx || ZOIA.state.hoveredBlock !== blkIdx) {
                ZOIA.state.hoveredModule = modIdx;
                ZOIA.state.hoveredBlock = blkIdx;
                if (!ds && ZOIA.state.mode === 'edit') ZOIA.gridButtons.render();
              }
            });

            btnEl.addEventListener('mouseleave', function(e) {
              btnEl.classList.remove('drag-target');
              // Clear hover state (only if not caused by DOM rebuild during render)
              if (ZOIA.state.hoveredModule === modIdx && ZOIA.state.hoveredBlock === blkIdx) {
                // Check if the mouse moved to a real target (not removed DOM)
                if (e.relatedTarget && e.relatedTarget.nodeType === 1) {
                  ZOIA.state.hoveredModule = null;
                  ZOIA.state.hoveredBlock = null;
                  if (!ZOIA.state.dragSrc && ZOIA.state.mode === 'edit') ZOIA.gridButtons.render();
                } else {
                  // DOM was likely rebuilt — just clear state without re-rendering
                  ZOIA.state.hoveredModule = null;
                  ZOIA.state.hoveredBlock = null;
                }
              }
            });
          })(mod.idx, entry.blockIndex, btn, entry.blockDef.n, mod.name || mod.typeName);

        } else {
          // ============================================
          // EMPTY BUTTON SETUP
          // ============================================

          // Dim empty buttons while a drag is in progress
          if (s.dragSrc) btn.classList.add('drag-dim');

          btn.title = 'Empty slot R' + r + ' C' + c + '\nClick or right-click to add module';

          // Position label for empty slots
          var emptyPos = document.createElement('span');
          emptyPos.className = 'gempty-pos';
          emptyPos.textContent = r + '.' + c;
          btn.appendChild(emptyPos);

          // ---- Click / right-click: open module-add popup (primary grid only) ----
          if (isPrimary) {
            (function(gridPos, btnEl) {
              btnEl.onclick = function(e) {
                e.stopPropagation();
                ZOIA.gridContextMenu.hide();
                // Clear grid-dot connection selection when clicking empty space
                ZOIA.clearSelectedConnection();
                ZOIA.moduleAdd.show(gridPos, btnEl);
              };
              btnEl.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ZOIA.moduleAdd.hide();
                // If clipboard has content, show a context menu with paste option
                if (ZOIA.state.clipboard) {
                  ZOIA.gridButtons._showEmptyContextMenu(gridPos, btnEl);
                } else {
                  ZOIA.gridContextMenu.hide();
                  ZOIA.moduleAdd.show(gridPos, btnEl);
                }
              });
            })(pos, btn);
          }

          // ---- Cancel drag if mouse released on an empty slot ----
          btn.addEventListener('mouseup', function() {
            if (ZOIA.state.dragSrc) {
              ZOIA.state.dragSrc = null;
              ZOIA.gridButtons.render();
            }
          });
        }

        container.appendChild(btn);
      }
    }
  },

  // ===== CONNECTION CREATION =====

  /**
   * Create a new connection between two blocks. Checks for duplicates
   * before adding. Logs the connection and shows a toast notification.
   *
   * @param {number} srcMod   - Source module index.
   * @param {number} srcBlock - Source block index.
   * @param {number} dstMod   - Destination module index.
   * @param {number} dstBlock - Destination block index.
   */
  _makeConnection: function(srcMod, srcBlock, dstMod, dstBlock) {
    var s = ZOIA.state;
    if (!s.patch) return;

    // Check for duplicate connection (in either direction)
    var exists = s.patch.connections.some(function(c) {
      return (c.srcMod === srcMod && c.srcBlock === srcBlock &&
              c.dstMod === dstMod && c.dstBlock === dstBlock) ||
             (c.srcMod === dstMod && c.srcBlock === dstBlock &&
              c.dstMod === srcMod && c.dstBlock === srcBlock);
    });
    if (exists) { ZOIA.log('Connection already exists'); return; }

    // Add the connection with default full strength
    s.patch.connections.push({
      srcMod: srcMod,
      srcBlock: srcBlock,
      dstMod: dstMod,
      dstBlock: dstBlock,
      strength: 10000
    });

    // Build descriptive names for the log / toast
    var sm = s.patch.modules[srcMod];
    var dm = s.patch.modules[dstMod];
    var sName = sm ? (sm.name || sm.typeName) : 'Mod ' + srcMod;
    var dName = dm ? (dm.name || dm.typeName) : 'Mod ' + dstMod;
    var sBlk = (sm && sm.blocks && sm.blocks[srcBlock]) ? sm.blocks[srcBlock].n : 'Block ' + srcBlock;
    var dBlk = (dm && dm.blocks && dm.blocks[dstBlock]) ? dm.blocks[dstBlock].n : 'Block ' + dstBlock;
    var msg = sName + ' : ' + sBlk + '  \u2192  ' + dName + ' : ' + dBlk;

    ZOIA.log('Connected: ' + msg);
    ZOIA.updatePatchSummary();
    this._showConnToast(msg);
  },

  // ===== DRAG INDICATOR =====

  /** Cached drag indicator DOM element (created on first use) */
  _dragIndicator: null,

  /**
   * Show the floating drag indicator near the cursor. Created lazily on
   * first use and repositioned on subsequent calls. A document-level
   * mousemove listener keeps the indicator tracking the cursor.
   *
   * @param {string} modName   - Name of the source module.
   * @param {string} blockName - Name of the source block.
   * @param {number} x         - Initial clientX position.
   * @param {number} y         - Initial clientY position.
   */
  _showDragIndicator: function(modName, blockName, x, y) {
    if (!this._dragIndicator) {
      // Create the indicator element once
      var el = document.createElement('div');
      el.id = 'drag-indicator';
      el.style.cssText = 'position:fixed;z-index:300;pointer-events:none;' +
        'background:rgba(0,204,255,0.15);border:1px solid #00ccff;' +
        'border-radius:4px;padding:4px 8px;font-size:10px;color:#00ccff;' +
        'white-space:nowrap;box-shadow:0 2px 8px rgba(0,204,255,0.3);';
      document.body.appendChild(el);
      this._dragIndicator = el;

      // Attach a persistent mousemove handler to track the cursor
      var self = this;
      this._dragMoveHandler = function(e) {
        if (self._dragIndicator && self._dragIndicator.style.display !== 'none') {
          self._dragIndicator.style.left = (e.clientX + 12) + 'px';
          self._dragIndicator.style.top = (e.clientY + 12) + 'px';
        }
      };
      document.addEventListener('mousemove', this._dragMoveHandler);
    }

    this._dragIndicator.textContent = '\u21C4 ' + modName + ':' + blockName + ' \u2192 drop on target';
    this._dragIndicator.style.left = (x + 12) + 'px';
    this._dragIndicator.style.top = (y + 12) + 'px';
    this._dragIndicator.style.display = 'block';
  },

  /**
   * Hide the floating drag indicator (does not destroy it).
   */
  _hideDragIndicator: function() {
    if (this._dragIndicator) {
      this._dragIndicator.style.display = 'none';
    }
  },

  // ===== CONNECTION TOAST =====

  /**
   * Display a brief toast notification confirming a newly created connection.
   * Auto-hides after 2.5 seconds.
   *
   * @param {string} msg - Descriptive connection text (e.g. "Mod:Blk -> Mod:Blk").
   */
  _showConnToast: function(msg) {
    var toast = document.getElementById('conn-toast');
    if (!toast) return;
    toast.textContent = '\u2713 Connected: ' + msg;
    toast.classList.remove('visible');
    // Force reflow to restart CSS animation
    void toast.offsetWidth;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 2500);
  },

  // ===== EMPTY SLOT CONTEXT MENU (PASTE) =====

  /**
   * Show a context menu on an empty grid button with "Add Module" and "Paste Module" options.
   * Reuses the grid context menu element for consistent styling.
   *
   * @param {number}      gridPos - Grid position of the empty slot.
   * @param {HTMLElement}  btnEl  - The grid button element.
   */
  _showEmptyContextMenu: function(gridPos, btnEl) {
    var menu = ZOIA.gridContextMenu._ensureMenu();
    var s = ZOIA.state;
    var clipName = s.clipboard ? (s.clipboard.name || s.clipboard.typeName) : '';

    var html = '';
    html += '<div class="ctx-header">Empty Slot</div>';
    html += '<div class="ctx-item" data-action="add"><span class="ctx-icon">+</span>Add Module</div>';
    if (s.clipboard) {
      html += '<div class="ctx-item" data-action="paste"><span class="ctx-icon">&#9113;</span>Paste "' + clipName + '"</div>';
    }
    menu.innerHTML = html;

    var rect = btnEl.getBoundingClientRect();
    var pedalRect = document.getElementById('pedal').getBoundingClientRect();
    var left = rect.left - pedalRect.left + rect.width + 2;
    var top = rect.top - pedalRect.top;
    if (left + 170 > pedalRect.width) left = rect.left - pedalRect.left - 170;
    if (top + 80 > pedalRect.height) top = pedalRect.height - 90;
    if (top < 0) top = 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('visible');

    var items = menu.querySelectorAll('.ctx-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        item.onclick = function(e) {
          e.stopPropagation();
          var action = item.getAttribute('data-action');
          ZOIA.gridContextMenu.hide();
          if (action === 'add') {
            ZOIA.moduleAdd.show(gridPos, btnEl);
          } else if (action === 'paste') {
            ZOIA.pasteModule(gridPos, s.currentPage);
          }
        };
      })(items[i]);
    }
  },

  // ===== PUBLIC RENDER ENTRY POINT =====

  /**
   * Render the grid in either single-grid or dual-grid mode depending on
   * whether a secondary page is active. Also refreshes the param input.
   */
  render: function() {
    var s = ZOIA.state;
    var singleGrid = document.getElementById('btn-grid');
    var dualArea = document.getElementById('dual-grid-area');

    if (s.patch && s.secondaryPage >= 0) {
      // ---- DUAL GRID MODE ----
      if (singleGrid) singleGrid.style.display = 'none';

      // Create the dual-grid DOM structure if it does not exist yet
      if (!dualArea) {
        dualArea = document.createElement('div');
        dualArea.id = 'dual-grid-area';
        dualArea.innerHTML =
          '<div class="grid-column">' +
            '<div class="grid-header">' +
              '<span class="grid-label" ondblclick="ZOIA.renamePage(ZOIA.state.currentPage)" title="Double-click to rename page">LEFT</span>' +
              '<select id="page-select-left" onchange="ZOIA.hardwareView.goToPage(this.value)"></select>' +
            '</div>' +
            '<div class="btn-grid-inner" id="grid-left"></div>' +
          '</div>' +
          '<div class="grid-divider"></div>' +
          '<div class="grid-column">' +
            '<div class="grid-header">' +
              '<span class="grid-label" ondblclick="ZOIA.renamePage(ZOIA.state.secondaryPage)" title="Double-click to rename page">RIGHT</span>' +
              '<select id="page-select-right" onchange="ZOIA.hardwareView.goToSecondaryPage(this.value)"></select>' +
            '</div>' +
            '<div class="btn-grid-inner" id="grid-right"></div>' +
          '</div>';
        var pedalRight = document.getElementById('pedal-right');
        if (pedalRight) pedalRight.appendChild(dualArea);
      }
      dualArea.style.display = 'flex';

      // Render both grids
      var gridLeft = document.getElementById('grid-left');
      if (gridLeft) this._renderGrid(gridLeft, s.currentPage, true);

      var gridRight = document.getElementById('grid-right');
      if (gridRight) this._renderGrid(gridRight, s.secondaryPage, false);

      this._updateDualPageSelectors();

    } else {
      // ---- SINGLE GRID MODE ----
      if (dualArea) dualArea.style.display = 'none';
      if (singleGrid) {
        singleGrid.style.display = '';
        this._renderGrid(singleGrid, s.currentPage, true);
      }
    }

    // Sync the numeric param input with the current selection
    if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();

    // Update physical jack highlights based on selected/hovered module
    this._updateJackHighlights();
  },

  /**
   * Highlight physical I/O jack-holes when an Audio Input/Output module
   * block is selected or hovered. Maps module typeIdx + block to the
   * corresponding jack data-io attribute.
   */
  _updateJackHighlights: function() {
    // Clear all jack highlights first
    var allJacks = document.querySelectorAll('.jack-hole[data-io]');
    for (var j = 0; j < allJacks.length; j++) {
      allJacks[j].classList.remove('io-active');
    }

    var s = ZOIA.state;
    if (!s.patch) return;

    // Build list of { modIdx, blockIdx } pairs to check
    var targets = [];
    if (s.selectedModule !== null) {
      targets.push({ modIdx: s.selectedModule, blockIdx: s.selectedBlock });
    }
    if (s.hoveredModule !== null && s.hoveredModule !== s.selectedModule) {
      targets.push({ modIdx: s.hoveredModule, blockIdx: s.hoveredBlock });
    }

    for (var ti = 0; ti < targets.length; ti++) {
      var mod = s.patch.modules[targets[ti].modIdx];
      if (!mod) continue;
      var blkIdx = targets[ti].blockIdx;
      var tn = (mod.typeName || '').toLowerCase();

      // Determine which block is selected/hovered; get its name
      var blockName = '';
      if (mod.blocks && blkIdx !== null && blkIdx !== undefined && mod.blocks[blkIdx]) {
        blockName = (mod.blocks[blkIdx].n || '').toLowerCase();
      }

      if (mod.typeIdx === 1 || tn.indexOf('audio input') >= 0) {
        // Audio Input: map block name to specific jack
        // "left" or "output" (mono) -> IN L; "right" -> IN R
        // If no specific block selected, highlight both
        if (blkIdx === null || blkIdx === undefined) {
          this._highlightJack('in-l');
          this._highlightJack('in-r');
        } else if (blockName.indexOf('right') >= 0) {
          this._highlightJack('in-r');
        } else {
          // "left", "output" (mono variant), or any other block
          this._highlightJack('in-l');
        }
      } else if (mod.typeIdx === 2 || tn.indexOf('audio output') >= 0) {
        // Audio Output: "left" or "input" (mono) -> OUT L; "right" -> OUT R; "gain" -> no jack
        if (blkIdx === null || blkIdx === undefined) {
          this._highlightJack('out-l');
          this._highlightJack('out-r');
        } else if (blockName.indexOf('right') >= 0) {
          this._highlightJack('out-r');
        } else if (blockName.indexOf('gain') >= 0) {
          // Gain block has no physical jack
        } else {
          this._highlightJack('out-l');
        }
      } else if (tn.indexOf('midi') >= 0) {
        if (tn.indexOf('in') >= 0) this._highlightJack('midi-in');
        if (tn.indexOf('out') >= 0) this._highlightJack('midi-out');
      }
    }
  },

  /**
   * Helper: highlight a single physical jack by its data-io value.
   * @param {string} ioName - The data-io attribute value (e.g. 'in-l').
   */
  _highlightJack: function(ioName) {
    var el = document.querySelector('.jack-hole[data-io="' + ioName + '"]');
    if (el) el.classList.add('io-active');
  },

  // ===== DUAL PAGE SELECTORS =====

  /**
   * Populate the left and right page-selector dropdowns in dual-grid mode.
   * Each dropdown lists all pages in the patch plus a "+ Blank Page" option.
   */
  _updateDualPageSelectors: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    var leftSel = document.getElementById('page-select-left');
    var rightSel = document.getElementById('page-select-right');

    [leftSel, rightSel].forEach(function(sel, idx) {
      if (!sel) return;
      var curPage = idx === 0 ? s.currentPage : s.secondaryPage;
      sel.innerHTML = '';
      s.patch.pages.forEach(function(name, i) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i + ': ' + name;
        if (i === curPage) opt.selected = true;
        sel.appendChild(opt);
      });
      var blankOpt = document.createElement('option');
      blankOpt.value = 'blank';
      blankOpt.textContent = '+ Blank Page';
      sel.appendChild(blankOpt);
    });
  }
};


