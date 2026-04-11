import { useState, useEffect } from 'react';
import { SynthProvider } from './contexts/SynthContext';
import { Header } from './components/Header/Header';
import { OscSection } from './components/OscSection/OscSection';
import { FilterSection } from './components/FilterSection/FilterSection';
import { EnvSection } from './components/EnvSection/EnvSection';
import { LFOSection } from './components/LFOSection/LFOSection';
import { EffectsSection } from './components/EffectsSection/EffectsSection';
import { AmpSection } from './components/AmpSection/AmpSection';
import { Keyboard } from './components/Keyboard/Keyboard';
import { applyTheme } from './themes/themes';
import './App.css';

function SynthApp() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('synth_theme') || 'dawn';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('synth_theme', theme);
  }, [theme]);

  return (
    <div className="app">
      <Header currentTheme={theme} onThemeChange={setTheme} />

      <div className="synth-body">
        {/* Top row: OSC + Filter + LFO */}
        <div className="synth-row top-row">
          <OscSection />
          <div className="row-divider" />
          <FilterSection />
          <div className="row-divider" />
          <LFOSection />
        </div>

        {/* Bottom row: ENV + FX + AMP */}
        <div className="synth-row bottom-row">
          <EnvSection />
          <div className="row-divider" />
          <EffectsSection />
          <div className="row-divider" />
          <AmpSection />
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
