import { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { SynthProvider } from './contexts/SynthContext';
import { Header } from './components/Header/Header';
import { OscSection } from './components/OscSection/OscSection';
import { FilterSection } from './components/FilterSection/FilterSection';
import { EnvSection } from './components/EnvSection/EnvSection';
import { LFOSection } from './components/LFOSection/LFOSection';
import { EffectsSection } from './components/EffectsSection/EffectsSection';
import { AmpSection } from './components/AmpSection/AmpSection';
import { Keyboard } from './components/Keyboard/Keyboard';
import { Sequencer } from './components/Sequencer/Sequencer';
import { applyTheme } from './themes/themes';
import './App.css';

const TABS = [
  { id: 'osc',    label: 'OSC' },
  { id: 'filter', label: 'FILTER' },
  { id: 'env',    label: 'ENV' },
  { id: 'lfo',    label: 'LFO' },
  { id: 'fx',     label: 'FX' },
  { id: 'amp',    label: 'AMP' },
];

function SynthApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('synth_theme') || 'dawn');
  const [activeTab, setActiveTab] = useState('osc');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('synth_theme', theme);
  }, [theme]);

  // Unlock AudioContext on first user interaction so noteOn can be synchronous
  useEffect(() => {
    const unlock = () => { Tone.start(); };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown',     unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown',     unlock);
    };
  }, []);

  return (
    <div className="app">
      <Header currentTheme={theme} onThemeChange={setTheme} />

      {/* Desktop: all panels in two rows */}
      <div className="synth-body desktop-layout">
        <div className="synth-row top-row">
          <OscSection />
          <div className="row-divider" />
          <FilterSection />
          <div className="row-divider" />
          <LFOSection />
        </div>
        <div className="synth-row bottom-row">
          <EnvSection />
          <div className="row-divider" />
          <EffectsSection />
          <div className="row-divider" />
          <AmpSection />
        </div>
        <Sequencer />
      </div>

      {/* Mobile: tabbed synth panels + sequencer always visible at bottom */}
      <div className="synth-body mobile-layout">
        <nav className="tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="tab-panel">
          {activeTab === 'osc'    && <OscSection />}
          {activeTab === 'filter' && <FilterSection />}
          {activeTab === 'env'    && <EnvSection />}
          {activeTab === 'lfo'    && <LFOSection />}
          {activeTab === 'fx'     && <EffectsSection />}
          {activeTab === 'amp'    && <AmpSection />}
        </div>
        <div className="mobile-seq">
          <Sequencer />
        </div>
      </div>

      <Keyboard />
    </div>
  );
}

export default function App() {
  return (
    <SynthProvider>
      <SynthApp />
    </SynthProvider>
  );
}
