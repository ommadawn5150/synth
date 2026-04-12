import { useState, useRef, useEffect } from 'react';
import { useSynth } from '../../contexts/SynthContext';
import { SCALES, ROOTS } from '../../engine/SequencerEngine';
import './Sequencer.css';

const STEP_COUNTS = [8, 16, 32];
const LONG_PRESS_MS = 400;

export function Sequencer() {
  const {
    seq, scaleNotes,
    seqToggle, setSeqBPM, setSeqStep, setSeqStepCount, setSeqScale,
  } = useSynth();

  const [notePickerIdx, setNotePickerIdx] = useState(null);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (notePickerIdx === null) return;
    const onPointerDown = (e) => {
      if (!pickerRef.current?.contains(e.target)) setNotePickerIdx(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [notePickerIdx]);

  // ── Step interactions ──────────────────────────────────────────
  function openPicker(i) {
    setNotePickerIdx(prev => prev === i ? null : i);
  }

  // Desktop: click = toggle, right-click = note picker
  function handleClick(i) {
    if (didLongPress.current) { didLongPress.current = false; return; }
    setSeqStep(i, { active: !seq.steps[i].active });
  }

  function handleContextMenu(e, i) {
    e.preventDefault();
    openPicker(i);
  }

  // Mobile: touchstart starts long-press timer
  function handleTouchStart(e, i) {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      openPicker(i);
      // Light haptic feedback if available
      navigator.vibrate?.(30);
    }, LONG_PRESS_MS);
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current);
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
            type="range" min={40} max={240} value={seq.bpm}
            onChange={e => setSeqBPM(Number(e.target.value))}
            className="seq-slider"
          />
          <span className="seq-bpm-val">{seq.bpm}</span>
        </div>

        <div className="seq-steps-control">
          <span className="seq-label">Steps</span>
          {STEP_COUNTS.map(n => (
            <button key={n}
              className={`seq-count-btn ${seq.stepCount === n ? 'active' : ''}`}
              onClick={() => setSeqStepCount(n)}
            >{n}</button>
          ))}
        </div>

        <div className="seq-scale-control">
          <span className="seq-label">Root</span>
          <select className="seq-select" value={seq.root}
            onChange={e => setSeqScale(e.target.value, seq.scale)}>
            {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="seq-label">Scale</span>
          <select className="seq-select" value={seq.scale}
            onChange={e => setSeqScale(seq.root, e.target.value)}>
            {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Step grid */}
      <div className="seq-grid" style={{ '--step-count': seq.stepCount }}>
        {seq.steps.slice(0, seq.stepCount).map((step, i) => (
          <button
            key={i}
            className={[
              'seq-step',
              step.active ? 'active' : '',
              seq.currentStep === i ? 'current' : '',
              i % 4 === 0 ? 'beat' : '',
              notePickerIdx === i ? 'editing' : '',
            ].join(' ')}
            onClick={() => handleClick(i)}
            onContextMenu={e => handleContextMenu(e, i)}
            onTouchStart={e => handleTouchStart(e, i)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            <span className="seq-step-note">{step.active ? step.note : ''}</span>
            {step.active && (
              <span className="seq-step-edit" onPointerDown={e => { e.stopPropagation(); openPicker(i); }}>
                ✎
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Note picker — inline below grid, full width */}
      {notePickerIdx !== null && (
        <div className="note-picker-bar" ref={pickerRef}>
          <span className="note-picker-label">Step {notePickerIdx + 1}</span>
          <div className="note-picker-notes">
            {scaleNotes.map(n => (
              <button
                key={n}
                className={`note-pill ${seq.steps[notePickerIdx]?.note === n ? 'active' : ''}`}
                onClick={() => handleNoteSelect(notePickerIdx, n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="note-picker-close" onClick={() => setNotePickerIdx(null)}>×</button>
        </div>
      )}

      <div className="seq-hint">
        Tap: on/off &nbsp;·&nbsp; Long press / ✎ / Right-click: select note
      </div>
    </div>
  );
}
