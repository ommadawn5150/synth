import * as Tone from 'tone';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES = {
  chromatic:    [0,1,2,3,4,5,6,7,8,9,10,11],
  major:        [0,2,4,5,7,9,11],
  minor:        [0,2,3,5,7,8,10],
  pentatonic:   [0,2,4,7,9],
  blues:        [0,3,5,6,7,10],
  dorian:       [0,2,3,5,7,9,10],
};

export const ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function buildScaleNotes(root, scale, octaveRange = [3, 5]) {
  const rootIdx = NOTE_NAMES.indexOf(root);
  const notes = [];
  for (let oct = octaveRange[0]; oct <= octaveRange[1]; oct++) {
    for (const interval of scale) {
      const noteIdx = (rootIdx + interval) % 12;
      notes.push(`${NOTE_NAMES[noteIdx]}${oct}`);
    }
  }
  return notes;
}

export function defaultStep(note = 'C4') {
  return { active: false, note, velocity: 0.8 };
}

export class SequencerEngine {
  constructor(synthEngine) {
    this.synth = synthEngine;
    this.bpm = 120;
    this.steps = 16;
    this.stepLength = '16n';
    this.currentStep = 0;
    this.playing = false;
    this.onStep = null; // callback(stepIndex)

    Tone.getTransport().bpm.value = this.bpm;

    this._sequence = new Tone.Sequence(
      (time, step) => {
        this.currentStep = step;
        if (this.onStep) {
          Tone.getDraw().schedule(() => this.onStep(step), time);
        }
      },
      Array.from({ length: this.steps }, (_, i) => i),
      this.stepLength
    );
  }

  // Called externally with current step data
  setStepCallback(cb) { this.onStep = cb; }

  // Trigger note at a specific time (called from outside via step data)
  scheduleNote(note, velocity, time) {
    const duration = Tone.Time(this.stepLength).toSeconds() * 0.8;
    this.synth._ensureStarted().then(() => {
      const { osc1, osc2, env: ep } = this.synth.params;

      const voiceOut = new Tone.Gain(velocity).connect(this.synth.voiceBus);
      const envelope = new Tone.AmplitudeEnvelope({
        attack: ep.attack, decay: ep.decay, sustain: ep.sustain, release: ep.release,
      }).connect(voiceOut);

      const freq = Tone.Frequency(note).toFrequency();
      const osc1Gain = new Tone.Gain(osc1.volume).connect(envelope);
      const oscillator1 = new Tone.Oscillator({
        type: osc1.type,
        frequency: freq * Math.pow(2, osc1.octave),
        detune: osc1.detune,
      }).connect(osc1Gain);
      oscillator1.start(time);

      let oscillator2 = null, osc2Gain = null;
      if (osc2.enabled) {
        osc2Gain = new Tone.Gain(osc2.volume).connect(envelope);
        const osc2Freq = freq * Math.pow(2, osc2.octave) * Math.pow(2, osc2.semitone / 12);
        oscillator2 = new Tone.Oscillator({ type: osc2.type, frequency: osc2Freq, detune: osc2.detune }).connect(osc2Gain);
        oscillator2.start(time);
      }

      envelope.triggerAttack(time);
      envelope.triggerRelease(time + duration);

      const cleanupDelay = (duration + ep.release + 0.3) * 1000;
      setTimeout(() => {
        try { oscillator1.stop(); oscillator1.dispose(); } catch(_) {}
        try { oscillator2?.stop(); oscillator2?.dispose(); } catch(_) {}
        try { envelope.dispose(); } catch(_) {}
        try { osc1Gain.dispose(); } catch(_) {}
        try { osc2Gain?.dispose(); } catch(_) {}
        try { voiceOut.dispose(); } catch(_) {}
      }, cleanupDelay);
    });
  }

  async start(stepData) {
    await Tone.start();
    this._stepData = stepData;

    // Re-create sequence with note scheduling
    this._sequence.callback = (time, step) => {
      this.currentStep = step;
      const s = this._stepData[step];
      if (s?.active && s.note) {
        this.scheduleNote(s.note, s.velocity ?? 0.8, time);
      }
      if (this.onStep) {
        Tone.getDraw().schedule(() => this.onStep(step), time);
      }
    };

    this._sequence.start(0);
    Tone.getTransport().start();
    this.playing = true;
  }

  stop() {
    this._sequence.stop();
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.currentStep = 0;
    this.playing = false;
    if (this.onStep) this.onStep(-1);
  }

  updateStepData(stepData) {
    this._stepData = stepData;
  }

  setBPM(bpm) {
    this.bpm = bpm;
    Tone.getTransport().bpm.rampTo(bpm, 0.1);
  }

  setStepCount(count) {
    const wasPlaying = this.playing;
    if (wasPlaying) this.stop();
    this.steps = count;
    this._sequence.dispose();
    this._sequence = new Tone.Sequence(
      (time, step) => {
        this.currentStep = step;
        const s = this._stepData?.[step];
        if (s?.active && s.note) this.scheduleNote(s.note, s.velocity ?? 0.8, time);
        if (this.onStep) Tone.getDraw().schedule(() => this.onStep(step), time);
      },
      Array.from({ length: count }, (_, i) => i),
      this.stepLength
    );
  }

  dispose() {
    this.stop();
    try { this._sequence.dispose(); } catch(_) {}
  }
}

export { buildScaleNotes };
