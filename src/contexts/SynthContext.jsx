import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { SynthEngine } from '../engine/SynthEngine';
import { PRESETS } from '../presets/presets';

const SynthContext = createContext(null);

export function SynthProvider({ children }) {
  const engineRef = useRef(null);
  const [params, setParams] = useState(() => PRESETS[0]);
  const [currentPreset, setCurrentPreset] = useState('init');
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('synth_presets') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const engine = new SynthEngine();
    engineRef.current = engine;
    return () => engine.dispose();
  }, []);

  function getEngine() {
    return engineRef.current;
  }

  function updateParam(section, key, value) {
    setParams((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    const engine = getEngine();
    if (!engine) return;
    if (section === 'osc1') engine.setOsc1(key, value);
    else if (section === 'osc2') engine.setOsc2(key, value);
    else if (section === 'filter') engine.setFilter(key, value);
    else if (section === 'env') engine.setEnv(key, value);
    else if (section === 'lfo') engine.setLFO(key, value);
    else if (section === 'unison') engine.setUnison(key, value);
    else if (section === 'amp') engine.setAmp(value);
  }

  function updateEffect(effect, key, value) {
    setParams((prev) => ({
      ...prev,
      effects: {
        ...prev.effects,
        [effect]: { ...prev.effects[effect], [key]: value },
      },
    }));
    getEngine()?.setEffect(effect, key, value);
  }

  function loadPreset(preset) {
    setParams(preset);
    setCurrentPreset(preset.id);
    getEngine()?.loadPreset(preset);
  }

  function savePreset(name) {
    const engine = getEngine();
    if (!engine) return;
    const newPreset = { ...engine.params, id: `user_${Date.now()}`, name };
    const updated = [...customPresets.filter((p) => p.name !== name), newPreset];
    setCustomPresets(updated);
    localStorage.setItem('synth_presets', JSON.stringify(updated));
  }

  function deleteCustomPreset(id) {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('synth_presets', JSON.stringify(updated));
  }

  function noteOn(note) {
    getEngine()?.noteOn(note);
  }

  function noteOff(note) {
    getEngine()?.noteOff(note);
  }

  return (
    <SynthContext.Provider
      value={{
        params,
        currentPreset,
        customPresets,
        updateParam,
        updateEffect,
        loadPreset,
        savePreset,
        deleteCustomPreset,
        noteOn,
        noteOff,
      }}
    >
      {children}
    </SynthContext.Provider>
  );
}

export function useSynth() {
  return useContext(SynthContext);
}
