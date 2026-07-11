// === test-patch-loader.js ===
// Loads committed canonical Test_Modules patches embedded in the generated HTML.
window.ZOIA = window.ZOIA || {};

(function() {
  var MANIFEST_URL = '/tests/workflow/canonical-patches/Test_Modules.manifest.json';
  var PATCH_ROOT_URL = '/tests/workflow/canonical-patches/Test_Modules/';
  var manifest = null;
  var patchEntries = [];

  function byName(a, b) {
    return a.relativePath.localeCompare(b.relativePath);
  }

  function normalizePath(path) {
    return String(path || '').replace(/\\/g, '/');
  }

  function patchLabel(entry) {
    return normalizePath(entry.relativePath).replace(/\.bin$/i, '');
  }

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function embeddedPayload() {
    var el = document.getElementById('zoia-embedded-test-patches');
    if (!el || !el.textContent) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      ZOIA.log('ERROR: Embedded test patch payload parse failed: ' + error.message);
      return null;
    }
  }

  function getDialog() {
    return document.getElementById('test-patch-dialog');
  }

  function getSelect() {
    return document.getElementById('test-patch-select');
  }

  function getStatus() {
    return document.getElementById('test-patch-status');
  }

  function setStatus(message) {
    var el = getStatus();
    if (el) el.textContent = message || '';
  }

  function fillSelect() {
    var select = getSelect();
    if (!select) return;
    select.innerHTML = '';
    for (var i = 0; i < patchEntries.length; i++) {
      var option = document.createElement('option');
      option.value = i;
      option.textContent = patchLabel(patchEntries[i]);
      select.appendChild(option);
    }
  }

  function loadManifest(callback) {
    if (manifest) {
      callback(null);
      return;
    }
    var embedded = embeddedPayload();
    if (embedded && embedded.patches && embedded.patches.length) {
      manifest = embedded;
      patchEntries = embedded.patches.slice().sort(byName);
      fillSelect();
      setStatus(patchEntries.length + ' embedded test patches available.');
      callback(null);
      return;
    }
    setStatus('Loading test patch manifest...');
    fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(function(response) {
        if (!response.ok) throw new Error('Manifest HTTP ' + response.status);
        return response.json();
      })
      .then(function(data) {
        manifest = data;
        patchEntries = (data.files || [])
          .filter(function(file) { return /\.bin$/i.test(file.relativePath || ''); })
          .sort(byName);
        fillSelect();
        setStatus(patchEntries.length + ' test patches available.');
        callback(null);
      })
      .catch(function(error) {
        setStatus('Could not load test patch manifest from embedded data or ' + MANIFEST_URL + '.');
        ZOIA.log('ERROR: Test patch manifest load failed: ' + error.message);
        callback(error);
      });
  }

  function selectedEntry() {
    var select = getSelect();
    if (!select || patchEntries.length === 0) return null;
    return patchEntries[Number(select.value) || 0] || null;
  }

  function patchUrl(entry) {
    return PATCH_ROOT_URL + normalizePath(entry.relativePath).split('/').map(encodeURIComponent).join('/');
  }

  function loadEntry(entry) {
    if (!entry) {
      setStatus('No test patch selected.');
      return;
    }
    var label = patchLabel(entry);
    setStatus('Loading ' + label + '...');
    if (entry.base64) {
      try {
        var embeddedPatch = ZOIA.parsePatch(base64ToArrayBuffer(entry.base64));
        if (!embeddedPatch.name || embeddedPatch.name.length === 0) {
          embeddedPatch.name = label.split('/').pop();
        }
        ZOIA.loadPatch(embeddedPatch);
        setStatus('Loaded ' + label + '.');
        ZOIA.log('Loaded embedded test patch: ' + label);
        ZOIA.testPatchLoader.close();
      } catch (error) {
        setStatus('Could not load embedded ' + label + ': ' + error.message);
        ZOIA.log('ERROR: Embedded test patch load failed for ' + label + ': ' + error.message);
      }
      return;
    }
    fetch(patchUrl(entry), { cache: 'no-store' })
      .then(function(response) {
        if (!response.ok) throw new Error('Patch HTTP ' + response.status);
        return response.arrayBuffer();
      })
      .then(function(buffer) {
        var patch = ZOIA.parsePatch(buffer);
        if (!patch.name || patch.name.length === 0) {
          patch.name = label.split('/').pop();
        }
        ZOIA.loadPatch(patch);
        setStatus('Loaded ' + label + '.');
        ZOIA.log('Loaded committed test patch: ' + label);
        ZOIA.testPatchLoader.close();
      })
      .catch(function(error) {
        setStatus('Could not load ' + label + ': ' + error.message);
        ZOIA.log('ERROR: Test patch load failed for ' + label + ': ' + error.message);
      });
  }

  ZOIA.testPatchLoader = {
    open: function() {
      var dialog = getDialog();
      if (!dialog) return;
      dialog.style.display = 'block';
      loadManifest(function() {});
    },
    close: function() {
      var dialog = getDialog();
      if (dialog) dialog.style.display = 'none';
    },
    loadSelected: function() {
      if (patchEntries.length === 0) {
        loadManifest(function(error) {
          if (!error) loadEntry(selectedEntry());
        });
        return;
      }
      loadEntry(selectedEntry());
    },
    loadFirst: function() {
      loadManifest(function(error) {
        if (!error) loadEntry(patchEntries[0]);
      });
    }
  };
}());
