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
    seqPresets, currentSeqPresetId, saveSeqPreset, overwriteSeqPreset, loadSeqPreset, deleteSeqPreset,
  } = useSynth();

  const [collapsed, setCollapsed] = useState(false);
  const [notePickerIdx, setNotePickerIdx] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);
  const pickerRef = useRef(null);
  const saveInputRef = useRef(null);

  // Close note picker when clicking outside
  useEffect(() => {
    if (notePickerIdx === null) return;
    const onPointerDown = (e) => {
      if (!pickerRef.current?.contains(e.target)) setNotePickerIdx(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [notePickerIdx]);

  // Focus save input when it appears
  useEffect(() => {
    if (showSaveInput) saveInputRef.current?.focus();
  }, [showSaveInput]);

  // ── Step interactions ──────────────────────────────────────────
  function openPicker(i) {
    setNotePickerIdx(prev => prev === i ? null : i);
  }

  function handleClick(i) {
    if (didLongPress.current) { didLongPress.current = false; return; }
    setSeqStep(i, { active: !seq.steps[i].active });
  }

  function handleContextMenu(e, i) {
    e.preventDefault();
    openPicker(i);
  }

  function handleTouchStart(e, i) {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      openPicker(i);
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

  // ── Preset interactions ────────────────────────────────────────
  function handleSave(e) {
    e.preventDefault();
    const name = saveName.trim();
    if (!name) return;
    saveSeqPreset(name);
    setSaveName('');
    setShowSaveInput(false);
  }

  return (
    <div className={`sequencer synth-section ${collapsed ? 'seq-collapsed' : ''}`}>
      {/* Transport controls */}
      <div className="seq-controls">
        <button
          className={`seq-play-btn ${seq.playing ? 'playing' : ''}`}
          onClick={seqToggle}
        >
          {seq.playing ? '■' : '▶'}
        </button>

        {!collapsed && <>
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
        </>}

        <button
          className="seq-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'シーケンサーを表示' : 'シーケンサーを非表示'}
        >
          {collapsed ? '▲ SEQ' : '▼'}
        </button>
      </div>

      {/* Step grid */}
      {!collapsed && <div className="seq-grid" style={{ '--step-count': seq.stepCount }}>
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
      </div>}

      {/* Note picker */}
      {!collapsed && notePickerIdx !== null && (
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

      {/* Preset bar */}
      {!collapsed && <div className="seq-preset-bar">
        <span className="seq-label">PRESETS</span>
        <div className="seq-preset-list">
          {seqPresets.map(p => (
            <span key={p.id} className="seq-preset-item">
              <button
                className={`seq-preset-btn ${p.id === currentSeqPresetId ? 'active' : ''}`}
                onClick={() => loadSeqPreset(p)}
              >{p.name}</button>
              <button className="seq-preset-del" onClick={() => deleteSeqPreset(p.id)}>×</button>
            </span>
          ))}
        </div>
        {currentSeqPresetId && (
          <button className="seq-count-btn seq-overwrite-btn" onClick={overwriteSeqPreset}>↺</button>
        )}
        {showSaveInput ? (
          <form className="seq-save-form" onSubmit={handleSave}>
            <input
              ref={saveInputRef}
              className="seq-save-input"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="preset name"
              maxLength={24}
            />
            <button type="submit" className="seq-count-btn active" disabled={!saveName.trim()}>Save</button>
            <button type="button" className="seq-count-btn" onClick={() => { setShowSaveInput(false); setSaveName(''); }}>×</button>
          </form>
        ) : (
          <button className="seq-count-btn" onClick={() => setShowSaveInput(true)}>+ Save</button>
        )}
      </div>}

      {!collapsed && <div className="seq-hint">
        Tap: on/off &nbsp;·&nbsp; Long press / ✎ / Right-click: select note
      </div>}
    </div>
  );
}
