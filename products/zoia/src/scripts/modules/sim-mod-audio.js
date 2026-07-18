// === sim-mod-audio.js ===
/**
 * sim-mod-audio.js — ZOIA Simulation: Audio-Processing Module Factories
 *
 * Implements Web Audio node graphs for audio-processing modules:
 *   Multi Filter (24), Stereo Spread (53), Audio Balance (64),
 *   Inverter (65), EQ (73), Granular (78/83), Audio In Switch (33),
 *   Audio Out Switch (34), Looper (62), Sampler (102)
 *
 * Each factory returns: { type, inputs[], outputs[], dispose() }
 *   - inputs[blockIdx]  = AudioNode (audio_in) | AudioParam (cv_in) | null
 *   - outputs[blockIdx] = AudioNode (audio_out/cv_out/gate_out) | null
 *
 * ES5 only — no arrow functions, no const/let, no template literals, no classes.
 */
window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};


// ================================================================
//  Helper: read initial param value (normalized 0-1)
// ================================================================

ZOIA.sim._readParam = function(mod, idx) {
  if (idx !== null && mod.params && mod.params[idx] !== undefined) {
    return ZOIA.sim._clampUnit(mod.params[idx] / 65535, 0.5);
  }
  return null;
};

ZOIA.sim._clampUnit = function(value, fallback) {
  var n = Number(value);
  if (!isFinite(n)) return fallback;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
};


// ================================================================
//  Multi Filter (Type 24)
// ================================================================
// Blocks: Audio In [audio_in], Frequency [cv_in], Resonance [cv_in],
//         Output [audio_out], Gain [cv_in]
// BiquadFilterNode with gain control.

ZOIA.sim._createMultiFilter = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  filter.Q.value = 1;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  var outputLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);

  inGain.connect(filter);
  filter.connect(outGain);
  outGain.connect(outputLimiter);

  var freqIdx = null;
  var resIdx = null;
  var gainIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('freq') >= 0) {
        freqIdx = i;
        inputs[i] = filter.frequency;
      } else if (name.indexOf('res') >= 0) {
        resIdx = i;
        inputs[i] = filter.Q;
      } else if (name.indexOf('gain') >= 0) {
        gainIdx = i;
        inputs[i] = outGain.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outputLimiter;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial param values
  var freqVal = ZOIA.sim._readParam(mod, freqIdx);
  if (freqVal !== null) {
    filter.frequency.value = 20 * Math.pow(1000, freqVal);
  }

  var resVal = ZOIA.sim._readParam(mod, resIdx);
  if (resVal !== null) {
    filter.Q.value = 0.5 + resVal * 14.5;
  }

  var gainVal = ZOIA.sim._readParam(mod, gainIdx);
  if (gainVal !== null) {
    outGain.gain.value = gainVal;
  }

  return {
    type: 'multi_filter',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _filter: filter,
    _outGain: outGain,
    _outputLimiter: outputLimiter,
    freqIdx: freqIdx,
    resIdx: resIdx,
    gainIdx: gainIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._filter.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._outputLimiter.disconnect(); } catch (e) {}
    },
    setFrequency: function(freq) {
      var t = ZOIA.sim.ctx.currentTime;
      this._filter.frequency.setTargetAtTime(freq, t, 0.01);
    },
    setQ: function(q) {
      var t = ZOIA.sim.ctx.currentTime;
      this._filter.Q.setTargetAtTime(q, t, 0.01);
    }
  };
};


// ================================================================
//  Stereo Spread (Type 53)
// ================================================================
// Blocks: L In [audio_in], R In [audio_in], Width [cv_in],
//         L Out [audio_out], R Out [audio_out]
// Mid/Side processing. Width=0 = mono, Width=1 = full stereo.

ZOIA.sim._createStereoSpread = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Input gains for L and R
  var lIn = ctx.createGain();
  lIn.gain.value = 1.0;
  var rIn = ctx.createGain();
  rIn.gain.value = 1.0;

  // Mid = (L + R) * 0.5, Side = (L - R) * 0.5
  // Output L = Mid + Side * width, Output R = Mid - Side * width
  //
  // We approximate with gain node mixing:
  //   L Out = lIn * (1 - spread) * 0.5 + lIn * (1 + spread) * 0.5
  // Simplified: L Out = lIn * midAmt + rIn * midAmt (for mono)
  //             plus lIn * sideAmt - rIn * sideAmt (for stereo)
  //
  // Implementation: Use four gain nodes for cross-mixing
  //   L Out = lIn * directGain + rIn * crossGain
  //   R Out = rIn * directGain + lIn * crossGain
  // Width=0 (mono): directGain=0.5, crossGain=0.5  (L+R)/2 to both
  // Width=1 (full stereo): directGain=1.0, crossGain=0.0

  var directL = ctx.createGain();  // lIn -> L Out
  var crossL = ctx.createGain();   // rIn -> L Out
  var directR = ctx.createGain();  // rIn -> R Out
  var crossR = ctx.createGain();   // lIn -> R Out

  var lOut = ctx.createGain();
  lOut.gain.value = 1.0;
  var rOut = ctx.createGain();
  rOut.gain.value = 1.0;

  lIn.connect(directL);
  rIn.connect(crossL);
  directL.connect(lOut);
  crossL.connect(lOut);

  rIn.connect(directR);
  lIn.connect(crossR);
  directR.connect(rOut);
  crossR.connect(rOut);

  // Default width = 1.0 (full stereo)
  var width = 1.0;
  directL.gain.value = 0.5 + width * 0.5;
  crossL.gain.value = 0.5 - width * 0.5;
  directR.gain.value = 0.5 + width * 0.5;
  crossR.gain.value = 0.5 - width * 0.5;

  var widthIdx = null;
  var inCount = 0;
  var outCount = 0;

  // Proxy+analyser for Width CV input
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inCount === 0) { inputs[i] = lIn; }
      else { inputs[i] = rIn; }
      inCount++;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('width') >= 0) {
        widthIdx = i;
        inputs[i] = selProxy.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outCount === 0) { outputs[i] = lOut; }
      else { outputs[i] = rOut; }
      outCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial width from params
  var widthVal = ZOIA.sim._readParam(mod, widthIdx);
  if (widthVal !== null) {
    width = widthVal;
    directL.gain.value = 0.5 + width * 0.5;
    crossL.gain.value = 0.5 - width * 0.5;
    directR.gain.value = 0.5 + width * 0.5;
    crossR.gain.value = 0.5 - width * 0.5;
  }

  var node = {
    type: 'stereo_spread',
    inputs: inputs,
    outputs: outputs,
    _lIn: lIn,
    _rIn: rIn,
    _directL: directL,
    _crossL: crossL,
    _directR: directR,
    _crossR: crossR,
    _lOut: lOut,
    _rOut: rOut,
    widthIdx: widthIdx,
    dispose: function() {
      _disposed = true;
      try { this._lIn.disconnect(); } catch (e) {}
      try { this._rIn.disconnect(); } catch (e) {}
      try { this._directL.disconnect(); } catch (e) {}
      try { this._crossL.disconnect(); } catch (e) {}
      try { this._directR.disconnect(); } catch (e) {}
      try { this._crossR.disconnect(); } catch (e) {}
      try { this._lOut.disconnect(); } catch (e) {}
      try { this._rOut.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setWidth: function(w) {
      var t = ZOIA.sim.ctx.currentTime;
      var direct = 0.5 + w * 0.5;
      var cross = 0.5 - w * 0.5;
      this._directL.gain.setTargetAtTime(direct, t, 0.01);
      this._crossL.gain.setTargetAtTime(cross, t, 0.01);
      this._directR.gain.setTargetAtTime(direct, t, 0.01);
      this._crossR.gain.setTargetAtTime(cross, t, 0.01);
    }
  };

  // Poll width CV to drive setWidth
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollWidth() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var w = _selBuf[0];
    if (Math.abs(w - _lastSel) > 0.05) {
      node.setWidth(w);
      _lastSel = w;
    }
    requestAnimationFrame(pollWidth);
  })();

  return node;
};


// ================================================================
//  Audio Balance (Type 64)
// ================================================================
// Mono: In A [audio_in], In B [audio_in], Balance [cv_in], Output [audio_out]
// Stereo (variant 1): L In A, R In A, L In B, R In B, Balance, L Out, R Out
// Crossfade: Balance=0 = all A, Balance=1 = all B.

ZOIA.sim._createAudioBalance = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Count audio ins to detect mono vs stereo
  var audioInCount = 0;
  var audioOutCount = 0;
  for (var k = 0; k < blocks.length; k++) {
    if (blocks[k].t === 'audio_in') audioInCount++;
    if (blocks[k].t === 'audio_out') audioOutCount++;
  }

  var isStereo = (audioInCount >= 4 && audioOutCount >= 2);
  var balanceIdx = null;
  var balance = 0.5;

  // Proxy+analyser for Balance CV input (shared by both stereo and mono)
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  if (isStereo) {
    // Stereo variant: L In A, R In A, L In B, R In B, Balance, L Out, R Out
    var lInA = ctx.createGain();
    lInA.gain.value = 1.0;
    var rInA = ctx.createGain();
    rInA.gain.value = 1.0;
    var lInB = ctx.createGain();
    lInB.gain.value = 1.0;
    var rInB = ctx.createGain();
    rInB.gain.value = 1.0;

    // Gain A = (1 - balance), Gain B = balance
    var gainLA = ctx.createGain();
    gainLA.gain.value = 0.5;
    var gainRA = ctx.createGain();
    gainRA.gain.value = 0.5;
    var gainLB = ctx.createGain();
    gainLB.gain.value = 0.5;
    var gainRB = ctx.createGain();
    gainRB.gain.value = 0.5;

    var lOut = ctx.createGain();
    lOut.gain.value = 1.0;
    var rOut = ctx.createGain();
    rOut.gain.value = 1.0;

    lInA.connect(gainLA);
    gainLA.connect(lOut);
    rInA.connect(gainRA);
    gainRA.connect(rOut);
    lInB.connect(gainLB);
    gainLB.connect(lOut);
    rInB.connect(gainRB);
    gainRB.connect(rOut);

    var stereoInIdx = 0;
    var stereoOutIdx = 0;

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.t === 'audio_in') {
        if (stereoInIdx === 0) { inputs[i] = lInA; }
        else if (stereoInIdx === 1) { inputs[i] = rInA; }
        else if (stereoInIdx === 2) { inputs[i] = lInB; }
        else { inputs[i] = rInB; }
        stereoInIdx++;
      } else if (b.t === 'cv_in') {
        var name = (b.n || '').toLowerCase();
        if (name.indexOf('balance') >= 0 || name.indexOf('bal') >= 0) {
          balanceIdx = i;
          inputs[i] = selProxy.gain;
        } else {
          inputs[i] = null;
        }
      } else if (b.t === 'audio_out') {
        if (stereoOutIdx === 0) { outputs[i] = lOut; }
        else { outputs[i] = rOut; }
        stereoOutIdx++;
      } else {
        inputs[i] = null;
        outputs[i] = null;
      }
    }

    // Apply initial balance
    var balVal = ZOIA.sim._readParam(mod, balanceIdx);
    if (balVal !== null) { balance = balVal; }
    gainLA.gain.value = 1.0 - balance;
    gainRA.gain.value = 1.0 - balance;
    gainLB.gain.value = balance;
    gainRB.gain.value = balance;

    var node = {
      type: 'audio_balance',
      inputs: inputs,
      outputs: outputs,
      _lInA: lInA, _rInA: rInA, _lInB: lInB, _rInB: rInB,
      _gainLA: gainLA, _gainRA: gainRA, _gainLB: gainLB, _gainRB: gainRB,
      _lOut: lOut, _rOut: rOut,
      balanceIdx: balanceIdx,
      dispose: function() {
        _disposed = true;
        try { this._lInA.disconnect(); } catch (e) {}
        try { this._rInA.disconnect(); } catch (e) {}
        try { this._lInB.disconnect(); } catch (e) {}
        try { this._rInB.disconnect(); } catch (e) {}
        try { this._gainLA.disconnect(); } catch (e) {}
        try { this._gainRA.disconnect(); } catch (e) {}
        try { this._gainLB.disconnect(); } catch (e) {}
        try { this._gainRB.disconnect(); } catch (e) {}
        try { this._lOut.disconnect(); } catch (e) {}
        try { this._rOut.disconnect(); } catch (e) {}
        try { selSrc.stop(); } catch (e) {}
        try { selSrc.disconnect(); } catch (e) {}
        try { selProxy.disconnect(); } catch (e) {}
        try { selAnalyser.disconnect(); } catch (e) {}
      },
      setBalance: function(bal) {
        bal = ZOIA.sim._clampUnit(bal, 0.5);
        var t = ZOIA.sim.ctx.currentTime;
        this._gainLA.gain.setTargetAtTime(1.0 - bal, t, 0.01);
        this._gainRA.gain.setTargetAtTime(1.0 - bal, t, 0.01);
        this._gainLB.gain.setTargetAtTime(bal, t, 0.01);
        this._gainRB.gain.setTargetAtTime(bal, t, 0.01);
      }
    };

    // Poll balance CV to drive setBalance (stereo)
    var _selBuf = new Float32Array(1);
    var _lastSel = -1;
    var _disposed = false;

    (function pollBalance() {
      if (_disposed) return;
      selAnalyser.getFloatTimeDomainData(_selBuf);
      var b = ZOIA.sim._clampUnit(_selBuf[0], _lastSel < 0 ? 0.5 : _lastSel);
      if (Math.abs(b - _lastSel) > 0.05) {
        node.setBalance(b);
        _lastSel = b;
      }
      requestAnimationFrame(pollBalance);
    })();

    return node;
  }

  // Mono variant: In A, In B, Balance, Output
  var inA = ctx.createGain();
  inA.gain.value = 1.0;
  var inB = ctx.createGain();
  inB.gain.value = 1.0;

  var gainA = ctx.createGain();
  gainA.gain.value = 0.5;
  var gainB = ctx.createGain();
  gainB.gain.value = 0.5;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inA.connect(gainA);
  gainA.connect(outGain);
  inB.connect(gainB);
  gainB.connect(outGain);

  var monoInIdx = 0;

  for (var j = 0; j < blocks.length; j++) {
    var bm = blocks[j];
    if (bm.t === 'audio_in') {
      if (monoInIdx === 0) { inputs[j] = inA; }
      else { inputs[j] = inB; }
      monoInIdx++;
    } else if (bm.t === 'cv_in') {
      var mname = (bm.n || '').toLowerCase();
      if (mname.indexOf('balance') >= 0 || mname.indexOf('bal') >= 0) {
        balanceIdx = j;
        inputs[j] = selProxy.gain;
      } else {
        inputs[j] = null;
      }
    } else if (bm.t === 'audio_out') {
      outputs[j] = outGain;
    } else {
      inputs[j] = null;
      outputs[j] = null;
    }
  }

  // Apply initial balance
  var monoBalVal = ZOIA.sim._readParam(mod, balanceIdx);
  if (monoBalVal !== null) { balance = monoBalVal; }
  gainA.gain.value = 1.0 - balance;
  gainB.gain.value = balance;

  var node = {
    type: 'audio_balance',
    inputs: inputs,
    outputs: outputs,
    _inA: inA, _inB: inB,
    _gainA: gainA, _gainB: gainB,
    _outGain: outGain,
    balanceIdx: balanceIdx,
    dispose: function() {
      _disposed = true;
      try { this._inA.disconnect(); } catch (e) {}
      try { this._inB.disconnect(); } catch (e) {}
      try { this._gainA.disconnect(); } catch (e) {}
      try { this._gainB.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setBalance: function(bal) {
      bal = ZOIA.sim._clampUnit(bal, 0.5);
      var t = ZOIA.sim.ctx.currentTime;
      this._gainA.gain.setTargetAtTime(1.0 - bal, t, 0.01);
      this._gainB.gain.setTargetAtTime(bal, t, 0.01);
    }
  };

  // Poll balance CV to drive setBalance (mono)
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollBalance() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var b = ZOIA.sim._clampUnit(_selBuf[0], _lastSel < 0 ? 0.5 : _lastSel);
    if (Math.abs(b - _lastSel) > 0.05) {
      node.setBalance(b);
      _lastSel = b;
    }
    requestAnimationFrame(pollBalance);
  })();

  return node;
};


// ================================================================
//  Inverter (Type 65)
// ================================================================
// Blocks: Input [audio_in], Output [audio_out]
// Phase inversion via GainNode with gain = -1.

ZOIA.sim._createInverter = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inv = ctx.createGain();
  inv.gain.value = -1.0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inv;
    } else if (b.t === 'audio_out') {
      outputs[i] = inv;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'inverter',
    inputs: inputs,
    outputs: outputs,
    _inv: inv,
    dispose: function() {
      try { this._inv.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  EQ (Type 73)
// ================================================================
// Blocks: Audio In [audio_in], Low [cv_in], Mid [cv_in], High [cv_in],
//         Audio Out [audio_out]
// Three-band EQ: lowshelf 200Hz, peaking 1kHz, highshelf 4kHz.
// Band gain: (v - 0.5) * 24 for +/-12 dB range.

ZOIA.sim._createEQ = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 200;
  lowShelf.gain.value = 0;

  var midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 1;
  midPeak.gain.value = 0;

  var highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 4000;
  highShelf.gain.value = 0;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  inGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);

  var lowIdx = null;
  var midIdx = null;
  var highIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('low') >= 0) {
        lowIdx = i;
        inputs[i] = lowShelf.gain;
      } else if (name.indexOf('mid') >= 0) {
        midIdx = i;
        inputs[i] = midPeak.gain;
      } else if (name.indexOf('high') >= 0) {
        highIdx = i;
        inputs[i] = highShelf.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = highShelf;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial EQ gains: (v - 0.5) * 24 for +/-12 dB
  var lowVal = ZOIA.sim._readParam(mod, lowIdx);
  if (lowVal !== null) {
    lowShelf.gain.value = (lowVal - 0.5) * 24;
  }

  var midVal = ZOIA.sim._readParam(mod, midIdx);
  if (midVal !== null) {
    midPeak.gain.value = (midVal - 0.5) * 24;
  }

  var highVal = ZOIA.sim._readParam(mod, highIdx);
  if (highVal !== null) {
    highShelf.gain.value = (highVal - 0.5) * 24;
  }

  return {
    type: 'eq',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _low: lowShelf,
    _mid: midPeak,
    _high: highShelf,
    lowIdx: lowIdx,
    midIdx: midIdx,
    highIdx: highIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._low.disconnect(); } catch (e) {}
      try { this._mid.disconnect(); } catch (e) {}
      try { this._high.disconnect(); } catch (e) {}
    },
    setLow: function(db) {
      var t = ZOIA.sim.ctx.currentTime;
      this._low.gain.setTargetAtTime(db, t, 0.01);
    },
    setMid: function(db) {
      var t = ZOIA.sim.ctx.currentTime;
      this._mid.gain.setTargetAtTime(db, t, 0.01);
    },
    setHigh: function(db) {
      var t = ZOIA.sim.ctx.currentTime;
      this._high.gain.setTargetAtTime(db, t, 0.01);
    }
  };
};


// ================================================================
//  Granular (Types 78, 83)
// ================================================================
// Blocks: Audio In [audio_in], Position [cv_in], Size [cv_in],
//         Audio Out [audio_out]
// Uses a circular buffer (DelayNode) with variable read position and
// grain size. Position controls the read offset; Size controls the
// grain window length.

ZOIA.sim._createGranular = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Use a long delay as a circular buffer (max 5 seconds)
  var buffer = ctx.createDelay(5.0);
  buffer.delayTime.value = 0.5;

  // Grain playback: a second delay tapped at a different position
  var grainTap = ctx.createDelay(5.0);
  grainTap.delayTime.value = 0.25;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Feed input into the circular buffer
  inGain.connect(buffer);

  // The grain tap reads from a modulated position in the delay
  // We connect input to the grain tap as well, creating a second read head
  inGain.connect(grainTap);

  // Grain envelope: use a gain node to window the grain output
  var grainEnv = ctx.createGain();
  grainEnv.gain.value = 1.0;
  grainTap.connect(grainEnv);

  // Mix dry buffer output and grain output
  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.3;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.7;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  var outputLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);

  buffer.connect(dryGain);
  grainEnv.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);
  outGain.connect(outputLimiter);

  var posIdx = null;
  var sizeIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('pos') >= 0) {
        posIdx = i;
        inputs[i] = grainTap.delayTime; // Position modulates the grain read offset
      } else if (name.indexOf('size') >= 0) {
        sizeIdx = i;
        inputs[i] = null; // Size controls grain window; set via updateParam
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outputLimiter;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial position (0-1 mapped to 0-5s delay offset)
  var posVal = ZOIA.sim._readParam(mod, posIdx);
  if (posVal !== null) {
    grainTap.delayTime.value = posVal * 5.0;
  }

  // Apply initial size (adjusts the base delay for the buffer)
  var sizeVal = ZOIA.sim._readParam(mod, sizeIdx);
  if (sizeVal !== null) {
    buffer.delayTime.value = Math.max(0.01, sizeVal * 5.0);
  }

  return {
    type: 'granular',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _buffer: buffer,
    _grainTap: grainTap,
    _grainEnv: grainEnv,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _outGain: outGain,
    _outputLimiter: outputLimiter,
    posIdx: posIdx,
    sizeIdx: sizeIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._buffer.disconnect(); } catch (e) {}
      try { this._grainTap.disconnect(); } catch (e) {}
      try { this._grainEnv.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._outputLimiter.disconnect(); } catch (e) {}
    },
    setPosition: function(pos) {
      var t = ZOIA.sim.ctx.currentTime;
      this._grainTap.delayTime.setTargetAtTime(pos * 5.0, t, 0.01);
    },
    setSize: function(size) {
      var t = ZOIA.sim.ctx.currentTime;
      var val = Math.max(0.01, size * 5.0);
      this._buffer.delayTime.setTargetAtTime(val, t, 0.01);
    }
  };
};


// ================================================================
//  Audio In Switch (Type 33)
// ================================================================
// Blocks: In 1 [audio_in], In 2 [audio_in], Output [audio_out],
//         Select [cv_in]
// Selects between two inputs. Select < 0.5 = In 1, >= 0.5 = In 2.
// Uses two GainNodes for crossfading.

ZOIA.sim._createAudioInSwitch = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var in1 = ctx.createGain();
  in1.gain.value = 1.0;
  var in2 = ctx.createGain();
  in2.gain.value = 1.0;

  var gain1 = ctx.createGain();
  gain1.gain.value = 1.0; // Default: In 1 selected
  var gain2 = ctx.createGain();
  gain2.gain.value = 0.0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  var outputLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);

  in1.connect(gain1);
  in2.connect(gain2);
  gain1.connect(outGain);
  gain2.connect(outGain);
  outGain.connect(outputLimiter);

  var selectIdx = null;
  var inCount = 0;

  // Proxy+analyser for Select CV input
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inCount === 0) { inputs[i] = in1; }
      else { inputs[i] = in2; }
      inCount++;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('select') >= 0 || name.indexOf('sel') >= 0) {
        selectIdx = i;
        inputs[i] = selProxy.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outputLimiter;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial select
  var selVal = ZOIA.sim._readParam(mod, selectIdx);
  if (selVal !== null) {
    if (selVal >= 0.5) {
      gain1.gain.value = 0.0;
      gain2.gain.value = 1.0;
    } else {
      gain1.gain.value = 1.0;
      gain2.gain.value = 0.0;
    }
  }

  var node = {
    type: 'audio_in_switch',
    inputs: inputs,
    outputs: outputs,
    _in1: in1, _in2: in2,
    _gain1: gain1, _gain2: gain2,
    _outGain: outGain,
    _outputLimiter: outputLimiter,
    selectIdx: selectIdx,
    dispose: function() {
      _disposed = true;
      try { this._in1.disconnect(); } catch (e) {}
      try { this._in2.disconnect(); } catch (e) {}
      try { this._gain1.disconnect(); } catch (e) {}
      try { this._gain2.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._outputLimiter.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setSelect: function(sel) {
      sel = ZOIA.sim._clampUnit(sel, 0);
      var t = ZOIA.sim.ctx.currentTime;
      if (sel >= 0.5) {
        this._gain1.gain.setTargetAtTime(0.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(1.0, t, 0.01);
      } else {
        this._gain1.gain.setTargetAtTime(1.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(0.0, t, 0.01);
      }
    }
  };

  // Poll select CV to drive setSelect
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollSelect() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var s = ZOIA.sim._clampUnit(_selBuf[0], _lastSel < 0 ? 0 : _lastSel);
    if (Math.abs(s - _lastSel) > 0.05) {
      node.setSelect(s);
      _lastSel = s;
    }
    requestAnimationFrame(pollSelect);
  })();

  return node;
};


// ================================================================
//  Audio Out Switch (Type 34)
// ================================================================
// Blocks: Input [audio_in], Out 1 [audio_out], Out 2 [audio_out],
//         Select [cv_in]
// Routes input to one of two outputs. Select < 0.5 = Out 1, >= 0.5 = Out 2.

ZOIA.sim._createAudioOutSwitch = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var gain1 = ctx.createGain();
  gain1.gain.value = 1.0; // Default: Out 1 selected
  var gain2 = ctx.createGain();
  gain2.gain.value = 0.0;

  inGain.connect(gain1);
  inGain.connect(gain2);

  var selectIdx = null;
  var outCount = 0;

  // Proxy+analyser for Select CV input
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('select') >= 0 || name.indexOf('sel') >= 0) {
        selectIdx = i;
        inputs[i] = selProxy.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outCount === 0) { outputs[i] = gain1; }
      else { outputs[i] = gain2; }
      outCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial select
  var selVal = ZOIA.sim._readParam(mod, selectIdx);
  if (selVal !== null) {
    if (selVal >= 0.5) {
      gain1.gain.value = 0.0;
      gain2.gain.value = 1.0;
    } else {
      gain1.gain.value = 1.0;
      gain2.gain.value = 0.0;
    }
  }

  var node = {
    type: 'audio_out_switch',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _gain1: gain1, _gain2: gain2,
    selectIdx: selectIdx,
    dispose: function() {
      _disposed = true;
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._gain1.disconnect(); } catch (e) {}
      try { this._gain2.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setSelect: function(sel) {
      var t = ZOIA.sim.ctx.currentTime;
      if (sel >= 0.5) {
        this._gain1.gain.setTargetAtTime(0.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(1.0, t, 0.01);
      } else {
        this._gain1.gain.setTargetAtTime(1.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(0.0, t, 0.01);
      }
    }
  };

  // Poll select CV to drive setSelect
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollSelect() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var s = _selBuf[0];
    if (Math.abs(s - _lastSel) > 0.05) {
      node.setSelect(s);
      _lastSel = s;
    }
    requestAnimationFrame(pollSelect);
  })();

  return node;
};


// ================================================================
//  Sampler (Type 102)
// ================================================================
// Deterministic validation model. Provides audio outputs from a generated
// fixture buffer so community patches that route Sampler modules can be tested.

ZOIA.sim._createSampler = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var playProxy = ctx.createGain();
  playProxy.gain.value = 0;
  var recordProxy = ctx.createGain();
  recordProxy.gain.value = 0;
  var cvProxy = ctx.createGain();
  cvProxy.gain.value = 0;

  var lOut = ctx.createGain();
  lOut.gain.value = 1.0;
  var rOut = ctx.createGain();
  rOut.gain.value = 1.0;
  var lLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);
  var rLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);
  lOut.connect(lLimiter);
  rOut.connect(rLimiter);

  var audioOutCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'gate_in') {
      var name = (b.n || '').toLowerCase();
      inputs[i] = name.indexOf('record') >= 0 ? recordProxy : playProxy;
    } else if (b.t === 'cv_in') {
      inputs[i] = cvProxy;
    } else if (b.t === 'audio_out') {
      outputs[i] = audioOutCount === 0 ? lLimiter : rLimiter;
      audioOutCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  var node = {
    type: 'sampler',
    inputs: inputs,
    outputs: outputs,
    _playProxy: playProxy,
    _recordProxy: recordProxy,
    _cvProxy: cvProxy,
    _lOut: lOut,
    _rOut: rOut,
    _lLimiter: lLimiter,
    _rLimiter: rLimiter,
    _audioBuffer: null,
    _sourceNode: null,
    dispose: function() {
      if (this._sourceNode) {
        try { this._sourceNode.stop(); } catch (e) {}
        try { this._sourceNode.disconnect(); } catch (e2) {}
      }
      try { this._playProxy.disconnect(); } catch (e3) {}
      try { this._recordProxy.disconnect(); } catch (e4) {}
      try { this._cvProxy.disconnect(); } catch (e5) {}
      try { this._lOut.disconnect(); } catch (e6) {}
      try { this._rOut.disconnect(); } catch (e7) {}
      try { this._lLimiter.disconnect(); } catch (e8) {}
      try { this._rLimiter.disconnect(); } catch (e9) {}
    },
    _loadTestLoop: function() {
      var sampleRate = ctx.sampleRate || 44100;
      var length = Math.max(1, Math.floor(sampleRate * 0.5));
      var buffer = ctx.createBuffer(1, length, sampleRate);
      var channelData = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) {
        var fundamental = Math.sin((2 * Math.PI * 196 * i) / sampleRate) * 0.28;
        var overtone = Math.sin((2 * Math.PI * 392 * i) / sampleRate) * 0.08;
        channelData[i] = fundamental + overtone;
      }
      this._audioBuffer = buffer;
      ZOIA.log('[DIAG] Sampler deterministic test sample loaded, length=' + length);
    },
    startPlay: function(source) {
      if (!this._audioBuffer) this._loadTestLoop();
      if (this._sourceNode) {
        try { this._sourceNode.stop(); } catch (e) {}
        try { this._sourceNode.disconnect(); } catch (e2) {}
      }
      var src = ctx.createBufferSource();
      src.buffer = this._audioBuffer;
      src.loop = true;
      src.connect(this._lOut);
      src.connect(this._rOut);
      src.start();
      this._sourceNode = src;
      ZOIA.log('[DIAG] Sampler deterministic playback started, source=' + (source || 'button'));
    }
  };

  return node;
};


// ================================================================
//  Looper (Type 62)
// ================================================================
// Blocks: Audio In [audio_in], Record [gate_in], Play [gate_in],
//         Audio Out [audio_out]
// Uses ScriptProcessorNode to capture raw samples during recording,
// then creates an AudioBuffer + AudioBufferSourceNode(loop=true)
// for reliable variable-length looping playback.

ZOIA.sim._createLooper = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var recordGain = ctx.createGain();
  recordGain.gain.value = 0.0; // Off by default; gate enables recording

  var playGain = ctx.createGain();
  playGain.gain.value = 0.0; // Off by default; gate enables playback

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  var outputLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);

  // Audio capture during recording
  var captureProcessor = ctx.createScriptProcessor(4096, 1, 1);
  var captureChunks = []; // Array of Float32Array chunks
  var captureActive = false;

  // Signal flow:
  //   input -> outGain (dry pass-through, always)
  //   input -> recordGain -> captureProcessor -> silentDrain -> destination (capture path)
  //   input -> energyAnalyser (energy capture for timeline)
  //   AudioBufferSourceNode(loop=true) -> playGain -> outGain (playback path, created on demand)
  inGain.connect(recordGain);
  recordGain.connect(captureProcessor);
  var silentDrain = ctx.createGain();
  silentDrain.gain.value = 0;
  captureProcessor.connect(silentDrain);
  silentDrain.connect(ctx.destination);
  playGain.connect(outGain);
  inGain.connect(outGain); // dry signal always passes through
  outGain.connect(outputLimiter);

  // Capture handler
  captureProcessor.onaudioprocess = function(e) {
    if (captureActive) {
      var input = e.inputBuffer.getChannelData(0);
      var chunk = new Float32Array(input.length);
      // Copy samples (must copy, buffer is reused)
      for (var ci = 0; ci < input.length; ci++) {
        var sample = Number(input[ci]);
        if (!isFinite(sample)) sample = 0;
        if (sample > 1) sample = 1;
        if (sample < -1) sample = -1;
        chunk[ci] = sample;
      }
      captureChunks.push(chunk);
    }
    // Zero the output to prevent any sound from the processor
    var output = e.outputBuffer.getChannelData(0);
    for (var oi = 0; oi < output.length; oi++) {
      output[oi] = 0;
    }
  };

  // CV proxy nodes for record/play/stop gates
  // Uses proxy GainNode + AnalyserNode polling (same pattern as Oscillator CV)
  var recProxy = ctx.createGain();
  recProxy.gain.value = 0;
  var recSrc = ctx.createConstantSource();
  recSrc.offset.value = 1;
  recSrc.connect(recProxy);
  recSrc.start();
  var recAnalyser = ctx.createAnalyser();
  recAnalyser.fftSize = 256;
  recProxy.connect(recAnalyser);

  var playProxy = ctx.createGain();
  playProxy.gain.value = 0;
  var playSrc = ctx.createConstantSource();
  playSrc.offset.value = 1;
  playSrc.connect(playProxy);
  playSrc.start();
  var playAnalyser = ctx.createAnalyser();
  playAnalyser.fftSize = 256;
  playProxy.connect(playAnalyser);

  // Stop gate proxy+analyser
  var stopProxy = ctx.createGain();
  stopProxy.gain.value = 0;
  var stopSrc = ctx.createConstantSource();
  stopSrc.offset.value = 1;
  stopSrc.connect(stopProxy);
  stopSrc.start();
  var stopAnalyser = ctx.createAnalyser();
  stopAnalyser.fftSize = 256;
  stopProxy.connect(stopAnalyser);

  // Energy analyser for waveform timeline (tapped from input)
  var energyAnalyser = ctx.createAnalyser();
  energyAnalyser.fftSize = 256;
  inGain.connect(energyAnalyser);
  var _energyBuf = new Float32Array(energyAnalyser.frequencyBinCount);

  var _disposed = false;
  var _recBuf = new Float32Array(1);
  var _playBuf = new Float32Array(1);
  var _stopBuf = new Float32Array(1);
  var _lastRec = 0;
  var _lastPlay = 0;
  var _lastStop = 0;

  var recordIdx = null;
  var playIdx = null;
  var stopIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'gate_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rec') >= 0) {
        recordIdx = i;
        inputs[i] = recProxy.gain; // CV input for record gate
      } else if (name.indexOf('play') >= 0) {
        playIdx = i;
        inputs[i] = playProxy.gain; // CV input for play gate
      } else if (name.indexOf('stop') >= 0) {
        stopIdx = i;
        inputs[i] = stopProxy.gain; // CV input for stop gate
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outputLimiter;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  ZOIA.log('[DIAG] Looper factory: mod.idx=' + mod.idx + ' recordIdx=' + recordIdx + ' playIdx=' + playIdx + ' stopIdx=' + stopIdx + ' blocks=' + blocks.length);

  var node = {
    type: 'looper',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _recordGain: recordGain,
    _playGain: playGain,
    _outGain: outGain,
    _outputLimiter: outputLimiter,
    _audioBuffer: null,      // AudioBuffer created from captured samples
    _sourceNode: null,       // Current AudioBufferSourceNode (null when not playing)
    _recording: false,
    _playing: false,
    _recordStartTime: 0,
    _recordDuration: 0,
    _playStartTime: 0,
    _uiUpdateCounter: 0,
    _energyData: [],
    _energySampleRate: 20,
    recordIdx: recordIdx,
    playIdx: playIdx,
    stopIdx: stopIdx,
    dispose: function() {
      _disposed = true;
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._recordGain.disconnect(); } catch (e) {}
      try { this._playGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._outputLimiter.disconnect(); } catch (e) {}
      try { captureProcessor.disconnect(); } catch (e) {}
      try { silentDrain.disconnect(); } catch (e) {}
      if (this._sourceNode) {
        try { this._sourceNode.stop(); } catch (e) {}
        try { this._sourceNode.disconnect(); } catch (e) {}
      }
      try { recSrc.stop(); } catch (e) {}
      try { recSrc.disconnect(); } catch (e) {}
      try { recProxy.disconnect(); } catch (e) {}
      try { recAnalyser.disconnect(); } catch (e) {}
      try { playSrc.stop(); } catch (e) {}
      try { playSrc.disconnect(); } catch (e) {}
      try { playProxy.disconnect(); } catch (e) {}
      try { playAnalyser.disconnect(); } catch (e) {}
      try { stopSrc.stop(); } catch (e) {}
      try { stopSrc.disconnect(); } catch (e) {}
      try { stopProxy.disconnect(); } catch (e) {}
      try { stopAnalyser.disconnect(); } catch (e) {}
      try { energyAnalyser.disconnect(); } catch (e) {}
    },
    _loadTestLoop: function() {
      var sampleRate = ctx.sampleRate || 44100;
      var length = Math.max(1, Math.floor(sampleRate * 0.5));
      var buffer = ctx.createBuffer(1, length, sampleRate);
      var channelData = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) {
        channelData[i] = Math.sin((2 * Math.PI * 220 * i) / sampleRate) * 0.35;
      }
      this._audioBuffer = buffer;
      this._recordDuration = length / sampleRate;
      ZOIA.log('[DIAG] Looper deterministic test loop loaded, length=' + length);
    },
    startRecord: function(source) {
      ZOIA.log('[DIAG] startRecord() called, source=' + (source || 'button') + ' _recording=' + this._recording);
      if (this._recording) return;
      this._energyData = [];
      captureChunks = [];
      captureActive = true;
      var t = ZOIA.sim.ctx.currentTime;
      this._recordGain.gain.setTargetAtTime(1.0, t, 0.01);
      this._recording = true;
      this._recordStartTime = ZOIA.sim.ctx.currentTime;
      ZOIA.gridButtons.render();
      ZOIA.oled.render();
      if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
      var ps = document.getElementById('patch-summary');
      if (ps) {
        ps.textContent = '\u25CF REC 0.0s';
        ps.style.color = '#ff1744';
      }
    },
    stopRecord: function(source) {
      ZOIA.log('[DIAG] stopRecord() called, source=' + (source || 'button') + ' _recording=' + this._recording);
      if (!this._recording) return;
      var t = ZOIA.sim.ctx.currentTime;
      captureActive = false;
      this._recordGain.gain.setTargetAtTime(0.0, t, 0.01);
      this._recordDuration = ZOIA.sim.ctx.currentTime - this._recordStartTime;

      // Build AudioBuffer from captured chunks
      var totalSamples = 0;
      for (var ci = 0; ci < captureChunks.length; ci++) {
        totalSamples += captureChunks[ci].length;
      }
      ZOIA.log('[DIAG] stopRecord: captured ' + captureChunks.length + ' chunks, ' + totalSamples + ' samples, duration=' + this._recordDuration.toFixed(3) + 's');
      if (totalSamples > 0) {
        var sampleRate = ctx.sampleRate;
        var buffer = ctx.createBuffer(1, totalSamples, sampleRate);
        var channelData = buffer.getChannelData(0);
        var offset = 0;
        for (var ci2 = 0; ci2 < captureChunks.length; ci2++) {
          channelData.set(captureChunks[ci2], offset);
          offset += captureChunks[ci2].length;
        }
        this._audioBuffer = buffer;
        ZOIA.log('[DIAG] stopRecord: created AudioBuffer, length=' + buffer.length + ' sampleRate=' + sampleRate);
      }
      captureChunks = []; // Free memory

      this._recording = false;
      ZOIA.gridButtons.render();
      ZOIA.oled.render();
      if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
      var ps = document.getElementById('patch-summary');
      if (ps) {
        ps.style.color = '';
        ZOIA.updatePatchSummary();
      }
    },
    startPlay: function(source) {
      ZOIA.log('[DIAG] startPlay() called, source=' + (source || 'button') + ' _playing=' + this._playing);
      if (this._playing) return;
      if (!this._audioBuffer) {
        ZOIA.log('[DIAG] startPlay: no audioBuffer, cannot play');
      } else {
        var t = ZOIA.sim.ctx.currentTime;
        // Create a new AudioBufferSourceNode each time (they are one-shot)
        var src = ctx.createBufferSource();
        src.buffer = this._audioBuffer;
        src.loop = true;
        src.connect(this._playGain);
        src.start(0);
        this._sourceNode = src;
        this._playGain.gain.setTargetAtTime(0.6, t, 0.01);
        this._playing = true;
        this._playStartTime = ZOIA.sim.ctx.currentTime;
        ZOIA.log('[DIAG] startPlay: started AudioBufferSourceNode, loop=true, bufferLen=' + this._audioBuffer.length);
        ZOIA.gridButtons.render();
        ZOIA.oled.render();
        if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
        var ps = document.getElementById('patch-summary');
        if (ps && !this._recording) {
          var dur = this._recordDuration;
          if (dur > 0) {
            ps.textContent = '\u25B6 0.0s / ' + dur.toFixed(1) + 's';
          } else {
            ps.textContent = '\u25B6 PLAYING';
          }
          ps.style.color = '#00e676';
        }
      }
    },
    stopPlay: function(source) {
      ZOIA.log('[DIAG] stopPlay() called, source=' + (source || 'button') + ' _playing=' + this._playing);
      if (!this._playing) return;
      var t = ZOIA.sim.ctx.currentTime;
      this._playGain.gain.setTargetAtTime(0.0, t, 0.01);
      if (this._sourceNode) {
        try { this._sourceNode.stop(); } catch (e) {}
        try { this._sourceNode.disconnect(); } catch (e) {}
        this._sourceNode = null;
      }
      this._playing = false;
      ZOIA.gridButtons.render();
      ZOIA.oled.render();
      if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
      var ps = document.getElementById('patch-summary');
      if (ps && !this._recording) {
        ps.style.color = '';
        ZOIA.updatePatchSummary();
      }
    },
    pressBlock: function(blockIdx) {
      ZOIA.log('[DIAG] pressBlock(' + blockIdx + ') recIdx=' + this.recordIdx + ' playIdx=' + this.playIdx + ' stopIdx=' + this.stopIdx + ' _rec=' + this._recording + ' _play=' + this._playing);
      if (blockIdx === this.recordIdx) {
        if (this._recording) {
          this.stopRecord();
          this.startPlay();
        } else {
          this.startRecord();
        }
      } else if (blockIdx === this.playIdx) {
        if (this._playing) {
          this.stopPlay();
        } else {
          this.startPlay();
        }
      } else if (blockIdx === this.stopIdx) {
        this.stopRecord();
        this.stopPlay();
      }
    },
    releaseBlock: function(blockIdx) {
      // Only Stop is momentary; Record and Play are toggles (no release action)
    }
  };

  // Poll CV inputs to detect gate changes
  var _pollCounter = 0;
  (function pollGates() {
    if (_disposed) return;
    recAnalyser.getFloatTimeDomainData(_recBuf);
    playAnalyser.getFloatTimeDomainData(_playBuf);
    var rec = _recBuf[0];
    var play = _playBuf[0];
    // Stop gate: read early so we can log all three together
    stopAnalyser.getFloatTimeDomainData(_stopBuf);
    var stop = _stopBuf[0];
    _pollCounter++;
    if (_pollCounter % 60 === 0) {
      ZOIA.log('[DIAG] pollGates: rec=' + rec.toFixed(3) + ' play=' + play.toFixed(3) + ' stop=' + stop.toFixed(3) + ' _rec=' + node._recording + ' _play=' + node._playing);
    }
    // Record gate: high (>0.5) = recording, low = stop
    if (rec > 0.5 && _lastRec <= 0.5) {
      node.startRecord('pollGates');
    } else if (rec <= 0.5 && _lastRec > 0.5) {
      node.stopRecord('pollGates');
      node.startPlay('pollGates-afterRec'); // Auto-play after recording stops
    }
    // Play gate: explicit play control
    if (play > 0.5 && _lastPlay <= 0.5) {
      node.startPlay('pollGates');
    } else if (play <= 0.5 && _lastPlay > 0.5) {
      node.stopPlay('pollGates');
    }
    // Stop gate: rising edge stops both recording and playback
    if (stop > 0.5 && _lastStop <= 0.5) {
      node.stopRecord('pollGates-stop');
      node.stopPlay('pollGates-stop');
    }
    if (node._recording) {
      node._uiUpdateCounter++;
      // Sample energy every 3 frames (~50ms at 60fps) for waveform timeline
      if (node._uiUpdateCounter % 3 === 0) {
        energyAnalyser.getFloatTimeDomainData(_energyBuf);
        var sum = 0;
        for (var ei = 0; ei < _energyBuf.length; ei++) {
          sum += _energyBuf[ei] * _energyBuf[ei];
        }
        var rms = Math.sqrt(sum / _energyBuf.length);
        node._energyData.push(Math.min(1.0, rms * 4));
      }
      if (node._uiUpdateCounter % 15 === 0) {
        ZOIA.oled.render();
        if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
        var ps = document.getElementById('patch-summary');
        if (ps) {
          var elapsed = ZOIA.sim.ctx.currentTime - node._recordStartTime;
          ps.textContent = '\u25CF REC ' + elapsed.toFixed(1) + 's';
        }
      }
    } else if (node._playing) {
      node._uiUpdateCounter++;
      if (node._uiUpdateCounter % 15 === 0) {
        ZOIA.oled.render();
        if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
        var ps2 = document.getElementById('patch-summary');
        if (ps2 && node._recordDuration > 0) {
          var playElapsed = ZOIA.sim.ctx.currentTime - node._playStartTime;
          var playPos = playElapsed % node._recordDuration;
          ps2.textContent = '\u25B6 ' + playPos.toFixed(1) + 's / ' + node._recordDuration.toFixed(1) + 's';
        }
      }
    }
    _lastRec = rec;
    _lastPlay = play;
    _lastStop = stop;
    requestAnimationFrame(pollGates);
  })();

  return node;
};


// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[24] = ZOIA.sim._createMultiFilter;
ZOIA.sim._moduleFactories[33] = ZOIA.sim._createAudioInSwitch;
ZOIA.sim._moduleFactories[34] = ZOIA.sim._createAudioOutSwitch;
ZOIA.sim._moduleFactories[53] = ZOIA.sim._createStereoSpread;
ZOIA.sim._moduleFactories[62] = ZOIA.sim._createLooper;
ZOIA.sim._moduleFactories[102] = ZOIA.sim._createSampler;
ZOIA.sim._moduleFactories[64] = ZOIA.sim._createAudioBalance;
ZOIA.sim._moduleFactories[65] = ZOIA.sim._createInverter;
ZOIA.sim._moduleFactories[73] = ZOIA.sim._createEQ;
ZOIA.sim._moduleFactories[78] = ZOIA.sim._createGranular;
ZOIA.sim._moduleFactories[79] = ZOIA.sim._createAudioBalance;
ZOIA.sim._moduleFactories[83] = ZOIA.sim._createGranular;

ZOIA.log('sim-mod-audio.js loaded: 10 audio modules registered');


