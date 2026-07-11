// === sim-mod-cv.js ===
window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};

// ============================================================================
// Helper: build a WaveShaperNode from a mapping function
// ============================================================================
function _buildCurve(ctx, numSamples, mapFn) {
  var curve = new Float32Array(numSamples);
  for (var i = 0; i < numSamples; i++) {
    var x = (i / (numSamples - 1)) * 2 - 1; // -1 to +1
    curve[i] = mapFn(x);
  }
  var ws = ctx.createWaveShaper();
  ws.curve = curve;
  ws.oversample = 'none';
  return ws;
}

// ============================================================================
// 1. CV Mixer (Type 104)
//    blocks: In 1 [cv_in], In 2 [cv_in], In 3 [cv_in], Output [cv_out]
//    Sum three CV inputs into one output.
// ============================================================================
ZOIA.sim._createCVMixer = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var in1 = ctx.createGain();
  in1.gain.value = 1;
  var in2 = ctx.createGain();
  in2.gain.value = 1;
  var in3 = ctx.createGain();
  in3.gain.value = 1;
  var sum = ctx.createGain();
  sum.gain.value = 1;

  in1.connect(sum);
  in2.connect(sum);
  in3.connect(sum);

  var inNodes = [in1, in2, in3];
  var inIdx = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx < inNodes.length ? inNodes[inIdx++] : null;
      outputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = sum;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_mixer',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      in1.disconnect();
      in2.disconnect();
      in3.disconnect();
      sum.disconnect();
    }
  };
};

// ============================================================================
// 2. Multiplier (Type 22)
//    blocks: In 1 [cv_in], In 2 [cv_in], Output [cv_out]
//    Variant 1 has 3 inputs.
//    Multiply signals: In 1 feeds audio path of GainNode, In 2 modulates gain.
// ============================================================================
ZOIA.sim._createMultiplier = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // In 1 goes through a gain whose .gain is modulated by In 2
  var mult = ctx.createGain();
  mult.gain.value = 0; // will be driven by In 2

  // For variant 1 with a third input, chain a second multiplier
  var mult2 = ctx.createGain();
  mult2.gain.value = 1;
  mult.connect(mult2);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = mult; // audio path
      } else if (inIdx === 1) {
        inputs[i] = mult.gain; // modulate gain = multiply
      } else if (inIdx === 2) {
        inputs[i] = mult2.gain; // third input modulates second stage
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : mult2;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'multiplier',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      mult.disconnect();
      mult2.disconnect();
    }
  };
};

// ============================================================================
// 3. Sample & Hold (Type 10)
//    blocks: Input [cv_in], Trigger [gate_in], Output [cv_out]
//    On trigger rising edge, sample the CV input and hold it on the output.
// ============================================================================
ZOIA.sim._createSampleAndHold = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input CV proxy+analyser (continuous value read) ---
  var inputProxy = ctx.createGain();
  inputProxy.gain.value = 0;
  var inputProbeSrc = ctx.createConstantSource();
  inputProbeSrc.offset.value = 1;
  inputProbeSrc.connect(inputProxy);
  inputProbeSrc.start();
  var inputAnalyser = ctx.createAnalyser();
  inputAnalyser.fftSize = 256;
  inputProxy.connect(inputAnalyser);
  var _inputBuf = new Float32Array(1);

  // --- Trigger proxy+analyser (edge-detect) ---
  var trigProxy = ctx.createGain();
  trigProxy.gain.value = 0;
  var trigProbeSrc = ctx.createConstantSource();
  trigProbeSrc.offset.value = 1;
  trigProbeSrc.connect(trigProxy);
  trigProbeSrc.start();
  var trigAnalyser = ctx.createAnalyser();
  trigAnalyser.fftSize = 256;
  trigProxy.connect(trigAnalyser);
  var _trigBuf = new Float32Array(1);
  var _trigLast = 0;

  // --- Held output via ConstantSourceNode ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0;
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    // Read trigger
    trigAnalyser.getFloatTimeDomainData(_trigBuf);
    var g = _trigBuf[0];
    if (g > 0.5 && _trigLast <= 0.5) {
      // Rising edge: sample the input value
      inputAnalyser.getFloatTimeDomainData(_inputBuf);
      constOut.offset.value = _inputBuf[0];
    }
    _trigLast = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inputProxy.gain; // CV input
      } else {
        inputs[i] = trigProxy.gain; // Trigger input
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'sample_and_hold',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { inputProbeSrc.stop(); } catch (e) {}
      try { inputProbeSrc.disconnect(); } catch (e) {}
      try { inputProxy.disconnect(); } catch (e) {}
      try { inputAnalyser.disconnect(); } catch (e) {}
      try { trigProbeSrc.stop(); } catch (e) {}
      try { trigProbeSrc.disconnect(); } catch (e) {}
      try { trigProxy.disconnect(); } catch (e) {}
      try { trigAnalyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 4. Slew Limiter (Type 19)
//    blocks: Input [cv_in], Output [cv_out]
//    Variant 1 adds Rise Rate [cv_in] and Fall Rate [cv_in].
//    Polling-based linear slew with separate rise and fall rates.
//    Converts square waves into trapezoidal shapes.
// ============================================================================
ZOIA.sim._createSlewLimiter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input signal proxy+analyser (continuous value read) ---
  var inputProxy = ctx.createGain();
  inputProxy.gain.value = 0;
  var inputProbeSrc = ctx.createConstantSource();
  inputProbeSrc.offset.value = 1;
  inputProbeSrc.connect(inputProxy);
  inputProbeSrc.start();
  var inputAnalyser = ctx.createAnalyser();
  inputAnalyser.fftSize = 256;
  inputProxy.connect(inputAnalyser);
  var _inputBuf = new Float32Array(1);

  // --- Rise rate CV proxy+analyser (continuous value read) ---
  var riseProxy = ctx.createGain();
  riseProxy.gain.value = 0;
  var riseProbeSrc = ctx.createConstantSource();
  riseProbeSrc.offset.value = 1;
  riseProbeSrc.connect(riseProxy);
  riseProbeSrc.start();
  var riseAnalyser = ctx.createAnalyser();
  riseAnalyser.fftSize = 256;
  riseProxy.connect(riseAnalyser);
  var _riseBuf = new Float32Array(1);

  // --- Fall rate CV proxy+analyser (continuous value read) ---
  var fallProxy = ctx.createGain();
  fallProxy.gain.value = 0;
  var fallProbeSrc = ctx.createConstantSource();
  fallProbeSrc.offset.value = 1;
  fallProbeSrc.connect(fallProxy);
  fallProbeSrc.start();
  var fallAnalyser = ctx.createAnalyser();
  fallAnalyser.fftSize = 256;
  fallProxy.connect(fallAnalyser);
  var _fallBuf = new Float32Array(1);

  // --- Output via ConstantSourceNode ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0;
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  // --- Read initial rise/fall rates from mod.params if available ---
  var _current = 0;
  var _riseRate = 0.005;
  var _fallRate = 0.005;

  // Find inIdx 1 and inIdx 2 block positions for rise/fall params
  var riseBlockIdx = -1;
  var fallBlockIdx = -1;
  var tmpIdx = 0;
  for (var k = 0; k < blocks.length; k++) {
    var bt = blocks[k].t;
    if (bt === 'cv_in' || bt === 'audio_in' || bt === 'gate_in') {
      if (tmpIdx === 1) {
        riseBlockIdx = k;
      } else if (tmpIdx === 2) {
        fallBlockIdx = k;
      }
      tmpIdx++;
    }
  }
  if (riseBlockIdx >= 0 && mod.params && mod.params[riseBlockIdx] !== undefined) {
    _riseRate = (mod.params[riseBlockIdx] / 65535) * 0.1;
    if (_riseRate < 0.0001) { _riseRate = 0.005; }
  }
  if (fallBlockIdx >= 0 && mod.params && mod.params[fallBlockIdx] !== undefined) {
    _fallRate = (mod.params[fallBlockIdx] / 65535) * 0.1;
    if (_fallRate < 0.0001) { _fallRate = 0.005; }
  }

  var _disposed = false;

  (function poll() {
    if (_disposed) return;

    // Read input signal
    inputAnalyser.getFloatTimeDomainData(_inputBuf);
    var target = _inputBuf[0];

    // Read rise/fall CVs if connected
    riseAnalyser.getFloatTimeDomainData(_riseBuf);
    var rCV = _riseBuf[0];
    if (rCV > 0.001) { _riseRate = rCV * 0.1; }

    fallAnalyser.getFloatTimeDomainData(_fallBuf);
    var fCV = _fallBuf[0];
    if (fCV > 0.001) { _fallRate = fCV * 0.1; }

    // Linear slew toward target
    if (target > _current) {
      _current = Math.min(target, _current + _riseRate);
    } else if (target < _current) {
      _current = Math.max(target, _current - _fallRate);
    }
    constOut.offset.value = _current;

    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inputProxy.gain; // Input
      } else if (inIdx === 1) {
        inputs[i] = riseProxy.gain; // Rise Rate
      } else if (inIdx === 2) {
        inputs[i] = fallProxy.gain; // Fall Rate
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'slew_limiter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { inputProbeSrc.stop(); } catch (e) {}
      try { inputProbeSrc.disconnect(); } catch (e) {}
      try { inputProxy.disconnect(); } catch (e) {}
      try { inputAnalyser.disconnect(); } catch (e) {}
      try { riseProbeSrc.stop(); } catch (e) {}
      try { riseProbeSrc.disconnect(); } catch (e) {}
      try { riseProxy.disconnect(); } catch (e) {}
      try { riseAnalyser.disconnect(); } catch (e) {}
      try { fallProbeSrc.stop(); } catch (e) {}
      try { fallProbeSrc.disconnect(); } catch (e) {}
      try { fallProxy.disconnect(); } catch (e) {}
      try { fallAnalyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 5. Sequencer (Type 4)
//    blocks: CV Out [cv_out], Gate Out [gate_out], Clock [gate_in],
//            Reset [gate_in]
//    Approximate with a low-frequency sawtooth for CV and square for gate.
// ============================================================================
ZOIA.sim._createSequencer = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- 1. Parse step data from block layout ---
  var stepCount = 0;
  var cvInCount = 0;
  for (var bi = 0; bi < blocks.length; bi++) {
    if (blocks[bi].t === 'cv_in') { cvInCount++; }
  }
  stepCount = Math.max(2, cvInCount - 2); // minus clock and reset

  // Read step CV values from params (blocks 2..2+stepCount-1)
  var _stepValues = [];
  for (var si = 0; si < stepCount; si++) {
    var paramIdx = si + 2;
    if (mod.params && mod.params[paramIdx] !== undefined) {
      _stepValues.push(mod.params[paramIdx] / 65535);
    } else {
      _stepValues.push(si / Math.max(1, stepCount - 1)); // ascending staircase fallback
    }
  }

  // --- 2. Create output nodes (ConstantSourceNodes) ---
  var cvOut = ctx.createConstantSource();
  cvOut.offset.value = _stepValues[0];
  cvOut.start();
  var cvOutGain = ctx.createGain();
  cvOutGain.gain.value = 1;
  cvOut.connect(cvOutGain);

  var gateOut = ctx.createConstantSource();
  gateOut.offset.value = 0;
  gateOut.start();
  var gateOutGain = ctx.createGain();
  gateOutGain.gain.value = 1;
  gateOut.connect(gateOutGain);

  // --- 3. Clock proxy+analyser (edge detection) ---
  var clockProxy = ctx.createGain();
  clockProxy.gain.value = 0;
  var clockSrc = ctx.createConstantSource();
  clockSrc.offset.value = 1;
  clockSrc.connect(clockProxy);
  clockSrc.start();
  var clockAnalyser = ctx.createAnalyser();
  clockAnalyser.fftSize = 256;
  clockProxy.connect(clockAnalyser);
  var _clockBuf = new Float32Array(1);
  var _lastClock = 0;

  // --- 4. Reset proxy+analyser (edge detection) ---
  var resetProxy = ctx.createGain();
  resetProxy.gain.value = 0;
  var resetSrc = ctx.createConstantSource();
  resetSrc.offset.value = 1;
  resetSrc.connect(resetProxy);
  resetSrc.start();
  var resetAnalyser = ctx.createAnalyser();
  resetAnalyser.fftSize = 256;
  resetProxy.connect(resetAnalyser);
  var _resetBuf = new Float32Array(1);
  var _lastReset = 0;

  // --- 5. Step state and polling loop ---
  var _currentStep = 0;
  var _disposed = false;

  (function pollSeq() {
    if (_disposed) return;

    // Check clock for rising edge
    clockAnalyser.getFloatTimeDomainData(_clockBuf);
    var clk = _clockBuf[0];
    if (clk > 0.5 && _lastClock <= 0.5) {
      // Advance step
      _currentStep = (_currentStep + 1) % stepCount;
      var t = ZOIA.sim.ctx.currentTime;
      cvOut.offset.setValueAtTime(_stepValues[_currentStep], t);
      // Fire gate pulse (2ms)
      gateOut.offset.setValueAtTime(1, t);
      gateOut.offset.setValueAtTime(0, t + 0.002);
    }
    _lastClock = clk;

    // Check reset for rising edge
    resetAnalyser.getFloatTimeDomainData(_resetBuf);
    var rst = _resetBuf[0];
    if (rst > 0.5 && _lastReset <= 0.5) {
      _currentStep = 0;
      var t2 = ZOIA.sim.ctx.currentTime;
      cvOut.offset.setValueAtTime(_stepValues[0], t2);
    }
    _lastReset = rst;

    requestAnimationFrame(pollSeq);
  })();

  // --- 6. Block wiring loop ---
  var inIdx = 0;
  var outDone = false;
  var gateDone = false;
  var _stepSinks = [];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = clockProxy.gain; // Clock
      } else if (inIdx === 1) {
        inputs[i] = resetProxy.gain; // Reset
      } else {
        // Step value inputs (s1-sN) — accept as sinks for now
        var stepSink = ctx.createGain();
        stepSink.gain.value = 1;
        inputs[i] = stepSink;
        _stepSinks.push(stepSink);
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out') {
      if (!outDone) {
        inputs[i] = null;
        outputs[i] = cvOutGain; // CV output
        outDone = true;
      } else if (!gateDone) {
        inputs[i] = null;
        outputs[i] = gateOutGain; // Gate output
        gateDone = true;
      } else {
        inputs[i] = null;
        outputs[i] = null;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // --- 7. Return module descriptor ---
  return {
    type: 'sequencer',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { cvOut.stop(); } catch (e) {}
      try { cvOut.disconnect(); } catch (e) {}
      try { cvOutGain.disconnect(); } catch (e) {}
      try { gateOut.stop(); } catch (e) {}
      try { gateOut.disconnect(); } catch (e) {}
      try { gateOutGain.disconnect(); } catch (e) {}
      try { clockSrc.stop(); } catch (e) {}
      try { clockSrc.disconnect(); } catch (e) {}
      try { clockProxy.disconnect(); } catch (e) {}
      try { clockAnalyser.disconnect(); } catch (e) {}
      try { resetSrc.stop(); } catch (e) {}
      try { resetSrc.disconnect(); } catch (e) {}
      try { resetProxy.disconnect(); } catch (e) {}
      try { resetAnalyser.disconnect(); } catch (e) {}
      for (var di = 0; di < _stepSinks.length; di++) {
        try { _stepSinks[di].disconnect(); } catch (e) {}
      }
    }
  };
};

// ============================================================================
// 6. CV Invert (Type 17)
//    blocks: Input [cv_in], Output [cv_out]
//    Output = 1 - Input. ConstantSource(1) + Input * -1.
// ============================================================================
ZOIA.sim._createCVInvert = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Negate the input
  var invert = ctx.createGain();
  invert.gain.value = -1;

  // Add constant 1
  var one = ctx.createConstantSource();
  one.offset.value = 1;
  one.start();

  // Sum node
  var sum = ctx.createGain();
  sum.gain.value = 1;

  invert.connect(sum);
  one.connect(sum);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? invert : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : sum;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_invert',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      invert.disconnect();
      one.stop();
      one.disconnect();
      sum.disconnect();
    }
  };
};

// ============================================================================
// 7. Steps (Type 18)
//    blocks: Input [cv_in], Steps [cv_in], Output [cv_out]
//    Quantize CV to discrete steps via WaveShaperNode staircase curve.
// ============================================================================
ZOIA.sim._createSteps = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var numSteps = 8;
  if (mod.params && mod.params.length > 0) {
    var raw = mod.params[0] / 65535;
    numSteps = Math.max(2, Math.round(raw * 32));
  }

  var ws = _buildCurve(ctx, 8192, function (x) {
    // Map -1..1 to 0..1, quantize, map back
    var v = (x + 1) * 0.5;
    var q = Math.floor(v * numSteps) / numSteps;
    return q * 2 - 1;
  });

  var inGain = ctx.createGain();
  inGain.gain.value = 1;
  inGain.connect(ws);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else {
        inputs[i] = null; // Steps cv_in - ignored (baked into curve)
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'steps',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      ws.disconnect();
    }
  };
};

// ============================================================================
// 8. CV Delay (Type 46)
//    blocks: Input [cv_in], Time [cv_in], Output [cv_out]
//    Delay a CV signal with a DelayNode.
// ============================================================================
ZOIA.sim._createCVDelay = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var delay = ctx.createDelay(5.0); // max 5 seconds
  delay.delayTime.value = 0.5;

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = delay; // Input
      } else if (inIdx === 1) {
        inputs[i] = delay.delayTime; // Time modulation
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : delay;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_delay',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      delay.disconnect();
    }
  };
};

// ============================================================================
// 9. CV Loop (Type 47)
//    blocks: Input [cv_in], Record [gate_in], Output [cv_out]
//    Approximate with DelayNode with feedback=1 to recirculate.
// ============================================================================
ZOIA.sim._createCVLoop = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var delay = ctx.createDelay(5.0);
  delay.delayTime.value = 2.0;

  var feedback = ctx.createGain();
  feedback.gain.value = 1.0; // full feedback = loop

  var inGain = ctx.createGain();
  inGain.gain.value = 0; // NOT recording by default

  inGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);

  // --- Record gate proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: start recording
      inGain.gain.setTargetAtTime(1.0, ZOIA.sim.ctx.currentTime, 0.01);
    } else if (g <= 0.5 && _last > 0.5) {
      // Falling edge: stop recording
      inGain.gain.setTargetAtTime(0.0, ZOIA.sim.ctx.currentTime, 0.01);
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else {
        inputs[i] = proxy.gain; // Record gate
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : delay;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_loop',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { inGain.disconnect(); } catch (e) {}
      try { delay.disconnect(); } catch (e) {}
      try { feedback.disconnect(); } catch (e) {}
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 10. CV Filter (Type 48)
//     blocks: Input [cv_in], Frequency [cv_in], Output [cv_out]
//     Lowpass filter for CV at very low frequency.
// ============================================================================
ZOIA.sim._createCVFilter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5; // very low
  lp.Q.value = 0.707;

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = lp; // Input (connect audio into filter)
      } else if (inIdx === 1) {
        inputs[i] = lp.frequency; // Frequency modulation
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : lp;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_filter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      lp.disconnect();
    }
  };
};

// ============================================================================
// 11. Clock Divider (Type 49)
//     blocks: Clock In [gate_in], Divisor [cv_in], Output [gate_out],
//             Remainder [gate_out]
//     Passthrough with gain scaling as approximation.
// ============================================================================
ZOIA.sim._createClockDivider = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Determine divisor block index and read initial divisor from params ---
  var divisorIdx = -1;
  var tmpInIdx = 0;
  for (var k = 0; k < blocks.length; k++) {
    var bt = blocks[k].t;
    if (bt === 'cv_in' || bt === 'audio_in' || bt === 'gate_in') {
      if (tmpInIdx === 1) {
        divisorIdx = k;
        break;
      }
      tmpInIdx++;
    }
  }
  var _divisor = 4; // default
  if (divisorIdx >= 0 && mod.params && mod.params[divisorIdx] !== undefined) {
    _divisor = Math.max(2, Math.round((mod.params[divisorIdx] / 65535) * 30) + 2);
  }

  // --- Clock input proxy+analyser (edge-detect) ---
  var clockProxy = ctx.createGain();
  clockProxy.gain.value = 0;
  var clockProbeSrc = ctx.createConstantSource();
  clockProbeSrc.offset.value = 1;
  clockProbeSrc.connect(clockProxy);
  clockProbeSrc.start();
  var clockAnalyser = ctx.createAnalyser();
  clockAnalyser.fftSize = 256;
  clockProxy.connect(clockAnalyser);
  var _clockBuf = new Float32Array(1);
  var _clockLast = 0;

  // --- Divisor CV proxy+analyser (continuous value) ---
  var divisorProxy = ctx.createGain();
  divisorProxy.gain.value = 0;
  var divisorProbeSrc = ctx.createConstantSource();
  divisorProbeSrc.offset.value = 1;
  divisorProbeSrc.connect(divisorProxy);
  divisorProbeSrc.start();
  var divisorAnalyser = ctx.createAnalyser();
  divisorAnalyser.fftSize = 256;
  divisorProxy.connect(divisorAnalyser);
  var _divBuf = new Float32Array(1);
  var _divLast = -1;

  // --- Divided output via ConstantSourceNode ---
  var mainOut = ctx.createConstantSource();
  mainOut.offset.value = 0;
  mainOut.start();
  var mainOutGain = ctx.createGain();
  mainOutGain.gain.value = 1;
  mainOut.connect(mainOutGain);

  // --- Remainder output via ConstantSourceNode ---
  var remOut = ctx.createConstantSource();
  remOut.offset.value = 0;
  remOut.start();
  var remOutGain = ctx.createGain();
  remOutGain.gain.value = 1;
  remOut.connect(remOutGain);

  var _counter = 0;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;

    // Check divisor CV for changes
    divisorAnalyser.getFloatTimeDomainData(_divBuf);
    var dv = _divBuf[0];
    if (Math.abs(dv - _divLast) > 0.05) {
      _divisor = Math.max(2, Math.round(dv * 30) + 2);
      _divLast = dv;
    }

    // Check clock for rising edge
    clockAnalyser.getFloatTimeDomainData(_clockBuf);
    var g = _clockBuf[0];
    if (g > 0.5 && _clockLast <= 0.5) {
      _counter++;
      var t = ZOIA.sim.ctx.currentTime;
      if (_counter >= _divisor) {
        _counter = 0;
        mainOut.offset.setValueAtTime(1, t);
        mainOut.offset.setValueAtTime(0, t + 0.002);
      } else {
        remOut.offset.setValueAtTime(1, t);
        remOut.offset.setValueAtTime(0, t + 0.002);
      }
    }
    _clockLast = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [mainOutGain, remOutGain];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = clockProxy.gain; // Clock In
      } else if (inIdx === 1) {
        inputs[i] = divisorProxy.gain; // Divisor
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'clock_divider',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { clockProbeSrc.stop(); } catch (e) {}
      try { clockProbeSrc.disconnect(); } catch (e) {}
      try { clockProxy.disconnect(); } catch (e) {}
      try { clockAnalyser.disconnect(); } catch (e) {}
      try { divisorProbeSrc.stop(); } catch (e) {}
      try { divisorProbeSrc.disconnect(); } catch (e) {}
      try { divisorProxy.disconnect(); } catch (e) {}
      try { divisorAnalyser.disconnect(); } catch (e) {}
      try { mainOut.stop(); } catch (e) {}
      try { mainOut.disconnect(); } catch (e) {}
      try { mainOutGain.disconnect(); } catch (e) {}
      try { remOut.stop(); } catch (e) {}
      try { remOut.disconnect(); } catch (e) {}
      try { remOutGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 12. Comparator (Type 50)
//     blocks: Input [cv_in], Threshold [cv_in], Output [gate_out]
//     Use WaveShaperNode with step function: output 1 when input > 0.
//     Subtract threshold from input first.
// ============================================================================
ZOIA.sim._createComparator = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Input - threshold, then step function
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Threshold subtracted via inverted gain
  var threshInvert = ctx.createGain();
  threshInvert.gain.value = -1;

  // Summation node
  var diff = ctx.createGain();
  diff.gain.value = 1;
  inGain.connect(diff);
  threshInvert.connect(diff);

  // Step function: > 0 => 1, <= 0 => 0
  var ws = _buildCurve(ctx, 4096, function (x) {
    return x > 0 ? 1 : 0;
  });
  diff.connect(ws);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else if (inIdx === 1) {
        inputs[i] = threshInvert; // Threshold
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'comparator',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      threshInvert.disconnect();
      diff.disconnect();
      ws.disconnect();
    }
  };
};

// ============================================================================
// 13. CV Rectify (Type 51)
//     blocks: Input [cv_in], Output [cv_out]
//     Full-wave rectification (absolute value) via WaveShaperNode.
// ============================================================================
ZOIA.sim._createCVRectify = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var ws = _buildCurve(ctx, 4096, function (x) {
    return Math.abs(x);
  });

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? ws : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_rectify',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      ws.disconnect();
    }
  };
};

// ============================================================================
// 14. Trigger (Type 52)
//     blocks: Input [gate_in], Output [gate_out]
//     Convert gate to short trigger pulse via edge detection.
// ============================================================================
ZOIA.sim._createTrigger = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;

  // --- Output: ConstantSourceNode for trigger pulse ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0;
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: fire a short 2ms trigger pulse
      var t = ZOIA.sim.ctx.currentTime;
      constOut.offset.setValueAtTime(1, t);
      constOut.offset.setValueAtTime(0, t + 0.002);
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? proxy.gain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'trigger',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 15. CV Abs (Type 63)
//     blocks: Input [cv_in], Output [cv_out]
//     Absolute value via WaveShaperNode (same as rectify).
// ============================================================================
ZOIA.sim._createCVAbs = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var ws = _buildCurve(ctx, 4096, function (x) {
    return Math.abs(x);
  });

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? ws : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_abs',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      ws.disconnect();
    }
  };
};

// ============================================================================
// 16. Quantizer (Type 70)
//     blocks: Input [cv_in], Output [cv_out]
//     Musical scale quantizer: 12 chromatic steps per octave.
// ============================================================================
ZOIA.sim._createQuantizer = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Quantize to 12 steps per unit (chromatic semitones per octave)
  var ws = _buildCurve(ctx, 8192, function (x) {
    // Map from -1..1 to 0..1 range
    var v = (x + 1) * 0.5;
    // Quantize to 1/12th steps
    var q = Math.round(v * 12) / 12;
    // Map back to -1..1
    return q * 2 - 1;
  });

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? ws : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'quantizer',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      ws.disconnect();
    }
  };
};

// ============================================================================
// 17. CV Min/Max (Type 74)
//     blocks: In 1 [cv_in], In 2 [cv_in], Min [cv_out], Max [cv_out]
//     Rough approximation: Min output = In 1, Max output = In 2.
//     (True min/max requires non-linear mixing not easily done in Web Audio.)
// ============================================================================
ZOIA.sim._createCVMinMax = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var in1 = ctx.createGain();
  in1.gain.value = 1;
  var in2 = ctx.createGain();
  in2.gain.value = 1;

  // Approximation: average both to each output with slight bias
  // Min output: average with slight downward bias
  var minOut = ctx.createGain();
  minOut.gain.value = 1;
  var minG1 = ctx.createGain();
  minG1.gain.value = 0.5;
  var minG2 = ctx.createGain();
  minG2.gain.value = 0.5;
  in1.connect(minG1);
  in2.connect(minG2);
  minG1.connect(minOut);
  minG2.connect(minOut);

  // Max output: same average (rough approximation)
  var maxOut = ctx.createGain();
  maxOut.gain.value = 1;
  var maxG1 = ctx.createGain();
  maxG1.gain.value = 0.5;
  var maxG2 = ctx.createGain();
  maxG2.gain.value = 0.5;
  in1.connect(maxG1);
  in2.connect(maxG2);
  maxG1.connect(maxOut);
  maxG2.connect(maxOut);

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [minOut, maxOut];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = in1;
      } else if (inIdx === 1) {
        inputs[i] = in2;
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_min_max',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      in1.disconnect();
      in2.disconnect();
      minG1.disconnect();
      minG2.disconnect();
      minOut.disconnect();
      maxG1.disconnect();
      maxG2.disconnect();
      maxOut.disconnect();
    }
  };
};

// ============================================================================
// 18. Gate Inverter (Type 75)
//     blocks: Input [gate_in], Output [gate_out]
//     Invert gate: GainNode(-1) + ConstantSource(1).
// ============================================================================
ZOIA.sim._createGateInverter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var invert = ctx.createGain();
  invert.gain.value = -1;

  var one = ctx.createConstantSource();
  one.offset.value = 1;
  one.start();

  var sum = ctx.createGain();
  sum.gain.value = 1;
  invert.connect(sum);
  one.connect(sum);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? invert : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : sum;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'gate_inverter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      invert.disconnect();
      one.stop();
      one.disconnect();
      sum.disconnect();
    }
  };
};

// ============================================================================
// 19. CV Flip Flop (Type 77)
//     blocks: Input [gate_in], Q [gate_out], Q Inv [gate_out]
//     Toggle state on each rising edge. Q and Q-Inv are complementary.
// ============================================================================
ZOIA.sim._createCVFlipFlop = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;

  // --- Q output ---
  var qSrc = ctx.createConstantSource();
  qSrc.offset.value = 0;
  qSrc.start();
  var qOutGain = ctx.createGain();
  qOutGain.gain.value = 1;
  qSrc.connect(qOutGain);

  // --- Q-Inv output ---
  var qInvSrc = ctx.createConstantSource();
  qInvSrc.offset.value = 1;
  qInvSrc.start();
  var qInvOutGain = ctx.createGain();
  qInvOutGain.gain.value = 1;
  qInvSrc.connect(qInvOutGain);

  var _state = false;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: toggle state
      _state = !_state;
      qSrc.offset.value = _state ? 1 : 0;
      qInvSrc.offset.value = _state ? 0 : 1;
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [qOutGain, qInvOutGain];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? proxy.gain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_flip_flop',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
      try { qSrc.stop(); } catch (e) {}
      try { qSrc.disconnect(); } catch (e) {}
      try { qOutGain.disconnect(); } catch (e) {}
      try { qInvSrc.stop(); } catch (e) {}
      try { qInvSrc.disconnect(); } catch (e) {}
      try { qInvOutGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 20. Tap Tempo (Type 100)
//     blocks: Tap [gate_in], CV Out [cv_out]
//     Detect tap rising edges and output CV proportional to tap interval.
//     Maps: 0s interval -> 0.0 CV, 2s interval -> 1.0 CV.
// ============================================================================
ZOIA.sim._createTapTempo = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Tap input proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;

  // --- Output via ConstantSourceNode ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0; // no tempo detected yet
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  var _lastTapTime = 0;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: compute interval and update output CV
      var now = ZOIA.sim.ctx.currentTime;
      if (_lastTapTime > 0) {
        var interval = now - _lastTapTime;
        constOut.offset.value = Math.min(1.0, interval / 2.0);
      }
      _lastTapTime = now;
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? proxy.gain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'tap_tempo',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 21. Byte Splitter (Type 103)
//     blocks: Input [cv_in], High [cv_out], Low [cv_out]
//     Split CV into high and low portions using different gains.
// ============================================================================
ZOIA.sim._createByteSplitter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // High: scale down to get upper portion
  var highGain = ctx.createGain();
  highGain.gain.value = 0.5; // upper half approximation
  inGain.connect(highGain);

  // Low: waveshaper to extract fractional part (lower bits)
  var lowWs = _buildCurve(ctx, 4096, function (x) {
    // Extract lower portion: fract(x * 16) / 16 mapped to full range
    var v = (x + 1) * 0.5; // 0..1
    var frac = (v * 16) % 1;
    return frac * 2 - 1;
  });
  inGain.connect(lowWs);

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [highGain, lowWs];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? inGain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'byte_splitter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      highGain.disconnect();
      lowWs.disconnect();
    }
  };
};

// ============================================================================
// 22. Logic Gate (Type 105)
//     blocks: In 1 [gate_in], In 2 [gate_in], Output [gate_out]
//     AND approximation via audio multiplication (GainNode).
// ============================================================================
ZOIA.sim._createLogicGate = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // AND: multiply two signals. In 1 feeds audio, In 2 modulates gain.
  var mult = ctx.createGain();
  mult.gain.value = 0; // driven by In 2

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = mult; // In 1: audio path
      } else if (inIdx === 1) {
        inputs[i] = mult.gain; // In 2: modulate gain (AND)
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : mult;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'logic_gate',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      mult.disconnect();
    }
  };
};

// ============================================================================
// 23. Random (Type 39)
//     blocks: Output [cv_out]. Variant 1 adds Trigger [gate_in].
//     If gate_in block exists: triggered random (new value on each rising edge).
//     Otherwise: free-running noise buffer at slow rate.
// ============================================================================
ZOIA.sim._createRandom = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Detect whether a gate_in block exists (triggered variant)
  var hasGateIn = false;
  for (var k = 0; k < blocks.length; k++) {
    if (blocks[k].t === 'gate_in') {
      hasGateIn = true;
      break;
    }
  }

  var outGain = ctx.createGain();
  outGain.gain.value = 1;

  // Nodes that only exist in one variant
  var _disposed = false;
  var proxy = null;
  var probeSrc = null;
  var analyser = null;
  var constOut = null;
  var src = null;

  if (hasGateIn) {
    // --- Triggered variant: proxy+analyser edge-detect ---
    proxy = ctx.createGain();
    proxy.gain.value = 0;
    probeSrc = ctx.createConstantSource();
    probeSrc.offset.value = 1;
    probeSrc.connect(proxy);
    probeSrc.start();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    proxy.connect(analyser);
    var _buf = new Float32Array(1);
    var _last = 0;

    constOut = ctx.createConstantSource();
    constOut.offset.value = Math.random();
    constOut.start();
    constOut.connect(outGain);

    (function poll() {
      if (_disposed) return;
      analyser.getFloatTimeDomainData(_buf);
      var g = _buf[0];
      if (g > 0.5 && _last <= 0.5) {
        // Rising edge: new random value
        constOut.offset.value = Math.random();
      }
      _last = g;
      requestAnimationFrame(poll);
    })();
  } else {
    // --- Free-running variant: noise buffer ---
    var bufLen = 256;
    var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var j = 0; j < bufLen; j++) {
      data[j] = Math.random();
    }

    src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.01;
    src.connect(outGain);
    src.start();
  }

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (hasGateIn && inIdx === 0) {
        inputs[i] = proxy.gain; // Trigger input
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'random',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { outGain.disconnect(); } catch (e) {}
      if (hasGateIn) {
        try { probeSrc.stop(); } catch (e) {}
        try { probeSrc.disconnect(); } catch (e) {}
        try { proxy.disconnect(); } catch (e) {}
        try { analyser.disconnect(); } catch (e) {}
        try { constOut.stop(); } catch (e) {}
        try { constOut.disconnect(); } catch (e) {}
      } else {
        try { src.stop(); } catch (e) {}
        try { src.disconnect(); } catch (e) {}
      }
    }
  };
};

// ============================================================================
// 24. Rhythm (Type 37)
//     blocks: Gate Out [gate_out], Clock [gate_in], Reset [gate_in],
//             Steps [cv_in], Density [cv_in]
//     Approximate with a square wave oscillator at clock rate.
// ============================================================================
ZOIA.sim._createRhythm = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sqOsc = ctx.createOscillator();
  sqOsc.type = 'square';
  sqOsc.frequency.value = 2; // ~120 BPM eighth notes

  // Scale to 0..1 range for gate
  var scaleGain = ctx.createGain();
  scaleGain.gain.value = 0.5;
  var offsetNode = ctx.createConstantSource();
  offsetNode.offset.value = 0.5;
  offsetNode.start();

  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  sqOsc.connect(scaleGain);
  scaleGain.connect(outGain);
  offsetNode.connect(outGain);

  sqOsc.start();

  // Clock input: connects to sqOsc frequency for external rate control
  var rhythmClockIn = ctx.createGain();
  rhythmClockIn.gain.value = 1;
  rhythmClockIn.connect(sqOsc.frequency);

  // Reset, Steps, Density: GainNodes so connections are accepted (sink)
  var rhythmResetIn = ctx.createGain();
  rhythmResetIn.gain.value = 1;
  var rhythmStepsIn = ctx.createGain();
  rhythmStepsIn.gain.value = 1;
  var rhythmDensityIn = ctx.createGain();
  rhythmDensityIn.gain.value = 1;

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = rhythmClockIn; // Clock - modulates oscillator frequency
      } else if (inIdx === 1) {
        inputs[i] = rhythmResetIn; // Reset - accepted but sink
      } else if (inIdx === 2) {
        inputs[i] = rhythmStepsIn; // Steps - accepted but sink
      } else if (inIdx === 3) {
        inputs[i] = rhythmDensityIn; // Density - accepted but sink
      } else {
        inputs[i] = rhythmDensityIn; // fallback sink
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'rhythm',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sqOsc.stop();
      sqOsc.disconnect();
      scaleGain.disconnect();
      offsetNode.stop();
      offsetNode.disconnect();
      outGain.disconnect();
      rhythmClockIn.disconnect();
      rhythmResetIn.disconnect();
      rhythmStepsIn.disconnect();
      rhythmDensityIn.disconnect();
    }
  };
};

// ============================================================================
// 25. Gate (Type 35)
//     blocks: Input [cv_in], Gate [gate_in], Output [cv_out]
//     Pass CV only when gate is high. GainNode where gate modulates gain.
// ============================================================================
ZOIA.sim._createGate = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Input goes through GainNode whose gain is modulated by Gate
  var gated = ctx.createGain();
  gated.gain.value = 1; // default open; explicit gate input overrides this
  var threshold = ctx.createWaveShaper();
  var thresholdCurve = new Float32Array(256);
  for (var tc = 0; tc < thresholdCurve.length; tc++) {
    thresholdCurve[tc] = tc >= 128 ? 1 : 0;
  }
  threshold.curve = thresholdCurve;
  threshold.oversample = 'none';
  gated.connect(threshold);

  var inIdx = 0;
  var outDone = false;
  var gateInputAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = gated; // Input: audio path
      } else if (inIdx === 1) {
        inputs[i] = gated.gain; // Gate: modulates gain
        gateInputAssigned = true;
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : threshold;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'gate',
    inputs: inputs,
    outputs: outputs,
    _gateInputAssigned: gateInputAssigned,
    dispose: function () {
      gated.disconnect();
      threshold.disconnect();
    }
  };
};

// ============================================================================
// 26. In Switch (Type 31)
//     blocks: In 1 [cv_in], In 2 [cv_in], Output [cv_out], Select [cv_in]
//     Crossfade between two inputs based on Select CV.
// ============================================================================
ZOIA.sim._createInSwitch = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // In 1 through gain A, In 2 through gain B
  // Select CV: 0 = In 1, 1 = In 2 (crossfade)
  var in1Gain = ctx.createGain();
  in1Gain.gain.value = 1.0; // default: In 1 selected
  var in2Gain = ctx.createGain();
  in2Gain.gain.value = 0.0;

  var outSum = ctx.createGain();
  outSum.gain.value = 1;
  in1Gain.connect(outSum);
  in2Gain.connect(outSum);

  // Select input: proxy + analyser to detect CV value and crossfade
  var inSwSelProxy = ctx.createGain();
  inSwSelProxy.gain.value = 0;
  var inSwSelSrc = ctx.createConstantSource();
  inSwSelSrc.offset.value = 1;
  inSwSelSrc.connect(inSwSelProxy);
  inSwSelSrc.start();
  var inSwSelAnalyser = ctx.createAnalyser();
  inSwSelAnalyser.fftSize = 256;
  inSwSelProxy.connect(inSwSelAnalyser);

  // Poll select value and adjust input gains
  var _inSwSelBuf = new Float32Array(1);
  var _inSwLastSel = -1;
  var _inSwDisposed = false;

  (function pollInSwSelect() {
    if (!_inSwDisposed) {
      inSwSelAnalyser.getFloatTimeDomainData(_inSwSelBuf);
      var s = _inSwSelBuf[0];
      if (Math.abs(s - _inSwLastSel) > 0.05) {
        var t = ZOIA.sim.ctx.currentTime;
        if (s >= 0.5) {
          in1Gain.gain.setTargetAtTime(0.0, t, 0.01);
          in2Gain.gain.setTargetAtTime(1.0, t, 0.01);
        } else {
          in1Gain.gain.setTargetAtTime(1.0, t, 0.01);
          in2Gain.gain.setTargetAtTime(0.0, t, 0.01);
        }
        _inSwLastSel = s;
      }
      requestAnimationFrame(pollInSwSelect);
    }
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = in1Gain; // In 1
      } else if (inIdx === 1) {
        inputs[i] = in2Gain; // In 2
      } else if (inIdx === 2) {
        inputs[i] = inSwSelProxy.gain; // Select - proxy+analyser for crossfade
      } else {
        inputs[i] = inSwSelProxy.gain; // fallback to select
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outSum;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'in_switch',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _inSwDisposed = true;
      in1Gain.disconnect();
      in2Gain.disconnect();
      outSum.disconnect();
      inSwSelProxy.disconnect();
      inSwSelSrc.stop();
      inSwSelSrc.disconnect();
      inSwSelAnalyser.disconnect();
    }
  };
};

// ============================================================================
// 27. Out Switch (Type 32)
//     blocks: Input [cv_in], Out 1 [cv_out], Out 2 [cv_out], Select [cv_in]
//     Route input to one of two outputs. Approximation: split to both.
// ============================================================================
ZOIA.sim._createOutSwitch = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  var out1 = ctx.createGain();
  out1.gain.value = 1.0; // default: Out 1 selected
  var out2 = ctx.createGain();
  out2.gain.value = 0.0;

  inGain.connect(out1);
  inGain.connect(out2);

  // Select input: proxy + analyser to detect CV value and route output
  var outSwSelProxy = ctx.createGain();
  outSwSelProxy.gain.value = 0;
  var outSwSelSrc = ctx.createConstantSource();
  outSwSelSrc.offset.value = 1;
  outSwSelSrc.connect(outSwSelProxy);
  outSwSelSrc.start();
  var outSwSelAnalyser = ctx.createAnalyser();
  outSwSelAnalyser.fftSize = 256;
  outSwSelProxy.connect(outSwSelAnalyser);

  // Poll select value and adjust output gains
  var _outSwSelBuf = new Float32Array(1);
  var _outSwLastSel = -1;
  var _outSwDisposed = false;

  (function pollOutSwSelect() {
    if (!_outSwDisposed) {
      outSwSelAnalyser.getFloatTimeDomainData(_outSwSelBuf);
      var s = _outSwSelBuf[0];
      if (Math.abs(s - _outSwLastSel) > 0.05) {
        var t = ZOIA.sim.ctx.currentTime;
        if (s >= 0.5) {
          out1.gain.setTargetAtTime(0.0, t, 0.01);
          out2.gain.setTargetAtTime(1.0, t, 0.01);
        } else {
          out1.gain.setTargetAtTime(1.0, t, 0.01);
          out2.gain.setTargetAtTime(0.0, t, 0.01);
        }
        _outSwLastSel = s;
      }
      requestAnimationFrame(pollOutSwSelect);
    }
  })();

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [out1, out2];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else {
        inputs[i] = outSwSelProxy.gain; // Select - proxy+analyser for routing
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'out_switch',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _outSwDisposed = true;
      inGain.disconnect();
      out1.disconnect();
      out2.disconnect();
      outSwSelProxy.disconnect();
      outSwSelSrc.stop();
      outSwSelSrc.disconnect();
      outSwSelAnalyser.disconnect();
    }
  };
};

// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[4]   = ZOIA.sim._createSequencer;
ZOIA.sim._moduleFactories[10]  = ZOIA.sim._createSampleAndHold;
ZOIA.sim._moduleFactories[17]  = ZOIA.sim._createCVInvert;
ZOIA.sim._moduleFactories[18]  = ZOIA.sim._createSteps;
ZOIA.sim._moduleFactories[19]  = ZOIA.sim._createSlewLimiter;
ZOIA.sim._moduleFactories[21]  = ZOIA.sim._createCVDelay;
ZOIA.sim._moduleFactories[22]  = ZOIA.sim._createMultiplier;
ZOIA.sim._moduleFactories[31]  = ZOIA.sim._createInSwitch;
ZOIA.sim._moduleFactories[32]  = ZOIA.sim._createOutSwitch;
ZOIA.sim._moduleFactories[35]  = ZOIA.sim._createGate;
ZOIA.sim._moduleFactories[37]  = ZOIA.sim._createRhythm;
ZOIA.sim._moduleFactories[39]  = ZOIA.sim._createRandom;
ZOIA.sim._moduleFactories[46]  = ZOIA.sim._createCVDelay;
ZOIA.sim._moduleFactories[47]  = ZOIA.sim._createCVLoop;
ZOIA.sim._moduleFactories[48]  = ZOIA.sim._createCVFilter;
ZOIA.sim._moduleFactories[49]  = ZOIA.sim._createClockDivider;
ZOIA.sim._moduleFactories[50]  = ZOIA.sim._createComparator;
ZOIA.sim._moduleFactories[51]  = ZOIA.sim._createCVRectify;
ZOIA.sim._moduleFactories[52]  = ZOIA.sim._createTrigger;
ZOIA.sim._moduleFactories[63]  = ZOIA.sim._createCVAbs;
ZOIA.sim._moduleFactories[70]  = ZOIA.sim._createQuantizer;
ZOIA.sim._moduleFactories[74]  = ZOIA.sim._createCVMinMax;
ZOIA.sim._moduleFactories[75]  = ZOIA.sim._createGateInverter;
ZOIA.sim._moduleFactories[77]  = ZOIA.sim._createCVFlipFlop;
ZOIA.sim._moduleFactories[100] = ZOIA.sim._createTapTempo;
ZOIA.sim._moduleFactories[103] = ZOIA.sim._createByteSplitter;
ZOIA.sim._moduleFactories[104] = ZOIA.sim._createCVMixer;
ZOIA.sim._moduleFactories[105] = ZOIA.sim._createLogicGate;

ZOIA.log('sim-mod-cv.js loaded: 27 CV/utility modules registered');


