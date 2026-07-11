// === sim-mod-effects.js ===
/**
 * sim-mod-effects.js — ZOIA Simulation Module Factories: EFFECT-type modules
 *
 * Implements Web Audio node graphs for effect modules:
 *   Plate Reverb (25), Hall Reverb (26), Shimmer (27), Ghostverb (67),
 *   Vibrato (30), Phaser (61), Fuzz (66), Cabinet Sim (72),
 *   Diffuser (80), Aliaser (3), Ping Pong (69), Grain Delay (68),
 *   Ring Mod (42)
 *
 * Each factory: ZOIA.sim._createXxx(ctx, mod) -> { type, inputs[], outputs[], dispose() }
 *
 * ES5 only — no arrow functions, no const/let, no template literals, no classes.
 */
window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};


// ================================================================
//  HELPER: Synthetic Impulse Response Generator
// ================================================================

/**
 * Build a stereo impulse response buffer for convolution reverbs.
 * @param {AudioContext} ctx
 * @param {number} duration  — IR length in seconds
 * @param {number} decay     — Exponential decay power (higher = faster decay)
 * @param {boolean} diffuse  — If true, apply extra diffusion (randomized envelopes)
 * @returns {AudioBuffer}
 */
ZOIA.sim._buildIR = function(ctx, duration, decay, diffuse) {
  var len = Math.floor(ctx.sampleRate * duration);
  if (len < 1) len = 1;
  var buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = buf.getChannelData(ch);
    for (var i = 0; i < len; i++) {
      var env = Math.pow(1 - i / len, decay);
      if (diffuse) {
        // Add randomized modulation to the envelope for diffusion
        env *= (0.7 + 0.3 * Math.random());
      }
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return buf;
};


// ================================================================
//  Plate Reverb (Type 25)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]

ZOIA.sim._createPlateReverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Read initial param values
  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.5;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  // Plate character: moderate duration, quick decay exponent
  var irDuration = 0.5 + decayNorm * 3.5; // 0.5 - 4.0 seconds
  var convolver = ctx.createConvolver();
  convolver.buffer = ZOIA.sim._buildIR(ctx, irDuration, 2.5, false);

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);

  // Split stereo for L/R outputs
  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;

  // Merge dry (mono->both) and wet (stereo split)
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('decay') >= 0) {
        // Decay not directly an AudioParam; expose wetGain as proxy
        inputs[i] = null;
      } else if (name.indexOf('mix') >= 0) {
        inputs[i] = null; // Mix handled manually
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'plate_reverb',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Hall Reverb (Type 26)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]

ZOIA.sim._createHallReverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.6;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  // Hall character: longer duration, slower decay, more diffuse
  var irDuration = 1.0 + decayNorm * 6.0; // 1.0 - 7.0 seconds
  var convolver = ctx.createConvolver();
  convolver.buffer = ZOIA.sim._buildIR(ctx, irDuration, 1.5, true);

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);

  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null; // Decay and mix handled at init
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'hall_reverb',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Shimmer (Type 27)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]
//
// Reverb + pitch-shifted feedback using detuned delay lines.

ZOIA.sim._createShimmer = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.6;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;

  // Shimmer: reverb tail via convolver
  var irDuration = 1.0 + decayNorm * 5.0;
  var convolver = ctx.createConvolver();
  convolver.buffer = ZOIA.sim._buildIR(ctx, irDuration, 1.8, true);

  // Pitch-shifted feedback: two detuned delay lines feeding back into the convolver
  var delayA = ctx.createDelay(0.5);
  delayA.delayTime.value = 0.037; // prime-ish offset
  var delayB = ctx.createDelay(0.5);
  delayB.delayTime.value = 0.053;

  // LFO to modulate delay times for pitch shimmer effect
  var lfoA = ctx.createOscillator();
  lfoA.type = 'sine';
  lfoA.frequency.value = 0.3;
  var lfoAGain = ctx.createGain();
  lfoAGain.gain.value = 0.004; // subtle pitch shift
  lfoA.connect(lfoAGain);
  lfoAGain.connect(delayA.delayTime);
  lfoA.start();

  var lfoB = ctx.createOscillator();
  lfoB.type = 'sine';
  lfoB.frequency.value = 0.5;
  var lfoBGain = ctx.createGain();
  lfoBGain.gain.value = 0.006;
  lfoB.connect(lfoBGain);
  lfoBGain.connect(delayB.delayTime);
  lfoB.start();

  // Feedback gains (controlled by decay)
  var fbA = ctx.createGain();
  fbA.gain.value = 0.3 + decayNorm * 0.4; // 0.3 - 0.7
  var fbB = ctx.createGain();
  fbB.gain.value = 0.25 + decayNorm * 0.35;

  // Signal flow:
  //   inGain -> convolver -> delayA -> fbA -> convolver (feedback loop)
  //                       -> delayB -> fbB -> convolver (feedback loop)
  //   inGain -> dryGain
  //   convolver + delayA + delayB -> wetGain -> splitter -> L/R
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(delayA);
  convolver.connect(delayB);
  delayA.connect(fbA);
  fbA.connect(convolver);
  delayB.connect(fbB);
  fbB.connect(convolver);
  convolver.connect(wetGain);
  delayA.connect(wetGain);
  delayB.connect(wetGain);

  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'shimmer',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _delayA: delayA,
    _delayB: delayB,
    _lfoA: lfoA,
    _lfoAGain: lfoAGain,
    _lfoB: lfoB,
    _lfoBGain: lfoBGain,
    _fbA: fbA,
    _fbB: fbB,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._lfoA.stop(); } catch (e) {}
      try { this._lfoB.stop(); } catch (e) {}
      try { this._lfoA.disconnect(); } catch (e) {}
      try { this._lfoAGain.disconnect(); } catch (e) {}
      try { this._lfoB.disconnect(); } catch (e) {}
      try { this._lfoBGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._delayA.disconnect(); } catch (e) {}
      try { this._delayB.disconnect(); } catch (e) {}
      try { this._fbA.disconnect(); } catch (e) {}
      try { this._fbB.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Ghostverb (Type 67)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]
//
// Reverse-style reverb: uses a reversed impulse response (attack swell)
// combined with pre-delay for an eerie reverse-envelope character.

ZOIA.sim._createGhostverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.5;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  // Build a reverse-envelope IR: volume swells UP instead of decaying
  var irDuration = 0.8 + decayNorm * 4.0; // 0.8 - 4.8 seconds
  var irLen = Math.floor(ctx.sampleRate * irDuration);
  if (irLen < 1) irLen = 1;
  var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = irBuf.getChannelData(ch);
    for (var s = 0; s < irLen; s++) {
      // Reverse envelope: grows then cuts off
      var env = Math.pow(s / irLen, 2.0);
      // Add some randomized diffusion
      env *= (0.6 + 0.4 * Math.random());
      d[s] = (Math.random() * 2 - 1) * env;
    }
  }

  var convolver = ctx.createConvolver();
  convolver.buffer = irBuf;

  // Pre-delay for ghostly character
  var preDelay = ctx.createDelay(1.0);
  preDelay.delayTime.value = 0.05 + decayNorm * 0.15; // 50-200ms pre-delay

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(preDelay);
  preDelay.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);

  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ghostverb',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _preDelay: preDelay,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._preDelay.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Vibrato (Type 30)
// ================================================================
// Blocks: Audio In [audio_in], Rate [cv_in], Depth [cv_in],
//         Audio Out [audio_out]
//
// Pure pitch modulation via LFO-modulated delay. No dry signal.

ZOIA.sim._createVibrato = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var rateIdx = null;
  var depthIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('rate') >= 0) rateIdx = p;
      else if (pn.indexOf('depth') >= 0) depthIdx = p;
    }
  }

  var rateNorm = 0.3;
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    rateNorm = mod.params[rateIdx] / 65535;
  }
  var depthNorm = 0.5;
  if (depthIdx !== null && mod.params && mod.params[depthIdx] !== undefined) {
    depthNorm = mod.params[depthIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Modulated delay for vibrato
  var delay = ctx.createDelay(0.1);
  delay.delayTime.value = 0.005; // 5ms center point

  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.01 + rateNorm * 19.99; // 0.01 - 20 Hz

  var lfoGain = ctx.createGain();
  // Depth maps to delay modulation amount: 0 - 4ms
  lfoGain.gain.value = depthNorm * 0.004;

  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  // Pure wet signal only (no dry mix — vibrato is 100% wet)
  inGain.connect(delay);
  delay.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) {
        inputs[i] = lfo.frequency;
      } else if (name.indexOf('depth') >= 0) {
        inputs[i] = lfoGain.gain;
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

  return {
    type: 'vibrato',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _delay: delay,
    _lfo: lfo,
    _lfoGain: lfoGain,
    _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Phaser (Type 61)
// ================================================================
// Blocks: Audio In [audio_in], Rate [cv_in], Depth [cv_in],
//         Audio Out [audio_out]
//
// Chain of allpass BiquadFilterNodes with LFO sweeping frequency,
// mixed with dry signal for the characteristic notch/peak pattern.

ZOIA.sim._createPhaser = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var rateIdx = null;
  var depthIdx = null;
  var fbIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('rate') >= 0) rateIdx = p;
      else if (pn.indexOf('depth') >= 0) depthIdx = p;
      else if (pn.indexOf('feedback') >= 0) fbIdx = p;
    }
  }

  var rateNorm = 0.15;
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    rateNorm = mod.params[rateIdx] / 65535;
  }
  var depthNorm = 0.7;
  if (depthIdx !== null && mod.params && mod.params[depthIdx] !== undefined) {
    depthNorm = mod.params[depthIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Create 6 allpass filter stages
  var numStages = 6;
  var allpassFilters = [];
  var baseFreq = 500; // Center frequency for sweep
  for (var s = 0; s < numStages; s++) {
    var ap = ctx.createBiquadFilter();
    ap.type = 'allpass';
    ap.frequency.value = baseFreq;
    ap.Q.value = 0.5;
    allpassFilters.push(ap);
  }

  // Chain allpass filters together
  inGain.connect(allpassFilters[0]);
  for (var c = 1; c < numStages; c++) {
    allpassFilters[c - 1].connect(allpassFilters[c]);
  }

  // LFO sweeps all allpass filter frequencies together
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.01 + rateNorm * 19.99;

  // LFO gain controls the sweep depth
  // Each allpass filter needs its own gain node for the LFO connection
  var lfoGains = [];
  for (var g = 0; g < numStages; g++) {
    var lg = ctx.createGain();
    lg.gain.value = depthNorm * 2000; // Sweep range in Hz
    lfo.connect(lg);
    lg.connect(allpassFilters[g].frequency);
    lfoGains.push(lg);
  }
  lfo.start();

  // Feedback path: allpass output -> feedback gain -> input
  var fbGain = ctx.createGain();
  var fbNorm = 0.0;
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    fbNorm = mod.params[fbIdx] / 65535;
  }
  fbGain.gain.value = fbNorm * 0.9; // Cap at 0.9 to avoid runaway
  allpassFilters[numStages - 1].connect(fbGain);
  fbGain.connect(allpassFilters[0]);

  // Mix dry and phased (wet) signals
  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.7;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.7;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(dryGain);
  allpassFilters[numStages - 1].connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) {
        inputs[i] = lfo.frequency;
      } else if (name.indexOf('depth') >= 0) {
        inputs[i] = lfoGains[0].gain;
      } else if (name.indexOf('feedback') >= 0) {
        inputs[i] = fbGain.gain;
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

  return {
    type: 'phaser',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _allpassFilters: allpassFilters,
    _lfo: lfo,
    _lfoGains: lfoGains,
    _fbGain: fbGain,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      for (var j = 0; j < this._lfoGains.length; j++) {
        try { this._lfoGains[j].disconnect(); } catch (e) {}
      }
      try { this._inGain.disconnect(); } catch (e) {}
      for (var k = 0; k < this._allpassFilters.length; k++) {
        try { this._allpassFilters[k].disconnect(); } catch (e) {}
      }
      try { this._fbGain.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Fuzz (Type 66)
// ================================================================
// Blocks: Audio In [audio_in], Drive [cv_in], Audio Out [audio_out]
//
// Aggressive asymmetric clipping via WaveShaperNode.

ZOIA.sim._createFuzz = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var driveIdx = null;
  var toneIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('drive') >= 0 || pn.indexOf('gain') >= 0) driveIdx = p;
      else if (pn.indexOf('tone') >= 0) toneIdx = p;
    }
  }

  var driveNorm = 0.5;
  if (driveIdx !== null && mod.params && mod.params[driveIdx] !== undefined) {
    driveNorm = mod.params[driveIdx] / 65535;
  }

  // Pre-gain driven by drive param
  var preGain = ctx.createGain();
  preGain.gain.value = 2 + driveNorm * 30; // 2x - 32x gain for extreme fuzz

  // WaveShaper with aggressive asymmetric clipping
  var shaper = ctx.createWaveShaper();
  shaper.oversample = '4x';

  var curveLen = 44100;
  var curve = new Float32Array(curveLen);
  for (var s = 0; s < curveLen; s++) {
    var x = (s / curveLen) * 2 - 1;
    // Asymmetric: positive side clips harder than negative
    if (x >= 0) {
      curve[s] = 1 - Math.exp(-x * 5);
    } else {
      curve[s] = -(1 - Math.exp(x * 3));
    }
  }
  shaper.curve = curve;

  // Post-filter to tame the harshest highs
  var postFilter = ctx.createBiquadFilter();
  postFilter.type = 'lowpass';
  postFilter.frequency.value = 4500;
  postFilter.Q.value = 0.7;

  var outGain = ctx.createGain();
  outGain.gain.value = 0.5; // Tame output level

  preGain.connect(shaper);
  shaper.connect(postFilter);
  postFilter.connect(outGain);

  // Apply initial tone param (controls post-filter cutoff)
  if (toneIdx !== null && mod.params && mod.params[toneIdx] !== undefined) {
    var toneNorm = mod.params[toneIdx] / 65535;
    postFilter.frequency.value = 500 + toneNorm * 9500; // 500 Hz - 10 kHz
  }

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = preGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('drive') >= 0 || name.indexOf('gain') >= 0) {
        inputs[i] = preGain.gain;
      } else if (name.indexOf('tone') >= 0) {
        inputs[i] = postFilter.frequency;
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

  return {
    type: 'fuzz',
    inputs: inputs,
    outputs: outputs,
    _preGain: preGain,
    _shaper: shaper,
    _postFilter: postFilter,
    _outGain: outGain,
    dispose: function() {
      try { this._preGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
      try { this._postFilter.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Cabinet Sim (Type 72)
// ================================================================
// Blocks: Audio In [audio_in], Audio Out [audio_out]
//
// Short synthetic speaker cabinet IR with bandpass character (~100Hz-5kHz).

ZOIA.sim._createCabinetSim = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Build a short cabinet impulse response (~50ms)
  // with bandpass character: rolls off below ~100Hz and above ~5kHz
  var irLen = Math.floor(ctx.sampleRate * 0.05); // 50ms
  if (irLen < 1) irLen = 1;
  var irBuf = ctx.createBuffer(1, irLen, ctx.sampleRate);
  var d = irBuf.getChannelData(0);
  for (var s = 0; s < irLen; s++) {
    var env = Math.pow(1 - s / irLen, 3.0);
    d[s] = (Math.random() * 2 - 1) * env;
  }

  var convolver = ctx.createConvolver();
  convolver.buffer = irBuf;

  // Additional bandpass shaping for cabinet character
  var hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = 100;
  hipass.Q.value = 0.7;

  var lopass = ctx.createBiquadFilter();
  lopass.type = 'lowpass';
  lopass.frequency.value = 5000;
  lopass.Q.value = 0.7;

  // Mid-presence peak (speaker resonance around 2-3kHz)
  var presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2500;
  presence.Q.value = 1.5;
  presence.gain.value = 3;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(convolver);
  convolver.connect(hipass);
  hipass.connect(lopass);
  lopass.connect(presence);
  presence.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cabinet_sim',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _hipass: hipass,
    _lopass: lopass,
    _presence: presence,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._hipass.disconnect(); } catch (e) {}
      try { this._lopass.disconnect(); } catch (e) {}
      try { this._presence.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Diffuser (Type 80)
// ================================================================
// Blocks: Audio In [audio_in], Size [cv_in], Audio Out [audio_out]
//
// Chain of 4 allpass filters with prime-number delay times.
// Size controls delay lengths.

ZOIA.sim._createDiffuser = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sizeIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('size') >= 0) sizeIdx = p;
    }
  }

  var sizeNorm = 0.5;
  if (sizeIdx !== null && mod.params && mod.params[sizeIdx] !== undefined) {
    sizeNorm = mod.params[sizeIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Prime-number base delay times (in ms), scaled by size
  var primes = [7, 11, 17, 23];
  var stages = [];
  var prevNode = inGain;

  for (var s = 0; s < 4; s++) {
    // Each stage: delay -> allpass filter (to add phase smearing)
    var delayTime = (primes[s] / 1000) * (0.3 + sizeNorm * 2.0); // Scale with size
    var delay = ctx.createDelay(0.2);
    delay.delayTime.value = Math.min(delayTime, 0.19);

    var allpass = ctx.createBiquadFilter();
    allpass.type = 'allpass';
    allpass.frequency.value = 300 + s * 400; // Spread frequencies
    allpass.Q.value = 0.5;

    // Feedback within each stage for denser diffusion
    var fb = ctx.createGain();
    fb.gain.value = 0.5;

    prevNode.connect(delay);
    delay.connect(allpass);
    allpass.connect(fb);
    fb.connect(delay); // feedback loop

    stages.push({ delay: delay, allpass: allpass, fb: fb });
    prevNode = allpass;
  }

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  prevNode.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null; // Size set at init
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'diffuser',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _stages: stages,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      for (var j = 0; j < this._stages.length; j++) {
        try { this._stages[j].delay.disconnect(); } catch (e) {}
        try { this._stages[j].allpass.disconnect(); } catch (e) {}
        try { this._stages[j].fb.disconnect(); } catch (e) {}
      }
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Aliaser (Type 3)
// ================================================================
// Blocks: Audio In [audio_in], Rate [cv_in], Audio Out [audio_out]
//
// Sample rate reduction using a WaveShaperNode with a stepped curve.
// Rate parameter controls the step resolution (fewer steps = more aliasing).

ZOIA.sim._createAliaser = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var rateIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('rate') >= 0) rateIdx = p;
    }
  }

  var rateNorm = 0.5;
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    rateNorm = mod.params[rateIdx] / 65535;
  }

  // Build a stepped WaveShaper curve for quantization/aliasing
  // Lower rate = fewer steps = more extreme aliasing
  var steps = Math.max(2, Math.round(4 + rateNorm * 252)); // 4 - 256 steps
  var curveLen = 44100;
  var curve = new Float32Array(curveLen);
  for (var s = 0; s < curveLen; s++) {
    var x = (s / curveLen) * 2 - 1;
    curve[s] = Math.round(x * steps) / steps;
  }

  var shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = 'none'; // Intentionally no oversampling for aliasing character

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(shaper);
  shaper.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null; // Rate set at init via curve generation
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'aliaser',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _shaper: shaper,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Ping Pong Delay (Type 69)
// ================================================================
// Blocks: Audio In [audio_in], Time [cv_in], Feedback [cv_in],
//         Mix [cv_in], L Out [audio_out], R Out [audio_out]
//
// Left/right alternating delay with cross-feedback.

ZOIA.sim._createPingPong = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var timeIdx = null;
  var fbIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('time') >= 0) timeIdx = p;
      else if (pn.indexOf('feed') >= 0) fbIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var timeNorm = 0.3;
  if (timeIdx !== null && mod.params && mod.params[timeIdx] !== undefined) {
    timeNorm = mod.params[timeIdx] / 65535;
  }
  var fbNorm = 0.4;
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    fbNorm = mod.params[fbIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  var delayTime = timeNorm * 2.0; // 0 - 2 seconds

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Two delay lines: left and right, with cross-feedback
  var delayL = ctx.createDelay(5.0);
  delayL.delayTime.value = delayTime;
  var delayR = ctx.createDelay(5.0);
  delayR.delayTime.value = delayTime;

  var fbL = ctx.createGain();
  fbL.gain.value = fbNorm * 0.9; // Cap feedback below 1.0
  var fbR = ctx.createGain();
  fbR.gain.value = fbNorm * 0.9;

  // Cross-feedback: L delay output -> R delay input, and vice versa
  // Input feeds into L delay first, creating the ping-pong pattern
  inGain.connect(delayL);
  delayL.connect(fbL);
  fbL.connect(delayR);
  delayR.connect(fbR);
  fbR.connect(delayL);

  // Dry/wet mixing per channel
  var dryL = ctx.createGain();
  dryL.gain.value = 1 - mixNorm;
  var dryR = ctx.createGain();
  dryR.gain.value = 1 - mixNorm;
  var wetL = ctx.createGain();
  wetL.gain.value = mixNorm;
  var wetR = ctx.createGain();
  wetR.gain.value = mixNorm;

  var outL = ctx.createGain();
  outL.gain.value = 1.0;
  var outR = ctx.createGain();
  outR.gain.value = 1.0;

  inGain.connect(dryL);
  inGain.connect(dryR);
  delayL.connect(wetL);
  delayR.connect(wetR);
  dryL.connect(outL);
  wetL.connect(outL);
  dryR.connect(outR);
  wetR.connect(outR);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('time') >= 0) {
        inputs[i] = delayL.delayTime; // Primary; R follows via cross-feedback
      } else if (name.indexOf('feed') >= 0) {
        inputs[i] = fbL.gain;
      } else if (name.indexOf('mix') >= 0) {
        inputs[i] = null; // Mix set at init
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = outL; outIdx++; }
      else { outputs[i] = outR; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ping_pong',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _delayL: delayL,
    _delayR: delayR,
    _fbL: fbL,
    _fbR: fbR,
    _dryL: dryL,
    _dryR: dryR,
    _wetL: wetL,
    _wetR: wetR,
    _outL: outL,
    _outR: outR,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delayL.disconnect(); } catch (e) {}
      try { this._delayR.disconnect(); } catch (e) {}
      try { this._fbL.disconnect(); } catch (e) {}
      try { this._fbR.disconnect(); } catch (e) {}
      try { this._dryL.disconnect(); } catch (e) {}
      try { this._dryR.disconnect(); } catch (e) {}
      try { this._wetL.disconnect(); } catch (e) {}
      try { this._wetR.disconnect(); } catch (e) {}
      try { this._outL.disconnect(); } catch (e) {}
      try { this._outR.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Grain Delay (Type 68)
// ================================================================
// Blocks: Audio In [audio_in], Time [cv_in], Size [cv_in],
//         Mix [cv_in], Audio Out [audio_out]
//
// Granular-style delay using multiple short delays at slightly
// different times for a textured, granular repetition effect.

ZOIA.sim._createGrainDelay = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var timeIdx = null;
  var sizeIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('time') >= 0) timeIdx = p;
      else if (pn.indexOf('size') >= 0) sizeIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var timeNorm = 0.3;
  if (timeIdx !== null && mod.params && mod.params[timeIdx] !== undefined) {
    timeNorm = mod.params[timeIdx] / 65535;
  }
  var sizeNorm = 0.5;
  if (sizeIdx !== null && mod.params && mod.params[sizeIdx] !== undefined) {
    sizeNorm = mod.params[sizeIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  var baseTime = timeNorm * 2.0; // 0 - 2 seconds
  var spread = sizeNorm * 0.1;   // Grain spread: 0 - 100ms offset between grains

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Create 4 delay "grains" at slightly offset times
  var numGrains = 4;
  var grainDelays = [];
  var grainGains = [];
  var wetMix = ctx.createGain();
  wetMix.gain.value = mixNorm / numGrains; // Normalize grain levels

  for (var g = 0; g < numGrains; g++) {
    var gDelay = ctx.createDelay(5.0);
    var offset = spread * (g - (numGrains - 1) / 2); // Center the spread
    gDelay.delayTime.value = Math.max(0, baseTime + offset);

    var gGain = ctx.createGain();
    // Slight volume variation per grain for texture
    gGain.gain.value = 0.8 + Math.random() * 0.4;

    inGain.connect(gDelay);
    gDelay.connect(gGain);
    gGain.connect(wetMix);

    grainDelays.push(gDelay);
    grainGains.push(gGain);
  }

  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(dryGain);
  dryGain.connect(outGain);
  wetMix.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('time') >= 0) {
        inputs[i] = grainDelays[0].delayTime; // Primary grain time
      } else if (name.indexOf('size') >= 0) {
        inputs[i] = null; // Size set at init (controls spread)
      } else if (name.indexOf('mix') >= 0) {
        inputs[i] = null; // Mix set at init
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

  return {
    type: 'grain_delay',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _grainDelays: grainDelays,
    _grainGains: grainGains,
    _wetMix: wetMix,
    _dryGain: dryGain,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      for (var j = 0; j < this._grainDelays.length; j++) {
        try { this._grainDelays[j].disconnect(); } catch (e) {}
        try { this._grainGains[j].disconnect(); } catch (e) {}
      }
      try { this._wetMix.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Ring Mod (Type 42)
// ================================================================
// Blocks: In 1 [audio_in], In 2 [audio_in], Output [audio_out]
//
// Multiply two audio signals. Uses a GainNode where one input
// signal modulates the gain of the other.

ZOIA.sim._createRingMod = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Carrier: audio passes through this GainNode
  // Modulator: connects to the gain AudioParam of the carrier
  var carrier = ctx.createGain();
  carrier.gain.value = 1; // Pass through when no modulator input is connected

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  carrier.connect(outGain);

  var inputCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inputCount === 0) {
        // First input: audio signal passes through the carrier GainNode
        inputs[i] = carrier;
        inputCount++;
      } else {
        // Second input: modulates the gain (ring modulation)
        inputs[i] = carrier.gain;
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
    type: 'ring_mod',
    inputs: inputs,
    outputs: outputs,
    _carrier: carrier,
    _outGain: outGain,
    _hasRingModulatorInput: inputCount > 1,
    dispose: function() {
      try { this._carrier.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[3]  = ZOIA.sim._createAliaser;
ZOIA.sim._moduleFactories[25] = ZOIA.sim._createPlateReverb;
ZOIA.sim._moduleFactories[26] = ZOIA.sim._createHallReverb;
ZOIA.sim._moduleFactories[27] = ZOIA.sim._createShimmer;
ZOIA.sim._moduleFactories[30] = ZOIA.sim._createVibrato;
ZOIA.sim._moduleFactories[42] = ZOIA.sim._createRingMod;
ZOIA.sim._moduleFactories[61] = ZOIA.sim._createPhaser;
ZOIA.sim._moduleFactories[66] = ZOIA.sim._createFuzz;
ZOIA.sim._moduleFactories[67] = ZOIA.sim._createGhostverb;
ZOIA.sim._moduleFactories[68] = ZOIA.sim._createGrainDelay;
ZOIA.sim._moduleFactories[69] = ZOIA.sim._createPingPong;
ZOIA.sim._moduleFactories[72] = ZOIA.sim._createCabinetSim;
ZOIA.sim._moduleFactories[80] = ZOIA.sim._createDiffuser;

ZOIA.log('sim-mod-effects.js loaded: 13 effect modules registered');


