import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { SynthEngine } from '../engine/SynthEngine';
import { SequencerEngine, buildScaleNotes, SCALES, ROOTS, defaultStep } from '../engine/SequencerEngine';
import { PRESETS } from '../presets/presets';

const SynthContext = createContext(null);

const DEFAULT_SEQ = {
  bpm: 120,
  steps: Array.from({ length: 16 }, (_, i) => defaultStep(i % 4 === 0 ? 'C4' : 'E4')),
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

  useEffect(() => {
    const engine = new SynthEngine();
    engineRef.current = engine;
    const seqEngine = new SequencerEngine(engine);
    seqEngineRef.current = seqEngine;

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
    if (section === 'osc1')   engine.setOsc1(key, value);
    else if (section === 'osc2')   engine.setOsc2(key, value);
    else if (section === 'filter') engine.setFilter(key, value);
    else if (section === 'env')    engine.setEnv(key, value);
    else if (section === 'lfo')    engine.setLFO(key, value);
    else if (section === 'unison') engine.setUnison(key, value);
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

  // ── Sequencer ────────────────────────────────────────────────────
  function seqPlay() {
    const se = seqEngineRef.current;
    if (!se) return;
    se.setBPM(seq.bpm);
    se.start(seq.steps).then(() => setSeq(prev => ({ ...prev, playing: true })));
  }

  function seqStop() {
    seqEngineRef.current?.stop();
    setSeq(prev => ({ ...prev, playing: false, currentStep: -1 }));
  }

  function seqToggle() {
    if (seq.playing) seqStop(); else seqPlay();
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
    setSeq(prev => {
      const steps = Array.from({ length: count }, (_, i) => prev.steps[i] ?? defaultStep());
      return { ...prev, stepCount: count, steps };
    });
    seqEngineRef.current?.setStepCount(count);
  }

  function setSeqScale(root, scale) {
    setSeq(prev => ({ ...prev, root, scale }));
  }

  const scaleNotes = buildScaleNotes(seq.root, SCALES[seq.scale] || SCALES.minor);

  return (
    <SynthContext.Provider value={{
      params, currentPreset, customPresets,
      updateParam, updateEffect, loadPreset, savePreset, deleteCustomPreset,
      noteOn, noteOff,
      seq, scaleNotes,
      seqToggle, seqStop, setSeqBPM, setSeqStep, setSeqStepCount, setSeqScale,
    }}>
      {children}
    </SynthContext.Provider>
  );
}

export function useSynth() { return useContext(SynthContext); }
