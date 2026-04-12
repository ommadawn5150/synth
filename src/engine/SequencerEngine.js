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
      (time, step) => this._tick(time, step),
      Array.from({ length: this.steps }, (_, i) => i),
      this.stepLength
    );
  }

  _tick(time, step) {
    this.currentStep = step;
    const s = this._stepData?.[step];
    if (s?.active && s.note) {
      this.synth.triggerNote(s.note, time, s.velocity ?? 0.8);
    }
    if (this.onStep) {
      Tone.getDraw().schedule(() => this.onStep(step), time);
    }
  }

  setStepCallback(cb) { this.onStep = cb; }

  async start(stepData) {
    await Tone.start();
    this._stepData = stepData;
    this._sequence.callback = (time, step) => this._tick(time, step);
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
      (time, step) => this._tick(time, step),
      Array.from({ length: count }, (_, i) => i),
      this.stepLength
    );
    if (wasPlaying) this.start(this._stepData);
  }

  dispose() {
    this.stop();
    try { this._sequence.dispose(); } catch(_) {}
  }
}

export { buildScaleNotes };
