// === stompswitches.js ===
/**
 * stompswitches.js -- Stomp Switch Controls
 *
 * Simulates the ZOIA's three physical stomp switches and two combo-press
 * actions. The real hardware has:
 *
 *   Left   = BYPASS   -- Toggles the bypass state (red/green LED).
 *   Center = SELECT   -- Selects the next module on the current page.
 *   Right  = SCROLL   -- Cycles through blocks of the selected module.
 *
 * Combo presses:
 *   SELECT + SCROLL   -- Jump to the next module (alias for select).
 *   SCROLL + BYPASS   -- Page forward (stomp-style page navigation).
 *
 * Namespace: window.ZOIA.stompswitches
 */
window.ZOIA = window.ZOIA || {};

ZOIA.stompswitches = {

  // ===== STOMP DISPATCH =====

  /**
   * Handle a stomp switch press by type.
   * @param {string} type - One of 'bypass', 'select', 'scroll',
   *                        'select_scroll', or 'scroll_bypass'.
   */
  onStomp: function(type) {
    var s = ZOIA.state;

    if (type === 'bypass') {
      // Toggle bypass -- swap the status LED between red and green
      s.bypassed = !s.bypassed;
      var leds = document.querySelectorAll('.status-led');
      leds[0].className = 'status-led ' + (s.bypassed ? 'on-red' : 'on-green');
      ZOIA.log('Bypass ' + (s.bypassed ? 'ON' : 'OFF'));
      // Also trigger stompswitch modules mapped to Left (option[1] == 0)
      this._triggerStompswitchModules(0);

    } else if (type === 'select') {
      // Select the next module on the current page
      this._selectNextModule(1);
      // Also trigger stompswitch modules mapped to Middle (option[1] == 1)
      this._triggerStompswitchModules(1);

    } else if (type === 'scroll') {
      // Cycle to the next block of the selected module
      this._scrollBlock(1);
      // Also trigger stompswitch modules mapped to Right (option[1] == 2)
      this._triggerStompswitchModules(2);

    } else if (type === 'select_scroll') {
      // Combo: Select + Scroll = jump to next module
      this._selectNextModule(1);

    } else if (type === 'scroll_bypass') {
      // Combo: Scroll + Bypass = page forward
      if (!s.patch) return;
      if (s.currentPage < s.patch.pages.length - 1) {
        s.currentPage++;
        s.selectedModule = null;
        s.selectedBlock = null;
        ZOIA.log('Stomp page forward -> ' + s.currentPage);
        ZOIA.hardwareView.renderAll();
      }
    }
  },

  // ===== STOMPSWITCH MODULE TRIGGERING =====

  /**
   * Trigger stompswitch modules (type 44) mapped to a given physical position.
   * On real ZOIA, stompswitch option byte 1 determines mapping:
   *   0 = Left (Bypass), 1 = Middle (Select), 2 = Right (Scroll).
   * @param {number} position - Physical button position (0, 1, or 2).
   */
  _triggerStompswitchModules: function(position) {
    var s = ZOIA.state;
    if (!s.patch || !ZOIA.sim || !ZOIA.sim.running) return;
    var modules = s.patch.modules;
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].typeIdx === 44) {
        var opts = modules[i].options || [];
        var mappedPos = opts[1] || 0;
        if (mappedPos === position) {
          var node = ZOIA.sim.nodes[i];
          if (node && node.toggle) {
            node.toggle();
            ZOIA.log('Stomp triggered stompswitch "' + modules[i].name + '" (mod ' + i + ')');
          }
        }
      }
    }
  },

  // ===== MODULE SELECTION =====

  /**
   * Select the next (or previous) module on the current page.
   * Wraps around the list of modules belonging to this page.
   * @param {number} dir - Direction (+1 forward, -1 backward).
   */
  _selectNextModule: function(dir) {
    var s = ZOIA.state;
    if (!s.patch) return;

    // Collect module indices that belong to the current page
    var pageModules = [];
    s.patch.modules.forEach(function(m, i) {
      if (m.page === s.currentPage) pageModules.push(i);
    });
    if (pageModules.length === 0) return;

    // Find current position in the page-module list and advance
    var curIdx = pageModules.indexOf(s.selectedModule);
    var nextIdx;
    if (curIdx < 0) {
      nextIdx = 0;
    } else {
      nextIdx = (curIdx + dir + pageModules.length) % pageModules.length;
    }

    ZOIA.hardwareView.selectModule(pageModules[nextIdx], 0);
    ZOIA.log('Selected module ' + pageModules[nextIdx] + ': ' + s.patch.modules[pageModules[nextIdx]].name);
  },

  // ===== BLOCK SCROLLING =====

  /**
   * Scroll through the blocks of the currently selected module.
   * Exits connection view if active, since the block is changing.
   * @param {number} dir - Direction (+1 forward, -1 backward).
   */
  _scrollBlock: function(dir) {
    var s = ZOIA.state;
    if (!s.patch || s.selectedModule === null) return;

    // Exit connection view when scrolling to a different block
    if (s.connectionView) ZOIA.exitConnectionView();

    var m = s.patch.modules[s.selectedModule];
    if (!m) return;

    var bc = m.blockCount || 1;
    var cur = s.selectedBlock || 0;
    var next = (cur + dir + bc) % bc;
    s.selectedBlock = next;

    ZOIA.log('Scroll block -> ' + next + '/' + bc);
    ZOIA.oled.render();
    ZOIA.gridButtons.render();
    if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
  }
};


