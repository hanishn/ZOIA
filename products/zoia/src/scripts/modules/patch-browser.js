// === patch-browser.js ===
/**
 * patch-browser.js -- Patch Library / Browser Modal
 * ====================================================
 * Provides a self-contained modal UI for importing, storing, searching,
 * sorting, and loading ZOIA .bin patch files.  The library is persisted
 * to localStorage so patches survive page reloads.
 *
 * Architecture:
 *   - Wrapped in an IIFE to keep internal state private.
 *   - Public API is exposed via window.ZOIA.patchBrowser.
 *   - On load, the module reads localStorage, injects a "Library"
 *     toolbar button, and is ready for use.
 *
 * Features:
 *   - Drag-and-drop or file-picker import (single files or folders)
 *   - Lightweight binary metadata extraction (name, module count,
 *     connections, pages, categories) without full module resolution
 *   - Full-text search across patch name, categories, and page names
 *   - Sort by name / date-added / module count
 *   - Catalog export (JSON) and catalog import (JSON) for sharing
 *     entire libraries between browsers
 *   - Duplicate detection by name + file size
 *
 * Depends on: ZOIA.log, ZOIA.MODULE_DB, ZOIA.parsePatch, ZOIA.loadPatch
 *
 * ES5 compatible -- no arrow functions, no template literals, no let/const.
 *
 * @namespace ZOIA.patchBrowser
 */
window.ZOIA = window.ZOIA || {};

(function() {
  "use strict";

  /* ================================================================
   * Storage
   * ================================================================ */

  /** localStorage key for the serialised library array. */
  var STORAGE_KEY = 'zoia_patch_library';

  /* ================================================================
   * Library State
   * ================================================================ */

  /**
   * In-memory library.  Each entry:
   * { id, name, moduleCount, connCount, pageCount, pages,
   *   categories, size, addedAt, binBase64 }
   */
  var library = [];

  /** Current search/filter text (lowercased for comparison). */
  var filterText = '';

  /** Active sort field: 'name', 'date', or 'modules'. */
  var sortField = 'name';

  /** Sort direction: true = ascending. */
  var sortAsc = true;

  /**
   * Active category filters.  Keys are category names, values are booleans.
   * When empty (or all false), no category filtering is applied (show all).
   */
  var activeCategories = {};

  /* ================================================================
   * DOM Element References (populated on first open)
   * ================================================================ */

  var modal = null;
  var overlay = null;
  var searchInput = null;
  var listContainer = null;
  var dropZone = null;
  var importInput = null;
  var countLabel = null;
  var sortBtn = null;
  var categoryBar = null;

  /* ================================================================
   * Utility Functions
   * ================================================================ */

  /** Generate a short, collision-resistant unique ID. */
  function uid() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  /** Format a byte count as a human-readable string (B / KB / MB). */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** Format a timestamp as a compact "M/D HH:MM" string. */
  function formatDate(ts) {
    var d = new Date(ts);
    var mon = d.getMonth() + 1;
    var day = d.getDate();
    var h = d.getHours();
    var m = d.getMinutes();
    return mon + '/' + day + ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /** Convert an ArrayBuffer to a base64 string for JSON storage. */
  function bufToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /** Convert a base64 string back to an ArrayBuffer. */
  function base64ToBuf(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /** Escape a string for safe insertion into innerHTML. */
  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  /* ================================================================
   * Metadata Extraction
   * ================================================================ */

  /**
   * Extract lightweight metadata from a raw .bin ArrayBuffer without
   * performing full module resolution.  Walks the binary structure:
   *
   *   [4] presetSize
   *   [16] name (ASCII, null-padded)
   *   [4] moduleCount
   *   For each module:
   *     [4] modSize (in uint32 units)
   *     [4] typeIdx  -- used for category lookup in MODULE_DB
   *     [...] remaining module data (skipped via modSize)
   *   [4] connCount
   *   [connCount * 5 * 4] connection data (skipped)
   *   [4] pageCount
   *   For each page:
   *     [16] pageName (ASCII, null-padded)
   *
   * @param  {ArrayBuffer} buf - Raw .bin file contents
   * @return {Object}          - { name, moduleCount, connCount,
   *                               pageCount, pages, categories }
   */
  function extractMeta(buf) {
    var dv = new DataView(buf);
    var off = 0;

    /** Read a little-endian uint32 and advance the offset. */
    function r32() { var v = dv.getUint32(off, true); off += 4; return v; }

    /** Read a fixed-length ASCII string, keeping only printable chars. */
    function rStr(len) {
      var s = '';
      for (var i = 0; i < len; i++) {
        var c = dv.getUint8(off + i);
        if (c >= 32 && c <= 126) s += String.fromCharCode(c);
      }
      off += len;
      return s.trim();
    }

    var presetSize = r32();
    var name = rStr(16);
    var moduleCount = r32();

    /* Walk each module to collect category counts (skip body data) */
    var categories = {};
    for (var i = 0; i < moduleCount; i++) {
      var modStart = off;
      var modSize = r32();
      var typeIdx = r32();

      /* Look up category from the module database */
      var dbEntry = ZOIA.MODULE_DB ? ZOIA.MODULE_DB[typeIdx] : null;
      if (dbEntry && dbEntry.cat) {
        categories[dbEntry.cat] = (categories[dbEntry.cat] || 0) + 1;
      }

      /* Jump past the rest of this module (modSize is in uint32 units) */
      var expectedEnd = modStart + modSize * 4;
      off = expectedEnd;
    }

    /* Read connection count and skip all connection data */
    var connCount = 0;
    var pageCount = 1;
    var pages = ['Page 1'];
    try {
      connCount = r32();
      off += connCount * 5 * 4; // each connection: 5 x uint32

      /* Read page count and page name strings */
      pageCount = r32();
      if (pageCount > 0 && pageCount <= 64) {
        pages = [];
        for (var k = 0; k < pageCount; k++) {
          pages.push(rStr(16) || ('Page ' + (k + 1)));
        }
      } else {
        pageCount = 1;
      }
    } catch (e) {
      /* Some patches may not have pages section -- keep defaults */
    }

    var catList = Object.keys(categories).sort();

    return {
      name: name || 'Unnamed',
      moduleCount: moduleCount,
      connCount: connCount,
      pageCount: pageCount,
      pages: pages,
      categories: catList
    };
  }

  /* ================================================================
   * Persistence (localStorage)
   * ================================================================ */

  /** Serialise the library array and write it to localStorage. */
  function saveLibrary() {
    try {
      var data = JSON.stringify(library);
      localStorage.setItem(STORAGE_KEY, data);
      ZOIA.log('Patch library saved (' + library.length + ' patches, ' + (data.length / 1024).toFixed(1) + ' KB)');
    } catch (e) {
      ZOIA.log('WARNING: Could not save library to localStorage: ' + e.message);
    }
  }

  /** Load the library array from localStorage (if present). */
  function loadLibrary() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        library = JSON.parse(raw);
        ZOIA.log('Loaded patch library from storage: ' + library.length + ' patches');
      }
    } catch (e) {
      ZOIA.log('WARNING: Could not load library from localStorage: ' + e.message);
      library = [];
    }
  }

  /* ================================================================
   * Import Logic
   * ================================================================ */

  /**
   * Import a single .bin File object into the library.
   * Reads the file as an ArrayBuffer, extracts metadata, checks for
   * duplicates (by name + byte size), and appends to the library.
   *
   * @param {File}     file     - The .bin file to import
   * @param {Function} callback - Called with the new entry, or null
   */
  function importFile(file, callback) {
    if (!file || !file.name) {
      if (callback) callback(null);
      return;
    }

    /* Reject non-.bin files early */
    var ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'bin') {
      ZOIA.log('Skipping non-.bin file: ' + file.name);
      if (callback) callback(null);
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      var buf = e.target.result;
      try {
        var meta = extractMeta(buf);

        /* Duplicate check: same name AND same byte size */
        var isDup = false;
        for (var i = 0; i < library.length; i++) {
          if (library[i].name === meta.name && library[i].size === buf.byteLength) {
            isDup = true;
            break;
          }
        }
        if (isDup) {
          ZOIA.log('Skipping duplicate patch: "' + meta.name + '"');
          if (callback) callback(null);
          return;
        }

        var entry = {
          id: uid(),
          name: meta.name,
          moduleCount: meta.moduleCount,
          connCount: meta.connCount,
          pageCount: meta.pageCount,
          pages: meta.pages,
          categories: meta.categories,
          size: buf.byteLength,
          addedAt: Date.now(),
          binBase64: bufToBase64(buf)
        };

        library.push(entry);
        ZOIA.log('Imported patch: "' + entry.name + '" (' + entry.moduleCount + ' modules, ' + formatSize(entry.size) + ')');
        if (callback) callback(entry);
      } catch (err) {
        ZOIA.log('ERROR importing "' + file.name + '": ' + err.message);
        if (callback) callback(null);
      }
    };
    reader.onerror = function() {
      ZOIA.log('ERROR reading file: ' + file.name);
      if (callback) callback(null);
    };
    reader.readAsArrayBuffer(file);
  }

  /**
   * Import an array-like FileList sequentially, then save and refresh.
   * If the file list contains .json sidecar files (from PatchStorage /
   * ZOIA Librarian), they are parsed and matched to .bin files by
   * filename stem to enrich library entries with tags, author, excerpt,
   * and PatchStorage categories.
   *
   * @param {FileList|Array} fileList - Files to import
   */
  function importFiles(fileList) {
    var files = [];
    var jsonFiles = [];
    for (var i = 0; i < fileList.length; i++) {
      var fname = fileList[i].name.toLowerCase();
      if (fname.endsWith('.bin')) {
        files.push(fileList[i]);
      } else if (fname.endsWith('.json')) {
        jsonFiles.push(fileList[i]);
      }
    }
    if (files.length === 0) return;

    var imported = 0;
    var idx = 0;
    var total = files.length;

    /* --- Show progress indicator in the drop zone --- */
    var progressEl = null;
    if (dropZone) {
      progressEl = document.createElement('div');
      progressEl.className = 'pb-import-progress';
      progressEl.innerHTML =
        '<div class="pb-progress-text" id="pb-progress-text">Importing 0 of ' + total + '...</div>' +
        '<div class="pb-progress-bar-track">' +
          '<div class="pb-progress-bar-fill" id="pb-progress-fill" style="width:0%"></div>' +
        '</div>';
      dropZone.appendChild(progressEl);
    }

    function updateProgress() {
      if (!progressEl) return;
      var pct = total > 0 ? Math.round((idx / total) * 100) : 0;
      var textEl = document.getElementById('pb-progress-text');
      var fillEl = document.getElementById('pb-progress-fill');
      if (textEl) textEl.textContent = 'Importing ' + idx + ' of ' + total + '...';
      if (fillEl) fillEl.style.width = pct + '%';
    }

    function removeProgress() {
      if (progressEl && progressEl.parentNode) {
        progressEl.parentNode.removeChild(progressEl);
      }
      progressEl = null;
    }

    /**
     * Build a lookup map from JSON sidecar filename stems to parsed
     * PatchStorage metadata, then begin the .bin import loop.
     */
    var sidecarMap = {};

    function parseSidecars(jIdx) {
      if (jIdx >= jsonFiles.length) {
        /* All sidecars parsed, begin .bin import */
        if (Object.keys(sidecarMap).length > 0) {
          ZOIA.log('Loaded ' + Object.keys(sidecarMap).length + ' JSON sidecar(s) for metadata enrichment');
        }
        next();
        return;
      }
      var jf = jsonFiles[jIdx];
      var jr = new FileReader();
      jr.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          /* Build keys to match against .bin files:
             - By JSON filename stem (e.g. "105188.json" -> "105188")
             - By the .bin filename inside the JSON (e.g. "000_zoia_Duck_Friends.bin" -> "000_zoia_duck_friends")
             - By directory name (the JSON's webkitRelativePath parent) */
          var stem = jf.name.replace(/\.json$/i, '').toLowerCase();
          sidecarMap[stem] = data;
          if (data.files && data.files[0] && data.files[0].filename) {
            var binStem = data.files[0].filename.replace(/\.bin$/i, '').toLowerCase();
            sidecarMap[binStem] = data;
          }
          if (data.title) {
            sidecarMap[data.title.toLowerCase()] = data;
          }
          /* Also match by directory parent path */
          if (jf.webkitRelativePath) {
            var parts = jf.webkitRelativePath.split('/');
            if (parts.length >= 2) {
              sidecarMap[parts[parts.length - 2].toLowerCase()] = data;
            }
          }
        } catch (e) { /* ignore non-PatchStorage JSON */ }
        parseSidecars(jIdx + 1);
      };
      jr.onerror = function() { parseSidecars(jIdx + 1); };
      jr.readAsText(jf);
    }

    /**
     * Look up sidecar metadata for a given .bin File object.
     * Tries matching by filename stem, parent directory, and patch name.
     */
    function findSidecar(binFile, patchName) {
      var stem = binFile.name.replace(/\.bin$/i, '').toLowerCase();
      if (sidecarMap[stem]) return sidecarMap[stem];
      /* Try parent directory (e.g. "105188/105188.bin" -> dir "105188") */
      if (binFile.webkitRelativePath) {
        var parts = binFile.webkitRelativePath.split('/');
        if (parts.length >= 2) {
          var dir = parts[parts.length - 2].toLowerCase();
          if (sidecarMap[dir]) return sidecarMap[dir];
        }
      }
      /* Try patch name from binary header */
      if (patchName && sidecarMap[patchName.toLowerCase()]) {
        return sidecarMap[patchName.toLowerCase()];
      }
      return null;
    }

    function next() {
      if (idx >= files.length) {
        if (imported > 0) {
          saveLibrary();
        }
        /* Final progress update before removal */
        if (progressEl) {
          var textEl = document.getElementById('pb-progress-text');
          var fillEl = document.getElementById('pb-progress-fill');
          if (textEl) textEl.textContent = 'Done! ' + imported + ' of ' + total + ' patches added.';
          if (fillEl) fillEl.style.width = '100%';
          setTimeout(removeProgress, 1200);
        }
        ZOIA.log('Import complete: ' + imported + ' of ' + files.length + ' patches added');
        renderList();
        return;
      }
      var f = files[idx];
      idx++;
      updateProgress();
      importFile(f, function(entry) {
        if (entry) {
          /* Enrich with sidecar metadata if available */
          var sc = findSidecar(f, entry.name);
          if (sc) {
            if (sc.tags && sc.tags.length) {
              entry.tags = sc.tags.map(function(t) { return t.name || t; });
            }
            if (sc.author && sc.author.name) {
              entry.author = sc.author.name;
            }
            if (sc.excerpt) {
              entry.excerpt = sc.excerpt;
            }
            if (sc.categories && sc.categories.length) {
              /* Merge PatchStorage categories with module-derived categories */
              var psCats = sc.categories.map(function(c) { return c.name || c; });
              for (var ci = 0; ci < psCats.length; ci++) {
                if (entry.categories.indexOf(psCats[ci]) < 0) {
                  entry.categories.push(psCats[ci]);
                }
              }
            }
            if (sc.like_count) entry.likes = sc.like_count;
            if (sc.download_count) entry.downloads = sc.download_count;
          }
          imported++;
        }
        next();
      });
    }

    /* Start by parsing JSON sidecars, then import .bin files */
    parseSidecars(0);
  }

  /* ================================================================
   * Loading / Deleting Entries
   * ================================================================ */

  /**
   * Load a library entry into the simulator.  Decodes the base64 bin
   * back to an ArrayBuffer, parses it, and passes the result to
   * ZOIA.loadPatch.
   *
   * @param {Object} entry - A library entry with .binBase64
   */
  function loadEntry(entry) {
    try {
      var buf = base64ToBuf(entry.binBase64);
      var patch = ZOIA.parsePatch(buf);
      if (!patch.name || patch.name.length === 0) {
        patch.name = entry.name || entry.filename || 'patch';
        ZOIA.log('Patch name empty; using library entry fallback: "' + patch.name + '"');
      }
      ZOIA.loadPatch(patch);
      closeModal();
      ZOIA.log('Loaded patch from library: "' + entry.name + '"');
    } catch (err) {
      ZOIA.log('ERROR loading patch "' + entry.name + '": ' + err.message);
      alert('Error loading patch: ' + err.message);
    }
  }

  /**
   * Remove a single entry from the library by ID.
   *
   * @param {string} id - Unique entry ID
   */
  function deleteEntry(id) {
    for (var i = 0; i < library.length; i++) {
      if (library[i].id === id) {
        ZOIA.log('Removed patch from library: "' + library[i].name + '"');
        library.splice(i, 1);
        break;
      }
    }
    saveLibrary();
    renderList();
  }

  /**
   * Clear the entire library after user confirmation.
   * Uses inline confirmation UI because confirm() is blocked in sandbox.
   */
  function clearLibrary() {
    if (library.length === 0) return;
    if (!listContainer) return;

    /* Show inline confirmation inside the list area */
    listContainer.innerHTML =
      '<div class="pb-empty">' +
        '<div class="pb-empty-icon">&#9888;</div>' +
        '<div class="pb-empty-title">Remove all ' + library.length + ' patch' + (library.length !== 1 ? 'es' : '') + ' from the library?</div>' +
        '<div style="margin-top:12px;display:flex;gap:10px;justify-content:center">' +
          '<button id="pb-clear-yes" style="background:#e94560;color:#fff;border:none;border-radius:4px;padding:6px 20px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600">Yes, Clear All</button>' +
          '<button id="pb-clear-no" style="background:#333;color:#aaa;border:1px solid #555;border-radius:4px;padding:6px 20px;font-size:12px;cursor:pointer;font-family:inherit">Cancel</button>' +
        '</div>' +
      '</div>';

    var yesBtn = document.getElementById('pb-clear-yes');
    var noBtn = document.getElementById('pb-clear-no');
    if (yesBtn) {
      yesBtn.onclick = function() {
        library.length = 0;
        saveLibrary();
        renderList();
        ZOIA.log('Patch library cleared');
      };
    }
    if (noBtn) {
      noBtn.onclick = function() {
        renderList();
      };
    }
  }

  /* ================================================================
   * Filtering and Sorting
   * ================================================================ */

  /**
   * Return the library array filtered by the current search text and
   * sorted by the current sort field/direction.
   *
   * Search matches against: patch name, category names, page names.
   *
   * @return {Array} Filtered and sorted entries
   */
  function getFilteredList() {
    var filtered = [];
    var q = filterText.toLowerCase();

    /* Determine if any category filters are active */
    var catFilterActive = false;
    var catFilterKeys = Object.keys(activeCategories);
    for (var ci = 0; ci < catFilterKeys.length; ci++) {
      if (activeCategories[catFilterKeys[ci]]) {
        catFilterActive = true;
        break;
      }
    }

    for (var i = 0; i < library.length; i++) {
      var entry = library[i];

      /* --- Category filter gate --- */
      if (catFilterActive) {
        var hasCat = false;
        for (var cc = 0; cc < entry.categories.length; cc++) {
          if (activeCategories[entry.categories[cc]]) {
            hasCat = true;
            break;
          }
        }
        if (!hasCat) continue;
      }

      /* --- Text search filter --- */
      if (q.length === 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against patch name */
      if (entry.name.toLowerCase().indexOf(q) >= 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against category names */
      var catMatch = false;
      for (var c = 0; c < entry.categories.length; c++) {
        if (entry.categories[c].toLowerCase().indexOf(q) >= 0) {
          catMatch = true;
          break;
        }
      }
      if (catMatch) {
        filtered.push(entry);
        continue;
      }

      /* Match against tags */
      if (entry.tags) {
        var tagMatch = false;
        for (var tg = 0; tg < entry.tags.length; tg++) {
          if (entry.tags[tg].toLowerCase().indexOf(q) >= 0) {
            tagMatch = true;
            break;
          }
        }
        if (tagMatch) { filtered.push(entry); continue; }
      }

      /* Match against author */
      if (entry.author && entry.author.toLowerCase().indexOf(q) >= 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against excerpt */
      if (entry.excerpt && entry.excerpt.toLowerCase().indexOf(q) >= 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against page names */
      if (entry.pages) {
        var pageMatch = false;
        for (var p = 0; p < entry.pages.length; p++) {
          if (entry.pages[p].toLowerCase().indexOf(q) >= 0) {
            pageMatch = true;
            break;
          }
        }
        if (pageMatch) filtered.push(entry);
      }
    }

    /* Apply sort */
    filtered.sort(function(a, b) {
      var va, vb;
      if (sortField === 'name') {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
        return sortAsc ? (va < vb ? -1 : va > vb ? 1 : 0) : (vb < va ? -1 : vb > va ? 1 : 0);
      } else if (sortField === 'date') {
        va = a.addedAt;
        vb = b.addedAt;
      } else if (sortField === 'modules') {
        va = a.moduleCount;
        vb = b.moduleCount;
      } else {
        va = 0; vb = 0;
      }
      return sortAsc ? va - vb : vb - va;
    });

    return filtered;
  }

  /* ================================================================
   * UI Rendering
   * ================================================================ */

  /**
   * Collect all unique category names from the library and rebuild the
   * category filter checkbox bar.  Called from renderList() so it stays
   * in sync whenever the library changes.
   */
  function buildCategoryFilters() {
    if (!categoryBar) return;

    /* Collect unique categories across the whole library */
    var catSet = {};
    for (var i = 0; i < library.length; i++) {
      var cats = library[i].categories;
      for (var c = 0; c < cats.length; c++) {
        catSet[cats[c]] = true;
      }
    }
    var catNames = Object.keys(catSet).sort();

    /* If no categories exist, hide the bar */
    if (catNames.length === 0) {
      categoryBar.style.display = 'none';
      return;
    }
    categoryBar.style.display = '';

    /* Determine if any filter is active */
    var anyActive = false;
    for (var k in activeCategories) {
      if (activeCategories[k]) { anyActive = true; break; }
    }

    /* Build checkbox HTML */
    var html = '<span class="pb-catbar-label">Filter:</span>';
    html +=
      '<label class="pb-catbar-item' + (!anyActive ? ' pb-catbar-active' : '') + '">' +
        '<input type="checkbox" class="pb-catbar-cb" data-cat="__all__"' + (!anyActive ? ' checked' : '') + '> All' +
      '</label>';
    for (var j = 0; j < catNames.length; j++) {
      var name = catNames[j];
      var checked = activeCategories[name] ? true : false;
      html +=
        '<label class="pb-catbar-item' + (checked ? ' pb-catbar-active' : '') + '">' +
          '<input type="checkbox" class="pb-catbar-cb" data-cat="' + esc(name) + '"' + (checked ? ' checked' : '') + '> ' + esc(name) +
        '</label>';
    }
    categoryBar.innerHTML = html;
  }

  /** Re-render the patch list inside the modal. */
  function renderList() {
    if (!listContainer) return;

    /* Update the count label */
    if (countLabel) {
      countLabel.textContent = library.length + ' patch' + (library.length !== 1 ? 'es' : '') + ' in library';
    }

    /* Rebuild category filter bar from current library data */
    buildCategoryFilters();

    var items = getFilteredList();

    /* Empty state: no patches at all */
    if (library.length === 0) {
      listContainer.innerHTML =
        '<div class="pb-empty">' +
          '<div class="pb-empty-icon">&#127925;</div>' +
          '<div class="pb-empty-title">No patches in library</div>' +
          '<div class="pb-empty-text">Drop .bin files above or click "Import Files" to add patches.</div>' +
        '</div>';
      return;
    }

    /* Empty state: no search/filter matches */
    if (items.length === 0) {
      var noMatchMsg = 'No patches match the current filters';
      if (filterText) {
        noMatchMsg = 'No patches match "' + esc(filterText) + '"';
      }
      listContainer.innerHTML =
        '<div class="pb-empty">' +
          '<div class="pb-empty-text">' + noMatchMsg + '</div>' +
        '</div>';
      return;
    }

    /* Build the list HTML */
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      var catBadges = '';
      for (var c = 0; c < e.categories.length; c++) {
        catBadges += '<span class="pb-cat-badge">' + esc(e.categories[c]) + '</span>';
      }

      /* Build tag badges */
      var tagBadges = '';
      if (e.tags && e.tags.length) {
        for (var t = 0; t < e.tags.length; t++) {
          tagBadges += '<span class="pb-tag-badge">' + esc(e.tags[t]) + '</span>';
        }
      }

      /* Author line */
      var authorHtml = '';
      if (e.author) {
        authorHtml = '<span class="pb-meta-author">by ' + esc(e.author) + '</span>';
      }

      /* Excerpt / description line */
      var excerptHtml = '';
      if (e.excerpt) {
        var short = e.excerpt.length > 80 ? e.excerpt.substring(0, 80) + '...' : e.excerpt;
        excerptHtml = '<div class="pb-item-excerpt">' + esc(short) + '</div>';
      }

      html +=
        '<div class="pb-item" data-id="' + e.id + '">' +
          '<div class="pb-item-main">' +
            '<div class="pb-item-name">' + esc(e.name) + authorHtml + '</div>' +
            '<div class="pb-item-meta">' +
              '<span class="pb-meta-stat">' + e.moduleCount + ' modules</span>' +
              '<span class="pb-meta-sep">|</span>' +
              '<span class="pb-meta-stat">' + e.connCount + ' connections</span>' +
              '<span class="pb-meta-sep">|</span>' +
              '<span class="pb-meta-stat">' + e.pageCount + ' pg</span>' +
              '<span class="pb-meta-sep">|</span>' +
              '<span class="pb-meta-stat">' + formatSize(e.size) + '</span>' +
              (e.downloads ? '<span class="pb-meta-sep">|</span><span class="pb-meta-stat">' + e.downloads + ' DL</span>' : '') +
              (e.likes ? '<span class="pb-meta-sep">|</span><span class="pb-meta-stat">' + e.likes + ' &hearts;</span>' : '') +
            '</div>' +
            excerptHtml +
            '<div class="pb-item-cats">' + catBadges + tagBadges + '</div>' +
          '</div>' +
          '<div class="pb-item-actions">' +
            '<button class="pb-btn-load" data-id="' + e.id + '" title="Load this patch">Load</button>' +
            '<button class="pb-btn-del" data-id="' + e.id + '" title="Remove from library">&times;</button>' +
          '</div>' +
        '</div>';
    }

    listContainer.innerHTML = html;
    /* Click handlers are managed via event delegation on listContainer
       (set up once in buildModal). */
  }

  /* ================================================================
   * Modal Construction
   * ================================================================ */

  /** Build the modal DOM, attach all event listeners, inject styles. */
  function buildModal() {

    /* --- Overlay --- */
    overlay = document.createElement('div');
    overlay.id = 'pb-overlay';
    overlay.className = 'pb-overlay';
    overlay.onclick = function() { closeModal(); };
    document.body.appendChild(overlay);

    /* --- Modal container --- */
    modal = document.createElement('div');
    modal.id = 'pb-modal';
    modal.className = 'pb-modal';

    modal.innerHTML =
      '<div class="pb-header">' +
        '<div class="pb-title">Patch Library</div>' +
        '<span class="pb-close" id="pb-close-btn" title="Close">&times;</span>' +
      '</div>' +
      '<div class="pb-drop-zone" id="pb-drop-zone">' +
        '<div class="pb-drop-icon">&#128229;</div>' +
        '<div class="pb-drop-text">Drop .bin files here to import</div>' +
        '<div class="pb-drop-sub">or</div>' +
        '<div style="display:flex;gap:8px;justify-content:center">' +
          '<button class="pb-import-btn" id="pb-import-btn">Import Files</button>' +
          '<button class="pb-import-btn" id="pb-import-dir-btn">Import Folder</button>' +
        '</div>' +
        '<input type="file" id="pb-import-input" accept=".bin,.json" multiple style="display:none">' +
        '<input type="file" id="pb-import-dir-input" webkitdirectory directory multiple style="display:none">' +
      '</div>' +
      '<div class="pb-toolbar">' +
        '<input type="text" class="pb-search" id="pb-search" placeholder="Search patches...">' +
        '<div class="pb-sort-group">' +
          '<button class="pb-sort-btn" id="pb-sort-btn" title="Change sort">Name &#9650;</button>' +
        '</div>' +
        '<span class="pb-count" id="pb-count"></span>' +
        '<button class="pb-export-btn" id="pb-export-cat-btn" title="Export catalog as JSON file" style="background:none;border:1px solid #446;color:#88a;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;white-space:nowrap">Export</button>' +
        '<button class="pb-import-cat-btn" id="pb-import-cat-btn" title="Import catalog from JSON file" style="background:none;border:1px solid #446;color:#88a;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;white-space:nowrap">Import Cat</button>' +
        '<input type="file" id="pb-import-cat-input" accept=".json" style="display:none">' +
        '<button class="pb-clear-btn" id="pb-clear-btn" title="Clear library">Clear All</button>' +
      '</div>' +
      '<div class="pb-category-bar" id="pb-category-bar"></div>' +
      '<div class="pb-list" id="pb-list"></div>';

    document.body.appendChild(modal);

    /* --- Cache DOM element references --- */
    searchInput = document.getElementById('pb-search');
    listContainer = document.getElementById('pb-list');
    dropZone = document.getElementById('pb-drop-zone');
    importInput = document.getElementById('pb-import-input');
    countLabel = document.getElementById('pb-count');
    sortBtn = document.getElementById('pb-sort-btn');
    categoryBar = document.getElementById('pb-category-bar');

    /* --- Category bar: event delegation for checkbox changes --- */
    categoryBar.onchange = function(ev) {
      var target = ev.target;
      if (!target || !target.classList.contains('pb-catbar-cb')) return;
      var cat = target.getAttribute('data-cat');

      if (cat === '__all__') {
        /* "All" was clicked -- clear all category filters */
        activeCategories = {};
      } else {
        /* Toggle this category */
        activeCategories[cat] = target.checked;

        /* If nothing is checked after this toggle, reset to show all */
        var anyOn = false;
        for (var k in activeCategories) {
          if (activeCategories[k]) { anyOn = true; break; }
        }
        if (!anyOn) activeCategories = {};
      }
      renderList();
    };

    /* --- Header: close button --- */
    document.getElementById('pb-close-btn').onclick = function() { closeModal(); };

    /* --- Import: file picker --- */
    document.getElementById('pb-import-btn').onclick = function(ev) {
      ev.stopPropagation();
      importInput.click();
    };

    /* --- Import: folder picker --- */
    var importDirBtn = document.getElementById('pb-import-dir-btn');
    var importDirInput = document.getElementById('pb-import-dir-input');
    if (importDirBtn && importDirInput) {
      importDirBtn.onclick = function(ev) {
        ev.stopPropagation();
        importDirInput.click();
      };
      importDirInput.onchange = function() {
        if (this.files && this.files.length > 0) {
          /* Filter the directory listing to .bin and .json files */
          var relevantFiles = [];
          var binCount = 0;
          var jsonCount = 0;
          for (var i = 0; i < this.files.length; i++) {
            var fn = this.files[i].name.toLowerCase();
            if (fn.endsWith('.bin')) {
              relevantFiles.push(this.files[i]);
              binCount++;
            } else if (fn.endsWith('.json')) {
              relevantFiles.push(this.files[i]);
              jsonCount++;
            }
          }
          ZOIA.log('Directory import: found ' + binCount + ' .bin + ' + jsonCount + ' .json files out of ' + this.files.length + ' total');
          if (binCount > 0) {
            importFiles(relevantFiles);
          } else {
            ZOIA.log('No .bin files found in selected folder');
          }
          this.value = '';
        }
      };
    }

    /* --- Import: file input change --- */
    importInput.onchange = function() {
      if (this.files && this.files.length > 0) {
        importFiles(this.files);
        this.value = '';
      }
    };

    /* --- Search input --- */
    searchInput.oninput = function() {
      filterText = this.value;
      renderList();
    };

    /* --- Sort button: cycles Name/Date/Modules, asc/desc --- */
    sortBtn.onclick = function() {
      if (sortField === 'name' && sortAsc) { sortAsc = false; }
      else if (sortField === 'name' && !sortAsc) { sortField = 'date'; sortAsc = false; }
      else if (sortField === 'date' && !sortAsc) { sortAsc = true; }
      else if (sortField === 'date' && sortAsc) { sortField = 'modules'; sortAsc = false; }
      else if (sortField === 'modules' && !sortAsc) { sortAsc = true; }
      else { sortField = 'name'; sortAsc = true; }

      var labels = { name: 'Name', date: 'Date', modules: 'Modules' };
      sortBtn.innerHTML = labels[sortField] + ' ' + (sortAsc ? '&#9650;' : '&#9660;');
      renderList();
    };

    /* --- Catalog Export: download library as JSON --- */
    document.getElementById('pb-export-cat-btn').onclick = function() {
      if (library.length === 0) { ZOIA.log('Nothing to export'); return; }
      var json = JSON.stringify(library, null, 2);
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'zoia_patch_catalog.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        ZOIA.log('Exported catalog (' + library.length + ' patches)');
      } catch(e) {
        ZOIA.log('Export failed: ' + e.message);
      }
    };

    /* --- Catalog Import: read JSON file and merge entries --- */
    var importCatInput = document.getElementById('pb-import-cat-input');
    document.getElementById('pb-import-cat-btn').onclick = function() { importCatInput.click(); };
    importCatInput.onchange = function() {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error('Invalid catalog format');
          var added = 0;
          for (var i = 0; i < imported.length; i++) {
            var entry = imported[i];
            if (!entry.id || !entry.name || !entry.binBase64) continue;
            /* Duplicate check: same name + same byte size */
            var isDup = false;
            for (var j = 0; j < library.length; j++) {
              if (library[j].name === entry.name && library[j].size === entry.size) { isDup = true; break; }
            }
            if (!isDup) { library.push(entry); added++; }
          }
          if (added > 0) saveLibrary();
          ZOIA.log('Imported catalog: ' + added + ' new patches from ' + imported.length + ' total');
          renderList();
        } catch(err) {
          ZOIA.log('Catalog import error: ' + err.message);
        }
      };
      reader.readAsText(file);
      this.value = '';
    };

    /* --- Clear All button --- */
    document.getElementById('pb-clear-btn').onclick = function() { clearLibrary(); };

    /* --- Drop zone drag events --- */
    dropZone.ondragover = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dropZone.classList.add('pb-drop-active');
    };
    dropZone.ondragleave = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dropZone.classList.remove('pb-drop-active');
    };
    dropZone.ondrop = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dropZone.classList.remove('pb-drop-active');
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
        importFiles(ev.dataTransfer.files);
      }
    };

    /* --- Event delegation for list items (Load / Delete / Row click) --- */
    listContainer.onclick = function(ev) {
      var target = ev.target;

      /* Load button */
      if (target.classList.contains('pb-btn-load')) {
        var loadId = target.getAttribute('data-id');
        for (var i = 0; i < library.length; i++) {
          if (library[i].id === loadId) {
            loadEntry(library[i]);
            return;
          }
        }
        return;
      }

      /* Delete button */
      if (target.classList.contains('pb-btn-del')) {
        var delId = target.getAttribute('data-id');
        deleteEntry(delId);
        return;
      }

      /* Click on row body -> load the patch */
      var row = target.closest ? target.closest('.pb-item') : null;
      /* Fallback for browsers without .closest */
      if (!row) {
        var el = target;
        while (el && el !== listContainer) {
          if (el.classList && el.classList.contains('pb-item')) { row = el; break; }
          el = el.parentNode;
        }
      }
      if (row) {
        var rowId = row.getAttribute('data-id');
        for (var j = 0; j < library.length; j++) {
          if (library[j].id === rowId) {
            loadEntry(library[j]);
            return;
          }
        }
      }
    };

    /* Inject the modal stylesheet */
    injectStyles();
  }

  /* ================================================================
   * Injected Styles
   * ================================================================ */

  /** Inject a <style> element with all patch-browser CSS rules. */
  function injectStyles() {
    var css =
      /* Overlay */
      '.pb-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:900; }' +
      '.pb-overlay.visible { display:block; }' +

      /* Modal */
      '.pb-modal { display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:620px; max-width:90vw; max-height:85vh; background:#1a1a2e; border:1px solid #444; border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.7); z-index:950; flex-direction:column; overflow:hidden; font-family:"Segoe UI",system-ui,sans-serif; }' +
      '.pb-modal.visible { display:flex; }' +

      /* Header */
      '.pb-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #333; flex-shrink:0; }' +
      '.pb-title { font-size:16px; font-weight:700; color:#e94560; letter-spacing:1px; text-transform:uppercase; }' +
      '.pb-close { font-size:20px; color:#666; cursor:pointer; padding:0 4px; line-height:1; }' +
      '.pb-close:hover { color:#eee; }' +

      /* Drop zone */
      '.pb-drop-zone { margin:12px 16px 8px; padding:20px; border:2px dashed #444; border-radius:6px; text-align:center; transition:all 0.2s; flex-shrink:0; }' +
      '.pb-drop-zone.pb-drop-active { border-color:#2979FF; background:rgba(41,121,255,0.1); }' +
      '.pb-drop-icon { font-size:28px; margin-bottom:4px; }' +
      '.pb-drop-text { font-size:13px; color:#aaa; }' +
      '.pb-drop-sub { font-size:11px; color:#555; margin:6px 0; }' +
      '.pb-import-btn { background:#2a2a2a; border:1px solid #555; color:#ccc; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12px; }' +
      '.pb-import-btn:hover { background:#3a3a3a; border-color:#777; }' +

      /* Toolbar */
      '.pb-toolbar { display:flex; align-items:center; gap:8px; padding:8px 16px; border-bottom:1px solid #2a2a2a; flex-shrink:0; }' +
      '.pb-search { flex:1; background:#111; border:1px solid #444; border-radius:4px; color:#eee; padding:6px 10px; font-size:12px; font-family:inherit; }' +
      '.pb-search:focus { border-color:#e94560; outline:none; }' +
      '.pb-search::placeholder { color:#555; }' +
      '.pb-sort-group { flex-shrink:0; }' +
      '.pb-sort-btn { background:#222; border:1px solid #444; color:#aaa; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px; white-space:nowrap; }' +
      '.pb-sort-btn:hover { background:#333; color:#ccc; }' +
      '.pb-count { font-size:11px; color:#555; white-space:nowrap; flex-shrink:0; }' +
      '.pb-clear-btn { background:none; border:1px solid #533; color:#a55; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px; white-space:nowrap; }' +
      '.pb-clear-btn:hover { background:rgba(255,0,0,0.1); color:#f66; border-color:#a55; }' +

      /* List container */
      '.pb-list { flex:1; overflow-y:auto; padding:8px 16px 12px; min-height:0; }' +

      /* Empty state */
      '.pb-empty { text-align:center; padding:30px 20px; }' +
      '.pb-empty-icon { font-size:32px; margin-bottom:8px; }' +
      '.pb-empty-title { font-size:14px; color:#aaa; margin-bottom:4px; }' +
      '.pb-empty-text { font-size:12px; color:#666; }' +

      /* Patch item row */
      '.pb-item { display:flex; align-items:center; padding:8px 10px; border:1px solid #2a2a2a; border-radius:5px; margin-bottom:4px; cursor:pointer; transition:all 0.12s; }' +
      '.pb-item:hover { background:rgba(233,69,96,0.08); border-color:#444; }' +
      '.pb-item-main { flex:1; min-width:0; }' +
      '.pb-item-name { font-size:13px; font-weight:600; color:#e0e0e0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.pb-item-meta { display:flex; flex-wrap:wrap; gap:0; margin-top:2px; }' +
      '.pb-meta-stat { font-size:10px; color:#777; }' +
      '.pb-meta-sep { font-size:10px; color:#333; margin:0 5px; }' +
      '.pb-item-cats { display:flex; flex-wrap:wrap; gap:3px; margin-top:3px; }' +
      '.pb-cat-badge { font-size:9px; color:#8888aa; background:rgba(136,136,170,0.12); border:1px solid rgba(136,136,170,0.2); border-radius:3px; padding:1px 5px; }' +
      '.pb-tag-badge { font-size:9px; color:#cc8844; background:rgba(204,136,68,0.12); border:1px solid rgba(204,136,68,0.25); border-radius:3px; padding:1px 5px; }' +
      '.pb-meta-author { font-size:11px; color:#888; font-weight:400; margin-left:8px; }' +
      '.pb-item-excerpt { font-size:10px; color:#666; margin-top:2px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +

      /* Item action buttons */
      '.pb-item-actions { display:flex; gap:4px; flex-shrink:0; margin-left:8px; }' +
      '.pb-btn-load { background:#0f3460; border:1px solid #2979FF; color:#7ab8ff; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; }' +
      '.pb-btn-load:hover { background:#1a4a8a; color:#aaccff; }' +
      '.pb-btn-del { background:none; border:1px solid #533; color:#a55; padding:3px 7px; border-radius:4px; cursor:pointer; font-size:14px; line-height:1; }' +
      '.pb-btn-del:hover { background:rgba(255,0,0,0.15); color:#f66; border-color:#a55; }' +

      /* Import progress indicator */
      '.pb-import-progress { margin-top:10px; }' +
      '.pb-progress-text { font-size:12px; color:#7ab8ff; margin-bottom:6px; }' +
      '.pb-progress-bar-track { width:100%; height:6px; background:#222; border-radius:3px; overflow:hidden; }' +
      '.pb-progress-bar-fill { height:100%; background:#2979FF; border-radius:3px; transition:width 0.15s ease; }' +

      /* Category filter bar */
      '.pb-category-bar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:6px 16px; border-bottom:1px solid #2a2a2a; flex-shrink:0; }' +
      '.pb-catbar-label { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:0.5px; flex-shrink:0; margin-right:2px; }' +
      '.pb-catbar-item { display:inline-flex; align-items:center; gap:3px; font-size:11px; color:#888; background:#1e1e30; border:1px solid #333; border-radius:3px; padding:2px 7px; cursor:pointer; transition:all 0.12s; user-select:none; -webkit-user-select:none; }' +
      '.pb-catbar-item:hover { border-color:#555; color:#bbb; background:#252540; }' +
      '.pb-catbar-item.pb-catbar-active { border-color:#e94560; color:#e0e0e0; background:rgba(233,69,96,0.12); }' +
      '.pb-catbar-cb { width:11px; height:11px; margin:0; cursor:pointer; accent-color:#e94560; }' +

      /* Scrollbar */
      '.pb-list::-webkit-scrollbar { width:6px; }' +
      '.pb-list::-webkit-scrollbar-track { background:#111; }' +
      '.pb-list::-webkit-scrollbar-thumb { background:#444; border-radius:3px; }' +
      '.pb-list::-webkit-scrollbar-thumb:hover { background:#666; }';

    var style = document.createElement('style');
    style.setAttribute('data-module', 'patch-browser');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ================================================================
   * Modal Open / Close
   * ================================================================ */

  /** Open the patch browser modal (builds it lazily on first open). */
  function openModal() {
    if (!modal) buildModal();
    overlay.classList.add('visible');
    modal.classList.add('visible');
    renderList();
    if (searchInput) {
      searchInput.value = filterText;
      searchInput.focus();
    }
  }

  /** Close the modal and overlay. */
  function closeModal() {
    if (overlay) overlay.classList.remove('visible');
    if (modal) modal.classList.remove('visible');
  }

  /* ================================================================
   * Global Keyboard Handler
   * ================================================================ */

  /** Escape key closes the modal when open. */
  document.addEventListener('keydown', function(ev) {
    if (ev.key === 'Escape' || ev.keyCode === 27) {
      if (modal && modal.classList.contains('visible')) {
        closeModal();
        ev.preventDefault();
      }
    }
  });

  /* ================================================================
   * Toolbar Button Injection
   * ================================================================ */

  /**
   * Inject a "Library" button into the main toolbar.  Placed after the
   * "Demo Patch" button when present, otherwise before the "Save"
   * button as a fallback.
   */
  function addToolbarButton() {
    var toolbar = document.getElementById('toolbar');
    if (!toolbar) {
      ZOIA.log('WARNING: Toolbar not found, cannot add Library button');
      return;
    }

    /* Find the Demo button to insert after */
    var btns = toolbar.querySelectorAll('.tbtn');
    var insertAfter = null;
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent.indexOf('Demo') >= 0) {
        insertAfter = btns[i];
        break;
      }
    }

    var libBtn = document.createElement('button');
    libBtn.className = 'tbtn';
    libBtn.textContent = 'Library';
    libBtn.onclick = function() { openModal(); };
    libBtn.title = 'Open patch library';

    if (insertAfter && insertAfter.nextSibling) {
      toolbar.insertBefore(libBtn, insertAfter.nextSibling);
    } else {
      /* Fallback: insert before the Save button */
      var saveBtn = null;
      for (var j = 0; j < btns.length; j++) {
        if (btns[j].textContent.indexOf('Save') >= 0) {
          saveBtn = btns[j];
          break;
        }
      }
      if (saveBtn) {
        toolbar.insertBefore(libBtn, saveBtn);
      } else {
        toolbar.appendChild(libBtn);
      }
    }
  }

  /* ================================================================
   * Public API
   * ================================================================ */

  ZOIA.patchBrowser = {
    open: openModal,
    close: closeModal,
    getLibrary: function() { return library; },
    importFiles: importFiles,
    clear: clearLibrary
  };

  /* ================================================================
   * Initialisation
   * ================================================================ */

  loadLibrary();
  addToolbarButton();
  ZOIA.log('Patch browser initialized (' + library.length + ' patches in library)');

})();

