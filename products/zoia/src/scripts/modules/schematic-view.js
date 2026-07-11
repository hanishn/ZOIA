// === schematic-view.js ===
/**
 * schematic-view.js -- Schematic View (Signal-Flow Diagram)
 * ===========================================================
 * Renders the signal-flow / schematic layout of the currently loaded
 * ZOIA patch.  Comprises five visual regions:
 *
 *   - Grid:          8x5 cell matrix showing module placement
 *   - SVG Overlay:   Bezier curves representing audio/CV/gate/param
 *                    connections drawn on top of the grid
 *   - Page Tabs:     Tab bar for switching between patch pages
 *   - Patch Info:    Left-panel statistics (name, counts, CPU est.)
 *   - Module Detail: Right-panel detail for the selected module
 *
 * Depends on: ZOIA.state, ZOIA.COLORS, ZOIA.COLOR_NAMES,
 *             ZOIA.CONN_STYLES, ZOIA.MODULE_DB, ZOIA.getConnType,
 *             ZOIA.handleFile, ZOIA.parsePatch, ZOIA.loadPatch
 *
 * @namespace ZOIA.schematicView
 */
window.ZOIA = window.ZOIA || {};

ZOIA.schematicView = {

  /* ===== Full Re-render ===== */

  /** Render every sub-region of the schematic view. */
  renderAll: function() {
    this.renderGrid();
    this.renderPageTabs();
    this.renderPatchInfo();
    this.renderModuleList();
    this.renderModuleDetail();
  },

  /* ===== Module Selection ===== */

  /**
   * Toggle selection of a module by index.  Clicking the same module
   * again deselects it.
   *
   * @param {number} idx - Module index within the patch
   */
  selectModule: function(idx) {
    var s = ZOIA.state;
    s.selectedModule = s.selectedModule === idx ? null : idx;
    this.renderGrid();
    this.renderModuleList();
    this.renderModuleDetail();
  },

  /* ===== Grid Rendering ===== */

  /**
   * Render the dual-page grid layout.  Creates two side-by-side grids
   * (primary page on the left, secondary page on the right) with page
   * selector dropdowns above each grid and an SVG connection overlay
   * per grid.  Falls back to single-grid mode when no patch is loaded.
   *
   * The DOM structure is built dynamically inside #sch-grid-container
   * the first time and reused on subsequent calls.
   */
  renderGrid: function() {
    var container = document.getElementById('sch-grid-container');
    var s = ZOIA.state;

    if (!s.patch) {
      container.innerHTML = '<div id="sch-grid"></div><svg id="sch-svg-overlay"></svg>';
      return;
    }

    /* Build the dual-grid DOM if it does not yet exist */
    var dualArea = document.getElementById('sch-dual-grid-area');
    if (!dualArea) {
      container.innerHTML = '';
      dualArea = document.createElement('div');
      dualArea.id = 'sch-dual-grid-area';

      /* Left (primary) column */
      var leftCol = document.createElement('div');
      leftCol.className = 'sch-grid-column';

      var leftHeader = document.createElement('div');
      leftHeader.className = 'sch-grid-header';
      var leftLabel = document.createElement('span');
      leftLabel.className = 'sch-grid-label';
      leftLabel.textContent = 'PRIMARY';
      var leftSelect = document.createElement('select');
      leftSelect.id = 'sch-page-select-left';
      leftSelect.onchange = function() { ZOIA.schematicView.goToPage(this.value); };
      leftHeader.appendChild(leftLabel);
      leftHeader.appendChild(leftSelect);

      var leftGridWrap = document.createElement('div');
      leftGridWrap.className = 'sch-grid-wrap';
      var leftGrid = document.createElement('div');
      leftGrid.id = 'sch-grid-left';
      leftGrid.className = 'sch-grid';
      var leftSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      leftSvg.id = 'sch-svg-overlay-left';
      leftSvg.setAttribute('class', 'sch-svg-overlay');
      leftGridWrap.appendChild(leftGrid);
      leftGridWrap.appendChild(leftSvg);

      leftCol.appendChild(leftHeader);
      leftCol.appendChild(leftGridWrap);

      /* Divider */
      var divider = document.createElement('div');
      divider.className = 'sch-grid-divider';

      /* Right (secondary) column */
      var rightCol = document.createElement('div');
      rightCol.className = 'sch-grid-column';

      var rightHeader = document.createElement('div');
      rightHeader.className = 'sch-grid-header';
      var rightLabel = document.createElement('span');
      rightLabel.className = 'sch-grid-label';
      rightLabel.textContent = 'SECONDARY';
      var rightSelect = document.createElement('select');
      rightSelect.id = 'sch-page-select-right';
      rightSelect.onchange = function() { ZOIA.schematicView.goToSecondaryPage(this.value); };
      rightHeader.appendChild(rightLabel);
      rightHeader.appendChild(rightSelect);

      var rightGridWrap = document.createElement('div');
      rightGridWrap.className = 'sch-grid-wrap';
      var rightGrid = document.createElement('div');
      rightGrid.id = 'sch-grid-right';
      rightGrid.className = 'sch-grid';
      var rightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      rightSvg.id = 'sch-svg-overlay-right';
      rightSvg.setAttribute('class', 'sch-svg-overlay');
      rightGridWrap.appendChild(rightGrid);
      rightGridWrap.appendChild(rightSvg);

      rightCol.appendChild(rightHeader);
      rightCol.appendChild(rightGridWrap);

      dualArea.appendChild(leftCol);
      dualArea.appendChild(divider);
      dualArea.appendChild(rightCol);
      container.appendChild(dualArea);
    }

    /* Render cells into both grids */
    this._renderSingleGrid(document.getElementById('sch-grid-left'), s.currentPage);
    this._renderSingleGrid(document.getElementById('sch-grid-right'), s.secondaryPage);

    /* Update page selector dropdowns */
    this._updatePageSelectors();

    /* Draw SVG connections for both pages */
    this._renderConnectionsForSvg(document.getElementById('sch-svg-overlay-left'), s.currentPage);
    this._renderConnectionsForSvg(document.getElementById('sch-svg-overlay-right'), s.secondaryPage);
  },

  /**
   * Render a single 8x5 cell grid into the given container for the
   * specified page.
   *
   * @param {HTMLElement} gridEl - The grid container element.
   * @param {number}      page   - The page index to render.
   */
  _renderSingleGrid: function(gridEl, page) {
    gridEl.innerHTML = '';
    var s = ZOIA.state;
    if (!s.patch) return;

    /* --- Build position map: gridPos -> { module, blockIndex, ... } --- */
    var posMap = {};
    s.patch.modules.filter(function(m) { return m.page === page; })
      .forEach(function(m) {
        var bc = m.blockCount || (m.blocks ? m.blocks.length : 1);
        for (var b = 0; b < bc; b++) {
          var pos = m.gridPos + b;
          if (pos >= ZOIA.GRID_SIZE) break;
          posMap[pos] = { module: m, blockIndex: b, isFirst: b === 0, blockCount: bc };
        }
      });

    /* --- Create one <div class="cell"> per grid position --- */
    for (var r = 0; r < ZOIA.GRID_ROWS; r++) {
      for (var c = 0; c < ZOIA.GRID_COLS; c++) {
        var pos = r * ZOIA.GRID_COLS + c;
        var cell = document.createElement('div');
        cell.className = 'cell';
        var info = posMap[pos];

        if (info) {
          var mod = info.module;
          cell.classList.add('occupied');

          /* Colour: translucent fill + solid border from the module colour */
          var col = ZOIA.COLORS[mod.colorId] || '#666';
          cell.style.background = col + '33';
          cell.style.borderColor = col;
          if (s.selectedModule === mod.idx) cell.classList.add('selected');

          /* Label: module name on first block, block name on every block */
          var blk = mod.blocks && mod.blocks[info.blockIndex] ? mod.blocks[info.blockIndex] : null;
          var label = info.isFirst ? '<span class="mod-name">' + mod.name + '</span>' : '';
          label += blk ? '<span class="mod-type">' + blk.n + '</span>' : '<span class="mod-type">' + mod.typeName + '</span>';
          cell.innerHTML = label;

          /* Click handler (closure to capture modIdx) */
          (function(modIdx) {
            cell.onclick = function() { ZOIA.schematicView.selectModule(modIdx); };
          })(mod.idx);
        }

        gridEl.appendChild(cell);
      }
    }
  },

  /* ===== Page Navigation ===== */

  /**
   * Navigate the primary (left) page in the schematic dual-grid view.
   *
   * @param {string|number} val - Page index or 'blank' for a new page.
   */
  goToPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return;
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.currentPage = newIdx;
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.currentPage = idx;
    }

    s.selectedModule = null;
    this.renderAll();
  },

  /**
   * Navigate the secondary (right) page in the schematic dual-grid view.
   *
   * @param {string|number} val - Page index or 'blank' for a new page.
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
   * Populate the left and right page-selector dropdowns in dual-grid mode.
   */
  _updatePageSelectors: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    var leftSel = document.getElementById('sch-page-select-left');
    var rightSel = document.getElementById('sch-page-select-right');

    var selectors = [leftSel, rightSel];
    for (var si = 0; si < selectors.length; si++) {
      var sel = selectors[si];
      if (!sel) continue;
      var curPage = si === 0 ? s.currentPage : s.secondaryPage;
      sel.innerHTML = '';
      for (var i = 0; i < s.patch.pages.length; i++) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i + ': ' + s.patch.pages[i];
        if (i === curPage) opt.selected = true;
        sel.appendChild(opt);
      }
    }
  },

  /* ===== SVG Connection / Edge Rendering ===== */

  /**
   * Public wrapper: re-draw connections on both SVG overlays.
   * Called by toggleConn() when a filter changes.
   */
  renderConnections: function() {
    var s = ZOIA.state;
    var leftSvg = document.getElementById('sch-svg-overlay-left');
    var rightSvg = document.getElementById('sch-svg-overlay-right');
    if (leftSvg) this._renderConnectionsForSvg(leftSvg, s.currentPage);
    if (rightSvg) this._renderConnectionsForSvg(rightSvg, s.secondaryPage);
  },

  /**
   * Draw Bezier-curve connections between module blocks using an SVG
   * overlay that sits directly on top of a grid.
   *
   * For each connection in the patch:
   *  1. Determine the connection type (audio/cv/gate/param) to pick
   *     colour, stroke width, and optional dash pattern.
   *  2. Compute source and destination centre-points from grid position.
   *  3. Build a cubic Bezier path (C command) with horizontal tangent
   *     offsets so curves bow outward naturally.
   *  4. Apply opacity based on connection strength (0-10000 range),
   *     dimming unrelated connections when a module is selected.
   *  5. Attach mouse-hover tooltip showing source/dest names, signal
   *     type, and strength percentage.
   *
   * SVG arrow markers are defined in a <defs> block, one per type.
   *
   * @param {SVGElement} svg  - The SVG element to render into.
   * @param {number}     page - The page index whose connections to draw.
   */
  _renderConnectionsForSvg: function(svg, page) {
    /* Size the SVG to cover the entire grid area */
    var cellW = 56, gap = 3;
    var gw = ZOIA.GRID_COLS * cellW + (ZOIA.GRID_COLS - 1) * gap;
    var gh = ZOIA.GRID_ROWS * cellW + (ZOIA.GRID_ROWS - 1) * gap;
    svg.setAttribute('width', gw);
    svg.setAttribute('height', gh);
    svg.innerHTML = '';

    var s = ZOIA.state;
    if (!s.patch) return;

    /* Use the SVG element's id as a prefix to keep marker ids unique
       across left and right overlays (avoids cross-SVG id collisions). */
    var prefix = svg.id ? svg.id + '-' : '';

    /* --- SVG <defs>: arrowhead markers per connection type --- */
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    ['audio', 'cv', 'gate', 'param'].forEach(function(type) {
      var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', prefix + 'arrow-' + type);
      marker.setAttribute('viewBox', '0 0 10 6');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '3');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('orient', 'auto');
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '0,0 10,3 0,6');
      poly.setAttribute('fill', ZOIA.CONN_STYLES[type].color);
      marker.appendChild(poly);
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    /* --- Helper: compute pixel centre of a module block --- */
    function blockCenter(mod, blockIdx) {
      var pos = mod.gridPos + (blockIdx || 0);
      // Clamp to valid grid range to prevent out-of-bounds positions
      if (pos < 0) pos = 0;
      if (pos >= ZOIA.GRID_SIZE) pos = ZOIA.GRID_SIZE - 1;
      var c = pos % ZOIA.GRID_COLS;
      var r = Math.floor(pos / ZOIA.GRID_COLS);
      return {
        x: c * (cellW + gap) + cellW / 2,
        y: r * (cellW + gap) + cellW / 2
      };
    }

    /* --- Draw one Bezier path per connection --- */
    s.patch.connections.forEach(function(conn) {
      var sm = s.patch.modules[conn.srcMod];
      var dm = s.patch.modules[conn.dstMod];
      if (!sm || !dm) return;

      /* Only draw connections where BOTH endpoints are on this page */
      if (sm.page !== page || dm.page !== page) return;

      /* Skip connections that reference blocks beyond the module's visible block count.
         The binary can contain connections to internal parameter slots that aren't
         represented in our resolved block layout, producing arrows to wrong positions. */
      var smBlockCount = sm.blockCount || (sm.blocks ? sm.blocks.length : 1);
      var dmBlockCount = dm.blockCount || (dm.blocks ? dm.blocks.length : 1);
      if (conn.srcBlock >= smBlockCount || conn.dstBlock >= dmBlockCount) return;

      /* Determine visual style from connection type */
      var type = ZOIA.getConnType(conn);
      if (!s.connFilters[type]) return;
      var style = ZOIA.CONN_STYLES[type];

      /* Opacity: capped at 50% to avoid obscuring buttons, further dimmed
         when a different module is selected. */
      var opacity = Math.min(0.5, Math.max(0.2, conn.strength / 10000 * 0.5));
      var src = blockCenter(sm, conn.srcBlock);
      var dst = blockCenter(dm, conn.dstBlock);
      var dx = dst.x - src.x;

      /* Build cubic Bezier: control points offset 30% of horizontal
         distance to create a gentle horizontal bow. */
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d',
        'M' + src.x + ',' + src.y +
        ' C' + (src.x + dx * 0.3) + ',' + src.y +
        ' ' + (dst.x - dx * 0.3) + ',' + dst.y +
        ' ' + dst.x + ',' + dst.y
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', style.color);
      path.setAttribute('stroke-width', style.width);
      if (style.dash) path.setAttribute('stroke-dasharray', style.dash);

      /* Dim connections unrelated to the selected module */
      path.setAttribute('opacity',
        s.selectedModule !== null && conn.srcMod !== s.selectedModule && conn.dstMod !== s.selectedModule
          ? opacity * 0.2
          : opacity
      );

      path.setAttribute('marker-end', 'url(#' + prefix + 'arrow-' + type + ')');
      path.classList.add('conn-hover');
      path.style.pointerEvents = 'stroke';

      /* --- Hover tooltip --- */
      var srcBlk = sm.blocks[conn.srcBlock] ? sm.blocks[conn.srcBlock].n : 'out ' + conn.srcBlock;
      var dstBlk = dm.blocks[conn.dstBlock] ? dm.blocks[conn.dstBlock].n : 'in ' + conn.dstBlock;

      path.addEventListener('mouseenter', function(e) {
        var tt = document.getElementById('tooltip');
        tt.innerHTML = '<b>' + sm.name + '</b> [' + srcBlk + '] \u2192 <b>' + dm.name + '</b> [' + dstBlk + ']<br>' +
          type.toUpperCase() + ' \u00B7 Strength: ' + (conn.strength / 100).toFixed(0) + '%';
        tt.style.display = 'block';
        tt.style.left = (e.clientX + 10) + 'px';
        tt.style.top = (e.clientY - 30) + 'px';
      });
      path.addEventListener('mouseleave', function() {
        document.getElementById('tooltip').style.display = 'none';
      });
      path.addEventListener('mousemove', function(e) {
        var tt = document.getElementById('tooltip');
        tt.style.left = (e.clientX + 10) + 'px';
        tt.style.top = (e.clientY - 30) + 'px';
      });

      svg.appendChild(path);
    });
  },

  /* ===== Page Tabs ===== */

  /** Render the tab bar at the top of the centre panel. */
  renderPageTabs: function() {
    var tabs = document.getElementById('sch-page-tabs');
    tabs.innerHTML = '';
    var s = ZOIA.state;
    if (!s.patch) return;
    var self = this;
    s.patch.pages.forEach(function(name, i) {
      var tab = document.createElement('div');
      tab.className = 'page-tab' + (i === s.currentPage ? ' active' : '');
      tab.textContent = name;
      tab.onclick = function() { s.currentPage = i; self.renderAll(); };
      tabs.appendChild(tab);
    });
  },

  /* ===== Left Panel: Patch Info ===== */

  /** Render aggregate patch statistics in the left panel. */
  renderPatchInfo: function() {
    var el = document.getElementById('sch-patch-info');
    var p = ZOIA.state.patch;
    if (!p) { el.innerHTML = '<p class="info-text">No patch loaded.</p>'; return; }

    var audioMods = p.modules.filter(function(m) {
      var d = ZOIA.MODULE_DB[m.typeIdx];
      return d && d.cat === "Audio";
    }).length;

    el.innerHTML =
      '<div class="stat-row"><span class="stat-label">Name</span><span class="stat-value">' + p.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Modules</span><span class="stat-value">' + p.moduleCount + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Connections</span><span class="stat-value">' + p.connections.length + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Pages</span><span class="stat-value">' + p.pages.length + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Audio Modules</span><span class="stat-value">' + audioMods + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Est. CPU</span><span class="stat-value">' + Math.min(100, Math.round(p.moduleCount * 2.5 + audioMods * 3)) + '%</span></div>';
  },

  /* ===== Left Panel: Module List ===== */

  /** Render the scrollable list of all modules in the patch. */
  renderModuleList: function() {
    var el = document.getElementById('sch-module-list');
    var s = ZOIA.state;
    if (!s.patch) { el.innerHTML = ''; return; }

    var html = '<div class="panel-title">Modules</div><div class="module-list">';
    s.patch.modules.forEach(function(m) {
      var col = ZOIA.COLORS[m.colorId] || '#666';
      html += '<div class="module-item' + (s.selectedModule === m.idx ? ' active' : '') +
        '" onclick="ZOIA.schematicView.selectModule(' + m.idx + ')">' +
        '<span class="module-dot" style="background:' + col + '"></span>' +
        '<span>' + m.name + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  },

  /* ===== Right Panel: Module Detail ===== */

  /**
   * Render detailed information about the selected module: metadata,
   * block list with colour-coded signal-type badges, and a list of
   * connections touching this module.
   */
  renderModuleDetail: function() {
    var el = document.getElementById('sch-module-detail');
    var s = ZOIA.state;

    if (s.selectedModule === null || !s.patch) {
      el.innerHTML = '<p class="info-text">Click a module to see details.</p>';
      return;
    }

    var m = s.patch.modules[s.selectedModule];
    if (!m) { el.innerHTML = ''; return; }
    var col = ZOIA.COLORS[m.colorId] || '#666';

    /* Module metadata */
    var html =
      '<div class="detail-section"><h3>Module</h3>' +
      '<div class="stat-row"><span class="stat-label">Name</span><span class="stat-value">' + m.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Type</span><span class="stat-value">' + m.typeName + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Category</span><span class="stat-value">' + (m.category || '?') + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Color</span><span class="stat-value" style="color:' + col + '">' + (ZOIA.COLOR_NAMES[m.colorId] || '?') + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Page</span><span class="stat-value">' + (s.patch.pages[m.page] || m.page) + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Grid Pos</span><span class="stat-value">R' + ((m.gridPos / ZOIA.GRID_COLS | 0) + 1) + ' C' + (m.gridPos % ZOIA.GRID_COLS + 1) + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Blocks</span><span class="stat-value">' + (m.blockCount || (m.blocks ? m.blocks.length : 1)) + ' buttons</span></div>' +
      '</div>';

    /* Block list with signal-type badges */
    if (m.blocks && m.blocks.length) {
      html += '<div class="detail-section"><h3>Blocks</h3>';
      m.blocks.forEach(function(b) {
        var st = b.t.startsWith('audio') ? 'audio' : b.t.startsWith('gate') ? 'gate' : b.t.startsWith('cv') ? 'cv' : 'param';
        var sty = ZOIA.CONN_STYLES[st];
        html += '<span class="conn-badge" style="background:' + sty.color + '22;color:' + sty.color + ';border:1px solid ' + sty.color + '44">' +
          b.n + ' (' + b.t.replace('_', ' ') + ')</span>';
      });
      html += '</div>';
    }

    /* Connections touching this module */
    var conns = s.patch.connections.filter(function(c) {
      return c.srcMod === m.idx || c.dstMod === m.idx;
    });
    if (conns.length) {
      html += '<div class="detail-section"><h3>Connections (' + conns.length + ')</h3>';
      conns.forEach(function(c) {
        var type = ZOIA.getConnType(c);
        var sty = ZOIA.CONN_STYLES[type];
        var other = c.srcMod === m.idx ? s.patch.modules[c.dstMod] : s.patch.modules[c.srcMod];
        var dir = c.srcMod === m.idx ? '\u2192' : '\u2190';
        html += '<div class="stat-row"><span class="stat-label" style="color:' + sty.color + '">' + dir + ' ' + (other ? other.name : '?') +
          '</span><span class="stat-value">' + (c.strength / 100).toFixed(0) + '%</span></div>';
      });
      html += '</div>';
    }

    el.innerHTML = html;
  },

  /* ===== Connection Filter Toggles ===== */

  /**
   * Toggle a connection type filter (audio/cv/gate/param) and re-draw
   * the SVG overlay.
   *
   * @param {HTMLElement} el - The toggle button element (data-type attr)
   */
  toggleConn: function(el) {
    var type = el.dataset.type;
    ZOIA.state.connFilters[type] = !ZOIA.state.connFilters[type];
    el.classList.toggle('on');
    this.renderConnections();
  },

  /* ===== Zoom Controls ===== */

  /**
   * Adjust the grid zoom level by a delta.  Clamps to [0.5, 2.0] and
   * applies a CSS transform on the grid container.
   *
   * @param {number} delta - Zoom increment (e.g. +0.1 or -0.1)
   */
  setZoom: function(delta) {
    var s = ZOIA.state;
    s.zoomLevel = Math.max(0.5, Math.min(2, s.zoomLevel + delta));
    document.getElementById('sch-grid-container').style.transform = 'scale(' + s.zoomLevel + ')';
    document.getElementById('sch-grid-container').style.transformOrigin = 'top center';
    document.getElementById('sch-zoom-label').textContent = Math.round(s.zoomLevel * 100) + '%';
  },

  /* ===== Drop Zone ===== */

  /**
   * Initialise drag-and-drop on the schematic centre panel so users
   * can drop a .bin file to load it.  Called once during init.
   */
  initDropZone: function() {
    var schCenter = document.getElementById('sch-center');
    var schDrop = document.getElementById('sch-drop-zone');
    if (!schCenter) return;

    schCenter.addEventListener('dragover', function(e) {
      e.preventDefault();
      schDrop.classList.add('active');
    });
    schCenter.addEventListener('dragleave', function(e) {
      if (!schCenter.contains(e.relatedTarget)) schDrop.classList.remove('active');
    });
    schCenter.addEventListener('drop', function(e) {
      e.preventDefault();
      schDrop.classList.remove('active');
      var f = e.dataTransfer.files[0];
      if (f && f.name.endsWith('.bin')) ZOIA.handleFile(f);
    });
  }
};


