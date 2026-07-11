// === waveform-timeline.js ===
/**
 * waveform-timeline.js -- Waveform Timeline View for Looper Module
 *
 * Renders a horizontal timeline strip showing recorded audio energy
 * on the Y axis and time on the X axis. During playback, shows a
 * moving playhead indicator. During recording, shows a red marker.
 *
 * ES5 only -- no arrow functions, no const/let, no template literals.
 */
window.ZOIA = window.ZOIA || {};

ZOIA.waveformTimeline = {
  _canvas: null,
  _ctx: null,
  _container: null,
  _initialized: false,

  /**
   * Create the DOM elements if not already present.
   * Inserts after #btn-grid or #dual-grid-area inside #pedal-right.
   */
  init: function() {
    if (this._initialized) {
      // already initialized, nothing to do
    } else {
      var existing = document.getElementById('waveform-timeline');
      if (existing) {
        this._container = existing;
        this._canvas = existing.querySelector('canvas');
        if (this._canvas) {
          this._ctx = this._canvas.getContext('2d');
        }
        this._initialized = true;
      } else {
        var container = document.createElement('div');
        container.id = 'waveform-timeline';

        var canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 48;
        container.appendChild(canvas);

        // Insert into pedal-right after btn-grid or dual-grid-area
        var pedalRight = document.getElementById('pedal-right');
        if (pedalRight) {
          var dualGrid = document.getElementById('dual-grid-area');
          var btnGrid = document.getElementById('btn-grid');
          var insertAfter = dualGrid || btnGrid;
          if (insertAfter && insertAfter.nextSibling) {
            pedalRight.insertBefore(container, insertAfter.nextSibling);
          } else if (insertAfter) {
            pedalRight.appendChild(container);
          } else {
            pedalRight.appendChild(container);
          }
        } else {
          // Fallback: append to body (should not happen in normal flow)
          document.body.appendChild(container);
        }

        this._container = container;
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._initialized = true;
      }
    }
  },

  /**
   * Find the first Looper node in the sim nodes list.
   * Returns the node object or null.
   */
  _findLooper: function() {
    var result = null;
    if (ZOIA.sim && ZOIA.sim.nodes) {
      var nodes = ZOIA.sim.nodes;
      var found = false;
      for (var i = 0; i < nodes.length && !found; i++) {
        if (nodes[i] && nodes[i].type === 'looper') {
          result = nodes[i];
          found = true;
        }
      }
    }
    return result;
  },

  /**
   * Render the waveform timeline canvas.
   */
  render: function() {
    if (!this._initialized) {
      this.init();
    }
    if (this._canvas && this._ctx) {
      var canvas = this._canvas;
      var ctx = this._ctx;
      var container = this._container;

      // Sync canvas pixel width to container layout width
      var cw = container.offsetWidth - 4; // subtract padding
      if (cw < 10) {
        cw = 400;
      }
      if (canvas.width !== cw) {
        canvas.width = cw;
      }
      var w = canvas.width;
      var h = canvas.height;

      // Clear
      ctx.clearRect(0, 0, w, h);

      var looper = this._findLooper();

      // No looper or no energy data: show empty message
      if (!looper || !looper._energyData || looper._energyData.length === 0) {
        ctx.fillStyle = '#444';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No recording', w / 2, h / 2);
      } else {
        var data = looper._energyData;
        var dataLen = data.length;
        var duration = looper._recordDuration;

        // If still recording, compute duration from start time
        if (looper._recording && ZOIA.sim && ZOIA.sim.ctx) {
          duration = ZOIA.sim.ctx.currentTime - looper._recordStartTime;
        }
        if (duration <= 0) {
          duration = dataLen / (looper._energySampleRate || 20);
        }

        // Draw waveform as filled area chart
        var xStep = w / dataLen;

        // Fill path
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var i = 0; i < dataLen; i++) {
          var x = i * xStep;
          var val = data[i];
          if (val < 0) { val = 0; }
          if (val > 1) { val = 1; }
          var y = h - (val * (h - 10)); // leave 10px for time labels
          ctx.lineTo(x, y);
        }
        ctx.lineTo((dataLen - 1) * xStep, h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 230, 118, 0.3)';
        ctx.fill();

        // Stroke path
        ctx.beginPath();
        for (var j = 0; j < dataLen; j++) {
          var sx = j * xStep;
          var sval = data[j];
          if (sval < 0) { sval = 0; }
          if (sval > 1) { sval = 1; }
          var sy = h - (sval * (h - 10));
          if (j === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw time labels along the bottom
        ctx.fillStyle = '#555';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (duration > 0) {
          var interval = 1; // 1 second intervals
          if (duration > 20) {
            interval = 5;
          } else if (duration > 10) {
            interval = 2;
          }
          for (var t = interval; t < duration; t += interval) {
            var tx = (t / duration) * w;
            ctx.fillText(t + 's', tx, h);
            // Small tick mark
            ctx.fillRect(tx - 0.5, h - 10, 1, 3);
          }
        }

        // Draw playhead
        if (looper._recording && ZOIA.sim && ZOIA.sim.ctx) {
          // Recording: red playhead at current position
          var recElapsed = ZOIA.sim.ctx.currentTime - looper._recordStartTime;
          var recFrac = 1.0; // at the end during recording
          if (duration > 0) {
            recFrac = recElapsed / duration;
            if (recFrac > 1.0) { recFrac = 1.0; }
          }
          var rx = recFrac * w;
          ctx.strokeStyle = '#ff1744';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx, h);
          ctx.stroke();
        } else if (looper._playing && ZOIA.sim && ZOIA.sim.ctx && looper._recordDuration > 0) {
          // Playing: white playhead at playback position
          var playElapsed = ZOIA.sim.ctx.currentTime - looper._playStartTime;
          var playPos = playElapsed % looper._recordDuration;
          var playFrac = playPos / looper._recordDuration;
          var px = playFrac * w;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        }
      }
    }
  }
};


