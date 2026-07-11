// === hardware-view.js ===
/**
 * hardware-view.js -- Hardware View (Pedal Replica)
 * ===================================================
 * Renders the physical ZOIA pedal interface: the 8x5 button grid,
 * OLED display, page selector, and stomp switches.  Handles module
 * selection/deselection, page navigation, shift mode, connection-view
 * exit, and the drag-and-drop zone for .bin file imports.
 *
 * Depends on: ZOIA.state, ZOIA.gridButtons, ZOIA.oled, ZOIA.knob,
 *             ZOIA.moduleAdd, ZOIA.gridContextMenu, ZOIA.handleFile,
 *             ZOIA.exitConnectionView, ZOIA.updatePatchSummary
 *
 * @namespace ZOIA.hardwareView
 */
window.ZOIA = window.ZOIA || {};

ZOIA.hardwareView = {

  /* ===== Full Re-render ===== */

  /**
   * Re-render the entire hardware view: grid buttons, OLED, and the
   * page selector dropdown.
   */
  renderAll: function() {
    ZOIA.gridButtons.render();
    ZOIA.oled.render();
    this.renderPageSelector();
    if (ZOIA.midiKeyboard) ZOIA.midiKeyboard.render();
  },

  /* ===== Module Selection ===== */

  /**
   * Select (or toggle-deselect) a module on the grid.
   *
   * If the user clicks the already-selected module+block, it deselects.
   * If connection view is active, it is exited before changing selection
   * so that stale connection highlights do not linger.
   *
   * @param {number} idx       - Module index within the patch
   * @param {number} blockIdx  - Block index within the module (default 0)
   */
  selectModule: function(idx, blockIdx) {
    var s = ZOIA.state;
    var bi = (blockIdx != null) ? blockIdx : 0;
    ZOIA.log('selectModule(' + idx + ', block=' + bi + ') prev=' + s.selectedModule + ':' + s.selectedBlock);

    /* Clear grid-dot connection selection when changing module/block. */
    if (s.selectedConnection !== null) {
      ZOIA.clearSelectedConnection();
    }

    /* Exit connection view when selecting a different module/block
       so the grid does not show stale connection highlights. */
    if (s.connectionView) {
      ZOIA.exitConnectionView();
    }

    /* Toggle: clicking the same module+block deselects it. */
    if (s.selectedModule === idx && s.selectedBlock === bi) {
      s.selectedModule = null;
      s.selectedBlock = null;
    } else {
      s.selectedModule = idx;
      s.selectedBlock = bi;
    }

    ZOIA.gridButtons.render();
    ZOIA.oled.render();
    if (ZOIA.knob && ZOIA.knob.updateParamInput) {
      ZOIA.knob.updateParamInput();
    }
  },

  /* ===== Page Selector Dropdown ===== */

  /**
   * Rebuild the <select> dropdown that lists all patch pages plus a
   * "+ Blank Page" option at the end.
   */
  renderPageSelector: function() {
    var sel = document.getElementById('page-select');
    if (!sel) return;
    var s = ZOIA.state;
    sel.innerHTML = '';

    /* No patch loaded -- show placeholder */
    if (!s.patch) {
      var opt = document.createElement('option');
      opt.textContent = '(no patch)';
      sel.appendChild(opt);
      return;
    }

    /* One <option> per existing page */
    s.patch.pages.forEach(function(name, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i + ': ' + name;
      if (i === s.currentPage) opt.selected = true;
      sel.appendChild(opt);
    });

    /* Append the "add new blank page" sentinel option */
    var blankOpt = document.createElement('option');
    blankOpt.value = 'blank';
    blankOpt.textContent = '+ Blank Page';
    sel.appendChild(blankOpt);
  },

  /* ===== Page Navigation ===== */

  /**
   * Navigate to a page by dropdown value.  If the value is 'blank', a
   * new page is created at the end of the pages array (up to 64 max).
   *
   * @param {string|number} val - Page index or 'blank'
   */
  goToPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      /* Create a new blank page at the next available index */
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return; // ZOIA hardware maximum: 64 pages
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.currentPage = newIdx;
      /* Initialise secondary page if this is the second page overall */
      if (s.secondaryPage < 0 && s.patch.pages.length > 1) {
        s.secondaryPage = Math.min(1, s.patch.pages.length - 1);
      }
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.currentPage = idx;
    }

    /* Deselect any module when changing pages */
    s.selectedModule = null;
    s.selectedBlock = null;
    ZOIA.updatePatchSummary();
    this.renderAll();
  },

  /**
   * Navigate the secondary (dual-grid) page.  Same blank-page logic
   * as goToPage but updates secondaryPage instead of currentPage.
   *
   * @param {string|number} val - Page index or 'blank'
   */
  goToSecondaryPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return;
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.secondaryPage = newIdx;
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.secondaryPage = idx;
    }

    this.renderAll();
  },

  /**
   * Step one page to the left (decrement currentPage).
   */
  pageLeft: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    if (s.currentPage > 0) {
      s.currentPage--;
      s.selectedModule = null;
      s.selectedBlock = null;
      ZOIA.log('Page left -> ' + s.currentPage);
      this.renderAll();
    }
  },

  /**
   * Step one page to the right (increment currentPage).
   */
  pageRight: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    if (s.currentPage < s.patch.pages.length - 1) {
      s.currentPage++;
      s.selectedModule = null;
      s.selectedBlock = null;
      ZOIA.log('Page right -> ' + s.currentPage);
      this.renderAll();
    }
  },

  /* ===== Back / Deselect ===== */

  /**
   * "Back" button handler.  Follows a priority chain:
   *
   *  1. If connection view is active, exit it first and stay on the
   *     currently selected module/block.  This mirrors the physical
   *     ZOIA behaviour where pressing Back in connection mode returns
   *     to the selected block rather than deselecting entirely.
   *
   *  2. Otherwise, deselect the current module, clear shift mode and
   *     any active drag, and hide open popups/context menus.
   */
  back: function() {
    var s = ZOIA.state;

    /* Priority 0: deselect grid-dot connection selection */
    if (s.selectedConnection !== null) {
      ZOIA.clearSelectedConnection();
      ZOIA.gridButtons.render();
      if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
      return;
    }

    /* Priority 1: exit connection view but keep the selected block */
    if (s.connectionView) {
      ZOIA.exitConnectionView();
      ZOIA.gridButtons.render();
      if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
      return;
    }

    /* Priority 2: full deselect and UI reset */
    s.selectedModule = null;
    s.selectedBlock = null;
    s.selectedConnection = null;
    s.shiftMode = false;
    s.dragSrc = null;
    ZOIA.moduleAdd.hide();
    ZOIA.gridContextMenu.hide();
    var shiftBtn = document.getElementById('shift-btn');
    if (shiftBtn) shiftBtn.classList.remove('shift-active');
    this.renderAll();
  },

  /* ===== Shift Mode ===== */

  /**
   * Toggle shift mode on the grid.  When active, grid buttons display
   * action labels (Add, Star, etc.) instead of module names.
   */
  toggleShift: function() {
    ZOIA.state.shiftMode = !ZOIA.state.shiftMode;
    var shiftBtn = document.getElementById('shift-btn');
    if (shiftBtn) shiftBtn.classList.toggle('shift-active', ZOIA.state.shiftMode);
    ZOIA.gridButtons.render();
  },

  /* ===== Drop Zone and Global Event Delegation ===== */

  /**
   * Initialise drag-and-drop on the pedal element so users can drop a
   * .bin file directly onto the hardware view to load it.  Also sets
   * up global click / right-click / mouseup listeners for closing
   * popups, context menus, and cancelling grid-button drags.
   *
   * Called once during viewManager.init().
   */
  initDropZone: function() {
    var pedal = document.getElementById('pedal');
    var hwDrop = document.getElementById('hw-drop-overlay');

    /* --- .bin file drag-and-drop on the pedal --- */
    pedal.addEventListener('dragover', function(e) {
      e.preventDefault();
      hwDrop.classList.add('active');
    });
    pedal.addEventListener('dragleave', function(e) {
      /* Only deactivate when the cursor truly leaves the pedal bounds */
      if (!pedal.contains(e.relatedTarget)) hwDrop.classList.remove('active');
    });
    pedal.addEventListener('drop', function(e) {
      e.preventDefault();
      hwDrop.classList.remove('active');
      var f = e.dataTransfer.files[0];
      if (f && f.name.endsWith('.bin')) ZOIA.handleFile(f);
    });

    /* --- Click-outside to close popups and context menus --- */
    document.addEventListener('click', function(e) {
      var popup = document.getElementById('module-add-popup');
      if (popup && popup.classList.contains('visible') && !popup.contains(e.target)) {
        ZOIA.moduleAdd.hide();
      }
      var ctxMenu = document.getElementById('grid-context-menu');
      if (ctxMenu && ctxMenu.classList.contains('visible') && !ctxMenu.contains(e.target)) {
        ZOIA.gridContextMenu.hide();
      }
    });

    /* --- Right-click on pedal: close context menu if open --- */
    document.getElementById('pedal').addEventListener('contextmenu', function(e) {
      var ctxMenu = document.getElementById('grid-context-menu');
      if (ctxMenu && ctxMenu.classList.contains('visible')) {
        if (!ctxMenu.contains(e.target)) {
          ZOIA.gridContextMenu.hide();
        }
      }
    });

    /* --- Global mouseup: cancel any in-progress grid drag --- */
    document.addEventListener('mouseup', function() {
      if (ZOIA.state.dragSrc) {
        ZOIA.state.dragSrc = null;
        ZOIA.gridButtons._hideDragIndicator();
        ZOIA.gridButtons.render();
      }
    });
  }
};


