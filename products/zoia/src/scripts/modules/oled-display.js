// === oled-display.js ===
/**
 * oled-display.js -- OLED Screen Simulation
 *
 * Renders the 128x64-style OLED display for the ZOIA pedal emulator.
 * The display has three distinct modes:
 *
 *   1. PATCH OVERVIEW  -- Shown when no module is selected. Displays the
 *      patch name, current page name, and a simulated CPU usage bar.
 *
 *   2. BLOCK DETAIL    -- Shown when a module/block is selected. Displays
 *      the module name, block name, parameter slider, current value, and
 *      a summary of connections to/from this block.
 *
 *   3. CONNECTION VIEW  -- Entered via encoder click when a block has
 *      connections. Shows a full-screen connection inspector with source,
 *      destination, signal type, strength bar, and navigation controls.
 *
 * Namespace: window.ZOIA.oled
 */
window.ZOIA = window.ZOIA || {};

ZOIA.oled = {

  // ===== SIGNAL TYPE METADATA =====

  /** Human-readable labels for each signal type (used in connection view) */
  _signalLabels: {
    audio: 'AUDIO',
    cv: 'CV',
    gate: 'GATE',
    param: 'PARAM'
  },

  /** Color codes per signal type (used for badges and strength bars) */
  _signalColors: {
    audio: '#00C853',
    cv: '#2979FF',
    gate: '#FF1744',
    param: '#FF9100'
  },

  // ===== HELPERS =====

  /**
   * Truncate a string to maxLen characters, appending an ellipsis if needed.
   * @param {string} str    - The string to truncate.
   * @param {number} maxLen - Maximum allowed length including the ellipsis.
   * @returns {string}
   */
  _trunc: function(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + '\u2026';
  },

  // ===== MODE 3: CONNECTION VIEW =====

  /**
   * Render the connection detail / inspector view.
   *
   * Layout (5 lines):
   *   Line 1 -- "CONNECTION" header + "N/M" navigation counter
   *   Line 2 -- Source module name  ->  Destination module name
   *   Line 3 -- Block names + direction arrow + signal type badge
   *   Line 4 -- Strength bar (14 chars) + formatted strength value
   *   Line 5 -- Hint text (knob scroll, shift+knob, click to toggle mode)
   *
   * @param {HTMLElement} oled - The OLED container element.
   */
  _renderConnectionView: function(oled) {
    var s = ZOIA.state;
    var p = s.patch;

    // Guard: exit if patch is missing or connection list is empty
    if (!p || s.connectionList.length === 0) {
      ZOIA.exitConnectionView();
      return;
    }

    var conn = s.connectionList[s.connectionIndex];
    if (!conn) { ZOIA.exitConnectionView(); return; }

    var modIdx = s.selectedModule;
    var blkIdx = s.selectedBlock;

    // Determine whether the selected block is the source or destination
    var isSource = (conn.srcMod === modIdx && conn.srcBlock === blkIdx);

    // ----- Resolve module and block names -----
    var srcMod = p.modules[conn.srcMod];
    var dstMod = p.modules[conn.dstMod];
    var srcName = srcMod ? this._trunc(srcMod.name || srcMod.typeName, 12) : '?';
    var dstName = dstMod ? this._trunc(dstMod.name || dstMod.typeName, 12) : '?';

    var srcBlkName = (srcMod && srcMod.blocks && srcMod.blocks[conn.srcBlock])
      ? srcMod.blocks[conn.srcBlock].n : 'Blk' + conn.srcBlock;
    var dstBlkName = (dstMod && dstMod.blocks && dstMod.blocks[conn.dstBlock])
      ? dstMod.blocks[conn.dstBlock].n : 'Blk' + conn.dstBlock;

    // ----- Signal type label and color -----
    var connType = ZOIA.getConnType(conn);
    var typeLabel = this._signalLabels[connType] || 'PARAM';
    var typeColor = this._signalColors[connType] || '#FF9100';

    // ----- Strength value and bar -----
    var strengthStr = ZOIA.formatConnStrength(conn, s.connectionStrengthMode);
    var raw = (conn.strength !== undefined) ? conn.strength : 10000;
    var pct = raw / 10000;

    // 14-char bar: filled blocks + empty blocks
    var barLen = 14;
    var filledLen = Math.round(pct * barLen);
    var strengthBar = '\u2588'.repeat(filledLen) + '\u2591'.repeat(barLen - filledLen);

    // ----- Navigation and direction -----
    var navStr = (s.connectionIndex + 1) + '/' + s.connectionList.length;
    var arrow = isSource ? '\u2192' : '\u2190';

    // ----- Build OLED HTML -----
    var html = '';

    // Line 1: header with navigation counter
    html += '<div style="display:flex;justify-content:space-between">';
    html += '<span style="color:#00cccc;font-weight:bold">CONNECTION</span>';
    html += '<span class="dim">' + navStr + '</span>';
    html += '</div>';

    // Line 2: source -> destination module names
    html += '<div style="display:flex;align-items:center;gap:2px">';
    html += '<span>' + srcName + '</span>';
    html += '<span style="color:#00cccc;margin:0 2px">\u2192</span>';
    html += '<span>' + dstName + '</span>';
    html += '</div>';

    // Line 3: block names, direction arrow, signal type badge
    html += '<div class="dim">';
    html += srcBlkName + ' ' + arrow + ' ' + dstBlkName;
    html += ' <span style="color:' + typeColor + '">[' + typeLabel + ']</span>';
    html += '</div>';

    // Line 4: colored strength bar + numeric strength
    html += '<div style="display:flex;align-items:center;gap:4px">';
    html += '<span style="letter-spacing:1px;color:' + typeColor + '">' + strengthBar + '</span>';
    html += '<span style="font-weight:bold">' + strengthStr + '</span>';
    html += '</div>';

    // Line 5: keyboard / interaction hints
    html += '<div class="dim" style="font-size:9px">';
    html += 'Knob:scroll  Shift+Knob:strength  Click:' + s.connectionStrengthMode;
    html += '</div>';

    oled.innerHTML = html;
  },

  // ===== MAIN RENDER ENTRY POINT =====

  /**
   * Render the OLED display. Delegates to the appropriate mode based on
   * the current application state (connection view, patch overview, or
   * block detail).
   */
  render: function() {
    var oled = document.getElementById('oled');
    if (!oled) return;

    var s = ZOIA.state;
    var p = s.patch;

    // ----- No patch loaded -----
    if (!p) {
      oled.innerHTML = '<div class="dim">No patch loaded</div>' +
        '<div class="dim">Load a .bin or Demo</div>';
      return;
    }

    // ----- Looper status overlay -----
    var looperStatus = '';
    if (ZOIA.state.mode === 'play' && ZOIA.sim) {
      var simNodes = ZOIA.sim.nodes;
      for (var li = 0; li < simNodes.length; li++) {
        if (simNodes[li] && simNodes[li].type === 'looper') {
          var ln = simNodes[li];
          if (ln._recording) {
            var elapsed = ZOIA.sim.ctx.currentTime - ln._recordStartTime;
            var secs = elapsed.toFixed(1);
            looperStatus = '<div style="background:#ff1744;color:#fff;padding:1px 6px;font-size:10px;text-align:center;margin-bottom:2px;border-radius:2px">' +
              '\u25CF REC ' + secs + 's</div>';
          } else if (ln._playing) {
            var playText = '\u25B6 PLAYING';
            if (ln._recordDuration > 0 && ln._playStartTime > 0) {
              var playElapsed = ZOIA.sim.ctx.currentTime - ln._playStartTime;
              var playPos = playElapsed % ln._recordDuration;
              playText = '\u25B6 ' + playPos.toFixed(1) + 's / ' + ln._recordDuration.toFixed(1) + 's';
            }
            looperStatus = '<div style="background:#00c853;color:#000;padding:1px 6px;font-size:10px;text-align:center;margin-bottom:2px;border-radius:2px">' +
              playText + '</div>';
          }
          break;
        }
      }
    }

    // ----- MODE 3: Connection view -----
    if (s.connectionView) {
      this._renderConnectionView(oled);
      if (looperStatus) {
        oled.innerHTML = looperStatus + oled.innerHTML;
      }
      return;
    }

    // ----- MODE 1: Patch overview (no module selected) -----
    if (s.selectedModule === null) {
      // Count audio/effect modules for simulated CPU estimate
      var audioMods = p.modules.filter(function(m) {
        var d = ZOIA.MODULE_DB[m.typeIdx];
        return d && (d.cat === "Audio" || d.cat === "Effect");
      }).length;

      var cpu = Math.min(100, Math.round(p.moduleCount * 1.5 + audioMods * 3));
      var barLen = 18;
      var filled = Math.round(cpu / 100 * barLen);
      var bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);

      var descHTML = '';
      if (p.description) {
        var shortDesc = p.description.length > 80 ? p.description.substring(0, 77) + '...' : p.description;
        descHTML = '<div class="oled-desc" title="' + p.description.replace(/"/g, '&quot;') + '">' + shortDesc + '</div>';
      }

      oled.innerHTML = looperStatus +
        '<div>001 ' + p.name + '</div>' +
        '<div>' + (p.pages[s.currentPage] || 'Page ' + s.currentPage) + '</div>' +
        descHTML +
        '<div>CPU: ' + cpu + '%</div>' +
        '<div style="letter-spacing:1px">' + bar + '</div>';
      return;
    }

    // ----- MODE 2: Block detail (module + block selected) -----
    var m = p.modules[s.selectedModule];
    if (!m) { oled.innerHTML = ''; return; }

    var blkIdx = s.selectedBlock || 0;
    var blk = m.blocks && m.blocks[blkIdx] ? m.blocks[blkIdx] : null;
    var blkName = blk ? blk.n : 'Block ' + blkIdx;

    // Parameter value formatted in correct units
    var paramVal = ZOIA.getParamValue(s.selectedModule, blkIdx);
    var paramStr = ZOIA.formatParam(blkName, paramVal);

    // 18-char slider bar with a bullet marker
    var sliderPos = Math.round(paramVal * 18);
    var sliderBar = '\u2500'.repeat(sliderPos) + '\u25CF' + '\u2500'.repeat(18 - sliderPos);

    // Gather connections to/from this specific block
    var blockConns = p.connections.filter(function(c) {
      return (c.srcMod === m.idx && c.srcBlock === blkIdx) ||
             (c.dstMod === m.idx && c.dstBlock === blkIdx);
    });

    // Build connection summary lines (show up to 2)
    var connLines = '';
    blockConns.slice(0, 2).forEach(function(c) {
      var isSource = c.srcMod === m.idx;
      var otherIdx = isSource ? c.dstMod : c.srcMod;
      var otherBlk = isSource ? c.dstBlock : c.srcBlock;
      var other = p.modules[otherIdx];
      var dir = isSource ? '\u2192' : '\u2190';
      var otherName = other ? (other.name || other.typeName) : '?';
      var otherBlkName = (other && other.blocks && other.blocks[otherBlk])
        ? other.blocks[otherBlk].n : '';
      connLines += '<div class="dim">' + dir + ' ' + otherName + ':' + otherBlkName + '</div>';
    });

    if (blockConns.length === 0) {
      connLines = '<div class="dim">No connections</div>';
    } else {
      // Clickable hint to enter full connection view
      connLines += '<div style="font-size:9px;color:#00cccc;cursor:pointer" onclick="ZOIA.enterConnectionView()">';
      connLines += '[' + blockConns.length + ' conn' + (blockConns.length > 1 ? 's' : '') + ' - click or encoder to view]';
      connLines += '</div>';
    }

    // Position label (row.col page)
    var blockPos = m.gridPos + blkIdx;
    var bRow = Math.floor(blockPos / ZOIA.GRID_COLS);
    var bCol = blockPos % ZOIA.GRID_COLS;
    var posStr = 'R' + bRow + ' C' + bCol + ' P' + m.page;

    oled.innerHTML = looperStatus +
      '<div style="cursor:pointer" ondblclick="ZOIA.renameModule(' + m.idx + ')">' +
        m.name + ' <span class="dim">(' + m.typeName + ')</span></div>' +
      '<div>' + blkName + ' <span class="dim">' + posStr + '</span></div>' +
      '<div style="letter-spacing:1px">' + sliderBar + ' ' + paramStr + '</div>' +
      connLines;
  }
};


