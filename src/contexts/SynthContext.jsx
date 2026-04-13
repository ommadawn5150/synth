import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { SynthEngine } from '../engine/SynthEngine';
import { SequencerEngine, buildScaleNotes, SCALES, ROOTS, defaultStep } from '../engine/SequencerEngine';
import { PRESETS } from '../presets/presets';

const SynthContext = createContext(null);

// Default sequencer state has a simple audible pattern so the play button
// produces sound immediately, without needing to load a preset first.
const INIT_PATTERN = [
  { active: true,  note: 'C4', velocity: 0.8 },
  { active: false, note: 'C4', velocity: 0.8 },
  { active: true,  note: 'E4', velocity: 0.8 },
  { active: false, note: 'E4', velocity: 0.8 },
  { active: true,  note: 'G4', velocity: 0.8 },
  { active: false, note: 'G4', velocity: 0.8 },
  { active: true,  note: 'E4', velocity: 0.8 },
  { active: false, note: 'E4', velocity: 0.8 },
  { active: true,  note: 'C4', velocity: 0.8 },
  { active: false, note: 'C4', velocity: 0.8 },
  { active: true,  note: 'G4', velocity: 0.8 },
  { active: false, note: 'G4', velocity: 0.8 },
  { active: true,  note: 'A4', velocity: 0.8 },
  { active: false, note: 'A4', velocity: 0.8 },
  { active: true,  note: 'G4', velocity: 0.8 },
  { active: false, note: 'G4', velocity: 0.8 },
];

const DEFAULT_SEQ = {
  bpm: 120,
  steps: INIT_PATTERN,
  root: 'C',
  scale: 'minor',
  stepCount: 16,
  playing: false,
  currentStep: -1,
};

export function SynthProvider({ children }) {
  const engineRef = useRef(null);
  const seqEngineRef = useRef(null);
  const [params, setParams] = useState(() => JSON.parse(JSON.stringify(PRESETS[0])));
  const [currentPreset, setCurrentPreset] = useState('init');
  const [customPresets, setCustomPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('synth_presets') || '[]'); }
    catch { return []; }
  });
  const [seq, setSeq] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SEQ)));
  const [seqPresets, setSeqPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('synth_seq_presets') || '[]'); }
    catch { return []; }
  });
  const [currentSeqPresetId, setCurrentSeqPresetId] = useState(null);
  // Visual samples for 3D wavetable display (persists across tab navigation)
  const [wtDisplaySamples, setWtDisplaySamples] = useState({ osc1: null, osc2: null });

  useEffect(() => {
    const engine = new SynthEngine();
    engineRef.current = engine;
    const seqEngine = new SequencerEngine(engine);
    seqEngineRef.current = seqEngine;

    // Sync initial step data to engine
    seqEngine.updateStepData(DEFAULT_SEQ.steps);

    seqEngine.setStepCallback((step) => {
      setSeq(prev => ({ ...prev, currentStep: step }));
    });

    return () => {
      seqEngine.dispose();
      engine.dispose();
    };
  }, []);

  function updateParam(section, key, value) {
    setParams(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    const engine = engineRef.current;
    if (!engine) return;
    if (section === 'osc1')        engine.setOsc1(key, value);
    else if (section === 'osc2')   engine.setOsc2(key, value);
    else if (section === 'filter') engine.setFilter(key, value);
    else if (section === 'env')    engine.setEnv(key, value);
    else if (section === 'lfo')    engine.setLFO(key, value);
    else if (section === 'unison') engine.setUnison(key, value);
    else if (section === 'osc3')   engine.setOsc3(key, value);
    else if (section === 'amp')    engine.setAmp(value);
  }

  function updateEffect(effect, key, value) {
    setParams(prev => ({
      ...prev,
      effects: { ...prev.effects, [effect]: { ...prev.effects[effect], [key]: value } },
    }));
    engineRef.current?.setEffect(effect, key, value);
  }

  function loadPreset(preset) {
    setParams(JSON.parse(JSON.stringify(preset)));
    setCurrentPreset(preset.id);
    engineRef.current?.loadPreset(preset);
    setWtDisplaySamples({ osc1: null, osc2: null });
  }

  function savePreset(name) {
    const engine = engineRef.current;
    if (!engine) return;
    const newPreset = { ...JSON.parse(JSON.stringify(engine.params)), id: `user_${Date.now()}`, name };
    const updated = [...customPresets.filter(p => p.name !== name), newPreset];
    setCustomPresets(updated);
    localStorage.setItem('synth_presets', JSON.stringify(updated));
  }

  function deleteCustomPreset(id) {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('synth_presets', JSON.stringify(updated));
  }

  function noteOn(note)  { engineRef.current?.noteOn(note); }
  function noteOff(note) { engineRef.current?.noteOff(note); }
  function getWtDisplayPos(oscKey) { return engineRef.current?.getWtDisplayPos(oscKey) ?? 0.5; }

  // ── Sequencer ────────────────────────────────────────────────────
  function seqPlay() {
    const se = seqEngineRef.current;
    // Guard: don't double-start. Use engine's playing flag (sync) not React state.
    if (!se || se.playing) return;
    se.setBPM(seq.bpm);
    // Always sync latest React steps to engine before starting
    se.updateStepData(seq.steps);
    se.start().then(() => setSeq(prev => ({ ...prev, playing: true })));
  }

  function seqStop() {
    seqEngineRef.current?.stop();
    setSeq(prev => ({ ...prev, playing: false, currentStep: -1 }));
  }

  function seqToggle() {
    const se = seqEngineRef.current;
    if (!se) return;
    // Use engine's playing flag as source of truth to avoid stale React state
    if (se.playing) seqStop(); else seqPlay();
  }

  function setSeqBPM(bpm) {
    setSeq(prev => ({ ...prev, bpm }));
    seqEngineRef.current?.setBPM(bpm);
  }

  function setSeqStep(index, patch) {
    setSeq(prev => {
      const steps = prev.steps.map((s, i) => i === index ? { ...s, ...patch } : s);
      seqEngineRef.current?.updateStepData(steps);
      return { ...prev, steps };
    });
  }

  function setSeqStepCount(count) {
    const se = seqEngineRef.current;
    const wasPlaying = se?.playing ?? false;

    setSeq(prev => {
      const steps = Array.from({ length: count }, (_, i) => prev.steps[i] ?? defaultStep());
      // Update engine step data inside updater so it's computed from prev state
      se?.updateStepData(steps);
      return { ...prev, stepCount: count, steps };
    });

    // setStepCount stops if playing and rebuilds the sequence
    se?.setStepCount(count);

    // Restart playback with the new sequence if it was playing
    if (wasPlaying) {
      se?.start().then(() => setSeq(prev => ({ ...prev, playing: true })));
    }
  }

  function setSeqScale(root, scale) {
    setSeq(prev => ({ ...prev, root, scale }));
  }

  function saveSeqPreset(name) {
    const preset = {
      id: `seq_${Date.now()}`,
      name,
      bpm: seq.bpm,
      stepCount: seq.stepCount,
      steps: JSON.parse(JSON.stringify(seq.steps)),
      root: seq.root,
      scale: seq.scale,
    };
    const updated = [...seqPresets.filter(p => p.name !== name), preset];
    setSeqPresets(updated);
    setCurrentSeqPresetId(preset.id);
    localStorage.setItem('synth_seq_presets', JSON.stringify(updated));
  }

  function overwriteSeqPreset() {
    if (!currentSeqPresetId) return;
    const existing = seqPresets.find(p => p.id === currentSeqPresetId);
    if (!existing) return;
    const preset = {
      ...existing,
      bpm: seq.bpm,
      stepCount: seq.stepCount,
      steps: JSON.parse(JSON.stringify(seq.steps)),
      root: seq.root,
      scale: seq.scale,
    };
    const updated = seqPresets.map(p => p.id === currentSeqPresetId ? preset : p);
    setSeqPresets(updated);
    localStorage.setItem('synth_seq_presets', JSON.stringify(updated));
  }

  function loadSeqPreset(preset) {
    const se = seqEngineRef.current;
    const steps = Array.from({ length: preset.stepCount }, (_, i) => preset.steps[i] ?? defaultStep());

    // Stop playback first to avoid race with setStepCount's internal stop
    if (se?.playing) se.stop();

    se?.setBPM(preset.bpm);
    // setStepCount rebuilds the sequence; does NOT auto-restart
    se?.setStepCount(preset.stepCount);
    // updateStepData sets the correct steps AFTER the sequence is rebuilt
    se?.updateStepData(steps);

    setCurrentSeqPresetId(preset.id);
    setSeq(prev => ({
      ...prev,
      bpm: preset.bpm,
      stepCount: preset.stepCount,
      steps,
      root: preset.root,
      scale: preset.scale,
      playing: false,
      currentStep: -1,
    }));
  }

  function deleteSeqPreset(id) {
    const updated = seqPresets.filter(p => p.id !== id);
    setSeqPresets(updated);
    if (id === currentSeqPresetId) setCurrentSeqPresetId(null);
    localStorage.setItem('synth_seq_presets', JSON.stringify(updated));
  }

  const scaleNotes = buildScaleNotes(seq.root, SCALES[seq.scale] || SCALES.minor);

  return (
    <SynthContext.Provider value={{
      params, currentPreset, customPresets,
      updateParam, updateEffect, loadPreset, savePreset, deleteCustomPreset,
      noteOn, noteOff, getWtDisplayPos,
      wtDisplaySamples, setWtDisplaySamples,
      seq, scaleNotes,
      seqToggle, seqStop, setSeqBPM, setSeqStep, setSeqStepCount, setSeqScale,
      seqPresets, currentSeqPresetId, saveSeqPreset, overwriteSeqPreset, loadSeqPreset, deleteSeqPreset,
    }}>
      {children}
    </SynthContext.Provider>
  );
}

export function useSynth() { return useContext(SynthContext); }
