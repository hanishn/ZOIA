// === sim-engine.js ===
/**
 * sim-engine.js — ZOIA Patch Simulation Engine
 *
 * Provides real-time audio simulation of the ZOIA patch using the Web Audio API.
 * Each module in the patch is mapped to a corresponding Web Audio node graph.
 * Connections between modules route audio/CV signals through GainNodes whose
 * gain reflects the connection strength (0-10000 → 0.0-1.0).
 *
 * Architecture:
 *   ZOIA.sim.ctx         — AudioContext (created on first play)
 *   ZOIA.sim.nodes[]     — Per-module node containers (one per patch module)
 *   ZOIA.sim.connGains[] — GainNode per connection (for strength attenuation)
 *   ZOIA.sim.running     — Boolean, true while simulation is active
 *
 * Supported modules (Tier 1):
 *   Audio Input (1), Audio Output (2), VCA (7), Oscillator (14),
 *   SV Filter (0), LFO (5), ADSR (6), Noise (38), Value (45),
 *   Delay Line (13), Distortion (11), Tone Control (12),
 *   Audio Mixer (76), Reverb (36), Chorus (29), Flanger (28),
 *   Tremolo (71), Bit Crusher (9), Audio Multiply (8),
 *   Audio Panner (57), Compressor (23)
 *
 * ES5 only — no arrow functions, no const/let, no template literals.
 */
window.ZOIA = window.ZOIA || {};

ZOIA.sim = {
  ctx: null,
  nodes: [],
  connGains: [],
  running: false,
  micStream: null,
  analyser: null,
  inputAnalyser: null,
  masterGain: null,
  masterLimiter: null,
  testToneActive: false,
  _testToneOsc: null,
  _testToneGain: null
};

ZOIA.sim._createSoftLimiter = function(ctx, limit) {
  var shaper = ctx.createWaveShaper();
  var n = 2048;
  var curve = new Float32Array(n);
  var max = Number(limit);
  if (!isFinite(max) || max <= 0) max = 1;
  for (var i = 0; i < n; i++) {
    var x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2.5) * max;
  }
  shaper.curve = curve;
  shaper.oversample = '2x';
  return shaper;
};


// ================================================================
//  AUDIO CONTEXT
// ================================================================

/**
 * Get or create the AudioContext. Resumes if suspended.
 * @returns {AudioContext}
 */
ZOIA.sim._getCtx = function() {
  if (!ZOIA.sim.ctx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      ZOIA.log('Web Audio API not supported');
      return null;
    }
    ZOIA.sim.ctx = new AC({ sampleRate: 44100 });
    ZOIA.log('AudioContext created (sr=' + ZOIA.sim.ctx.sampleRate + ')');
  }
  if (ZOIA.sim.ctx.state === 'suspended') {
    ZOIA.sim.ctx.resume();
  }
  return ZOIA.sim.ctx;
};


// ================================================================
//  MODULE NODE FACTORIES
// ================================================================

/**
 * Create node container for a module. Returns an object with:
 *   inputs[]   — one Web Audio node per audio_in / cv_in block
 *   outputs[]  — one Web Audio node per audio_out / cv_out / gate_out block
 *   dispose()  — cleanup function
 *
 * Block indices in the returned arrays match the module's block layout.
 * Blocks that don't produce/accept signal have null entries.
 */

// ---- Audio Input (Type 1) ----
ZOIA.sim._createAudioInput = function(ctx, mod) {
  // Audio Input brings external audio into the patch.
  // Requests microphone access via getUserMedia; falls back to silence if denied.
  var blocks = mod.blocks || [];
  var outputs = [];
  var _micStream = null;
  var _micSource = null;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'audio_out') {
      var gain = ctx.createGain();
      gain.gain.value = 1.0;
      outputs[i] = gain;
    } else {
      outputs[i] = null;
    }
  }
  // Request microphone and connect to output gains
  var _gains = outputs.filter(function(n) { return n !== null; });
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && _gains.length > 0) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      _micStream = stream;
      _micSource = ctx.createMediaStreamSource(stream);
      for (var g = 0; g < _gains.length; g++) {
        _micSource.connect(_gains[g]);
      }
      if (ZOIA.log) { ZOIA.log('[AudioInput] Microphone connected'); }
    })['catch'](function(err) {
      if (ZOIA.log) { ZOIA.log('[AudioInput] Mic denied or unavailable: ' + err.message); }
    });
  }
  return {
    type: 'audio_input',
    inputs: [],
    outputs: outputs,
    _gains: _gains,
    dispose: function() {
      if (_micSource) {
        try { _micSource.disconnect(); } catch (e) {}
      }
      if (_micStream) {
        var tracks = _micStream.getTracks();
        for (var t = 0; t < tracks.length; t++) {
          tracks[t].stop();
        }
      }
      for (var j = 0; j < this._gains.length; j++) {
        try { this._gains[j].disconnect(); } catch (e) {}
      }
    }
  };
};

// ---- Audio Output (Type 2) ----
ZOIA.sim._createAudioOutput = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var gainBlock = null;
  var merger = null;

  // Determine if stereo or mono
  var audioInCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'audio_in') audioInCount++;
  }

  // Create a gain node for the output level
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  if (audioInCount >= 2) {
    // Stereo: merge L+R
    merger = ctx.createChannelMerger(2);
    merger.connect(outGain);
  }

  var channel = 0;
  for (var j = 0; j < blocks.length; j++) {
    if (blocks[j].t === 'audio_in') {
      var inGain = ctx.createGain();
      inGain.gain.value = 1.0;
      if (merger) {
        inGain.connect(merger, 0, channel);
        channel++;
      } else {
        inGain.connect(outGain);
      }
      inputs[j] = inGain;
    } else if (blocks[j].t === 'cv_in') {
      // Gain control block
      gainBlock = j;
      inputs[j] = outGain.gain; // AudioParam — CV modulates gain
    } else {
      inputs[j] = null;
    }
  }

  // Apply initial gain from params
  if (gainBlock !== null && mod.params && mod.params[gainBlock] !== undefined) {
    outGain.gain.value = mod.params[gainBlock] / 65535;
  }

  return {
    type: 'audio_output',
    inputs: inputs,
    outputs: [],
    _outGain: outGain,
    _merger: merger,
    gainBlockIdx: gainBlock,
    dispose: function() {
      try { this._outGain.disconnect(); } catch (e) {}
      if (this._merger) try { this._merger.disconnect(); } catch (e) {}
      for (var k = 0; k < this.inputs.length; k++) {
        if (this.inputs[k] && this.inputs[k].disconnect) {
          try { this.inputs[k].disconnect(); } catch (e) {}
        }
      }
    },
    getDestinationNode: function() { return this._outGain; }
  };
};

// ---- VCA (Type 7) ----
// Uses direct AudioParam connection: CV source connects to vca.gain.
// Web Audio natively sums connected signals with the param's intrinsic value.
// When CV connected: gain.value=0, effective gain = 0 + CV signal = CV signal.
// When no CV:        gain.value=baseLevel, effective gain = baseLevel.
ZOIA.sim._createVCA = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var vca = ctx.createGain();
  vca.gain.value = 1.0;
  var fallbackMix = ctx.createGain();
  fallbackMix.gain.value = 1.0;
  var fallbackLevel = ctx.createGain();
  fallbackLevel.gain.value = 1.0;
  var limiter = ZOIA.sim._createSoftLimiter(ctx, 1);
  vca.connect(limiter);
  fallbackMix.connect(fallbackLevel);
  fallbackLevel.connect(limiter);

  var levelIdx = null;
  var audioInputs = [];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      var inGain = ctx.createGain();
      inGain.gain.value = 1.0;
      inGain.connect(vca);
      inGain.connect(fallbackMix);
      inputs[i] = inGain;
      audioInputs.push(inGain);
    } else if (b.t === 'cv_in') {
      levelIdx = i;
      inputs[i] = vca.gain; // CV connects directly to VCA gain AudioParam
    } else if (b.t === 'audio_out') {
      outputs[i] = limiter;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Initial level from params
  var baseLevel = 1.0;
  if (levelIdx !== null && mod.params && mod.params[levelIdx] !== undefined) {
    baseLevel = mod.params[levelIdx] / 65535;
  }
  vca.gain.value = baseLevel;

  ZOIA.log('[DIAG] VCA factory: levelIdx=' + levelIdx + ' baseLevel=' + baseLevel.toFixed(3) + ' (direct AudioParam mode)');

  return {
    type: 'vca',
    inputs: inputs,
    outputs: outputs,
    _vca: vca,
    _audioInputs: audioInputs,
    _fallbackMix: fallbackMix,
    _fallbackLevel: fallbackLevel,
    _limiter: limiter,
    levelIdx: levelIdx,
    dispose: function() {
      try { this._vca.disconnect(); } catch (e) {}
      try { fallbackMix.disconnect(); } catch (e) {}
      try { this._fallbackLevel.disconnect(); } catch (e) {}
      try { this._limiter.disconnect(); } catch (e) {}
      for (var j = 0; j < this.inputs.length; j++) {
        if (this.inputs[j] && this.inputs[j].disconnect) {
          try { this.inputs[j].disconnect(); } catch (e) {}
        }
      }
    }
  };
};

// ---- Oscillator (Type 14) ----
ZOIA.sim._createOscillator = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];
  var MIN_OSC_FREQUENCY_HZ = 20;
  var MAX_OSC_FREQUENCY_HZ = 20000;
  var OSC_FREQUENCY_RATIO = 1000;

  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 440;

  // Optional: duty cycle variant uses square wave
  var hasDuty = blocks.some(function(b) { return b.n && b.n.toLowerCase().indexOf('duty') >= 0; });
  if (hasDuty) osc.type = 'square';

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  osc.connect(outGain);

  var freqIdx = null;
  var dutyIdx = null;

  // Use a GainNode as the frequency CV input proxy.
  // A polling loop reads this node's value and applies ZOIA's
  // exponential CV-to-Hz mapping to the oscillator frequency.
  var freqProxy = ctx.createGain();
  freqProxy.gain.value = 0;
  var freqProxySrc = ctx.createConstantSource();
  freqProxySrc.offset.value = 1;
  freqProxySrc.connect(freqProxy);
  freqProxySrc.start();
  var freqAnalyser = ctx.createAnalyser();
  freqAnalyser.fftSize = 256;
  freqProxy.connect(freqAnalyser);
  var freqBuf = new Float32Array(1);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('freq') >= 0) {
      freqIdx = i;
      inputs[i] = freqProxy.gain; // CV connects here; polling maps to Hz
    } else if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('duty') >= 0) {
      dutyIdx = i;
      inputs[i] = null; // Duty cycle not directly mappable to AudioParam
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Set initial frequency from params (map 0-65535 to 20-20000 Hz exponential)
  var baseFreq = 440;
  if (freqIdx !== null && mod.params && mod.params[freqIdx] !== undefined) {
    var norm = mod.params[freqIdx] / 65535;
    baseFreq = MIN_OSC_FREQUENCY_HZ * Math.pow(OSC_FREQUENCY_RATIO, norm);
  }
  osc.frequency.value = baseFreq;

  ZOIA.log('[DIAG] Oscillator factory: freqIdx=' + freqIdx + ' dutyIdx=' + dutyIdx + ' baseFreq=' + baseFreq.toFixed(1) + ' blocks=' + blocks.length);

  osc.start();

  // Poll the frequency proxy input and apply exponential CV-to-Hz mapping.
  // ZOIA CV range 0-1 maps to 20-20000 Hz via: 20 * 1000^cv
  // When no CV is connected the proxy gain stays at 0 (default), so the
  // polling loop leaves frequency at the param-derived baseFreq.
  var _disposed = false;
  var _lastCV = -1;
  var _pollCount = 0;
  (function pollFreq() {
    if (_disposed) return;
    freqAnalyser.getFloatTimeDomainData(freqBuf);
    var cv = freqBuf[0];
    _pollCount++;
    if (_pollCount % 120 === 0) {
      ZOIA.log('[DIAG] Osc pollFreq: cv=' + cv.toFixed(4) + ' freq=' + osc.frequency.value.toFixed(1) + 'Hz');
    }
    if (cv !== _lastCV) {
      _lastCV = cv;
      if (cv > 0.001) {
        osc.frequency.value = Math.max(MIN_OSC_FREQUENCY_HZ, Math.min(MAX_OSC_FREQUENCY_HZ, MIN_OSC_FREQUENCY_HZ * Math.pow(OSC_FREQUENCY_RATIO, cv)));
      } else if (cv <= 0.001) {
        osc.frequency.value = baseFreq;
      }
    }
    requestAnimationFrame(pollFreq);
  })();

  return {
    type: 'oscillator',
    inputs: inputs,
    outputs: outputs,
    _osc: osc,
    _outGain: outGain,
    _freqProxy: freqProxy,
    _freqProxySrc: freqProxySrc,
    _freqAnalyser: freqAnalyser,
    freqIdx: freqIdx,
    dutyIdx: dutyIdx,
    dispose: function() {
      _disposed = true;
      try { this._osc.stop(); } catch (e) {}
      try { this._osc.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._freqProxySrc.stop(); } catch (e) {}
      try { this._freqProxySrc.disconnect(); } catch (e) {}
      try { this._freqProxy.disconnect(); } catch (e) {}
      try { this._freqAnalyser.disconnect(); } catch (e) {}
    }
  };
};

// ---- SV Filter (Type 0) ----
ZOIA.sim._createSVFilter = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Create three filters for LP/HP/BP outputs
  var lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.value = 1000;
  lpFilter.Q.value = 1;

  var hpFilter = ctx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.value = 1000;
  hpFilter.Q.value = 1;

  var bpFilter = ctx.createBiquadFilter();
  bpFilter.type = 'bandpass';
  bpFilter.frequency.value = 1000;
  bpFilter.Q.value = 1;

  // Input splitter: route input to all three filters
  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(lpFilter);
  inGain.connect(hpFilter);
  inGain.connect(bpFilter);

  var freqIdx = null;
  var resIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('freq') >= 0) {
      freqIdx = i;
      // We'll update all three filters' frequency together
      inputs[i] = lpFilter.frequency; // Primary param target
    } else if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('res') >= 0) {
      resIdx = i;
      inputs[i] = lpFilter.Q; // Primary param target
    } else if (b.t === 'audio_out') {
      // Map outputs by name
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('lp') >= 0 || name.indexOf('low') >= 0) {
        outputs[i] = lpFilter;
      } else if (name.indexOf('hp') >= 0 || name.indexOf('high') >= 0) {
        outputs[i] = hpFilter;
      } else if (name.indexOf('bp') >= 0 || name.indexOf('band') >= 0) {
        outputs[i] = bpFilter;
      } else {
        // Single output variant — use LP
        outputs[i] = lpFilter;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Set initial frequency from params
  if (freqIdx !== null && mod.params && mod.params[freqIdx] !== undefined) {
    var norm = mod.params[freqIdx] / 65535;
    var freq = 20 * Math.pow(1000, norm);
    lpFilter.frequency.value = freq;
    hpFilter.frequency.value = freq;
    bpFilter.frequency.value = freq;
  }

  // Set initial resonance from params (map 0-1 to Q 0.5-15)
  if (resIdx !== null && mod.params && mod.params[resIdx] !== undefined) {
    var rNorm = mod.params[resIdx] / 65535;
    var q = 0.5 + rNorm * 14.5;
    lpFilter.Q.value = q;
    hpFilter.Q.value = q;
    bpFilter.Q.value = q;
  }

  return {
    type: 'sv_filter',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _lp: lpFilter,
    _hp: hpFilter,
    _bp: bpFilter,
    freqIdx: freqIdx,
    resIdx: resIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._lp.disconnect(); } catch (e) {}
      try { this._hp.disconnect(); } catch (e) {}
      try { this._bp.disconnect(); } catch (e) {}
    },
    // Sync all filter frequencies
    setFrequency: function(freq) {
      var t = ZOIA.sim.ctx.currentTime;
      this._lp.frequency.setTargetAtTime(freq, t, 0.01);
      this._hp.frequency.setTargetAtTime(freq, t, 0.01);
      this._bp.frequency.setTargetAtTime(freq, t, 0.01);
    },
    setQ: function(q) {
      var t = ZOIA.sim.ctx.currentTime;
      this._lp.Q.setTargetAtTime(q, t, 0.01);
      this._hp.Q.setTargetAtTime(q, t, 0.01);
      this._bp.Q.setTargetAtTime(q, t, 0.01);
    }
  };
};

// ---- LFO (Type 5) ----
ZOIA.sim._createLFO = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1.0; // 1 Hz default

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  osc.connect(outGain);

  var rateIdx = null;
  var depthIdx = null;
  var depthHasConnection = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_out') {
      outputs[i] = outGain;
    } else if (b.t === 'cv_in' && b.n && b.n.indexOf('Rate') >= 0) {
      rateIdx = i;
      inputs[i] = osc.frequency;
    } else if (b.t === 'cv_in' && b.n && b.n.indexOf('Depth') >= 0) {
      depthIdx = i;
      inputs[i] = outGain.gain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Set initial rate from params (map 0-1 to 0.01-20 Hz)
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    var norm = mod.params[rateIdx] / 65535;
    osc.frequency.value = 0.01 + norm * 19.99;
  }

  if (depthIdx !== null && mod.params && mod.params[depthIdx] !== undefined) {
    outGain.gain.value = mod.params[depthIdx] / 65535;
  }
  if (depthIdx !== null && ZOIA.state && ZOIA.state.patch && ZOIA.state.patch.connections) {
    for (var lfoConnIdx = 0; lfoConnIdx < ZOIA.state.patch.connections.length; lfoConnIdx++) {
      var lfoConn = ZOIA.state.patch.connections[lfoConnIdx];
      if (lfoConn && lfoConn.dstMod === mod.idx && lfoConn.dstBlock === depthIdx) {
        depthHasConnection = true;
        break;
      }
    }
  }
  if (depthIdx !== null && !depthHasConnection && outGain.gain.value === 0) {
    outGain.gain.value = 1.0;
    ZOIA.log('[DIAG] LFO depth defaulted to 1.0 for unconnected depth input modIdx=' + mod.idx);
  }

  osc.start();

  return {
    type: 'lfo',
    inputs: inputs,
    outputs: outputs,
    _osc: osc,
    _outGain: outGain,
    rateIdx: rateIdx,
    depthIdx: depthIdx,
    dispose: function() {
      try { this._osc.stop(); } catch (e) {}
      try { this._osc.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- ADSR Envelope (Type 6) ----
ZOIA.sim._createADSR = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // ADSR uses a ConstantSourceNode to output the envelope value
  var src = ctx.createConstantSource();
  src.offset.value = 0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  src.connect(outGain);
  src.start();

  // Gate input: handled via direct JavaScript callbacks (not audio graph).
  // The post-wiring pass registers ADSR._onGateChange on source nodes'
  // _gateListeners arrays. Keyboard/Stompswitch call these on noteOn/noteOff.
  // This bypasses the Web Audio AnalyserNode which fails to read gate signals
  // from ConstantSourceNodes connected through the wiring graph.
  var _disposed = false;

  // CV modulation proxies for Attack, Decay, Sustain, Release
  var attackProxy = ctx.createGain();
  attackProxy.gain.value = 0;
  var attackSrc = ctx.createConstantSource();
  attackSrc.offset.value = 1;
  attackSrc.connect(attackProxy);
  attackSrc.start();
  var attackAnalyser = ctx.createAnalyser();
  attackAnalyser.fftSize = 256;
  attackProxy.connect(attackAnalyser);
  var _attackBuf = new Float32Array(1);

  var decayProxy = ctx.createGain();
  decayProxy.gain.value = 0;
  var decaySrc = ctx.createConstantSource();
  decaySrc.offset.value = 1;
  decaySrc.connect(decayProxy);
  decaySrc.start();
  var decayAnalyser = ctx.createAnalyser();
  decayAnalyser.fftSize = 256;
  decayProxy.connect(decayAnalyser);
  var _decayBuf = new Float32Array(1);

  var sustainProxy = ctx.createGain();
  sustainProxy.gain.value = 0;
  var sustainSrc = ctx.createConstantSource();
  sustainSrc.offset.value = 1;
  sustainSrc.connect(sustainProxy);
  sustainSrc.start();
  var sustainAnalyser = ctx.createAnalyser();
  sustainAnalyser.fftSize = 256;
  sustainProxy.connect(sustainAnalyser);
  var _sustainBuf = new Float32Array(1);

  var releaseProxy = ctx.createGain();
  releaseProxy.gain.value = 0;
  var releaseSrc = ctx.createConstantSource();
  releaseSrc.offset.value = 1;
  releaseSrc.connect(releaseProxy);
  releaseSrc.start();
  var releaseAnalyser = ctx.createAnalyser();
  releaseAnalyser.fftSize = 256;
  releaseProxy.connect(releaseAnalyser);
  var _releaseBuf = new Float32Array(1);

  // End gate output
  var endGateSrc = ctx.createConstantSource();
  endGateSrc.offset.value = 0;
  endGateSrc.start();
  var endGateOut = ctx.createGain();
  endGateOut.gain.value = 1;
  endGateSrc.connect(endGateOut);
  var _endGateTimeout = null;

  // Parse ADSR indices
  var cvOutIdx = null;
  var gateIdx = null;
  var attackIdx = null;
  var decayIdx = null;
  var sustainIdx = null;
  var releaseIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_out') {
      cvOutIdx = i;
      outputs[i] = outGain;
    } else if (b.t === 'gate_in') {
      if (gateIdx === null || (b.n || '').toLowerCase().indexOf('gate') >= 0) {
        gateIdx = i;
      }
      inputs[i] = null; // Gate handled via direct JS callbacks, not audio graph
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('gate') >= 0) {
        if (gateIdx === null) { gateIdx = i; }
        inputs[i] = null; /* direct JS callbacks */
      }
      else if (name.indexOf('attack') >= 0) { attackIdx = i; inputs[i] = attackProxy.gain; }
      else if (name.indexOf('decay') >= 0) { decayIdx = i; inputs[i] = decayProxy.gain; }
      else if (name.indexOf('sustain') >= 0) { sustainIdx = i; inputs[i] = sustainProxy.gain; }
      else if (name.indexOf('release') >= 0) { releaseIdx = i; inputs[i] = releaseProxy.gain; }
      else { inputs[i] = null; }
    } else if (b.t === 'gate_out') {
      outputs[i] = endGateOut;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  ZOIA.log('[DIAG] ADSR factory: gateIdx=' + gateIdx + ' attackIdx=' + attackIdx + ' decayIdx=' + decayIdx + ' sustainIdx=' + sustainIdx + ' releaseIdx=' + releaseIdx + ' cvOutIdx=' + cvOutIdx);

  // Read initial ADSR values from params
  var adsr = { a: 0.01, d: 0.3, s: 0.7, r: 0.5 };
  if (attackIdx !== null && mod.params && mod.params[attackIdx] !== undefined) {
    adsr.a = Math.max(0.001, (mod.params[attackIdx] / 65535) * 10);
  }
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    adsr.d = Math.max(0.001, (mod.params[decayIdx] / 65535) * 10);
  }
  if (sustainIdx !== null && mod.params && mod.params[sustainIdx] !== undefined) {
    adsr.s = mod.params[sustainIdx] / 65535;
  }
  if (releaseIdx !== null && mod.params && mod.params[releaseIdx] !== undefined) {
    adsr.r = Math.max(0.001, (mod.params[releaseIdx] / 65535) * 10);
  }

  // Store base values as fallbacks when no CV is connected
  var _baseA = adsr.a;
  var _baseD = adsr.d;
  var _baseS = adsr.s;
  var _baseR = adsr.r;

  ZOIA.log('[DIAG] ADSR params: a=' + adsr.a.toFixed(3) + ' d=' + adsr.d.toFixed(3) + ' s=' + adsr.s.toFixed(3) + ' r=' + adsr.r.toFixed(3));

  var node = {
    type: 'adsr',
    inputs: inputs,
    outputs: outputs,
    _src: src,
    _outGain: outGain,
    adsr: adsr,
    _gateOpen: false,
    _gateBlockIdx: gateIdx,
    _gateSourceStates: {},
    dispose: function() {
      _disposed = true;
      if (_endGateTimeout) { clearTimeout(_endGateTimeout); }
      try { attackSrc.stop(); } catch (e) {}
      try { attackSrc.disconnect(); } catch (e) {}
      try { attackProxy.disconnect(); } catch (e) {}
      try { attackAnalyser.disconnect(); } catch (e) {}
      try { decaySrc.stop(); } catch (e) {}
      try { decaySrc.disconnect(); } catch (e) {}
      try { decayProxy.disconnect(); } catch (e) {}
      try { decayAnalyser.disconnect(); } catch (e) {}
      try { sustainSrc.stop(); } catch (e) {}
      try { sustainSrc.disconnect(); } catch (e) {}
      try { sustainProxy.disconnect(); } catch (e) {}
      try { sustainAnalyser.disconnect(); } catch (e) {}
      try { releaseSrc.stop(); } catch (e) {}
      try { releaseSrc.disconnect(); } catch (e) {}
      try { releaseProxy.disconnect(); } catch (e) {}
      try { releaseAnalyser.disconnect(); } catch (e) {}
      try { endGateSrc.stop(); } catch (e) {}
      try { endGateSrc.disconnect(); } catch (e) {}
      try { endGateOut.disconnect(); } catch (e) {}
      try { this._src.stop(); } catch (e) {}
      try { this._src.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    },
    trigger: function() {
      if (_endGateTimeout) { clearTimeout(_endGateTimeout); _endGateTimeout = null; }
      var t = ZOIA.sim.ctx.currentTime;
      var o = this._src.offset;
      o.cancelScheduledValues(t);
      o.setValueAtTime(0, t);
      o.linearRampToValueAtTime(1.0, t + this.adsr.a);
      o.linearRampToValueAtTime(this.adsr.s, t + this.adsr.a + this.adsr.d);
      this._gateOpen = true;
    },
    release: function() {
      if (!this._gateOpen) return;
      var t = ZOIA.sim.ctx.currentTime;
      var o = this._src.offset;
      o.cancelScheduledValues(t);
      o.setTargetAtTime(0, t, this.adsr.r / 5);
      this._gateOpen = false;
      // Schedule end gate pulse after release time completes
      if (_endGateTimeout) { clearTimeout(_endGateTimeout); }
      _endGateTimeout = setTimeout(function() {
        var t2 = ZOIA.sim.ctx.currentTime;
        endGateSrc.offset.setValueAtTime(1, t2);
        endGateSrc.offset.setValueAtTime(0, t2 + 0.002);
        _endGateTimeout = null;
      }, Math.round(node.adsr.r * 1000));
    }
  };

  // Direct gate change callback — called by source modules (Keyboard, Stompswitch)
  // via the _gateListeners array registered in the post-wiring pass.
  // value: 1 = gate on, 0 = gate off
  node._onGateChange = function(value) {
    ZOIA.log('[DIAG] ADSR _onGateChange: value=' + value + ' gateOpen=' + node._gateOpen);
    if (value > 0.5 && !node._gateOpen) {
      node.trigger();
    } else if (value <= 0.5 && node._gateOpen) {
      node.release();
    }
  };

  node._onGateChangeFromSource = function(sourceId, value) {
    var key = String(sourceId);
    node._gateSourceStates[key] = value > 0.5 ? 1 : 0;
    var anyGateOpen = false;
    for (var sourceKey in node._gateSourceStates) {
      if (node._gateSourceStates.hasOwnProperty(sourceKey) && node._gateSourceStates[sourceKey] > 0.5) {
        anyGateOpen = true;
        break;
      }
    }
    node._onGateChange(anyGateOpen ? 1 : 0);
  };

  // Poll ADSR CV modulation inputs (attack, decay, sustain, release)
  // Gate detection is handled via direct JS callbacks, not polling.
  (function pollADSR() {
    if (_disposed) return;

    // Read CV modulation for Attack
    attackAnalyser.getFloatTimeDomainData(_attackBuf);
    var aCV = _attackBuf[0];
    if (aCV > 0.001) {
      node.adsr.a = Math.max(0.001, aCV * 10);
    } else {
      node.adsr.a = _baseA;
    }

    // Read CV modulation for Decay
    decayAnalyser.getFloatTimeDomainData(_decayBuf);
    var dCV = _decayBuf[0];
    if (dCV > 0.001) {
      node.adsr.d = Math.max(0.001, dCV * 10);
    } else {
      node.adsr.d = _baseD;
    }

    // Read CV modulation for Sustain (direct 0-1 range)
    sustainAnalyser.getFloatTimeDomainData(_sustainBuf);
    var sCV = _sustainBuf[0];
    if (sCV > 0.001) {
      node.adsr.s = sCV;
    } else {
      node.adsr.s = _baseS;
    }

    // Read CV modulation for Release
    releaseAnalyser.getFloatTimeDomainData(_releaseBuf);
    var rCV = _releaseBuf[0];
    if (rCV > 0.001) {
      node.adsr.r = Math.max(0.001, rCV * 10);
    } else {
      node.adsr.r = _baseR;
    }

    requestAnimationFrame(pollADSR);
  })();

  return node;
};

// ---- Noise (Type 38) ----
ZOIA.sim._createNoise = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var outputs = [];

  // Create a noise buffer (2 seconds of white noise)
  var bufLen = ctx.sampleRate * 2;
  var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  var data = noiseBuf.getChannelData(0);
  for (var s = 0; s < bufLen; s++) {
    data[s] = Math.random() * 2 - 1;
  }

  var src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  src.connect(outGain);
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      outputs[i] = null;
    }
  }

  return {
    type: 'noise',
    inputs: [],
    outputs: outputs,
    _src: src,
    _outGain: outGain,
    dispose: function() {
      try { this._src.stop(); } catch (e) {}
      try { this._src.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Value (Type 45) ----
ZOIA.sim._createValue = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0.5; // Default midpoint
  src.start();

  if (mod.params && mod.params[0] !== undefined) {
    src.offset.value = mod.params[0] / 65535;
  }

  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'cv_out') {
      outputs[i] = src;
    } else {
      outputs[i] = null;
    }
  }

  return {
    type: 'value',
    inputs: [],
    outputs: outputs,
    _src: src,
    dispose: function() {
      try { this._src.stop(); } catch (e) {}
      try { this._src.disconnect(); } catch (e) {}
    }
  };
};

// ---- Delay Line (Type 13) ----
ZOIA.sim._createDelay = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var delay = ctx.createDelay(5.0); // max 5s
  delay.delayTime.value = 0.3;

  var feedback = ctx.createGain();
  feedback.gain.value = 0.4;

  var timeCv = ctx.createGain();
  timeCv.gain.value = 1.0;
  timeCv.connect(delay.delayTime);

  var feedbackCv = ctx.createGain();
  feedbackCv.gain.value = 0.5;
  feedbackCv.connect(feedback.gain);

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  var feedbackLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);
  var outputLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);

  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.5;

  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;

  // Signal flow: input -> delay -> feedback -> delay (loop)
  //              input -> dryGain -> outGain
  //              delay -> wetGain -> outGain
  inGain.connect(delay);
  inGain.connect(dryGain);
  delay.connect(feedback);
  feedback.connect(feedbackLimiter);
  feedbackLimiter.connect(delay);
  delay.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);
  outGain.connect(outputLimiter);

  var timeIdx = null, fbIdx = null, mixIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('time') >= 0) {
        timeIdx = i;
        inputs[i] = timeCv;
      } else if (name.indexOf('feed') >= 0) {
        fbIdx = i;
        inputs[i] = feedbackCv;
      } else if (name.indexOf('mix') >= 0) {
        mixIdx = i;
        inputs[i] = null; // Mix handled manually
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

  // Initial params
  if (timeIdx !== null && mod.params && mod.params[timeIdx] !== undefined) {
    delay.delayTime.value = 0.005 + (mod.params[timeIdx] / 65535) * 1.5;
  }
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    feedback.gain.value = (mod.params[fbIdx] / 65535) * 0.35;
  }
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    var mix = mod.params[mixIdx] / 65535;
    wetGain.gain.value = mix;
    dryGain.gain.value = 1 - mix;
  }

  return {
    type: 'delay',
    inputs: inputs,
    outputs: outputs,
    _delay: delay,
    _feedback: feedback,
    _feedbackLimiter: feedbackLimiter,
    _outputLimiter: outputLimiter,
    _timeCv: timeCv,
    _feedbackCv: feedbackCv,
    _inGain: inGain,
    _outGain: outGain,
    _dryGain: dryGain,
    _wetGain: wetGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._feedback.disconnect(); } catch (e) {}
      try { this._feedbackLimiter.disconnect(); } catch (e) {}
      try { this._outputLimiter.disconnect(); } catch (e) {}
      try { this._timeCv.disconnect(); } catch (e) {}
      try { this._feedbackCv.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Distortion / OD (Type 11) ----
ZOIA.sim._createDistortion = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var shaper = ctx.createWaveShaper();
  shaper.oversample = '2x';

  // Generate a soft-clip curve
  var curve = new Float32Array(44100);
  for (var s = 0; s < 44100; s++) {
    var x = (s / 44100) * 2 - 1;
    curve[s] = Math.tanh(x * 2);
  }
  shaper.curve = curve;

  var preGain = ctx.createGain();
  preGain.gain.value = 2.0;

  var toneFilter = ctx.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 6000;

  var outGain = ctx.createGain();
  outGain.gain.value = 0.7;

  preGain.connect(shaper);
  shaper.connect(toneFilter);
  toneFilter.connect(outGain);

  var driveIdx = null, toneIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = preGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('drive') >= 0) {
        driveIdx = i;
        inputs[i] = preGain.gain;
      } else if (name.indexOf('tone') >= 0) {
        toneIdx = i;
        inputs[i] = toneFilter.frequency;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  if (driveIdx !== null && mod.params && mod.params[driveIdx] !== undefined) {
    preGain.gain.value = 1 + (mod.params[driveIdx] / 65535) * 10;
  }
  if (toneIdx !== null && mod.params && mod.params[toneIdx] !== undefined) {
    toneFilter.frequency.value = 200 + (mod.params[toneIdx] / 65535) * 7800;
  }

  return {
    type: 'distortion',
    inputs: inputs,
    outputs: outputs,
    _preGain: preGain,
    _shaper: shaper,
    _toneFilter: toneFilter,
    _outGain: outGain,
    dispose: function() {
      try { this._preGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
      try { this._toneFilter.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Tone Control (Type 12) ----
ZOIA.sim._createToneControl = function(ctx, mod) {
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

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('bass') >= 0 || name.indexOf('low') >= 0) {
        inputs[i] = lowShelf.gain;
      } else if (name.indexOf('mid') >= 0) {
        inputs[i] = midPeak.gain;
      } else if (name.indexOf('treble') >= 0 || name.indexOf('high') >= 0) {
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

  return {
    type: 'tone_control',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _low: lowShelf,
    _mid: midPeak,
    _high: highShelf,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._low.disconnect(); } catch (e) {}
      try { this._mid.disconnect(); } catch (e) {}
      try { this._high.disconnect(); } catch (e) {}
    }
  };
};

// ---- Audio Mixer (Type 76) ----
ZOIA.sim._createAudioMixer = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      var inG = ctx.createGain();
      inG.gain.value = 1.0;
      inG.connect(outGain);
      inputs[i] = inG;
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'audio_mixer',
    inputs: inputs,
    outputs: outputs,
    _outGain: outGain,
    dispose: function() {
      try { this._outGain.disconnect(); } catch (e) {}
      for (var j = 0; j < this.inputs.length; j++) {
        if (this.inputs[j] && this.inputs[j].disconnect) {
          try { this.inputs[j].disconnect(); } catch (e) {}
        }
      }
    }
  };
};

// ---- Reverb (Type 36) ----
ZOIA.sim._createReverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Build a simple convolution reverb with synthetic IR
  var convolver = ctx.createConvolver();
  var irLen = ctx.sampleRate * 2; // 2 second reverb tail
  var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = irBuf.getChannelData(ch);
    for (var s = 0; s < irLen; s++) {
      d[s] = (Math.random() * 2 - 1) * Math.pow(1 - s / irLen, 2);
    }
  }
  convolver.buffer = irBuf;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.5;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  var mixIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('mix') >= 0) {
        mixIdx = i;
        inputs[i] = null;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    var mix = mod.params[mixIdx] / 65535;
    wetGain.gain.value = mix;
    dryGain.gain.value = 1 - mix;
  }

  return {
    type: 'reverb',
    inputs: inputs,
    outputs: outputs,
    _convolver: convolver,
    _inGain: inGain,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Chorus (Type 29) ----
ZOIA.sim._createChorus = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var delay = ctx.createDelay(0.1);
  delay.delayTime.value = 0.02; // 20ms base
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1.5;
  var lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.005; // 5ms modulation depth
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.7;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(delay);
  inGain.connect(dryGain);
  delay.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) inputs[i] = lfo.frequency;
      else if (name.indexOf('depth') >= 0) inputs[i] = lfoGain.gain;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = outGain; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'chorus',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _delay: delay, _lfo: lfo, _lfoGain: lfoGain,
    _dryGain: dryGain, _wetGain: wetGain, _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Flanger (Type 28) ----
ZOIA.sim._createFlanger = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var delay = ctx.createDelay(0.02);
  delay.delayTime.value = 0.003;
  var feedback = ctx.createGain();
  feedback.gain.value = 0.7;
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.5;
  var lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.002;
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  inGain.connect(outGain);
  delay.connect(outGain);

  // Read initial params
  var fbIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pname = (blocks[p].n || '').toLowerCase();
      if (pname.indexOf('feedback') >= 0) fbIdx = p;
    }
  }
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    feedback.gain.value = mod.params[fbIdx] / 65535;
  }

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) inputs[i] = lfo.frequency;
      else if (name.indexOf('depth') >= 0) inputs[i] = lfoGain.gain;
      else if (name.indexOf('feedback') >= 0) inputs[i] = feedback.gain;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = outGain; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'flanger',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _delay: delay, _feedback: feedback,
    _lfo: lfo, _lfoGain: lfoGain, _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._feedback.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Tremolo (Type 71) ----
ZOIA.sim._createTremolo = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var trem = ctx.createGain();
  trem.gain.value = 0.75;
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  var lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain);
  lfoGain.connect(trem.gain);
  lfo.start();

  inGain.connect(trem);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) inputs[i] = lfo.frequency;
      else if (name.indexOf('depth') >= 0) inputs[i] = lfoGain.gain;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = trem; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'tremolo',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _trem: trem, _lfo: lfo, _lfoGain: lfoGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._trem.disconnect(); } catch (e) {}
    }
  };
};

// ---- Bit Crusher (Type 9) ----
ZOIA.sim._createBitCrusher = function(ctx, mod) {
  // Bit crusher uses a WaveShaperNode with stepped curve for quantization
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var shaper = ctx.createWaveShaper();
  var bits = 8;
  if (mod.params && mod.params[1] !== undefined) {
    bits = Math.max(1, Math.round(1 + (mod.params[1] / 65535) * 15));
  }
  var steps = Math.pow(2, bits);
  var curve = new Float32Array(44100);
  for (var s = 0; s < 44100; s++) {
    var x = (s / 44100) * 2 - 1;
    curve[s] = Math.round(x * steps) / steps;
  }
  shaper.curve = curve;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(shaper);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') { inputs[i] = null; }
    else if (b.t === 'audio_out') { outputs[i] = shaper; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'bitcrusher',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _shaper: shaper,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
    }
  };
};

// ---- Audio Multiply / Ring Mod (Type 8) ----
ZOIA.sim._createAudioMultiply = function(ctx, mod) {
  // Ring modulation approximation: multiply two signals
  // Web Audio doesn't have native multiply, so we use a GainNode
  // where one input modulates the gain of the other
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var carrier = ctx.createGain();
  carrier.gain.value = 0; // Will be modulated
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  carrier.connect(outGain);

  var inputCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inputCount === 0) {
        inputs[i] = carrier; // First input = audio through
        inputCount++;
      } else {
        inputs[i] = carrier.gain; // Second input modulates gain
        inputCount++;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'audio_multiply',
    inputs: inputs, outputs: outputs,
    _carrier: carrier, _outGain: outGain,
    dispose: function() {
      try { this._carrier.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Compressor (Type 23) ----
ZOIA.sim._createCompressor = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(comp);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('thresh') >= 0) inputs[i] = comp.threshold;
      else if (name.indexOf('ratio') >= 0) inputs[i] = comp.ratio;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = comp; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'compressor',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _comp: comp,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._comp.disconnect(); } catch (e) {}
    }
  };
};

// ---- Audio Panner (Type 57) ----
ZOIA.sim._createPanner = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var panner = ctx.createStereoPanner();
  panner.pan.value = 0; // center

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(panner);

  // Split output to L and R gains
  var splitter = ctx.createChannelSplitter(2);
  panner.connect(splitter);

  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('pan') >= 0) inputs[i] = panner.pan;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lGain; outIdx++; }
      else { outputs[i] = rGain; outIdx++; }
    }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'panner',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _panner: panner, _splitter: splitter,
    _lGain: lGain, _rGain: rGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._panner.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
    }
  };
};


// ---- Generic Pass-through (for unsupported modules) ----
ZOIA.sim._createPassthrough = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var through = ctx.createGain();
  through.gain.value = 1.0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = through;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = through;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'passthrough',
    inputs: inputs,
    outputs: outputs,
    _through: through,
    dispose: function() {
      try { this._through.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  MODULE FACTORY DISPATCHER
// ================================================================

ZOIA.sim._createModuleNode = function(ctx, mod) {
  var typeIdx = mod.typeIdx;
  // Look up factory; fall back to passthrough for unimplemented types
  var factory = ZOIA.sim._moduleFactories[typeIdx];
  if (factory) {
    var node = factory(ctx, mod);
    ZOIA.log('SIM:   [' + mod.idx + '] "' + mod.name + '" type=' + typeIdx + ' -> ' + node.type + ' (inputs=' + node.inputs.length + ', outputs=' + node.outputs.length + ')');
    for (var _di = 0; _di < node.inputs.length; _di++) {
      var _inp = node.inputs[_di];
      ZOIA.log('SIM:     input[' + _di + '] = ' + (_inp === null ? 'NULL' : (_inp instanceof AudioParam ? 'AudioParam' : 'AudioNode')));
    }
    for (var _do = 0; _do < node.outputs.length; _do++) {
      var _out = node.outputs[_do];
      ZOIA.log('SIM:     output[' + _do + '] = ' + (_out === null ? 'NULL' : (_out instanceof AudioParam ? 'AudioParam' : 'AudioNode')));
    }
    return node;
  }
  ZOIA.log('SIM:   [' + mod.idx + '] "' + mod.name + '" type=' + typeIdx + ' -> PASSTHROUGH (no factory)');
  return ZOIA.sim._createPassthrough(ctx, mod);
};

/**
 * Module factory registry. Maps typeIdx -> factory function.
 * Core factories are registered here; additional files append to this table.
 */
ZOIA.sim._moduleFactories = {
  // ---- Core (sim-engine.js) ----
  0:  ZOIA.sim._createSVFilter,
  1:  ZOIA.sim._createAudioInput,
  2:  ZOIA.sim._createAudioOutput,
  93: ZOIA.sim._createAudioInput,
  95: ZOIA.sim._createAudioOutput,
  5:  ZOIA.sim._createLFO,
  6:  ZOIA.sim._createADSR,
  7:  ZOIA.sim._createVCA,
  8:  ZOIA.sim._createAudioMultiply,
  9:  ZOIA.sim._createBitCrusher,
  11: ZOIA.sim._createDistortion,
  12: ZOIA.sim._createToneControl,
  13: ZOIA.sim._createDelay,
  14: ZOIA.sim._createOscillator,
  23: ZOIA.sim._createCompressor,
  25: ZOIA.sim._createReverb,     // Plate Reverb -> reuse Reverb factory
  26: ZOIA.sim._createReverb,     // Hall Reverb -> reuse Reverb factory
  27: ZOIA.sim._createReverb,     // Shimmer Reverb -> reuse Reverb factory
  67: ZOIA.sim._createReverb,     // Ghostverb (HW alias of Shimmer, kept by _NO_REMAP_TYPES)
  28: ZOIA.sim._createFlanger,
  29: ZOIA.sim._createChorus,
  36: ZOIA.sim._createReverb,
  38: ZOIA.sim._createNoise,
  45: ZOIA.sim._createValue,
  57: ZOIA.sim._createPanner,
  71: ZOIA.sim._createTremolo,
  76: ZOIA.sim._createAudioMixer,
  82: ZOIA.sim._createReverb,     // Reverb Lite -> reuse Reverb factory
  85: ZOIA.sim._createDelay,      // Delay -> reuse Delay factory
  86: ZOIA.sim._createDelay,      // Delay w/Mod -> reuse Delay factory (no mod sim)
  94: ZOIA.sim._createReverb       // Reverb Lite Stro -> reuse Reverb factory
};


// ================================================================
//  BUILD & CONNECT GRAPH
// ================================================================

/**
 * Build the full Web Audio graph from the current patch.
 * Creates one node container per module, then wires connections.
 */
ZOIA.sim.build = function() {
  var ctx = ZOIA.sim._getCtx();
  if (!ctx) return;
  var s = ZOIA.state;
  if (!s.patch) return;

  ZOIA.sim.teardown();

  var modules = s.patch.modules;
  var nodes = [];

  // Create analyser and master gain for visualization/monitoring
  ZOIA.sim.analyser = ctx.createAnalyser();
  ZOIA.sim.analyser.fftSize = 2048;
  ZOIA.sim.masterGain = ctx.createGain();
  ZOIA.sim.masterGain.gain.value = 1.0;
  ZOIA.sim.masterLimiter = ZOIA.sim._createSoftLimiter(ctx, 1);
  ZOIA.sim.masterGain.connect(ZOIA.sim.masterLimiter);
  ZOIA.sim.masterLimiter.connect(ZOIA.sim.analyser);
  ZOIA.sim.analyser.connect(ctx.destination);

  // Create input analyser for oscilloscope INPUT display
  ZOIA.sim.inputAnalyser = ctx.createAnalyser();
  ZOIA.sim.inputAnalyser.fftSize = 2048;

  // Phase 1: Create all module nodes
  ZOIA.log('SIM: Creating ' + modules.length + ' module nodes...');
  for (var i = 0; i < modules.length; i++) {
    ZOIA.log('[DIAG] Creating node for mod ' + i + ' type=' + modules[i].typeIdx);
    var node = ZOIA.sim._createModuleNode(ctx, modules[i]);
    node._modIdx = i;
    node._level = 0;  // Current signal level (0-1) for grid visualization

    // Attach a lightweight AnalyserNode for per-module signal level metering.
    // Prefer tapping the first output; fall back to first input for sink modules.
    node._analyser = null;
    node._analyserBuf = null;
    var mBlocks = modules[i].blocks || [];
    var tapped = false;
    // Try outputs first
    for (var ob = 0; ob < mBlocks.length && !tapped; ob++) {
      var obt = mBlocks[ob].t;
      if ((obt === 'audio_out' || obt === 'cv_out' || obt === 'gate_out') && node.outputs[ob]) {
        var meterOut = ctx.createAnalyser();
        meterOut.fftSize = 256;
        meterOut.smoothingTimeConstant = 0.6;
        try {
          node.outputs[ob].connect(meterOut);
          node._analyser = meterOut;
          node._analyserBuf = new Uint8Array(meterOut.frequencyBinCount);
          tapped = true;
        } catch (e) {}
      }
    }
    // Fall back to inputs (for sink modules like Audio Output, Pixel, MIDI Out)
    for (var ib = 0; ib < mBlocks.length && !tapped; ib++) {
      var ibt = mBlocks[ib].t;
      if ((ibt === 'audio_in' || ibt === 'cv_in' || ibt === 'gate_in') && node.inputs[ib]) {
        // Only tap AudioNode inputs, not AudioParam inputs
        if (node.inputs[ib] instanceof AudioParam) continue;
        var meterIn = ctx.createAnalyser();
        meterIn.fftSize = 256;
        meterIn.smoothingTimeConstant = 0.6;
        try {
          node.inputs[ib].connect(meterIn);
          node._analyser = meterIn;
          node._analyserBuf = new Uint8Array(meterIn.frequencyBinCount);
          tapped = true;
        } catch (e) {}
      }
    }

    nodes.push(node);

    // Connect Audio Output modules to master output
    if ((modules[i].typeIdx === 2 || modules[i].typeIdx === 95) && node.getDestinationNode) {
      node.getDestinationNode().connect(ZOIA.sim.masterGain);
    }

    // Tap Audio Input module outputs into the input analyser
    if (modules[i].typeIdx === 1 || modules[i].typeIdx === 93) {
      for (var ai = 0; ai < node.outputs.length; ai++) {
        if (node.outputs[ai]) {
          try { node.outputs[ai].connect(ZOIA.sim.inputAnalyser); } catch (e) {}
        }
      }
    }
  }

  // Phase 2: Wire connections
  var conns = s.patch.connections;
  var connGains = [];
  var gatePollers = [];
  var wired = 0;
  var skipped = 0;

  ZOIA.log('SIM: Wiring ' + conns.length + ' connections...');
  for (var j = 0; j < conns.length; j++) {
    var c = conns[j];
    var srcNode = nodes[c.srcMod];
    var dstNode = nodes[c.dstMod];

    if (!srcNode || !dstNode) {
      ZOIA.log('SIM:   SKIP conn[' + j + '] mod' + c.srcMod + '[' + c.srcBlock + ']->mod' + c.dstMod + '[' + c.dstBlock + ']: missing node (src=' + !!srcNode + ' dst=' + !!dstNode + ')');
      skipped++; continue;
    }

    var srcOut = srcNode.outputs[c.srcBlock];
    var dstIn = dstNode.inputs[c.dstBlock];
    var sourceBlock = modules[c.srcMod] && modules[c.srcMod].blocks ? modules[c.srcMod].blocks[c.srcBlock] : null;
    var destBlock = modules[c.dstMod] && modules[c.dstMod].blocks ? modules[c.dstMod].blocks[c.dstBlock] : null;
    var sourceBlockType = sourceBlock ? sourceBlock.t : null;
    var sourceName = ((modules[c.srcMod] && modules[c.srcMod].name) || '').toLowerCase();
    var sourceBlockName = ((sourceBlock && sourceBlock.n) || '').toLowerCase();
    var sourceLooksControl = sourceBlockType === 'cv_out' || sourceBlockType === 'gate_out' || srcNode.type === 'value' || srcNode.type === 'keyboard' || srcNode.type === 'midi_note_in' || srcNode.type === 'stompswitch' || srcNode.type === 'pushbutton';

    if (srcOut && !dstIn && dstNode.type === 'vca' && dstNode.levelIdx !== null && sourceLooksControl) {
      dstIn = dstNode.inputs[dstNode.levelIdx];
      ZOIA.log('SIM:   COMPAT conn[' + j + '] VCA destination block ' + c.dstBlock + ' resolved to Level input block ' + dstNode.levelIdx);
    }

    if (srcOut && dstNode.type === 'audio_output' && destBlock && destBlock.t === 'cv_in' && sourceBlockType === 'audio_out') {
      if (!dstNode._compatAudioInputs) dstNode._compatAudioInputs = {};
      if (!dstNode._compatAudioInputs[c.dstBlock]) {
        var compatAudioIn = ctx.createGain();
        compatAudioIn.gain.value = 1.0;
        compatAudioIn.connect(dstNode._outGain);
        dstNode._compatAudioInputs[c.dstBlock] = compatAudioIn;
      }
      dstIn = dstNode._compatAudioInputs[c.dstBlock];
      ZOIA.log('SIM:   COMPAT conn[' + j + '] Audio Output destination block ' + c.dstBlock + ' treated as audio input for audio-rate source');
    }

    if (srcOut && dstNode.type === 'vca' && destBlock && destBlock.t === 'audio_in' && sourceBlockType === 'audio_out') {
      if (!dstIn) {
        dstIn = dstNode._fallbackMix || dstNode._vca;
        ZOIA.log('SIM:   COMPAT conn[' + j + '] VCA audio input block ' + c.dstBlock + ' routed to VCA compatibility mix');
      } else {
        ZOIA.log('SIM:   COMPAT conn[' + j + '] VCA audio input block ' + c.dstBlock + ' uses native VCA input');
      }
    }

    if (srcOut && dstNode.type === 'adsr' && sourceLooksControl) {
      var adsrBlocksForCompat = modules[c.dstMod].blocks || [];
      var adsrTargetName = '';
      if (sourceName.indexOf('attack') >= 0 || sourceBlockName.indexOf('attack') >= 0) adsrTargetName = 'attack';
      else if (sourceName.indexOf('decay') >= 0 || sourceBlockName.indexOf('decay') >= 0) adsrTargetName = 'decay';
      else if (sourceName.indexOf('sustain') >= 0 || sourceBlockName.indexOf('sustain') >= 0) adsrTargetName = 'sustain';
      else if (sourceName.indexOf('release') >= 0 || sourceBlockName.indexOf('release') >= 0) adsrTargetName = 'release';
      else if (!dstIn && (sourceName.indexOf('gate') >= 0 || sourceBlockName.indexOf('gate') >= 0 || sourceBlockType === 'gate_out')) adsrTargetName = 'gate';
      if (adsrTargetName) {
        for (var ad = 0; ad < adsrBlocksForCompat.length; ad++) {
          var adName = (adsrBlocksForCompat[ad].n || '').toLowerCase();
          if (adsrBlocksForCompat[ad].t !== 'cv_in' && adsrBlocksForCompat[ad].t !== 'gate_in') continue;
          if (adName.indexOf(adsrTargetName) >= 0 && dstNode.inputs[ad]) {
            if (ad !== c.dstBlock) {
              dstIn = dstNode.inputs[ad];
              ZOIA.log('SIM:   COMPAT conn[' + j + '] ADSR destination block ' + c.dstBlock + ' remapped to ' + adsrTargetName + ' input block ' + ad);
            }
            break;
          }
        }
      }
    }

    if (!dstIn && dstNode.type === 'sequencer' && modules[c.dstMod]) {
      var seqBlocks = modules[c.dstMod].blocks || [];
      for (var sqi = 0; sqi < seqBlocks.length; sqi++) {
        var sqName = (seqBlocks[sqi].n || '').toLowerCase();
        if ((seqBlocks[sqi].t === 'gate_in' || seqBlocks[sqi].t === 'cv_in') && sqName.indexOf('clock') >= 0 && dstNode.inputs[sqi]) {
          dstIn = dstNode.inputs[sqi];
          ZOIA.log('SIM:   COMPAT conn[' + j + '] Sequencer destination block ' + c.dstBlock + ' resolved to Clock input block ' + sqi);
          break;
        }
      }
    }

    if (srcOut && !dstIn && sourceLooksControl && modules[c.dstMod]) {
      var compatDstBlocks = modules[c.dstMod].blocks || [];
      var sourceTokens = [];
      var sourceTokenText = (sourceName + ' ' + sourceBlockName).replace(/[^a-z0-9]+/g, ' ');
      var sourceTokenParts = sourceTokenText.split(' ');
      for (var stp = 0; stp < sourceTokenParts.length; stp++) {
        if (sourceTokenParts[stp].length >= 3) sourceTokens.push(sourceTokenParts[stp]);
      }
      if (sourceName.indexOf('freq') >= 0 || sourceName.indexOf('pitch') >= 0 || sourceBlockName.indexOf('freq') >= 0) sourceTokens.push('frequency');
      if (sourceName.indexOf('rev') >= 0 || sourceBlockName.indexOf('rev') >= 0) sourceTokens.push('reverse');
      if (sourceName.indexOf('fdbk') >= 0 || sourceName.indexOf('feedback') >= 0) sourceTokens.push('feedback');
      if (sourceName.indexOf('mod') >= 0 || sourceBlockName.indexOf('mod') >= 0) sourceTokens.push('mod');

      var resolvedControlInput = -1;
      for (var cdi = 0; cdi < compatDstBlocks.length && resolvedControlInput < 0; cdi++) {
        if ((compatDstBlocks[cdi].t !== 'cv_in' && compatDstBlocks[cdi].t !== 'gate_in') || !dstNode.inputs[cdi]) continue;
        var dstNameForMatch = (compatDstBlocks[cdi].n || '').toLowerCase();
        for (var sti = 0; sti < sourceTokens.length; sti++) {
          if (dstNameForMatch.indexOf(sourceTokens[sti]) >= 0) {
            resolvedControlInput = cdi;
            break;
          }
        }
      }
      if (resolvedControlInput < 0) {
        var preferredInputType = (sourceBlockType === 'gate_out' || srcNode.type === 'stompswitch' || srcNode.type === 'pushbutton') ? 'gate_in' : 'cv_in';
        for (var cdp = 0; cdp < compatDstBlocks.length; cdp++) {
          if (compatDstBlocks[cdp].t === preferredInputType && dstNode.inputs[cdp]) {
            resolvedControlInput = cdp;
            break;
          }
        }
      }
      if (resolvedControlInput < 0) {
        for (var cda = 0; cda < compatDstBlocks.length; cda++) {
          if ((compatDstBlocks[cda].t === 'cv_in' || compatDstBlocks[cda].t === 'gate_in') && dstNode.inputs[cda]) {
            resolvedControlInput = cda;
            break;
          }
        }
      }
      if (resolvedControlInput >= 0) {
        dstIn = dstNode.inputs[resolvedControlInput];
        ZOIA.log('SIM:   COMPAT conn[' + j + '] control destination block ' + c.dstBlock + ' on "' + modules[c.dstMod].name + '" resolved to input block ' + resolvedControlInput);
      }
    }

    if (!srcOut && modules[c.srcMod] && modules[c.srcMod].typeIdx === 13) {
      var srcBlocks = modules[c.srcMod].blocks || [];
      for (var ao = 0; ao < srcBlocks.length; ao++) {
        if (srcBlocks[ao].t === 'audio_out' && srcNode.outputs[ao]) {
          srcOut = srcNode.outputs[ao];
          ZOIA.log('SIM:   COMPAT conn[' + j + '] Delay Line source block ' + c.srcBlock + ' resolved to audio_out block ' + ao);
          break;
        }
      }
    }

    if (!srcOut && dstNode && dstNode._onGateChange && modules[c.srcMod]) {
      var gateSrcBlocks = modules[c.srcMod].blocks || [];
      for (var gso = 0; gso < gateSrcBlocks.length; gso++) {
        if (gateSrcBlocks[gso].t === 'gate_out' && srcNode.outputs[gso]) {
          srcOut = srcNode.outputs[gso];
          ZOIA.log('SIM:   COMPAT conn[' + j + '] gate source block ' + c.srcBlock + ' on "' + modules[c.srcMod].name + '" resolved to gate_out block ' + gso);
          break;
        }
      }
    }

    if (!srcOut && modules[c.srcMod]) {
      var compatSrcBlocks = modules[c.srcMod].blocks || [];
      for (var co = 0; co < compatSrcBlocks.length; co++) {
        var cot = compatSrcBlocks[co].t;
        if ((cot === 'audio_out' || cot === 'cv_out' || cot === 'gate_out') && srcNode.outputs[co]) {
          srcOut = srcNode.outputs[co];
          ZOIA.log('SIM:   COMPAT conn[' + j + '] source block ' + c.srcBlock + ' on "' + modules[c.srcMod].name + '" resolved to output block ' + co);
          break;
        }
      }
    }

    if (srcOut && !dstIn && dstNode && dstNode._onGateChange && dstNode._gateBlockIdx !== null && c.dstBlock === dstNode._gateBlockIdx) {
      var gateAnalyser = ctx.createAnalyser();
      gateAnalyser.fftSize = 256;
      try {
        srcOut.connect(gateAnalyser);
        (function(analyser, adsrNode, connIdx) {
          var GATE_ON_THRESHOLD = 0.5;
          var GATE_POLL_MS = 8;
          var gateBuf = new Float32Array(1);
          var lastGate = 0;
          var stopped = false;
          function pollGate() {
            if (stopped) return;
            analyser.getFloatTimeDomainData(gateBuf);
            var gateValue = gateBuf[0] > GATE_ON_THRESHOLD ? 1 : 0;
            if (gateValue !== lastGate) {
              if (adsrNode._onGateChangeFromSource) {
                adsrNode._onGateChangeFromSource('conn-' + connIdx, gateValue);
              } else {
                adsrNode._onGateChange(gateValue);
              }
              lastGate = gateValue;
            }
            setTimeout(pollGate, GATE_POLL_MS);
          }
          pollGate();
          gatePollers.push({
            connIdx: connIdx,
            stop: function() {
              stopped = true;
              try { analyser.disconnect(); } catch (e) {}
            }
          });
        })(gateAnalyser, dstNode, j);
        wired++;
        var _gsm = modules[c.srcMod]; var _gdm = modules[c.dstMod];
        ZOIA.log('SIM:   GATE-BRIDGE "' + (_gsm ? _gsm.name : '?') + '"[' + c.srcBlock + ']->"' + (_gdm ? _gdm.name : '?') + '"[' + c.dstBlock + ']');
        continue;
      } catch (gateBridgeError) {
        try { gateAnalyser.disconnect(); } catch (e) {}
        ZOIA.log('SIM:   ERROR gate bridge conn[' + j + ']: ' + gateBridgeError.message);
      }
    }

    if (!srcOut || !dstIn) {
      var _sm = modules[c.srcMod]; var _dm = modules[c.dstMod];
      var _sbn = _sm && _sm.blocks && _sm.blocks[c.srcBlock] ? _sm.blocks[c.srcBlock].n : '?';
      var _dbn = _dm && _dm.blocks && _dm.blocks[c.dstBlock] ? _dm.blocks[c.dstBlock].n : '?';
      ZOIA.log('SIM:   SKIP conn[' + j + '] "' + (_sm ? _sm.name : '?') + '"[' + c.srcBlock + ':' + _sbn + ']->"' + (_dm ? _dm.name : '?') + '"[' + c.dstBlock + ':' + _dbn + ']: null endpoint (srcOut=' + !!srcOut + ' dstIn=' + !!dstIn + ')');
      skipped++; continue;
    }

    // Connection strength as a GainNode (0-10000 -> 0.0-1.0)
    var strength = (c.strength !== undefined ? c.strength : 10000) / 10000;

    if (dstNode.type === 'vca' && dstNode.levelIdx !== null && c.dstBlock === dstNode.levelIdx && sourceLooksControl) {
      var vcaLevelAnalyser = ctx.createAnalyser();
      vcaLevelAnalyser.fftSize = 256;
      var vcaLevelGain = ctx.createGain();
      vcaLevelGain.gain.value = strength;
      try {
        srcOut.connect(vcaLevelGain);
        vcaLevelGain.connect(vcaLevelAnalyser);
        dstNode._vca._audioInputs = dstNode._audioInputs || [];
        (function(analyser, gainNode, connIdx) {
          var levelBuf = new Float32Array(analyser.fftSize || 256);
          var stopped = false;
          function pollVcaLevel() {
            if (stopped) return;
            analyser.getFloatTimeDomainData(levelBuf);
            var nextLevel = 0;
            for (var lb = 0; lb < levelBuf.length; lb++) {
              if (levelBuf[lb] > nextLevel) nextLevel = levelBuf[lb];
            }
            try {
              gainNode.gain.setValueAtTime(nextLevel, ZOIA.sim.ctx.currentTime);
            } catch (e) {
              gainNode.gain.value = nextLevel;
            }
            setTimeout(pollVcaLevel, 8);
          }
          pollVcaLevel();
          gatePollers.push({
            connIdx: connIdx,
            stop: function() {
              stopped = true;
              try { analyser.disconnect(); } catch (e) {}
              try { vcaLevelGain.disconnect(); } catch (e) {}
            }
          });
        })(vcaLevelAnalyser, dstNode._vca, j);
        connGains.push({ gain: vcaLevelGain, connIdx: j });
        wired++;
        var _cvsm = modules[c.srcMod]; var _cvdm = modules[c.dstMod];
        ZOIA.log('SIM:   VCA-CV-BRIDGE "' + (_cvsm ? _cvsm.name : '?') + '"[' + c.srcBlock + ']->"' + (_cvdm ? _cvdm.name : '?') + '"[' + c.dstBlock + '] str=' + strength);
        continue;
      } catch (vcaBridgeError) {
        try { vcaLevelAnalyser.disconnect(); } catch (e) {}
        try { vcaLevelGain.disconnect(); } catch (e) {}
        ZOIA.log('SIM:   ERROR VCA CV bridge conn[' + j + ']: ' + vcaBridgeError.message);
      }
    }

    var connGain = ctx.createGain();
    connGain.gain.value = strength;

    try {
      // If destination is an AudioParam, connect source -> gain -> param
      if (dstIn instanceof AudioParam) {
        srcOut.connect(connGain);
        connGain.connect(dstIn);
      } else {
        // Normal AudioNode -> AudioNode connection
        srcOut.connect(connGain);
        connGain.connect(dstIn);
      }
      connGains.push({ gain: connGain, connIdx: j });
      wired++;
      var _wsm = modules[c.srcMod]; var _wdm = modules[c.dstMod];
      var _wsbn = _wsm && _wsm.blocks && _wsm.blocks[c.srcBlock] ? _wsm.blocks[c.srcBlock].n : '?';
      var _wdbn = _wdm && _wdm.blocks && _wdm.blocks[c.dstBlock] ? _wdm.blocks[c.dstBlock].n : '?';
      ZOIA.log('SIM:   WIRED "' + (_wsm ? _wsm.name : '?') + '"[' + c.srcBlock + ':' + _wsbn + ']->"' + (_wdm ? _wdm.name : '?') + '"[' + c.dstBlock + ':' + _wdbn + '] str=' + strength + (dstIn instanceof AudioParam ? ' (param)' : ''));
    } catch (e) {
      var _esm = modules[c.srcMod]; var _edm = modules[c.dstMod];
      ZOIA.log('SIM:   ERROR conn[' + j + '] "' + (_esm ? _esm.name : '?') + '"[' + c.srcBlock + ']->"' + (_edm ? _edm.name : '?') + '"[' + c.dstBlock + ']: ' + e.message);
      skipped++;
    }
  }

  ZOIA.sim.nodes = nodes;
  ZOIA.log('[DIAG] Sim nodes created: ' + ZOIA.sim.nodes.length + ' nodes');
  ZOIA.sim.connGains = connGains;
  ZOIA.sim.gatePollers = gatePollers;

  ZOIA.log('SIM: Graph built. ' + wired + ' connections wired, ' + skipped + ' skipped.');

  // Post-wiring pass 1: for VCA nodes with a CV connection to their level input,
  // set gain.value=0 so the connected CV signal controls the gain entirely.
  // Without this, the baseLevel (e.g. 1.0) would be ADDED to the CV signal.
  for (var k = 0; k < conns.length; k++) {
    var ck = conns[k];
    var dkNode = nodes[ck.dstMod];
    if (dkNode && dkNode.type === 'vca' && dkNode.levelIdx !== null && ck.dstBlock === dkNode.levelIdx) {
      dkNode._vca.gain.value = 0;
      ZOIA.log('[DIAG] VCA mod' + ck.dstMod + ': level CV connected, gain.value set to 0 (CV takes over)');
    }
    if (dkNode && dkNode.type === 'ring_mod' && dkNode.inputs && dkNode.inputs[ck.dstBlock] instanceof AudioParam) {
      dkNode._carrier.gain.value = 0;
      ZOIA.log('[DIAG] Ring Mod mod' + ck.dstMod + ': modulator connected, carrier gain.value set to 0');
    }
  }

  // Gate callbacks are now handled at call time by ZOIA.sim._fireGateCallbacks()
  // in sim-mod-interface.js. Keyboard/Stompswitch scan connections directly when
  // noteOn/noteOff/toggle are called, finding connected ADSR gate inputs and
  // invoking their _onGateChange callbacks. No pre-registration needed.
};

/**
 * Tear down the audio graph. Disconnects and disposes all nodes.
 */
ZOIA.sim.teardown = function() {
  // Dispose module nodes (and per-module analysers)
  for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
    var n = ZOIA.sim.nodes[i];
    if (n) {
      if (n._analyser) {
        try { n._analyser.disconnect(); } catch (e) {}
        n._analyser = null;
      }
      if (n.dispose) n.dispose();
    }
  }
  ZOIA.sim.nodes = [];
  // Reset grid button brightness
  ZOIA.sim._resetGridLevels();

  // Dispose connection gains
  for (var j = 0; j < ZOIA.sim.connGains.length; j++) {
    try { ZOIA.sim.connGains[j].gain.disconnect(); } catch (e) {}
  }
  ZOIA.sim.connGains = [];

  if (ZOIA.sim.gatePollers) {
    for (var gp = 0; gp < ZOIA.sim.gatePollers.length; gp++) {
      try { ZOIA.sim.gatePollers[gp].stop(); } catch (e) {}
    }
  }
  ZOIA.sim.gatePollers = [];

  // Dispose master chain
  if (ZOIA.sim.masterGain) {
    try { ZOIA.sim.masterGain.disconnect(); } catch (e) {}
    ZOIA.sim.masterGain = null;
  }
  if (ZOIA.sim.masterLimiter) {
    try { ZOIA.sim.masterLimiter.disconnect(); } catch (e) {}
    ZOIA.sim.masterLimiter = null;
  }
  if (ZOIA.sim.analyser) {
    try { ZOIA.sim.analyser.disconnect(); } catch (e) {}
    ZOIA.sim.analyser = null;
  }
  if (ZOIA.sim.inputAnalyser) {
    try { ZOIA.sim.inputAnalyser.disconnect(); } catch (e) {}
    ZOIA.sim.inputAnalyser = null;
  }

  // Stop mic
  if (ZOIA.sim.micStream) {
    ZOIA.sim.micStream.getTracks().forEach(function(t) { t.stop(); });
    ZOIA.sim.micStream = null;
  }

  // Stop test tone
  ZOIA.sim.disconnectTestTone();
};


// ================================================================
//  START / STOP / TOGGLE
// ================================================================

/**
 * Start the simulation. Builds the graph if needed.
 */
ZOIA.sim.start = function() {
  if (ZOIA.sim.running) return;
  if (!ZOIA.state.patch) {
    ZOIA.log('SIM: No patch loaded.');
    return;
  }

  ZOIA.sim.build();
  ZOIA.sim.running = true;
  ZOIA.state.mode = 'play';
  ZOIA.log('SIM: Simulation started.');
  ZOIA.sim._updateUI();
  ZOIA.sim._startViz();
  if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.init();
  if (ZOIA.hardwareView) ZOIA.hardwareView.renderAll();
};

/**
 * Stop the simulation. Tears down the graph.
 */
ZOIA.sim.stop = function() {
  if (!ZOIA.sim.running) return;
  ZOIA.sim.running = false;
  ZOIA.state.mode = 'edit';
  ZOIA.sim.teardown();
  ZOIA.log('SIM: Simulation stopped.');
  ZOIA.sim._updateUI();
  ZOIA.sim._stopViz();
  if (ZOIA.hardwareView) ZOIA.hardwareView.renderAll();
};

/**
 * Toggle the simulation on/off.
 */
ZOIA.sim.toggle = function() {
  if (ZOIA.sim.running) ZOIA.sim.stop();
  else ZOIA.sim.start();
};


// ================================================================
//  MICROPHONE INPUT
// ================================================================

/**
 * Connect microphone to all Audio Input modules.
 */
ZOIA.sim.connectMic = function() {
  if (!ZOIA.sim.running || !ZOIA.sim.ctx) return;
  var ctx = ZOIA.sim.ctx;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    ZOIA.sim.micStream = stream;
    var micSource = ctx.createMediaStreamSource(stream);

    // Find all Audio Input module nodes and connect mic to them
    for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
      var node = ZOIA.sim.nodes[i];
      if (node.type === 'audio_input') {
        for (var j = 0; j < node.outputs.length; j++) {
          if (node.outputs[j]) {
            micSource.connect(node.outputs[j]);
          }
        }
        ZOIA.log('SIM: Mic connected to Audio Input module ' + i);
      }
    }
  }).catch(function(err) {
    ZOIA.log('SIM: Mic access denied: ' + err.message);
  });
};


// ================================================================
//  TEST TONE
// ================================================================

/**
 * Connect a test tone (440 Hz sine wave) to all Audio Input module outputs.
 * Feeds both IN L and IN R at moderate volume.
 */
ZOIA.sim.connectTestTone = function() {
  if (!ZOIA.sim.running || !ZOIA.sim.ctx) return;
  ZOIA.sim.disconnectTestTone(); // clean up any existing

  var ctx = ZOIA.sim.ctx;
  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 440;

  var gain = ctx.createGain();
  gain.gain.value = 0.3; // moderate level so effects are audible without clipping

  osc.connect(gain);

  // Route to all Audio Input module outputs (IN L and IN R)
  var connected = 0;
  for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
    var node = ZOIA.sim.nodes[i];
    if (node.type === 'audio_input') {
      for (var j = 0; j < node.outputs.length; j++) {
        if (node.outputs[j]) {
          gain.connect(node.outputs[j]);
          connected++;
        }
      }
    }
  }

  osc.start();
  ZOIA.sim._testToneOsc = osc;
  ZOIA.sim._testToneGain = gain;
  ZOIA.sim.testToneActive = true;

  ZOIA.log('SIM: Test tone (440 Hz) connected to ' + connected + ' Audio Input jack(s).');
  ZOIA.sim._updateUI();
};

/**
 * Disconnect and stop the test tone.
 */
ZOIA.sim.disconnectTestTone = function() {
  if (ZOIA.sim._testToneOsc) {
    try { ZOIA.sim._testToneOsc.stop(); } catch (e) {}
    try { ZOIA.sim._testToneOsc.disconnect(); } catch (e) {}
    ZOIA.sim._testToneOsc = null;
  }
  if (ZOIA.sim._testToneGain) {
    try { ZOIA.sim._testToneGain.disconnect(); } catch (e) {}
    ZOIA.sim._testToneGain = null;
  }
  if (ZOIA.sim.testToneActive) {
    ZOIA.sim.testToneActive = false;
    ZOIA.log('SIM: Test tone disconnected.');
    ZOIA.sim._updateUI();
  }
};

/**
 * Toggle test tone on/off.
 */
ZOIA.sim.toggleTestTone = function() {
  if (ZOIA.sim.testToneActive) ZOIA.sim.disconnectTestTone();
  else ZOIA.sim.connectTestTone();
};


// ================================================================
//  PARAMETER SYNC (UI -> Audio)
// ================================================================

/**
 * Update a module's audio parameter from the UI.
 * Called when the user tweaks a param via knob or param-input.
 */
ZOIA.sim.updateParam = function(modIdx, blockIdx, normValue) {
  if (!ZOIA.sim.running) return;
  var node = ZOIA.sim.nodes[modIdx];
  if (!node) return;
  var mod = ZOIA.state.patch.modules[modIdx];
  if (!mod) return;
  var block = (mod.blocks || [])[blockIdx];
  if (!block) return;
  var ctx = ZOIA.sim.ctx;
  var t = ctx.currentTime;

  // Type-specific param updates
  switch (node.type) {
    case 'oscillator':
      if (blockIdx === node.freqIdx) {
        var freq = 20 * Math.pow(1000, normValue);
        node._osc.frequency.setTargetAtTime(freq, t, 0.01);
      }
      break;

    case 'sv_filter':
      if (blockIdx === node.freqIdx) {
        var fFreq = 20 * Math.pow(1000, normValue);
        node.setFrequency(fFreq);
      } else if (blockIdx === node.resIdx) {
        var q = 0.5 + normValue * 14.5;
        node.setQ(q);
      }
      break;

    case 'vca':
      if (blockIdx === node.levelIdx) {
        node._vca.gain.setTargetAtTime(normValue, t, 0.01);
      }
      break;

    case 'lfo':
      if (blockIdx === node.rateIdx) {
        var rate = 0.01 + normValue * 19.99;
        node._osc.frequency.setTargetAtTime(rate, t, 0.01);
      } else if (blockIdx === node.depthIdx) {
        node._outGain.gain.setTargetAtTime(normValue, t, 0.01);
      }
      break;

    case 'audio_output':
      if (blockIdx === node.gainBlockIdx) {
        node._outGain.gain.setTargetAtTime(normValue, t, 0.01);
      }
      break;
  }
};

/**
 * Update connection strength in the audio graph when user changes it.
 */
ZOIA.sim.updateConnStrength = function(connIdx, strength) {
  if (!ZOIA.sim.running) return;
  var norm = strength / 10000;
  for (var i = 0; i < ZOIA.sim.connGains.length; i++) {
    if (ZOIA.sim.connGains[i].connIdx === connIdx) {
      var t = ZOIA.sim.ctx.currentTime;
      ZOIA.sim.connGains[i].gain.gain.setTargetAtTime(norm, t, 0.01);
      return;
    }
  }
};


// ================================================================
//  VISUALIZATION (Waveform/Level Meter)
// ================================================================

// ================================================================
//  PER-MODULE SIGNAL LEVEL → GRID BUTTON BRIGHTNESS
// ================================================================

/**
 * Read RMS level from each module's AnalyserNode and update
 * the grid button DOM elements with brightness proportional to signal.
 * Called every frame from _vizDraw.
 */
ZOIA.sim._updateGridLevels = function() {
  var nodes = ZOIA.sim.nodes;
  if (!nodes || !nodes.length) return;

  var s = ZOIA.state;
  if (!s.patch) return;
  var modules = s.patch.modules;
  var currentPage = s.currentPage || 0;

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (!node || !node._analyser) {
      node._level = 0;
      continue;
    }

    // Read RMS from analyser
    var analyser = node._analyser;
    var buf = node._analyserBuf;
    analyser.getByteTimeDomainData(buf);

    var rms = 0;
    for (var k = 0; k < buf.length; k++) {
      var sample = (buf[k] - 128) / 128;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / buf.length);

    // Smooth: blend toward new level (attack fast, release slow)
    var target = Math.min(1.0, rms * 4);  // Scale up for visibility
    if (target > node._level) {
      node._level = node._level * 0.3 + target * 0.7;  // Fast attack
    } else {
      node._level = node._level * 0.85 + target * 0.15; // Slow release
    }
  }

  // Apply levels to grid buttons on the current page
  var btns = document.querySelectorAll('.grid-btn[data-mod-idx]');
  for (var b = 0; b < btns.length; b++) {
    var btn = btns[b];
    var modIdx = parseInt(btn.dataset.modIdx, 10);
    if (isNaN(modIdx) || modIdx < 0 || modIdx >= nodes.length) continue;

    var mod = modules[modIdx];
    if (!mod) continue;

    // Skip interactive buttons in Play mode -- their appearance is managed by CSS classes
    if (btn.classList.contains('btn-toggle') ||
        btn.classList.contains('btn-momentary') ||
        btn.classList.contains('btn-recording') ||
        btn.classList.contains('btn-playing')) {
      continue;
    }

    var level = nodes[modIdx] ? nodes[modIdx]._level : 0;
    var col = ZOIA.COLORS[mod.colorId] || '#666';

    // Base brightness: 0.15 (dim) to 1.0 (full bright) based on signal level
    var brightness = 0.15 + level * 0.85;
    // Background alpha: 30 (hex=0x1E, ~12%) to CC (~80%)
    var bgAlpha = Math.round(0x1E + level * (0xCC - 0x1E));
    var bgHex = bgAlpha < 16 ? '0' + bgAlpha.toString(16) : bgAlpha.toString(16);
    // Shadow: scale glow intensity with signal
    var shadowAlpha = Math.round(0x40 + level * (0xFF - 0x40));
    var shHex = shadowAlpha < 16 ? '0' + shadowAlpha.toString(16) : shadowAlpha.toString(16);
    var shadowSize = 2 + Math.round(level * 10);

    btn.style.background = col + bgHex;
    btn.style.boxShadow = '0 0 ' + shadowSize + 'px ' + Math.round(shadowSize / 2) + 'px ' + col + shHex;
    btn.style.opacity = brightness;
  }
};

/**
 * Reset all grid buttons to their default brightness (no signal).
 */
ZOIA.sim._resetGridLevels = function() {
  var btns = document.querySelectorAll('.grid-btn[data-mod-idx]');
  for (var b = 0; b < btns.length; b++) {
    btns[b].style.opacity = '';
    btns[b].style.boxShadow = '';
    btns[b].style.background = '';
  }
  // Zero out levels on nodes
  for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
    if (ZOIA.sim.nodes[i]) ZOIA.sim.nodes[i]._level = 0;
  }
};


ZOIA.sim._vizRAF = null;
ZOIA.sim._vizCanvasInput = null;
ZOIA.sim._vizCtx2dInput = null;
ZOIA.sim._vizCanvasOutput = null;
ZOIA.sim._vizCtx2dOutput = null;
ZOIA.sim._vizCanvasSelected = null;
ZOIA.sim._vizCtx2dSelected = null;

ZOIA.sim._startViz = function() {
  var cIn = document.getElementById('sim-viz-input');
  var cOut = document.getElementById('sim-viz-output');
  var cSel = document.getElementById('sim-viz-selected');
  if (cIn) {
    ZOIA.sim._vizCanvasInput = cIn;
    ZOIA.sim._vizCtx2dInput = cIn.getContext('2d');
  }
  if (cOut) {
    ZOIA.sim._vizCanvasOutput = cOut;
    ZOIA.sim._vizCtx2dOutput = cOut.getContext('2d');
  }
  if (cSel) {
    ZOIA.sim._vizCanvasSelected = cSel;
    ZOIA.sim._vizCtx2dSelected = cSel.getContext('2d');
  }
  ZOIA.sim._vizDraw();
};

ZOIA.sim._stopViz = function() {
  if (ZOIA.sim._vizRAF) {
    cancelAnimationFrame(ZOIA.sim._vizRAF);
    ZOIA.sim._vizRAF = null;
  }
  // Clear all 3 canvases
  var canvases = [
    { cv: ZOIA.sim._vizCanvasInput, cx: ZOIA.sim._vizCtx2dInput },
    { cv: ZOIA.sim._vizCanvasOutput, cx: ZOIA.sim._vizCtx2dOutput },
    { cv: ZOIA.sim._vizCanvasSelected, cx: ZOIA.sim._vizCtx2dSelected }
  ];
  for (var i = 0; i < canvases.length; i++) {
    if (canvases[i].cx && canvases[i].cv) {
      canvases[i].cx.clearRect(0, 0, canvases[i].cv.width, canvases[i].cv.height);
    }
  }
  ZOIA.sim._vizCanvasInput = null;
  ZOIA.sim._vizCtx2dInput = null;
  ZOIA.sim._vizCanvasOutput = null;
  ZOIA.sim._vizCtx2dOutput = null;
  ZOIA.sim._vizCanvasSelected = null;
  ZOIA.sim._vizCtx2dSelected = null;
  // Reset grid button brightness
  ZOIA.sim._resetGridLevels();
};

/**
 * Draw a single oscilloscope: waveform + RMS bar.
 * Reusable helper to avoid repetition across 3 scope canvases.
 */
ZOIA.sim._drawScope = function(canvas, ctx2d, analyser, color) {
  if (!canvas || !ctx2d || !analyser) {
    // Draw a flat line if no analyser
    if (canvas && ctx2d) {
      var w = canvas.width, h = canvas.height;
      ctx2d.fillStyle = '#0a0a0a';
      ctx2d.fillRect(0, 0, w, h);
      ctx2d.strokeStyle = '#333';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2);
      ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();
    }
    return;
  }
  var w = canvas.width, h = canvas.height;
  var bufLen = analyser.frequencyBinCount;
  var data = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(data);

  ctx2d.fillStyle = '#0a0a0a';
  ctx2d.fillRect(0, 0, w, h);

  // Waveform
  ctx2d.lineWidth = 1.5;
  ctx2d.strokeStyle = color;
  ctx2d.beginPath();
  var sliceW = w / bufLen;
  var x = 0;
  for (var i = 0; i < bufLen; i++) {
    var v = data[i] / 128.0;
    var y = v * h / 2;
    if (i === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
    x += sliceW;
  }
  ctx2d.lineTo(w, h / 2);
  ctx2d.stroke();

  // RMS bar at bottom
  var rms = 0;
  for (var j = 0; j < bufLen; j++) {
    var sample = (data[j] - 128) / 128;
    rms += sample * sample;
  }
  rms = Math.sqrt(rms / bufLen);
  var dbLevel = Math.max(0, Math.min(1, rms * 3));
  ctx2d.fillStyle = dbLevel > 0.8 ? '#e94560' : color;
  ctx2d.fillRect(0, h - 3, w * dbLevel, 3);
};

ZOIA.sim._vizDraw = function() {
  if (!ZOIA.sim.running) return;

  // INPUT scope (green) — from inputAnalyser
  ZOIA.sim._drawScope(
    ZOIA.sim._vizCanvasInput,
    ZOIA.sim._vizCtx2dInput,
    ZOIA.sim.inputAnalyser,
    '#00cc66'
  );

  // OUTPUT scope (cyan) — from master analyser
  ZOIA.sim._drawScope(
    ZOIA.sim._vizCanvasOutput,
    ZOIA.sim._vizCtx2dOutput,
    ZOIA.sim.analyser,
    '#00cccc'
  );

  // SELECTED MODULE scope (purple) — from selected module's per-node analyser
  var selAnalyser = null;
  var selIdx = ZOIA.state.selectedModule;
  if (selIdx !== null && selIdx !== undefined && ZOIA.sim.nodes[selIdx]) {
    selAnalyser = ZOIA.sim.nodes[selIdx]._analyser || null;
  }
  ZOIA.sim._drawScope(
    ZOIA.sim._vizCanvasSelected,
    ZOIA.sim._vizCtx2dSelected,
    selAnalyser,
    '#cc66ff'
  );

  // Update per-module grid button brightness
  ZOIA.sim._updateGridLevels();

  ZOIA.sim._vizRAF = requestAnimationFrame(ZOIA.sim._vizDraw);
};


// ================================================================
//  UI INTEGRATION
// ================================================================

/**
 * Update the sim play/stop button and status indicator.
 */
ZOIA.sim._updateUI = function() {
  var btn = document.getElementById('sim-toggle');
  if (btn) {
    btn.textContent = ZOIA.sim.running ? 'STOP / EDIT' : 'PLAY';
    btn.style.background = ZOIA.sim.running ? '#e94560' : '#00cccc';
    btn.style.color = ZOIA.sim.running ? '#fff' : '#000';
  }
  var status = document.getElementById('sim-status');
  if (status) {
    status.textContent = ZOIA.sim.running ? 'PLAY MODE' : 'EDIT MODE';
    status.style.color = ZOIA.sim.running ? '#00cccc' : '#666';
  }
  var toneBtn = document.getElementById('sim-testtone');
  if (toneBtn) {
    toneBtn.textContent = ZOIA.sim.testToneActive ? 'TONE OFF' : 'TONE';
    toneBtn.style.background = ZOIA.sim.testToneActive ? '#e94560' : '#333';
    toneBtn.style.color = ZOIA.sim.testToneActive ? '#fff' : '#aaa';
    toneBtn.style.borderColor = ZOIA.sim.testToneActive ? '#e94560' : '#555';
  }
};


// ================================================================
//  HOOK INTO PATCH STATE
// ================================================================

// Override setParamValue to also update simulation params
(function() {
  var origSetParam = ZOIA.setParamValue;
  ZOIA.setParamValue = function(modIdx, blockIdx, val) {
    origSetParam.call(ZOIA, modIdx, blockIdx, val);
    ZOIA.sim.updateParam(modIdx, blockIdx, val);
  };
})();

// Override setConnStrength to also update simulation
(function() {
  var origSetConnStr = ZOIA.setConnStrength;
  ZOIA.setConnStrength = function(connIdx, value) {
    origSetConnStr.call(ZOIA, connIdx, value);
    ZOIA.sim.updateConnStrength(connIdx, value);
  };
})();

// Override setSelectedConnStrength to also update simulation
(function() {
  var origSetSelConnStr = ZOIA.setSelectedConnStrength;
  ZOIA.setSelectedConnStrength = function(value) {
    origSetSelConnStr.call(ZOIA, value);
    var s = ZOIA.state;
    if (s.selectedConnection !== null) {
      ZOIA.sim.updateConnStrength(s.selectedConnection, value);
    }
  };
})();

ZOIA.log('sim-engine.js loaded');


