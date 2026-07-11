// === knob.js ===
/**
 * knob.js -- Rotary Encoder Interaction
 *
 * Simulates the ZOIA's single rotary encoder (knob). Supports mouse wheel
 * and click-drag gestures. The knob operates in two distinct modes:
 *
 *   NORMAL PARAM MODE (connectionView === false)
 *     - Wheel / drag  : adjusts the selected block's parameter value (0..1).
 *     - Click          : enters connection view if the selected block has
 *                        any connections.
 *
 *   CONNECTION VIEW MODE (connectionView === true)
 *     - Wheel          : scrolls through the connection list (prev / next).
 *     - Shift + wheel  : adjusts connection strength (raw 0..10000).
 *     - Drag           : ignored (no-op) unless Shift is held, in which
 *                        case it adjusts connection strength.
 *     - Click          : toggles the strength display format (% <-> dB).
 *
 * Namespace: window.ZOIA.knob
 */
window.ZOIA = window.ZOIA || {};

ZOIA.knob = {

  // ===== CONFIGURATION =====

  /** Sensitivity factor for parameter adjustment (units per pixel of drag) */
  _sensitivity: 0.004,

  /** Sensitivity for connection strength (raw units per pixel, out of 10000) */
  _connStrengthSensitivity: 200,

  // ===== INITIALIZATION =====

  /**
   * Attach all event listeners to the knob element.
   * Called once during application startup.
   */
  init: function() {
    var knobEl = document.getElementById('knob');
    var indicator = document.getElementById('knob-indicator');
    var dragging = false;
    var startY = 0;
    var self = this;

    // ----- Mouse wheel: rotate knob and dispatch action -----
    knobEl.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -15 : 15;
      ZOIA.state.knobAngle += delta;
      indicator.style.transform = 'translateX(-50%) rotate(' + ZOIA.state.knobAngle + 'deg)';

      var s = ZOIA.state;
      if (s.connectionView) {
        if (s.shiftMode) {
          // Shift + scroll: navigate between connections
          self._scrollConnection(delta > 0 ? 1 : -1);
        } else {
          // Scroll: adjust connection strength directly
          self._adjustConnStrength(delta * self._connStrengthSensitivity / 15);
        }
      } else if (s.selectedConnection !== null) {
        // Grid-dot selected connection: adjust its strength
        self._adjustSelectedConnStrength(delta * self._connStrengthSensitivity / 15);
      } else {
        // Normal mode: adjust parameter value
        self._adjustParam(delta * self._sensitivity);
      }
    });

    // ----- Mouse down: begin drag -----
    knobEl.addEventListener('mousedown', function(e) {
      dragging = true;
      startY = e.clientY;
      e.preventDefault();
    });

    // ----- Click: enter connection view or toggle strength display -----
    knobEl.addEventListener('click', function() {
      var s = ZOIA.state;
      if (s.connectionView) {
        // Toggle between % and dB strength display
        s.connectionStrengthMode = (s.connectionStrengthMode === '%') ? 'dB' : '%';
        ZOIA.log('Connection strength mode: ' + s.connectionStrengthMode);
        ZOIA.oled.render();
      } else if (s.selectedModule !== null && s.selectedBlock !== null) {
        // Enter connection view if the block has connections
        ZOIA.enterConnectionView();
      }
    });

    // ----- Mouse move (document-level): drag to adjust -----
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var dy = startY - e.clientY;
      ZOIA.state.knobAngle += dy * 0.8;
      startY = e.clientY;
      indicator.style.transform = 'translateX(-50%) rotate(' + ZOIA.state.knobAngle + 'deg)';

      var s = ZOIA.state;
      if (s.connectionView) {
        // Drag in connection view: adjust strength
        self._adjustConnStrength(dy * self._connStrengthSensitivity / 5);
      } else if (s.selectedConnection !== null) {
        // Grid-dot selected connection: drag adjusts strength
        self._adjustSelectedConnStrength(dy * self._connStrengthSensitivity / 5);
      } else {
        // Normal mode: adjust parameter value
        self._adjustParam(dy * self._sensitivity);
      }
    });

    // ----- Mouse up (document-level): end drag -----
    document.addEventListener('mouseup', function() { dragging = false; });
  },

  // ===== PARAMETER ADJUSTMENT =====

  /**
   * Adjust the selected block's parameter by delta (clamped to 0..1).
   * Delegates to ZOIA.setParamValue which also updates the OLED.
   * @param {number} delta - Amount to add to the current value.
   */
  _adjustParam: function(delta) {
    var s = ZOIA.state;
    if (s.selectedModule === null || s.selectedBlock === null) return;
    var cur = ZOIA.getParamValue(s.selectedModule, s.selectedBlock);
    var next = Math.max(0, Math.min(1, cur + delta));
    ZOIA.setParamValue(s.selectedModule, s.selectedBlock, next);
  },

  // ===== CONNECTION NAVIGATION =====

  /**
   * Navigate to the next or previous connection in the connection list.
   * Wraps around at both ends.
   * @param {number} dir - Direction (+1 for next, -1 for previous).
   */
  _scrollConnection: function(dir) {
    var s = ZOIA.state;
    if (!s.connectionView || s.connectionList.length === 0) return;
    var len = s.connectionList.length;
    // Modular wrap-around (handles negative values correctly)
    s.connectionIndex = ((s.connectionIndex + dir) % len + len) % len;
    ZOIA.log('Connection ' + (s.connectionIndex + 1) + '/' + len);
    ZOIA.oled.render();
  },

  // ===== CONNECTION STRENGTH =====

  /**
   * Adjust the strength of the currently viewed connection.
   * Clamped to 0..10000 raw units.
   * @param {number} delta - Raw units to add to the current strength.
   */
  _adjustConnStrength: function(delta) {
    var s = ZOIA.state;
    if (!s.connectionView || s.connectionList.length === 0) return;
    var conn = s.connectionList[s.connectionIndex];
    if (!conn) return;
    var raw = (conn.strength !== undefined) ? conn.strength : 10000;
    var next = Math.max(0, Math.min(10000, Math.round(raw + delta)));
    ZOIA.setConnStrength(s.connectionIndex, next);
  },

  // ===== GRID-DOT SELECTED CONNECTION STRENGTH =====

  /**
   * Adjust the strength of the grid-dot-selected connection.
   * Clamped to 0..10000 raw units. Delegates to ZOIA.setSelectedConnStrength.
   * @param {number} delta - Raw units to add to the current strength.
   */
  _adjustSelectedConnStrength: function(delta) {
    var s = ZOIA.state;
    if (s.selectedConnection === null || !s.patch) return;
    var conn = s.patch.connections[s.selectedConnection];
    if (!conn) return;
    var raw = (conn.strength !== undefined) ? conn.strength : 10000;
    var next = Math.max(0, Math.min(10000, Math.round(raw + delta)));
    ZOIA.setSelectedConnStrength(next);
  },

  // ===== PARAM INPUT FIELD SYNC =====

  /**
   * Update the numeric param-input field to reflect the current value.
   * In connection view mode this shows the connection strength (0..1).
   * In normal mode it shows the selected parameter value.
   */
  updateParamInput: function() {
    var input = document.getElementById('param-input');
    if (!input) return;
    var s = ZOIA.state;
    var label = document.querySelector('#param-input-area .param-label');

    // Grid-dot selected connection: display strength as percentage
    if (s.selectedConnection !== null && s.patch) {
      var selConn = s.patch.connections[s.selectedConnection];
      if (selConn) {
        var selRaw = (selConn.strength !== undefined) ? selConn.strength : 10000;
        input.value = (selRaw / 100).toFixed(1) + '%';
        if (label) label.textContent = 'CONN STRENGTH';
        return;
      }
    }

    // Connection view: display connection strength as percentage
    if (s.connectionView && s.connectionList.length > 0) {
      var conn = s.connectionList[s.connectionIndex];
      var raw = (conn && conn.strength !== undefined) ? conn.strength : 10000;
      input.value = (raw / 100).toFixed(1) + '%';
      if (label) label.textContent = 'CONN STRENGTH';
      return;
    }

    // Restore label for normal mode
    if (label) label.textContent = 'ENCODER VALUE';

    // No selection: show placeholder
    if (s.selectedModule === null || s.selectedBlock === null) {
      input.value = '--';
      return;
    }

    // Normal mode: show formatted parameter value with proper units
    var val = ZOIA.getParamValue(s.selectedModule, s.selectedBlock);
    var blockName = null;
    if (s.patch && s.patch.modules[s.selectedModule]) {
      var mod = s.patch.modules[s.selectedModule];
      if (mod.blocks && mod.blocks[s.selectedBlock]) {
        blockName = mod.blocks[s.selectedBlock].n;
      }
    }
    input.value = ZOIA.formatParam(blockName, val);
  },

  /**
   * Handle manual entry in the param-input field.
   * Parses the string, clamps to 0..1, and applies the value.
   * In connection view the value maps to raw strength (0..1 -> 0..10000).
   * @param {string} str - The raw text from the input field.
   */
  onParamInput: function(str) {
    var s = ZOIA.state;
    var val = parseFloat(str);
    if (isNaN(val)) return;

    // Grid-dot selected connection: parse percentage input to 0..10000 raw strength
    if (s.selectedConnection !== null && s.patch) {
      val = Math.max(0, Math.min(100, val));
      ZOIA.setSelectedConnStrength(Math.round(val * 100));
      return;
    }

    // Connection view: parse percentage input to 0..10000 raw strength
    if (s.connectionView && s.connectionList.length > 0) {
      val = Math.max(0, Math.min(100, val));
      ZOIA.setConnStrength(s.connectionIndex, Math.round(val * 100));
      return;
    }

    // Normal mode: reverse-parse using block name for unit-aware input
    if (s.selectedModule === null || s.selectedBlock === null) return;
    var blockName = null;
    if (s.patch && s.patch.modules[s.selectedModule]) {
      var mod = s.patch.modules[s.selectedModule];
      if (mod.blocks && mod.blocks[s.selectedBlock]) {
        blockName = mod.blocks[s.selectedBlock].n;
      }
    }
    var parsed = ZOIA.parseParam(blockName, str);
    if (parsed === null) return;
    ZOIA.setParamValue(s.selectedModule, s.selectedBlock, parsed);
  }
};


