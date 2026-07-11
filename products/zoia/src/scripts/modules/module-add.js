// === module-add.js ===
/**
 * module-add.js -- Module-Add Popup
 *
 * Provides a searchable popup for placing new modules onto the grid.
 * Triggered by clicking or right-clicking an empty grid button. The popup
 * displays a filtered list from ZOIA.MODULE_DB, checks for grid overflow
 * and position collisions, and creates a fully initialized module object
 * when a selection is made.
 *
 * Namespace: window.ZOIA.moduleAdd
 */
window.ZOIA = window.ZOIA || {};

ZOIA.moduleAdd = {

  /** Cached popup DOM element (created on first use) */
  _popup: null,

  /** Grid position where the new module will be placed */
  _targetPos: null,

  // ===== POPUP LIFECYCLE =====

  /**
   * Lazily create the popup element and append it to the pedal container.
   * The popup contains a close button, title with position, search input,
   * and a scrollable list of module entries.
   * @returns {HTMLElement} The popup element.
   */
  _ensurePopup: function() {
    if (this._popup) return this._popup;
    var popup = document.createElement('div');
    popup.id = 'module-add-popup';
    popup.innerHTML =
      '<span class="popup-close" onclick="ZOIA.moduleAdd.hide()">&times;</span>' +
      '<div class="popup-title">Add Module at <span id="popup-pos"></span></div>' +
      '<input class="popup-search" id="popup-search" placeholder="Search modules..." oninput="ZOIA.moduleAdd.filter(this.value)">' +
      '<div class="popup-list" id="popup-list"></div>';
    document.getElementById('pedal').appendChild(popup);
    this._popup = popup;
    return popup;
  },

  /**
   * Show the module-add popup, positioned near the clicked grid button.
   * Resets the search field and populates the full module list.
   *
   * @param {number}      gridPos - The grid position (0..39) to place the module.
   * @param {HTMLElement}  btnEl   - The empty grid button element that was clicked.
   */
  show: function(gridPos, btnEl) {
    var s = ZOIA.state;
    if (!s.patch) return;

    // Dismiss the context menu if it is open
    if (ZOIA.gridContextMenu) ZOIA.gridContextMenu.hide();

    var popup = this._ensurePopup();
    this._targetPos = gridPos;

    // Display the target position label (e.g. "R2 C5")
    var r = Math.floor(gridPos / ZOIA.GRID_COLS);
    var c = gridPos % ZOIA.GRID_COLS;
    document.getElementById('popup-pos').textContent = 'R' + r + ' C' + c;

    // ----- Position the popup near the clicked button -----
    var rect = btnEl.getBoundingClientRect();
    var pedalRect = document.getElementById('pedal').getBoundingClientRect();
    var left = rect.left - pedalRect.left + rect.width + 4;
    var top = rect.top - pedalRect.top;

    // Clamp to keep popup within the pedal bounds
    if (left + 230 > pedalRect.width) left = rect.left - pedalRect.left - 230;
    if (top + 250 > pedalRect.height) top = pedalRect.height - 260;
    if (top < 0) top = 4;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    // Clean up any leftover variant panel from a previous session
    var oldVP = document.getElementById('variant-panel');
    if (oldVP) oldVP.parentNode.removeChild(oldVP);

    // Ensure search and list are visible (may have been hidden by variant panel)
    var searchEl = document.getElementById('popup-search');
    var listEl = document.getElementById('popup-list');
    if (searchEl) searchEl.style.display = '';
    if (listEl) listEl.style.display = '';

    // Populate the unfiltered module list and show the popup
    this.filter('');
    popup.classList.add('visible');

    // Focus the search input after a brief delay (allows CSS transition)
    searchEl.value = '';
    setTimeout(function() { searchEl.focus(); }, 50);
  },

  /** Hide the popup, clean up variant panel, and clear the target position. */
  hide: function() {
    if (this._popup) {
      this._popup.classList.remove('visible');
      // Remove any lingering variant panel so the popup is clean next time
      var vp = document.getElementById('variant-panel');
      if (vp) vp.parentNode.removeChild(vp);
    }
    this._targetPos = null;
  },

  // ===== MODULE LIST FILTERING =====

  /**
   * Filter the module list by a search query. Matches against both the
   * module name and category. Results are sorted alphabetically and
   * capped at 30 visible entries.
   *
   * @param {string} query - The search text (case-insensitive).
   */
  filter: function(query) {
    var list = document.getElementById('popup-list');
    if (!list) return;
    list.innerHTML = '';

    var q = query.toLowerCase();
    var db = ZOIA.MODULE_DB;

    // Sort module type keys alphabetically by name
    var keys = Object.keys(db).sort(function(a, b) {
      return db[a].name.localeCompare(db[b].name);
    });

    var count = 0;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var mod = db[k];

      // Skip entries that don't match the query
      if (q && mod.name.toLowerCase().indexOf(q) < 0 && mod.cat.toLowerCase().indexOf(q) < 0) {
        continue;
      }

      var item = document.createElement('div');
      item.className = 'popup-item';
      item.innerHTML = '<span class="mi-name">' + mod.name + '</span>' +
        '<span class="mi-cat">' + mod.cat + ' (' + mod.blocks.length + ')</span>';

      // Click handler: show variants if available, otherwise add immediately
      (function(typeIdx) {
        item.onclick = function(e) {
          e.stopPropagation();
          var modDef = ZOIA.MODULE_DB[typeIdx];
          if (modDef && modDef.variants) {
            ZOIA.moduleAdd._showVariants(typeIdx);
          } else {
            ZOIA.moduleAdd.addModule(typeIdx);
          }
        };
      })(parseInt(k, 10));

      list.appendChild(item);
      count++;
      if (count >= 30) break; // cap visible results for performance
    }

    // Show a placeholder when no modules match
    if (count === 0) {
      list.innerHTML = '<div style="color:#666;padding:8px;text-align:center;">No matching modules</div>';
    }
  },

  // ===== VARIANT SELECTION =====

  /**
   * Derive a descriptive label for a block layout.
   * Detects stereo (L/R) vs mono based on block names, and reports the
   * block count.
   *
   * @param {Array<{n:string, t:string}>} blocks - Block descriptor array.
   * @returns {string} A label like "Stereo (6 blocks)" or "Mono (3 blocks)".
   */
  _deriveVariantLabel: function(blocks) {
    var hasStereo = false;
    for (var i = 0; i < blocks.length; i++) {
      var name = blocks[i].n.toLowerCase();
      if (name.indexOf('l ') === 0 || name.indexOf('r ') === 0 ||
          name === 'left' || name === 'right' ||
          name.indexOf('l in') === 0 || name.indexOf('r in') === 0 ||
          name.indexOf('l out') === 0 || name.indexOf('r out') === 0) {
        hasStereo = true;
        break;
      }
    }
    var label = hasStereo ? 'Stereo' : 'Mono';
    label += ' (' + blocks.length + ' block' + (blocks.length !== 1 ? 's' : '') + ')';
    return label;
  },

  /**
   * Show the variant selection sub-panel for a module type.
   * Hides the search input and module list, replacing them with a back
   * button and a list of variant options (including the default layout).
   *
   * @param {number} typeIdx - The module type index in ZOIA.MODULE_DB.
   */
  _showVariants: function(typeIdx) {
    var self = this;
    var db = ZOIA.MODULE_DB[typeIdx];
    if (!db || !db.variants) return;

    // Hide the search and module list
    var searchEl = document.getElementById('popup-search');
    var listEl = document.getElementById('popup-list');
    if (searchEl) searchEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';

    // Remove any previous variant panel
    var oldPanel = document.getElementById('variant-panel');
    if (oldPanel) oldPanel.parentNode.removeChild(oldPanel);

    // Build the variant panel
    var panel = document.createElement('div');
    panel.id = 'variant-panel';
    panel.className = 'variant-panel';

    // Header with back button and module name
    var header = document.createElement('div');
    header.className = 'variant-header';

    var backBtn = document.createElement('button');
    backBtn.className = 'variant-back';
    backBtn.textContent = 'Back';
    backBtn.onclick = function(e) {
      e.stopPropagation();
      self._showList();
    };
    header.appendChild(backBtn);

    var title = document.createElement('span');
    title.className = 'variant-title';
    title.textContent = db.name;
    header.appendChild(title);

    panel.appendChild(header);

    // Scrollable variant list
    var vList = document.createElement('div');
    vList.className = 'variant-list';

    // Collect all choices: default blocks + each variant
    // Build an ordered array of {key, blocks} entries
    var choices = [];

    // Check if key 0 is explicitly in variants
    var hasVariant0 = db.variants.hasOwnProperty(0) || db.variants.hasOwnProperty('0');

    if (!hasVariant0) {
      // Default blocks (option byte 0) are the base blocks
      choices.push({ key: 0, blocks: db.blocks });
    }

    // Add all variant keys (sorted numerically)
    var variantKeys = Object.keys(db.variants).sort(function(a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    for (var i = 0; i < variantKeys.length; i++) {
      var vk = parseInt(variantKeys[i], 10);
      choices.push({ key: vk, blocks: db.variants[variantKeys[i]] });
    }

    // If variant 0 exists, also add the base blocks as the "default" but
    // we need to figure out what option byte triggers base blocks.
    // When variant key 0 is present, the base blocks are used when options[0]
    // does NOT match any variant key. We'll present it as "Default" with a
    // sentinel key of -1 to signal "use base blocks, option byte 0".
    if (hasVariant0) {
      // Insert base blocks as first choice with a special marker
      choices.unshift({ key: -1, blocks: db.blocks, isBase: true });
    }

    for (var c = 0; c < choices.length; c++) {
      var choice = choices[c];
      var item = document.createElement('div');
      item.className = 'variant-item';

      var label = self._deriveVariantLabel(choice.blocks);
      if (choice.isBase) {
        label = 'Default - ' + label;
      }

      // Build block names string
      var blockNames = [];
      for (var b = 0; b < choice.blocks.length; b++) {
        blockNames.push(choice.blocks[b].n);
      }

      var labelDiv = document.createElement('div');
      labelDiv.className = 'vi-label';
      labelDiv.textContent = label;
      item.appendChild(labelDiv);

      var blocksDiv = document.createElement('div');
      blocksDiv.className = 'vi-blocks';
      blocksDiv.textContent = blockNames.join(', ');
      item.appendChild(blocksDiv);

      // Click handler to add with this variant
      (function(optionByte, variantBlocks) {
        item.onclick = function(e) {
          e.stopPropagation();
          self.addModule(typeIdx, optionByte, variantBlocks);
        };
      })(choice.key === -1 ? 0 : choice.key, choice.blocks);

      vList.appendChild(item);
    }

    panel.appendChild(vList);
    this._popup.appendChild(panel);
  },

  /**
   * Return from the variant sub-panel to the module list view.
   * Restores the search input and module list, removing the variant panel.
   */
  _showList: function() {
    // Remove variant panel
    var panel = document.getElementById('variant-panel');
    if (panel) panel.parentNode.removeChild(panel);

    // Restore search and list
    var searchEl = document.getElementById('popup-search');
    var listEl = document.getElementById('popup-list');
    if (searchEl) {
      searchEl.style.display = '';
      searchEl.focus();
    }
    if (listEl) listEl.style.display = '';
  },

  // ===== MODULE CREATION =====

  /**
   * Add a new module of the specified type at the target grid position.
   * Validates that all required grid slots are available, creates the
   * module object, appends it to the patch, and refreshes the UI.
   *
   * @param {number}                        typeIdx       - The module type index in ZOIA.MODULE_DB.
   * @param {number}                        [optionByte]  - Option byte value for options[0] (default 0).
   * @param {Array<{n:string, t:string}>}   [blockOverride] - Variant block layout to use instead of defaults.
   */
  addModule: function(typeIdx, optionByte, blockOverride) {
    var s = ZOIA.state;
    if (!s.patch || this._targetPos === null) return;

    var db = ZOIA.MODULE_DB[typeIdx];
    if (!db) return;

    var optByte = (typeof optionByte === 'number') ? optionByte : 0;
    var blocks = blockOverride || db.blocks;
    var blockCount = blocks.length;

    // ----- Validate grid space availability -----
    for (var b = 0; b < blockCount; b++) {
      var checkPos = this._targetPos + b;

      // Check for page overflow
      if (checkPos >= ZOIA.GRID_SIZE) {
        alert('Not enough room: module needs ' + blockCount + ' blocks but would overflow the page.');
        return;
      }

      // Check for overlap with existing modules
      var occupied = false;
      s.patch.modules.forEach(function(m) {
        if (m.page !== s.currentPage) return;
        var mbc = m.blockCount || (m.blocks ? m.blocks.length : 1);
        for (var mb = 0; mb < mbc; mb++) {
          if (m.gridPos + mb === checkPos) occupied = true;
        }
      });
      if (occupied) {
        alert('Position ' + checkPos + ' is already occupied.');
        return;
      }
    }

    // ----- Determine instance name (e.g. "VCA 2" for the second VCA) -----
    var typeCount = 0;
    s.patch.modules.forEach(function(m) {
      if (m.typeIdx === typeIdx) typeCount++;
    });

    // ----- Build the new module object -----
    var newIdx = s.patch.modules.length;
    var newModule = {
      idx: newIdx,
      typeIdx: typeIdx,
      page: s.currentPage,
      colorId: (newIdx % 15) + 1,
      gridPos: this._targetPos,
      name: db.name + ' ' + (typeCount + 1),
      typeName: db.name,
      blocks: blocks.slice(),
      blockCount: blockCount,
      category: db.cat,
      params: [],
      options: [optByte, 0, 0, 0, 0, 0, 0, 0],
      paramCount: 0
    };

    s.patch.modules.push(newModule);
    s.patch.moduleCount = s.patch.modules.length;

    // Select the newly added module
    s.selectedModule = newIdx;
    s.selectedBlock = 0;

    // Close the popup and refresh the UI
    this.hide();
    ZOIA.updatePatchSummary();
    ZOIA.hardwareView.renderAll();
  }
};


