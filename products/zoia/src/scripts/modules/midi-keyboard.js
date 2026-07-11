// === midi-keyboard.js ===
/**
 * midi-keyboard.js -- Virtual MIDI Controller for Keyboard Modules
 *
 * Renders a piano keyboard (white + black keys) below the ZOIA pedal
 * grid, representing an external MIDI controller connected to the
 * pedal's MIDI input. Adapted from SuperSynthLab's keyboard.
 *
 * Shows whenever the sim is running and the patch contains at least one
 * Keyboard module (typeIdx 16). Each key triggers noteOn/noteOff on
 * Keyboard sim nodes.
 *
 * ES5 only.
 * Namespace: window.ZOIA.midiKeyboard
 */
window.ZOIA = window.ZOIA || {};

ZOIA.midiKeyboard = {

  /** Note names for 12 chromatic pitch classes */
  _noteNames: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],

  /** Pitch classes that are black keys */
  _blackKeys: [1, 3, 6, 8, 10],

  /** Base octave for the keyboard (lowest octave shown) */
  _baseOctave: 3,

  /** Number of octaves to display */
  _numOctaves: 2,

  /** Currently held MIDI note (null if none) */
  _activeNote: null,

  /**
   * Check if the current patch has any Keyboard modules (typeIdx 16).
   * @returns {boolean}
   */
  hasKeyboardModules: function() {
    var s = ZOIA.state;
    if (!s.patch) return false;
    for (var i = 0; i < s.patch.modules.length; i++) {
      if (s.patch.modules[i].typeIdx === 16) return true;
    }
    return false;
  },

  /**
   * Check if a specific page has any Keyboard modules (typeIdx 16).
   * @param {number} pageNum
   * @returns {boolean}
   */
  hasKeyboardOnPage: function(pageNum) {
    var s = ZOIA.state;
    if (!s.patch) return false;
    for (var i = 0; i < s.patch.modules.length; i++) {
      var m = s.patch.modules[i];
      if (m.typeIdx === 16 && m.page === pageNum) return true;
    }
    return false;
  },

  /**
   * Get all Keyboard module indices in the patch.
   * @returns {number[]}
   */
  getKeyboardModules: function() {
    var s = ZOIA.state;
    if (!s.patch) return [];
    var indices = [];
    for (var i = 0; i < s.patch.modules.length; i++) {
      if (s.patch.modules[i].typeIdx === 16) indices.push(i);
    }
    return indices;
  },

  /**
   * Convert MIDI note to display name (e.g. 60 -> "C4").
   * @param {number} midi
   * @returns {string}
   */
  midiToName: function(midi) {
    var pc = midi % 12;
    var oct = Math.floor(midi / 12) - 1;
    return this._noteNames[pc] + oct;
  },

  /**
   * Trigger noteOn for Keyboard modules.
   * If a Keyboard module is selected, target only that one; otherwise all.
   * @param {number} midiNote
   */
  noteOn: function(midiNote) {
    if (!ZOIA.sim || !ZOIA.sim.running) return;
    var s = ZOIA.state;
    var targets = [];

    // If a specific Keyboard module is selected, target only that one
    if (s.selectedModule !== null && s.patch) {
      var m = s.patch.modules[s.selectedModule];
      if (m && m.typeIdx === 16) targets.push(s.selectedModule);
    }
    // Prefer keyboards on the current page (avoids additive doubling
    // when multiple keyboards are wired to the same destination)
    if (targets.length === 0 && s.patch) {
      for (var i = 0; i < s.patch.modules.length; i++) {
        if (s.patch.modules[i].typeIdx === 16 && s.patch.modules[i].page === s.currentPage) {
          targets.push(i);
        }
      }
    }
    // Fallback: target ALL keyboards (handles patches where no keyboard
    // is on the current page, e.g. I-category creative patches)
    if (targets.length === 0) {
      targets = this.getKeyboardModules();
    }

    for (var i = 0; i < targets.length; i++) {
      var node = ZOIA.sim.nodes[targets[i]];
      if (node && node.noteOn) node.noteOn(midiNote);
    }
    ZOIA.log('MIDI noteOn(' + midiNote + ' / ' + this.midiToName(midiNote) + ') -> ' + targets.length + ' keyboard(s)');
  },

  /**
   * Trigger noteOff for Keyboard modules.
   * Targets all keyboards (matches hardware: MIDI goes to all).
   */
  noteOff: function() {
    if (!ZOIA.sim || !ZOIA.sim.running) return;
    var s = ZOIA.state;
    var targets = [];

    if (s.selectedModule !== null && s.patch) {
      var m = s.patch.modules[s.selectedModule];
      if (m && m.typeIdx === 16) targets.push(s.selectedModule);
    }
    if (targets.length === 0 && s.patch) {
      for (var i = 0; i < s.patch.modules.length; i++) {
        if (s.patch.modules[i].typeIdx === 16 && s.patch.modules[i].page === s.currentPage) {
          targets.push(i);
        }
      }
    }
    if (targets.length === 0) {
      targets = this.getKeyboardModules();
    }

    for (var i = 0; i < targets.length; i++) {
      var node = ZOIA.sim.nodes[targets[i]];
      if (node && node.noteOff) node.noteOff();
    }
  },

  /**
   * Render the virtual MIDI controller keyboard below the grid.
   * Produces a proper piano layout with white and black keys spanning
   * 2 octaves (C3-C5 by default). Adapted from SuperSynthLab.
   */
  render: function() {
    var existing = document.getElementById('midi-keyboard');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var s = ZOIA.state;
    var shouldRender = ZOIA.sim && ZOIA.sim.running &&
                       this.hasKeyboardModules();
    if (!shouldRender) return;

    var container = document.createElement('div');
    container.id = 'midi-keyboard';
    container.className = 'midi-kb';

    // Header with label and octave controls
    var header = document.createElement('div');
    header.className = 'midi-kb-header';

    var label = document.createElement('span');
    label.className = 'midi-kb-title';
    label.textContent = 'MIDI CONTROLLER';
    header.appendChild(label);

    var octDown = document.createElement('button');
    octDown.className = 'midi-kb-oct-btn';
    octDown.textContent = '\u25C0';
    octDown.title = 'Octave down';
    header.appendChild(octDown);

    var octLabel = document.createElement('span');
    octLabel.className = 'midi-kb-oct-label';
    octLabel.id = 'midi-kb-oct-range';
    header.appendChild(octLabel);

    var octUp = document.createElement('button');
    octUp.className = 'midi-kb-oct-btn';
    octUp.textContent = '\u25B6';
    octUp.title = 'Octave up';
    header.appendChild(octUp);

    container.appendChild(header);

    // Keyboard element
    var kbEl = document.createElement('div');
    kbEl.className = 'midi-kb-keys';
    kbEl.id = 'midi-kb-piano';
    container.appendChild(kbEl);

    // Note readout
    var readout = document.createElement('div');
    readout.className = 'midi-kb-readout';
    readout.id = 'midi-kb-readout';
    readout.innerHTML = '&nbsp;';
    container.appendChild(readout);

    // Append to pedal area
    var pedalRight = document.getElementById('pedal-right');
    if (pedalRight) pedalRight.appendChild(container);

    // Build keys
    var self = this;
    this._buildKeys();
    this._updateOctLabel();

    // Octave button handlers
    octDown.addEventListener('click', function() {
      if (self._baseOctave > 1) {
        self._baseOctave--;
        self._buildKeys();
        self._updateOctLabel();
      }
    });
    octUp.addEventListener('click', function() {
      if (self._baseOctave < 6) {
        self._baseOctave++;
        self._buildKeys();
        self._updateOctLabel();
      }
    });
  },

  /**
   * Update the octave range label.
   */
  _updateOctLabel: function() {
    var el = document.getElementById('midi-kb-oct-range');
    if (el) {
      el.textContent = 'C' + this._baseOctave + ' \u2013 C' + (this._baseOctave + this._numOctaves);
    }
  },

  /**
   * Build the piano keys into the keyboard element.
   */
  _buildKeys: function() {
    var kbEl = document.getElementById('midi-kb-piano');
    if (!kbEl) return;
    kbEl.innerHTML = '';

    var startMidi = (this._baseOctave + 1) * 12;
    var endMidi = (this._baseOctave + this._numOctaves + 1) * 12;
    var self = this;

    for (var midi = startMidi; midi <= endMidi; midi++) {
      var pc = midi % 12;
      var isBlack = this._blackKeys.indexOf(pc) >= 0;

      var key = document.createElement('div');
      key.className = 'midi-kb-key ' + (isBlack ? 'black' : 'white');
      key.setAttribute('data-note', midi);

      // Note label
      var lbl = document.createElement('span');
      lbl.className = 'midi-kb-key-lbl';
      lbl.textContent = this.midiToName(midi);
      key.appendChild(lbl);

      // Event handlers
      (function(note, keyEl) {
        keyEl.addEventListener('mousedown', function(e) {
          e.preventDefault();
          // Release previous note if any
          if (self._activeNote !== null) {
            self.noteOff();
            var prev = kbEl.querySelector('.midi-kb-key.playing');
            if (prev) prev.classList.remove('playing');
          }
          self._activeNote = note;
          keyEl.classList.add('playing');
          self.noteOn(note);
          // Update readout
          var rd = document.getElementById('midi-kb-readout');
          if (rd) rd.textContent = self.midiToName(note);
        });

        keyEl.addEventListener('mouseup', function() {
          if (self._activeNote === note) {
            self._activeNote = null;
            keyEl.classList.remove('playing');
            self.noteOff();
          }
        });

        keyEl.addEventListener('mouseleave', function(e) {
          if (self._activeNote === note && e.buttons === 0) {
            self._activeNote = null;
            keyEl.classList.remove('playing');
            self.noteOff();
          }
        });
      })(midi, key);

      kbEl.appendChild(key);
    }
  }
};


