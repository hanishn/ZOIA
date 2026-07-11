// === view-manager.js ===
/**
 * view-manager.js -- View Toggle and Application Init
 * =====================================================
 * Manages switching between the Hardware view ("hw") and the
 * Schematic view ("sch"), and orchestrates top-level initialisation
 * of the ZOIA Web Emulator exhibit.
 *
 * Depends on: ZOIA.VERSION_STRING, ZOIA.knob, ZOIA.hardwareView,
 *             ZOIA.schematicView, ZOIA.loadDemo
 *
 * @namespace ZOIA.viewManager
 */
window.ZOIA = window.ZOIA || {};

ZOIA.viewManager = {

  /* ===== View Switching ===== */

  /**
   * Switch between the hardware view and the schematic view.
   * Highlights the active toolbar button, shows/hides the two view
   * containers, and triggers a full render on the newly visible view.
   *
   * @param {string} v - View key: 'hw' or 'sch'
   */
  switchView: function(v) {
    ZOIA.state.currentView = v;

    /* Update toolbar button active states */
    document.querySelectorAll('.view-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.view === v);
    });

    /* Show/hide view containers */
    document.getElementById('hw-view').style.display = v === 'hw' ? 'flex' : 'none';
    document.getElementById('sch-view').style.display = v === 'sch' ? 'flex' : 'none';

    /* Render the newly visible view */
    if (v === 'sch') ZOIA.schematicView.renderAll();
    if (v === 'hw') ZOIA.hardwareView.renderAll();
  },

  /* ===== Application Init ===== */

  /**
   * One-time initialisation called on page load.  Sets up all
   * subsystems, stamps the version string into the toolbar and pedal
   * badge, then loads the built-in demo patch.
   */
  init: function() {
    ZOIA.log('Initializing ZOIA Patch Simulator v' + ZOIA.VERSION_STRING);

    /* Initialise subsystems */
    ZOIA.knob.init();
    ZOIA.hardwareView.initDropZone();
    ZOIA.schematicView.initDropZone();

    /* Stamp version number in the toolbar and on the pedal badge */
    var revEl = document.getElementById('revision-label');
    if (revEl) revEl.textContent = 'v' + ZOIA.VERSION_STRING;
    var hwRev = document.getElementById('hw-rev-badge');
    if (hwRev) hwRev.textContent = 'v' + ZOIA.VERSION_STRING;

    /* Load the trivial Audio In -> Audio Out initial patch */
    ZOIA.loadInitial();

    ZOIA.log('Init complete');
  }
};


