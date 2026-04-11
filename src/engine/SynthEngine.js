import * as Tone from 'tone';

const UNISON_DETUNE_SPREADS = {
  1: [0],
  2: [-10, 10],
  3: [-15, 0, 15],
  4: [-20, -7, 7, 20],
  7: [-30, -20, -10, 0, 10, 20, 30],
};

export class SynthEngine {
  constructor() {
    this.voices = new Map(); // note -> [voice objects]
    this.params = this._defaultParams();
    this._buildChain();
  }

  _defaultParams() {
    return {
      osc1: { type: 'sawtooth', octave: 0, detune: 0, volume: 0.8 },
      osc2: { type: 'square', octave: 0, semitone: 7, detune: 0, volume: 0.3, enabled: true },
      unison: { voices: 1, spread: 15, width: 0.5 },
      filter: { type: 'lowpass', frequency: 2000, Q: 1 },
      env: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4 },
      lfo: { type: 'sine', rate: 2, depth: 0, destination: 'filter' },
      effects: {
        chorus: { rate: 1.5, depth: 0.5, wet: 0 },
        delay: { time: '8n', feedback: 0.3, wet: 0 },
        reverb: { decay: 2.5, wet: 0 },
      },
      amp: { volume: 0.75 },
    };
  }

  _buildChain() {
    // Master gain
    this.masterGain = new Tone.Gain(this.params.amp.volume).toDestination();

    // Effects
    this.reverb = new Tone.Reverb({
      decay: this.params.effects.reverb.decay,
      wet: this.params.effects.reverb.wet,
    });
    this.delay = new Tone.FeedbackDelay({
      delayTime: this.params.effects.delay.time,
      feedback: this.params.effects.delay.feedback,
      wet: this.params.effects.delay.wet,
    });
    this.chorus = new Tone.Chorus({
      rate: this.params.effects.chorus.rate,
      depth: this.params.effects.chorus.depth,
      wet: this.params.effects.chorus.wet,
    }).start();

    // Effects chain: chorus -> delay -> reverb -> master
    this.chorus.connect(this.delay);
    this.delay.connect(this.reverb);
    this.reverb.connect(this.masterGain);

    // Filter
    this.filter = new Tone.Filter({
      type: this.params.filter.type,
      frequency: this.params.filter.frequency,
      Q: this.params.filter.Q,
    }).connect(this.chorus);

    // LFO
    this.lfo = new Tone.LFO({
      type: this.params.lfo.type,
      frequency: this.params.lfo.rate,
      min: 0,
      max: this.params.lfo.depth,
    }).start();
    this._connectLFO();

    // Voice gain bus (all voices feed here)
    this.voiceBus = new Tone.Gain(1).connect(this.filter);
  }

  _connectLFO() {
    if (this._lfoConnection) {
      this._lfoConnection.dispose();
      this._lfoConnection = null;
    }
    const dest = this.params.lfo.destination;
    const depth = this.params.lfo.depth;

    if (dest === 'filter') {
      const baseFreq = this.params.filter.frequency;
      this.lfo.min = 0;
      this.lfo.max = baseFreq * depth * 2;
      this._lfoConnection = this.lfo.connect(this.filter.frequency);
    } else if (dest === 'amp') {
      this.lfo.min = 0;
      this.lfo.max = depth;
    }
    // pitch LFO handled per-voice
  }

  // ─── Note On/Off ────────────────────────────────────────────────
  noteOn(note) {
    if (this.voices.has(note)) this.noteOff(note);

    Tone.start();

    const unisonCount = this.params.unison.voices;
    const spread = this.params.unison.spread;
    const detuneOffsets = UNISON_DETUNE_SPREADS[unisonCount] || [0];
    const voiceList = [];

    detuneOffsets.forEach((spreadOffset) => {
      const voice = this._createVoice(note, spreadOffset * spread / 15);
      voiceList.push(voice);
    });

    this.voices.set(note, voiceList);
  }

  noteOff(note) {
    const voiceList = this.voices.get(note);
    if (!voiceList) return;
    voiceList.forEach((v) => {
      v.env.triggerRelease();
      const releaseTime = this.params.env.release;
      setTimeout(() => {
        try {
          v.osc1.stop().dispose();
          v.osc2?.stop().dispose();
          v.env.dispose();
          v.osc1Gain.dispose();
          v.osc2Gain?.dispose();
        } catch (_) {}
      }, (releaseTime + 0.2) * 1000);
    });
    this.voices.delete(note);
  }

  _createVoice(note, detuneOffset) {
    const freq = Tone.Frequency(note).toFrequency();
    const { osc1, osc2, env: envParams } = this.params;

    const voiceOut = new Tone.Gain(1).connect(this.voiceBus);

    // Envelope
    const envelope = new Tone.AmplitudeEnvelope({
      attack: envParams.attack,
      decay: envParams.decay,
      sustain: envParams.sustain,
      release: envParams.release,
    }).connect(voiceOut);

    // OSC1
    const osc1Gain = new Tone.Gain(osc1.volume).connect(envelope);
    const oscillator1 = new Tone.Oscillator({
      type: osc1.type,
      frequency: freq * Math.pow(2, osc1.octave),
      detune: osc1.detune + detuneOffset,
    }).connect(osc1Gain);

    // LFO pitch connection
    if (this.params.lfo.destination === 'pitch') {
      const pitchLfo = new Tone.LFO({
        type: this.params.lfo.type,
        frequency: this.params.lfo.rate,
        min: -this.params.lfo.depth * 100,
        max: this.params.lfo.depth * 100,
      }).start().connect(oscillator1.detune);
      // store for cleanup
      oscillator1._pitchLfo = pitchLfo;
    }

    oscillator1.start();

    // OSC2
    let oscillator2 = null;
    let osc2Gain = null;
    if (osc2.enabled) {
      osc2Gain = new Tone.Gain(osc2.volume).connect(envelope);
      const osc2Freq = freq * Math.pow(2, osc2.octave) * Math.pow(2, osc2.semitone / 12);
      oscillator2 = new Tone.Oscillator({
        type: osc2.type,
        frequency: osc2Freq,
        detune: osc2.detune + detuneOffset,
      }).connect(osc2Gain);
      oscillator2.start();
    }

    envelope.triggerAttack();

    return { osc1: oscillator1, osc2: oscillator2, env: envelope, osc1Gain, osc2Gain };
  }

  allNotesOff() {
    this.voices.forEach((_, note) => this.noteOff(note));
  }

  // ─── Parameter Setters ────────────────────────────────────────────
  setOsc1(key, value) {
    this.params.osc1[key] = value;
    if (key === 'volume') {
      this.voices.forEach((voiceList) =>
        voiceList.forEach((v) => v.osc1Gain?.gain.rampTo(value, 0.05))
      );
    }
    if (key === 'type') {
      this.voices.forEach((voiceList) =>
        voiceList.forEach((v) => { try { v.osc1.type = value; } catch (_) {} })
      );
    }
  }

  setOsc2(key, value) {
    this.params.osc2[key] = value;
    if (key === 'volume') {
      this.voices.forEach((voiceList) =>
        voiceList.forEach((v) => v.osc2Gain?.gain.rampTo(value, 0.05))
      );
    }
    if (key === 'type') {
      this.voices.forEach((voiceList) =>
        voiceList.forEach((v) => { try { if (v.osc2) v.osc2.type = value; } catch (_) {} })
      );
    }
  }

  setFilter(key, value) {
    this.params.filter[key] = value;
    if (key === 'frequency') this.filter.frequency.rampTo(value, 0.05);
    else if (key === 'Q') this.filter.Q.rampTo(value, 0.05);
    else if (key === 'type') this.filter.type = value;
    if (key === 'frequency') this._connectLFO();
  }

  setEnv(key, value) {
    this.params.env[key] = value;
  }

  setLFO(key, value) {
    this.params.lfo[key] = value;
    if (key === 'rate') this.lfo.frequency.rampTo(value, 0.05);
    if (key === 'depth' || key === 'destination') this._connectLFO();
    if (key === 'type') this.lfo.type = value;
  }

  setEffect(effect, key, value) {
    this.params.effects[effect][key] = value;
    const node = this[effect];
    if (!node) return;
    if (key === 'wet') node.wet.rampTo(value, 0.05);
    else if (effect === 'chorus') {
      if (key === 'rate') node.frequency.rampTo(value, 0.05);
      if (key === 'depth') node.depth = value;
    } else if (effect === 'delay') {
      if (key === 'time') node.delayTime.rampTo(Tone.Time(value).toSeconds(), 0.05);
      if (key === 'feedback') node.feedback.rampTo(value, 0.05);
    } else if (effect === 'reverb') {
      if (key === 'decay') node.decay = value;
    }
  }

  setAmp(value) {
    this.params.amp.volume = value;
    this.masterGain.gain.rampTo(value, 0.05);
  }

  setUnison(key, value) {
    this.params.unison[key] = value;
  }

  loadPreset(preset) {
    this.allNotesOff();
    this.params = { ...this._defaultParams(), ...preset };

    this.filter.type = this.params.filter.type;
    this.filter.frequency.rampTo(this.params.filter.frequency, 0.05);
    this.filter.Q.rampTo(this.params.filter.Q, 0.05);

    this.masterGain.gain.rampTo(this.params.amp.volume, 0.05);

    this.lfo.type = this.params.lfo.type;
    this.lfo.frequency.rampTo(this.params.lfo.rate, 0.05);
    this._connectLFO();

    this.chorus.wet.rampTo(this.params.effects.chorus.wet, 0.05);
    this.delay.wet.rampTo(this.params.effects.delay.wet, 0.05);
    this.reverb.wet.rampTo(this.params.effects.reverb.wet, 0.05);
  }

  dispose() {
    this.allNotesOff();
    this.lfo.dispose();
    this.filter.dispose();
    this.chorus.dispose();
    this.delay.dispose();
    this.reverb.dispose();
    this.masterGain.dispose();
  }
}
