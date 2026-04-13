import * as Tone from 'tone';

const UNISON_SPREADS = { 1:[0], 2:[-10,10], 3:[-15,0,15], 4:[-20,-7,7,20], 7:[-30,-20,-10,0,10,20,30] };

const WT_DEFAULTS = { wtPos: 0.5, wtScan: 0, wtRate: 1, wtEnv: 0 };

export class SynthEngine {
  constructor() {
    this.voices = new Map();
    this.params = this._defaultParams();
    this._lfoTarget = null;
    this._buildChain();
    this._startWtScheduler();
  }

  _defaultParams() {
    return {
      osc1:   { type: 'sawtooth', octave: 0, detune: 0, volume: 0.8, enabled: true,  wavetable: null, ...WT_DEFAULTS },
      osc2:   { type: 'square',   octave: 0, semitone: 7, detune: 0, volume: 0.3, enabled: false, wavetable: null, ...WT_DEFAULTS },
      osc3:   { type: 'white', volume: 0, enabled: false },
      unison: { voices: 1, spread: 15, width: 0.5 },
      filter: { type: 'lowpass', frequency: 2000, Q: 1, rolloff: -24, enabled: true },
      env:    { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4 },
      lfo:    { type: 'sine', rate: 2, depth: 0, destination: 'filter', enabled: true },
      effects: {
        chorus: { rate: 1.5, depth: 0.5, wet: 0, enabled: false },
        delay:  { time: 0.25, feedback: 0.3, wet: 0, enabled: false },
        reverb: { decay: 2.5, wet: 0, tone: 20000, enabled: false },
      },
      amp: { volume: 0.75 },
    };
  }

  _buildChain() {
    this.masterGain = new Tone.Gain(this.params.amp.volume).toDestination();

    this.reverb = new Tone.Reverb({ decay: this.params.effects.reverb.decay, wet: 0 });
    this.reverb.generate();
    this.delay  = new Tone.FeedbackDelay({ delayTime: this.params.effects.delay.time, feedback: this.params.effects.delay.feedback, wet: 0 });
    this.chorus = new Tone.Chorus({ rate: this.params.effects.chorus.rate, depth: this.params.effects.chorus.depth, wet: 0 }).start();

    this.reverbTone = new Tone.Filter({ type: 'lowpass', frequency: 20000 });
    this.reverbTone.connect(this.masterGain);

    this.chorus.connect(this.delay);
    this.delay.connect(this.reverb);
    this.reverb.connect(this.reverbTone);

    this.filter = new Tone.Filter({
      type:      this.params.filter.type,
      frequency: this.params.filter.frequency,
      Q:         this.params.filter.Q,
      rolloff:   this.params.filter.rolloff,
    });
    this.filter.connect(this.chorus);

    this.voiceBus = new Tone.Gain(1).connect(this.filter);
    this.lfo = new Tone.LFO({ type: this.params.lfo.type, frequency: this.params.lfo.rate, min: 0, max: 0 }).start();
  }

  // ─── Wavetable morphing scheduler (~30 fps) ───────────────────────
  _startWtScheduler() {
    // Display position: read by canvas rAF via getWtDisplayPos()
    this._wtDisplayPos = { osc1: 0.5, osc2: 0.5 };
    // startMs of the most recently triggered note (for envelope display)
    this._wtDisplayMs  = null;

    const computeDisplayPos = (osc) => {
      const nowSec  = Date.now() / 1000;
      const lfo     = osc.wtScan > 0
        ? Math.sin(2 * Math.PI * osc.wtRate * nowSec) * osc.wtScan * 0.5
        : 0;
      const elapsed = this._wtDisplayMs != null ? (Date.now() - this._wtDisplayMs) / 1000 : 0;
      const env     = osc.wtEnv !== 0 && this._wtDisplayMs != null
        ? this._getEnvValue(elapsed) * osc.wtEnv
        : 0;
      return Math.max(0, Math.min(1, (osc.wtPos ?? 0.5) + lfo + env));
    };

    this._wtInterval = setInterval(() => {
      // Always update display positions (LFO + envelope)
      this._wtDisplayPos.osc1 = computeDisplayPos(this.params.osc1);
      this._wtDisplayPos.osc2 = computeDisplayPos(this.params.osc2);

      if (this.voices.size === 0) return;
      this.voices.forEach(voiceList => {
        voiceList.forEach(v => {
          if (v.osc1 && Array.isArray(this.params.osc1.wavetable)) {
            const p = this._getWtPartials(this.params.osc1, v.startMs);
            if (p) try { v.osc1.partials = p; } catch(_) {}
          }
          if (v.osc2 && Array.isArray(this.params.osc2.wavetable)) {
            const p = this._getWtPartials(this.params.osc2, v.startMs);
            if (p) try { v.osc2.partials = p; } catch(_) {}
          }
        });
      });
    }, 33);
  }

  getWtDisplayPos(oscKey) {
    return this._wtDisplayPos?.[oscKey] ?? 0.5;
  }

  // Compute interpolated partials for current time and voice start
  _getWtPartials(osc, startMs) {
    const frames = osc.wavetable;
    if (!Array.isArray(frames) || frames.length === 0) return null;
    if (frames.length === 1) return frames[0];

    const nowSec     = Date.now() / 1000;
    const elapsedSec = (Date.now() - (startMs ?? Date.now())) / 1000;

    const lfo = osc.wtScan > 0
      ? Math.sin(2 * Math.PI * osc.wtRate * nowSec) * osc.wtScan * 0.5
      : 0;

    const env = osc.wtEnv !== 0
      ? this._getEnvValue(elapsedSec) * osc.wtEnv
      : 0;

    const pos = Math.max(0, Math.min(1, (osc.wtPos ?? 0.5) + lfo + env));
    return this._interpolateFrames(frames, pos);
  }

  _interpolateFrames(frames, pos) {
    const floatIdx = pos * (frames.length - 1);
    const i0 = Math.floor(floatIdx);
    const i1 = Math.min(i0 + 1, frames.length - 1);
    const t  = floatIdx - i0;
    const f0 = frames[i0], f1 = frames[i1];
    return f0.map((v, k) => v * (1 - t) + (f1[k] ?? 0) * t);
  }

  // Simplified ADSR value at elapsed time (attack peak = 1)
  _getEnvValue(elapsedSec) {
    const { attack, decay, sustain } = this.params.env;
    if (elapsedSec < attack)
      return elapsedSec / Math.max(attack, 0.001);
    if (elapsedSec < attack + decay)
      return 1 - (1 - sustain) * (elapsedSec - attack) / Math.max(decay, 0.001);
    return sustain;
  }

  // Immediately apply WT partials to all active voices for one osc
  _applyWtToVoices(oscKey) {
    const osc = this.params[oscKey];
    if (!Array.isArray(osc.wavetable)) return;
    this.voices.forEach(vl => vl.forEach(v => {
      const oscNode = v[oscKey === 'osc1' ? 'osc1' : 'osc2'];
      if (!oscNode) return;
      const p = this._getWtPartials(osc, v.startMs);
      if (p) try { oscNode.partials = p; } catch(_) {}
    }));
  }

  // ─── Note On/Off ─────────────────────────────────────────────────
  noteOn(note) {
    if (this.voices.has(note)) this.noteOff(note);
    const spreads = UNISON_SPREADS[this.params.unison.voices] || [0];
    const spreadScale = this.params.unison.spread / 15;
    const startMs = Date.now();
    this._wtDisplayMs = startMs;   // track for envelope display
    const voiceList = spreads.map((offset, i) => this._createVoice(note, offset * spreadScale, i === 0, startMs));
    this.voices.set(note, voiceList);
  }

  noteOff(note) {
    const voiceList = this.voices.get(note);
    if (!voiceList) return;
    const releaseTime = (this.params.env.release + 0.15) * 1000;
    voiceList.forEach(v => {
      try { v.env.triggerRelease(); } catch (_) {}
      setTimeout(() => {
        try { v.osc1?.stop();    v.osc1?.dispose();    } catch (_) {}
        try { v.osc2?.stop();    v.osc2?.dispose();    } catch (_) {}
        try { v.noise?.stop();   v.noise?.dispose();   } catch (_) {}
        try { v.env.dispose();                         } catch (_) {}
        try { v.osc1Gain?.dispose();                   } catch (_) {}
        try { v.osc2Gain?.dispose();                   } catch (_) {}
        try { v.noiseGain?.dispose();                  } catch (_) {}
        try { v.voiceOut.dispose();                    } catch (_) {}
      }, releaseTime);
    });
    this.voices.delete(note);
  }

  allNotesOff() {
    [...this.voices.keys()].forEach(n => this.noteOff(n));
  }

  // Sequencer trigger — called at audio-scheduled time
  triggerNote(note, time, velocity = 1) {
    const { osc1, osc2, osc3, env: ep } = this.params;
    const stepLen = Tone.Time('16n').toSeconds() * 0.8;
    const startMs = Date.now();

    const voiceOut = new Tone.Gain(velocity).connect(this.voiceBus);
    const envelope = new Tone.AmplitudeEnvelope({ attack: ep.attack, decay: ep.decay, sustain: ep.sustain, release: ep.release }).connect(voiceOut);

    const freq = Tone.Frequency(note).toFrequency();
    const osc1Gain = new Tone.Gain(osc1.volume).connect(envelope);
    const oscillator1 = new Tone.Oscillator({ type: osc1.type, frequency: freq * Math.pow(2, osc1.octave), detune: osc1.detune }).connect(osc1Gain);
    if (Array.isArray(osc1.wavetable)) {
      const p = this._getWtPartials(osc1, startMs);
      if (p) oscillator1.partials = p;
    }
    oscillator1.start(time);

    let oscillator2 = null, osc2Gain = null;
    if (osc2.enabled) {
      osc2Gain = new Tone.Gain(osc2.volume).connect(envelope);
      oscillator2 = new Tone.Oscillator({ type: osc2.type, frequency: freq * Math.pow(2, osc2.octave) * Math.pow(2, osc2.semitone / 12), detune: osc2.detune }).connect(osc2Gain);
      if (Array.isArray(osc2.wavetable)) {
        const p = this._getWtPartials(osc2, startMs);
        if (p) oscillator2.partials = p;
      }
      oscillator2.start(time);
    }

    let noiseNode = null, noiseGain = null;
    if (osc3.enabled) {
      noiseGain = new Tone.Gain(osc3.volume).connect(envelope);
      noiseNode = new Tone.Noise(osc3.type).connect(noiseGain);
      noiseNode.start(time);
    }

    if (this.params.lfo.destination === 'pitch' && this.params.lfo.enabled && this.params.lfo.depth > 0) {
      try { this.lfo.connect(oscillator1.detune); } catch(_) {}
      if (oscillator2) { try { this.lfo.connect(oscillator2.detune); } catch(_) {} }
    }

    envelope.triggerAttack(time);
    envelope.triggerRelease(time + stepLen);

    const cleanup = (stepLen + ep.release + 0.3) * 1000;
    setTimeout(() => {
      try { oscillator1.stop();   oscillator1.dispose();  } catch(_) {}
      try { oscillator2?.stop();  oscillator2?.dispose(); } catch(_) {}
      try { noiseNode?.stop();    noiseNode?.dispose();   } catch(_) {}
      try { envelope.dispose();                           } catch(_) {}
      try { osc1Gain.dispose();                           } catch(_) {}
      try { osc2Gain?.dispose();                          } catch(_) {}
      try { noiseGain?.dispose();                         } catch(_) {}
      try { voiceOut.dispose();                           } catch(_) {}
    }, cleanup);
  }

  _createVoice(note, detuneOffset, addNoise = false, startMs = Date.now()) {
    const freq = Tone.Frequency(note).toFrequency();
    const { osc1, osc2, osc3, env: ep } = this.params;

    const voiceOut = new Tone.Gain(1).connect(this.voiceBus);
    const envelope = new Tone.AmplitudeEnvelope({ attack: ep.attack, decay: ep.decay, sustain: ep.sustain, release: ep.release }).connect(voiceOut);

    let oscillator1 = null, osc1Gain = null;
    if (osc1.enabled) {
      osc1Gain = new Tone.Gain(osc1.volume).connect(envelope);
      oscillator1 = new Tone.Oscillator({ type: osc1.type, frequency: freq * Math.pow(2, osc1.octave), detune: osc1.detune + detuneOffset }).connect(osc1Gain);
      if (Array.isArray(osc1.wavetable)) {
        const p = this._getWtPartials(osc1, startMs);
        if (p) oscillator1.partials = p;
      }
      oscillator1.start();
    }

    let oscillator2 = null, osc2Gain = null;
    if (osc2.enabled) {
      osc2Gain = new Tone.Gain(osc2.volume).connect(envelope);
      const osc2Freq = freq * Math.pow(2, osc2.octave) * Math.pow(2, osc2.semitone / 12);
      oscillator2 = new Tone.Oscillator({ type: osc2.type, frequency: osc2Freq, detune: osc2.detune + detuneOffset }).connect(osc2Gain);
      if (Array.isArray(osc2.wavetable)) {
        const p = this._getWtPartials(osc2, startMs);
        if (p) oscillator2.partials = p;
      }
      oscillator2.start();
    }

    let noiseNode = null, noiseGain = null;
    if (addNoise && osc3.enabled) {
      noiseGain = new Tone.Gain(osc3.volume).connect(envelope);
      noiseNode = new Tone.Noise(osc3.type).connect(noiseGain);
      noiseNode.start();
    }

    if (this.params.lfo.destination === 'pitch' && this.params.lfo.enabled && this.params.lfo.depth > 0) {
      if (oscillator1) { try { this.lfo.connect(oscillator1.detune); } catch(_) {} }
      if (oscillator2) { try { this.lfo.connect(oscillator2.detune); } catch(_) {} }
    }

    envelope.triggerAttack();
    return { osc1: oscillator1, osc2: oscillator2, noise: noiseNode, env: envelope, osc1Gain, osc2Gain, noiseGain, voiceOut, startMs };
  }

  // ─── LFO ─────────────────────────────────────────────────────────
  _connectLFO() {
    if (this._lfoTarget === this.filter.frequency) {
      this.filter.frequency.rampTo(this.params.filter.frequency, 0.05);
    } else if (this._lfoTarget === this.masterGain.gain) {
      this.masterGain.gain.rampTo(this.params.amp.volume, 0.05);
    }

    try { this.lfo.disconnect(); } catch (_) {}
    this._lfoTarget = null;

    const { destination, depth, enabled, polarity = '±' } = this.params.lfo;
    if (!enabled || depth === 0) return;

    if (destination === 'filter') {
      const base = this.params.filter.frequency;
      const lo = Math.max(20, base * (1 - depth));
      const hi = Math.min(20000, base * (1 + depth));
      this.lfo.min = polarity === '+' ? base : lo;
      this.lfo.max = polarity === '-' ? base : hi;
      this._lfoTarget = this.filter.frequency;
      this.lfo.connect(this.filter.frequency);
    } else if (destination === 'amp') {
      const vol = this.params.amp.volume;
      const lo = Math.max(0, vol - depth);
      const hi = Math.min(1, vol + depth);
      this.lfo.min = polarity === '+' ? vol : lo;
      this.lfo.max = polarity === '-' ? vol : hi;
      this._lfoTarget = this.masterGain.gain;
      this.lfo.connect(this.masterGain.gain);
    } else if (destination === 'pitch') {
      const depthCents = depth * 200;
      this.lfo.min = polarity === '+' ? 0 : -depthCents;
      this.lfo.max = polarity === '-' ? 0 : depthCents;
      this._lfoTarget = 'pitch';
      this.voices.forEach(voiceList => {
        voiceList.forEach(v => {
          try { if (v.osc1) this.lfo.connect(v.osc1.detune); } catch(_) {}
          try { if (v.osc2) this.lfo.connect(v.osc2.detune); } catch(_) {}
        });
      });
    }
  }

  // ─── Parameter Setters ───────────────────────────────────────────
  setOsc1(key, value) {
    this.params.osc1[key] = value;
    if (key === 'volume')
      this.voices.forEach(vl => vl.forEach(v => v.osc1Gain?.gain.rampTo(value, 0.05)));
    if (key === 'type' && !this.params.osc1.wavetable)
      this.voices.forEach(vl => vl.forEach(v => { try { if (v.osc1) v.osc1.type = value; } catch(_){} }));
    if (key === 'wavetable') {
      this.voices.forEach(vl => vl.forEach(v => { try {
        if (!v.osc1) return;
        if (value) {
          const p = this._getWtPartials(this.params.osc1, v.startMs);
          if (p) v.osc1.partials = p;
        } else {
          v.osc1.type = this.params.osc1.type;
        }
      } catch(_){} }));
    }
    if (['wtPos', 'wtScan', 'wtRate', 'wtEnv'].includes(key))
      this._applyWtToVoices('osc1');
  }

  setOsc2(key, value) {
    this.params.osc2[key] = value;
    if (key === 'volume')
      this.voices.forEach(vl => vl.forEach(v => v.osc2Gain?.gain.rampTo(value, 0.05)));
    if (key === 'type' && !this.params.osc2.wavetable)
      this.voices.forEach(vl => vl.forEach(v => { try { if (v.osc2) v.osc2.type = value; } catch(_){} }));
    if (key === 'wavetable') {
      this.voices.forEach(vl => vl.forEach(v => { try {
        if (!v.osc2) return;
        if (value) {
          const p = this._getWtPartials(this.params.osc2, v.startMs);
          if (p) v.osc2.partials = p;
        } else {
          v.osc2.type = this.params.osc2.type;
        }
      } catch(_){} }));
    }
    if (['wtPos', 'wtScan', 'wtRate', 'wtEnv'].includes(key))
      this._applyWtToVoices('osc2');
  }

  setOsc3(key, value) {
    this.params.osc3[key] = value;
    if (key === 'volume') this.voices.forEach(vl => vl.forEach(v => v.noiseGain?.gain.rampTo(value, 0.05)));
  }

  setFilter(key, value) {
    this.params.filter[key] = value;
    if (key === 'frequency') { this.filter.frequency.rampTo(value, 0.05); this._connectLFO(); }
    else if (key === 'Q')       this.filter.Q.rampTo(value, 0.05);
    else if (key === 'type')    this.filter.type = value;
    else if (key === 'rolloff') this.filter.rolloff = value;
    else if (key === 'enabled') this.filter.type = value ? this.params.filter.type : 'allpass';
  }

  setEnv(key, value) { this.params.env[key] = value; }

  setLFO(key, value) {
    this.params.lfo[key] = value;
    if (key === 'rate') this.lfo.frequency.rampTo(value, 0.05);
    if (key === 'type') this.lfo.type = value;
    this._connectLFO();
  }

  setEffect(effect, key, value) {
    this.params.effects[effect][key] = value;
    const node = this[effect];
    if (!node) return;
    if (key === 'wet') node.wet.rampTo(value, 0.05);
    else if (key === 'enabled') {
      const wet = value ? (this.params.effects[effect].wet || 0.5) : 0;
      node.wet.rampTo(wet, 0.05);
    } else if (effect === 'chorus') {
      if (key === 'rate')  node.frequency.rampTo(value, 0.05);
      if (key === 'depth') node.depth = value;
    } else if (effect === 'delay') {
      if (key === 'time')     node.delayTime.rampTo(value, 0.1);
      if (key === 'feedback') node.feedback.rampTo(value, 0.05);
    } else if (effect === 'reverb') {
      if (key === 'decay') { node.decay = value; node.generate(); }
      if (key === 'tone')  this.reverbTone.frequency.rampTo(value, 0.05);
    }
  }

  setAmp(value) {
    this.params.amp.volume = value;
    this.masterGain.gain.rampTo(value, 0.05);
  }

  setUnison(key, value) { this.params.unison[key] = value; }

  loadPreset(preset) {
    this.allNotesOff();
    this.params = JSON.parse(JSON.stringify(preset));
    // Ensure wavetable fields are clean after preset load
    ['osc1', 'osc2'].forEach(k => {
      this.params[k].wavetable = null;
      this.params[k].wtPos  ??= 0.5;
      this.params[k].wtScan ??= 0;
      this.params[k].wtRate ??= 1;
      this.params[k].wtEnv  ??= 0;
    });
    this.filter.type = this.params.filter.enabled ? this.params.filter.type : 'allpass';
    this.filter.frequency.rampTo(this.params.filter.frequency, 0.05);
    this.filter.Q.rampTo(this.params.filter.Q, 0.05);
    this.filter.rolloff = this.params.filter.rolloff ?? -24;
    this.masterGain.gain.rampTo(this.params.amp.volume, 0.05);
    this.lfo.type = this.params.lfo.type;
    this.lfo.frequency.rampTo(this.params.lfo.rate, 0.05);
    this._connectLFO();
    this.chorus.wet.rampTo(this.params.effects.chorus.enabled ? this.params.effects.chorus.wet : 0, 0.05);
    this.delay.wet.rampTo(this.params.effects.delay.enabled   ? this.params.effects.delay.wet   : 0, 0.05);
    this.reverb.wet.rampTo(this.params.effects.reverb.enabled ? this.params.effects.reverb.wet  : 0, 0.05);
    this.reverbTone.frequency.rampTo(this.params.effects.reverb.tone ?? 20000, 0.05);
  }

  dispose() {
    if (this._wtInterval) clearInterval(this._wtInterval);
    this.allNotesOff();
    try { this.lfo.dispose();        } catch(_) {}
    try { this.filter.dispose();     } catch(_) {}
    try { this.chorus.dispose();     } catch(_) {}
    try { this.delay.dispose();      } catch(_) {}
    try { this.reverb.dispose();     } catch(_) {}
    try { this.reverbTone.dispose(); } catch(_) {}
    try { this.voiceBus.dispose();   } catch(_) {}
    try { this.masterGain.dispose(); } catch(_) {}
  }
}
