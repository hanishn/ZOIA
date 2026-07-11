// === sim-mod-interface.js ===
/**
 * sim-mod-interface.js
 *
 * ZOIA simulation module factories for Interface, Analysis, and MIDI modules.
 * ES5 only -- no const/let, no arrow functions, no template literals, no classes.
 */

window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};

/* ===================================================================
 *  Helper: Fire gate callbacks for all connections from a source module
 *  that target an ADSR gate input. Scans patch connections at call time
 *  and directly invokes ADSR._onGateChange(value).
 * =================================================================== */
ZOIA.sim._fireGateCallbacks = function(modIdx, value) {
  var conns = ZOIA.state && ZOIA.state.patch ? ZOIA.state.patch.connections : null;
  var nodes = ZOIA.sim.nodes;
  if (!conns || !nodes) return;
  for (var ci = 0; ci < conns.length; ci++) {
    var c = conns[ci];
    if (c.srcMod === modIdx) {
      var dn = nodes[c.dstMod];
      if (dn && dn._onGateChange && dn._gateBlockIdx !== null && c.dstBlock === dn._gateBlockIdx) {
        dn._onGateChange(value);
      }
    }
  }
};

/* ===================================================================
 *  Helper: absolute-value WaveShaperNode (full-wave rectifier)
 * =================================================================== */
function _makeAbsCurve() {
  var n = 1024;
  var curve = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    var x = (i / (n - 1)) * 2 - 1; // -1 .. +1
    curve[i] = Math.abs(x);
  }
  return curve;
}

/* ===================================================================
 *  1. Pushbutton  (Type 15)
 *     blocks: Output [gate_out]
 * =================================================================== */
ZOIA.sim._createPushbutton = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'pushbutton',
    inputs: inputs,
    outputs: outputs,
    press: function () {
      src.offset.value = 1;
    },
    release: function () {
      src.offset.value = 0;
    },
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  2. Keyboard  (Type 16)
 *     blocks: CV Out [cv_out], Gate Out [gate_out]
 * =================================================================== */
ZOIA.sim._createKeyboard = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var cvSrc = ctx.createConstantSource();
  cvSrc.offset.value = 0;
  cvSrc.start();

  var gateSrc = ctx.createConstantSource();
  gateSrc.offset.value = 0;
  gateSrc.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('gate') >= 0) {
        outputs[i] = gateSrc;
      } else {
        outputs[i] = cvSrc;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'keyboard',
    inputs: inputs,
    outputs: outputs,
    noteOn: function (midiNote) {
      var freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      var cv = Math.log(freq / 20) / Math.log(1000);
      ZOIA.log('[DIAG] Keyboard noteOn: midi=' + midiNote + ' freq=' + freq.toFixed(1) + 'Hz cv=' + cv.toFixed(4) + ' modIdx=' + this._modIdx);
      cvSrc.offset.value = cv;
      gateSrc.offset.value = 1;
      // Scan connections at call time to find and trigger connected ADSRs
      ZOIA.sim._fireGateCallbacks(this._modIdx, 1);
    },
    noteOff: function () {
      ZOIA.log('[DIAG] Keyboard noteOff: gate -> 0 modIdx=' + this._modIdx);
      gateSrc.offset.value = 0;
      ZOIA.sim._fireGateCallbacks(this._modIdx, 0);
    },
    dispose: function () {
      cvSrc.disconnect();
      gateSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  3. Stompswitch  (Type 44)
 *     blocks: Output [gate_out]
 * =================================================================== */
ZOIA.sim._createStompswitch = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  var state = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'stompswitch',
    inputs: inputs,
    outputs: outputs,
    _state: 0,
    toggle: function () {
      state = state ? 0 : 1;
      this._state = state;
      src.offset.value = state;
      ZOIA.sim._fireGateCallbacks(this._modIdx, state);
      ZOIA.gridButtons.render();
    },
    press: function () {
      state = 1;
      this._state = 1;
      src.offset.value = 1;
      ZOIA.sim._fireGateCallbacks(this._modIdx, 1);
      ZOIA.gridButtons.render();
    },
    release: function () {
      state = 0;
      this._state = 0;
      src.offset.value = 0;
      ZOIA.sim._fireGateCallbacks(this._modIdx, 0);
      ZOIA.gridButtons.render();
    },
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  4. Cport Exp/CV  (Type 54)
 *     blocks: Output [cv_out]
 * =================================================================== */
ZOIA.sim._createCportExpCv = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cport_exp_cv',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  5. UI Button  (Type 56)
 *     blocks: Output [gate_out].  Variant 1 adds LED [cv_in].
 * =================================================================== */
ZOIA.sim._createUIButton = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  var ledSink = ctx.createGain();
  ledSink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'gate_in' || b.t === 'audio_in') {
      // LED input or any other input
      inputs[i] = ledSink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ui_button',
    inputs: inputs,
    outputs: outputs,
    press: function () {
      src.offset.value = 1;
    },
    release: function () {
      src.offset.value = 0;
    },
    dispose: function () {
      src.disconnect();
      ledSink.disconnect();
    }
  };
};

/* ===================================================================
 *  6. Pixel  (Type 58)
 *     blocks: CV In [cv_in]
 * =================================================================== */
ZOIA.sim._createPixel = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sink = ctx.createGain();
  sink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = sink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'pixel',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sink.disconnect();
    }
  };
};

/* ===================================================================
 *  7. Env Follower  (Type 40)
 *     blocks: Audio In [audio_in], Sensitivity [cv_in], CV Out [cv_out]
 * =================================================================== */
ZOIA.sim._createEnvFollower = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];
  var params = mod.params || [];

  // Sensitivity param (first param), normalised 0-1
  var sensNorm = params.length > 0 ? params[0] / 65535 : 0.5;

  // Audio input gain
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Absolute value (full-wave rectifier)
  var rectifier = ctx.createWaveShaper();
  rectifier.curve = _makeAbsCurve();
  rectifier.oversample = 'none';

  // Lowpass filter — frequency maps from sensitivity (10-50 Hz range)
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 10 + sensNorm * 40;
  lpf.Q.value = 0.5;

  // Output gain — scale envelope to a large CV range so it can meaningfully
  // modulate AudioParams like filter frequency (0-1 envelope * 4000 = 0-4000 Hz)
  var outGain = ctx.createGain();
  outGain.gain.value = 4000;

  // Chain: inGain -> rectifier -> lpf -> outGain
  inGain.connect(rectifier);
  rectifier.connect(lpf);
  lpf.connect(outGain);

  // Sensitivity modulation: cv_in controls the filter frequency
  var sensGain = ctx.createGain();
  sensGain.gain.value = 40; // scale 0-1 CV into 0-40 Hz range addition
  sensGain.connect(lpf.frequency);

  var audioAssigned = false;
  var sensAssigned = false;
  var cvOutAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (!audioAssigned) {
        inputs[i] = inGain;
        audioAssigned = true;
      } else {
        inputs[i] = inGain;
      }
    } else if (b.t === 'cv_in' || b.t === 'gate_in') {
      if (!sensAssigned) {
        inputs[i] = sensGain;
        sensAssigned = true;
      } else {
        inputs[i] = sensGain;
      }
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      if (!cvOutAssigned) {
        outputs[i] = outGain;
        cvOutAssigned = true;
      } else {
        outputs[i] = outGain;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'env_follower',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      rectifier.disconnect();
      lpf.disconnect();
      outGain.disconnect();
      sensGain.disconnect();
    }
  };
};

/* ===================================================================
 *  8. Pitch Detect  (Type 41)
 *     blocks: Audio In [audio_in], CV Out [cv_out], Gate [gate_out]
 *     Approximation: bandpass -> envelope for gate, constant CV output.
 * =================================================================== */
ZOIA.sim._createPitchDetect = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Audio input
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Bandpass filter (centered around a mid frequency)
  var bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 440;
  bpf.Q.value = 1;

  // Envelope follower for gate detection
  var rectifier = ctx.createWaveShaper();
  rectifier.curve = _makeAbsCurve();
  rectifier.oversample = 'none';

  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 20;
  lpf.Q.value = 0.5;

  var gateGain = ctx.createGain();
  gateGain.gain.value = 1;

  // Chain for gate: inGain -> bpf -> rectifier -> lpf -> gateGain
  inGain.connect(bpf);
  bpf.connect(rectifier);
  rectifier.connect(lpf);
  lpf.connect(gateGain);

  // CV output: constant source (pitch detection is extremely hard in Web Audio)
  var cvSrc = ctx.createConstantSource();
  cvSrc.offset.value = 0;
  cvSrc.start();

  var audioAssigned = false;
  var cvAssigned = false;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (!audioAssigned) {
        inputs[i] = inGain;
        audioAssigned = true;
      } else {
        inputs[i] = inGain;
      }
    } else if (b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out') {
      if (!cvAssigned) {
        outputs[i] = cvSrc;
        cvAssigned = true;
      } else {
        outputs[i] = cvSrc;
      }
    } else if (b.t === 'gate_out') {
      if (!gateAssigned) {
        outputs[i] = gateGain;
        gateAssigned = true;
      } else {
        outputs[i] = gateGain;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'pitch_detect',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      bpf.disconnect();
      rectifier.disconnect();
      lpf.disconnect();
      gateGain.disconnect();
      cvSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  9. Onset Detect  (Type 60)
 *     blocks: Audio In [audio_in], Sensitivity [cv_in], Gate Out [gate_out]
 *     Approximation: highpass -> rectifier -> lowpass -> output as gate.
 * =================================================================== */
ZOIA.sim._createOnsetDetect = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];
  var params = mod.params || [];

  var sensNorm = params.length > 0 ? params[0] / 65535 : 0.5;

  // Audio input
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Highpass filter — detects transient changes
  var hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 200;
  hpf.Q.value = 0.7;

  // Rectifier
  var rectifier = ctx.createWaveShaper();
  rectifier.curve = _makeAbsCurve();
  rectifier.oversample = 'none';

  // Lowpass (smooth envelope)
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 15 + sensNorm * 35;
  lpf.Q.value = 0.5;

  // Output gain (gate signal)
  var outGain = ctx.createGain();
  outGain.gain.value = 2; // boost to push towards gate-like levels

  // Chain: inGain -> hpf -> rectifier -> lpf -> outGain
  inGain.connect(hpf);
  hpf.connect(rectifier);
  rectifier.connect(lpf);
  lpf.connect(outGain);

  // Sensitivity modulation
  var sensGain = ctx.createGain();
  sensGain.gain.value = 35;
  sensGain.connect(lpf.frequency);

  var audioAssigned = false;
  var sensAssigned = false;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (!audioAssigned) {
        inputs[i] = inGain;
        audioAssigned = true;
      } else {
        inputs[i] = inGain;
      }
    } else if (b.t === 'cv_in' || b.t === 'gate_in') {
      if (!sensAssigned) {
        inputs[i] = sensGain;
        sensAssigned = true;
      } else {
        inputs[i] = sensGain;
      }
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      if (!gateAssigned) {
        outputs[i] = outGain;
        gateAssigned = true;
      } else {
        outputs[i] = outGain;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'onset_detect',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      hpf.disconnect();
      rectifier.disconnect();
      lpf.disconnect();
      outGain.disconnect();
      sensGain.disconnect();
    }
  };
};

/* ===================================================================
 *  10. MIDI Note In  (Type 20)
 *      blocks: Note [cv_out], Gate [gate_out], Velocity [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiNoteIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var noteSrc = ctx.createConstantSource();
  noteSrc.offset.value = 0;
  noteSrc.start();

  var gateSrc = ctx.createConstantSource();
  gateSrc.offset.value = 0;
  gateSrc.start();

  var velSrc = ctx.createConstantSource();
  velSrc.offset.value = 0;
  velSrc.start();

  // Assign outputs in block order: first cv_out -> note, first gate_out -> gate,
  // second cv_out -> velocity
  var cvOutCount = 0;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out') {
      if (cvOutCount === 0) {
        outputs[i] = noteSrc;
      } else {
        outputs[i] = velSrc;
      }
      cvOutCount++;
    } else if (b.t === 'gate_out') {
      if (!gateAssigned) {
        outputs[i] = gateSrc;
        gateAssigned = true;
      } else {
        outputs[i] = gateSrc;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_note_in',
    inputs: inputs,
    outputs: outputs,
    noteOn: function (note, velocity) {
      noteSrc.offset.value = note / 127;
      velSrc.offset.value = (velocity !== undefined ? velocity : 127) / 127;
      gateSrc.offset.value = 1;
    },
    noteOff: function () {
      gateSrc.offset.value = 0;
    },
    dispose: function () {
      noteSrc.disconnect();
      gateSrc.disconnect();
      velSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  11. MIDI CC In  (Type 21)
 *      blocks: CC Value [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiCcIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var ccSrc = ctx.createConstantSource();
  ccSrc.offset.value = 0;
  ccSrc.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = ccSrc;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_cc_in',
    inputs: inputs,
    outputs: outputs,
    setValue: function (v) {
      ccSrc.offset.value = v;
    },
    dispose: function () {
      ccSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  12. MIDI Note Out  (Type 43)
 *      blocks: Note [cv_in], Gate [gate_in], Velocity [cv_in]
 * =================================================================== */
ZOIA.sim._createMidiNoteOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var noteSink = ctx.createGain();
  noteSink.gain.value = 1;

  var gateSink = ctx.createGain();
  gateSink.gain.value = 1;

  var velSink = ctx.createGain();
  velSink.gain.value = 1;

  var cvInCount = 0;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in') {
      if (cvInCount === 0) {
        inputs[i] = noteSink;
      } else {
        inputs[i] = velSink;
      }
      cvInCount++;
    } else if (b.t === 'gate_in') {
      if (!gateAssigned) {
        inputs[i] = gateSink;
        gateAssigned = true;
      } else {
        inputs[i] = gateSink;
      }
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_note_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      noteSink.disconnect();
      gateSink.disconnect();
      velSink.disconnect();
    }
  };
};

/* ===================================================================
 *  13. MIDI Pressure  (Type 55)
 *      blocks: Output [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiPressure = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_pressure',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  14. MIDI CC Out  (Type 59)
 *      blocks: CC Value [cv_in]
 * =================================================================== */
ZOIA.sim._createMidiCcOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sink = ctx.createGain();
  sink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = sink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_cc_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sink.disconnect();
    }
  };
};

/* ===================================================================
 *  15. MIDI PC In  (Type 101)
 *      blocks: PC Value [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiPcIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var pcSrc = ctx.createConstantSource();
  pcSrc.offset.value = 0;
  pcSrc.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = pcSrc;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_pc_in',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      pcSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  16. MIDI PC Out  (Type 102)
 *      blocks: PC Value [cv_in]
 * =================================================================== */
ZOIA.sim._createMidiPcOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sink = ctx.createGain();
  sink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = sink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_pc_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sink.disconnect();
    }
  };
};

/* ===================================================================
 *  17. MIDI Clock In  (Type 106)
 *      blocks: Clock [gate_out], Start [gate_out], Stop [gate_out]
 * =================================================================== */
ZOIA.sim._createMidiClockIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var clockSrc = ctx.createConstantSource();
  clockSrc.offset.value = 0;
  clockSrc.start();

  var startSrc = ctx.createConstantSource();
  startSrc.offset.value = 0;
  startSrc.start();

  var stopSrc = ctx.createConstantSource();
  stopSrc.offset.value = 0;
  stopSrc.start();

  var gateOutCount = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      if (gateOutCount === 0) {
        outputs[i] = clockSrc;
      } else if (gateOutCount === 1) {
        outputs[i] = startSrc;
      } else {
        outputs[i] = stopSrc;
      }
      gateOutCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_clock_in',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      clockSrc.disconnect();
      startSrc.disconnect();
      stopSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  18. MIDI Clock Out  (Type 107)
 *      blocks: Clock [gate_in], Start [gate_in], Stop [gate_in]
 * =================================================================== */
ZOIA.sim._createMidiClockOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var clockSink = ctx.createGain();
  clockSink.gain.value = 1;

  var startSink = ctx.createGain();
  startSink.gain.value = 1;

  var stopSink = ctx.createGain();
  stopSink.gain.value = 1;

  var gateInCount = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      if (gateInCount === 0) {
        inputs[i] = clockSink;
      } else if (gateInCount === 1) {
        inputs[i] = startSink;
      } else {
        inputs[i] = stopSink;
      }
      gateInCount++;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_clock_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      clockSink.disconnect();
      startSink.disconnect();
      stopSink.disconnect();
    }
  };
};

// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[15]  = ZOIA.sim._createPushbutton;
ZOIA.sim._moduleFactories[16]  = ZOIA.sim._createKeyboard;
ZOIA.sim._moduleFactories[20]  = ZOIA.sim._createMidiNoteIn;
ZOIA.sim._moduleFactories[121] = ZOIA.sim._createMidiCcIn;
ZOIA.sim._moduleFactories[40]  = ZOIA.sim._createEnvFollower;
ZOIA.sim._moduleFactories[41]  = ZOIA.sim._createPitchDetect;
ZOIA.sim._moduleFactories[43]  = ZOIA.sim._createMidiNoteOut;
ZOIA.sim._moduleFactories[44]  = ZOIA.sim._createStompswitch;
ZOIA.sim._moduleFactories[54]  = ZOIA.sim._createCportExpCv;
ZOIA.sim._moduleFactories[55]  = ZOIA.sim._createMidiPressure;
ZOIA.sim._moduleFactories[56]  = ZOIA.sim._createUIButton;
ZOIA.sim._moduleFactories[58]  = ZOIA.sim._createPixel;
ZOIA.sim._moduleFactories[59]  = ZOIA.sim._createMidiCcOut;
ZOIA.sim._moduleFactories[60]  = ZOIA.sim._createOnsetDetect;
ZOIA.sim._moduleFactories[101] = ZOIA.sim._createMidiPcIn;
ZOIA.sim._moduleFactories[102] = ZOIA.sim._createMidiPcOut;
ZOIA.sim._moduleFactories[106] = ZOIA.sim._createMidiClockIn;
ZOIA.sim._moduleFactories[107] = ZOIA.sim._createMidiClockOut;

ZOIA.log('sim-mod-interface.js loaded: 18 interface/MIDI modules registered');


