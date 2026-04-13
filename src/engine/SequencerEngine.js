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

export const DIRECTIONS = ['forward', 'backward', 'pingpong', 'random'];
export const DIRECTION_ICONS = { forward: '→', backward: '←', pingpong: '↔', random: '??' };

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
  return { active: false, note, velocity: 0.8, prob: 100 };
}

// Euclidean (Bresenham) rhythm: distributes `beats` onsets across `steps` as evenly as possible
export function euclideanRhythm(beats, steps) {
  if (beats <= 0) return Array(steps).fill(false);
  if (beats >= steps) return Array(steps).fill(true);
  return Array.from({ length: steps }, (_, i) => ((i * beats) % steps) < beats);
}

export class SequencerEngine {
  constructor(synthEngine) {
    this.synth = synthEngine;
    this.bpm = 120;
    this.steps = 16;
    this.stepLength = '16n';
    this.currentStep = 0;
    this.playing = false;
    this._stepData = null;
    this.onStep = null;
    this.direction = 'forward';
    this._pingpongDir = 1;
    this._seqId = null;

    Tone.getTransport().bpm.value = this.bpm;
  }

  _tick(time) {
    const step = this.currentStep;
    const s = this._stepData?.[step];
    if (s?.active && s.note) {
      const prob = (s.prob ?? 100) / 100;
      if (Math.random() < prob) {
        this.synth.triggerNote(s.note, time, s.velocity ?? 0.8);
      }
    }
    if (this.onStep) {
      Tone.getDraw().schedule(() => this.onStep(step), time);
    }
    this._advanceStep();
  }

  _advanceStep() {
    const n = this.steps;
    switch (this.direction) {
      case 'backward':
        this.currentStep = (this.currentStep - 1 + n) % n;
        break;
      case 'pingpong':
        this.currentStep += this._pingpongDir;
        if (this.currentStep >= n - 1) { this.currentStep = n - 1; this._pingpongDir = -1; }
        else if (this.currentStep <= 0) { this.currentStep = 0; this._pingpongDir = 1; }
        break;
      case 'random':
        this.currentStep = Math.floor(Math.random() * n);
        break;
      default: // forward
        this.currentStep = (this.currentStep + 1) % n;
    }
  }

  _resetStep() {
    this._pingpongDir = 1;
    switch (this.direction) {
      case 'backward':  this.currentStep = this.steps - 1; break;
      case 'random':    this.currentStep = Math.floor(Math.random() * this.steps); break;
      default:          this.currentStep = 0;
    }
  }

  setStepCallback(cb) { this.onStep = cb; }

  async start() {
    await Tone.start();
    // Clear any existing repeat event
    if (this._seqId !== null) {
      Tone.getTransport().clear(this._seqId);
      this._seqId = null;
    }
    this._resetStep();
    this._seqId = Tone.getTransport().scheduleRepeat(
      (time) => this._tick(time),
      this.stepLength
    );
    Tone.getTransport().start();
    this.playing = true;
  }

  stop() {
    if (this._seqId !== null) {
      Tone.getTransport().clear(this._seqId);
      this._seqId = null;
    }
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

  setDirection(dir) {
    this.direction = dir;
    if (dir === 'pingpong') this._pingpongDir = 1;
  }

  setStepCount(count) {
    if (this.playing) this.stop();
    this.steps = count;
  }

  dispose() {
    this.stop();
  }
}

export { buildScaleNotes };
