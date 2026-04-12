import { useState } from 'react';
import { useSynth } from '../../contexts/SynthContext';
import { SCALES, ROOTS } from '../../engine/SequencerEngine';
import './Sequencer.css';

const STEP_COUNTS = [8, 16, 32];

export function Sequencer() {
  const {
    seq, scaleNotes,
    seqToggle, setSeqBPM, setSeqStep, setSeqStepCount, setSeqScale,
  } = useSynth();

  const [notePickerIdx, setNotePickerIdx] = useState(null);

  function handleStepClick(i) {
    setSeqStep(i, { active: !seq.steps[i].active });
  }

  function handleStepRightClick(e, i) {
    e.preventDefault();
    setNotePickerIdx(notePickerIdx === i ? null : i);
  }

  function handleNoteSelect(i, note) {
    setSeqStep(i, { note, active: true });
    setNotePickerIdx(null);
  }

  return (
    <div className="sequencer synth-section">
      {/* Transport controls */}
      <div className="seq-controls">
        <button
          className={`seq-play-btn ${seq.playing ? 'playing' : ''}`}
          onClick={seqToggle}
        >
          {seq.playing ? '■' : '▶'}
        </button>

        <div className="seq-bpm">
          <span className="seq-label">BPM</span>
          <input
            type="range"
            min={40}
            max={240}
            value={seq.bpm}
            onChange={e => setSeqBPM(Number(e.target.value))}
            className="seq-slider"
          />
          <span className="seq-bpm-val">{seq.bpm}</span>
        </div>

        <div className="seq-steps-control">
          <span className="seq-label">Steps</span>
          {STEP_COUNTS.map(n => (
            <button
              key={n}
              className={`seq-count-btn ${seq.stepCount === n ? 'active' : ''}`}
              onClick={() => setSeqStepCount(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="seq-scale-control">
          <span className="seq-label">Root</span>
          <select
            className="seq-select"
            value={seq.root}
            onChange={e => setSeqScale(e.target.value, seq.scale)}
          >
            {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="seq-label">Scale</span>
          <select
            className="seq-select"
            value={seq.scale}
            onChange={e => setSeqScale(seq.root, e.target.value)}
          >
            {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Step grid */}
      <div className="seq-grid" style={{ '--step-count': seq.stepCount }}>
        {seq.steps.slice(0, seq.stepCount).map((step, i) => (
          <div key={i} className="seq-step-wrapper">
            <button
              className={[
                'seq-step',
                step.active ? 'active' : '',
                seq.currentStep === i ? 'current' : '',
                i % 4 === 0 ? 'beat' : '',
              ].join(' ')}
              onClick={() => handleStepClick(i)}
              onContextMenu={e => handleStepRightClick(e, i)}
            >
              <span className="seq-step-note">{step.active ? step.note : ''}</span>
            </button>

            {notePickerIdx === i && (
              <div className="note-picker">
                {scaleNotes.map(n => (
                  <button
                    key={n}
                    className={`note-picker-btn ${step.note === n ? 'active' : ''}`}
                    onClick={() => handleNoteSelect(i, n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="seq-hint">Left click: on/off &nbsp;·&nbsp; Right click: select note</div>
    </div>
  );
}
