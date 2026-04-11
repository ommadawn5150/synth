import { useState } from 'react';
import { useSynth } from '../../contexts/SynthContext';
import { PRESETS } from '../../presets/presets';
import { themes } from '../../themes/themes';
import './Header.css';

export function Header({ currentTheme, onThemeChange }) {
  const { currentPreset, customPresets, loadPreset, savePreset, deleteCustomPreset } = useSynth();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');

  const allPresets = [...PRESETS, ...customPresets];

  function handleSave() {
    if (!saveName.trim()) return;
    savePreset(saveName.trim());
    setSaveName('');
    setShowSaveInput(false);
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-mark">◈</span>
          <span className="logo-text">SYNTH</span>
        </div>
      </div>

      <div className="header-center">
        <div className="preset-bar">
          <span className="header-label">Preset</span>
          <select
            className="preset-select"
            value={currentPreset}
            onChange={(e) => {
              const p = allPresets.find((x) => x.id === e.target.value);
              if (p) loadPreset(p);
            }}
          >
            <optgroup label="Factory">
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            {customPresets.length > 0 && (
              <optgroup label="User">
                {customPresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
          </select>

          {showSaveInput ? (
            <div className="save-row">
              <input
                className="save-input"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button className="btn-small" onClick={handleSave}>Save</button>
              <button className="btn-small" onClick={() => setShowSaveInput(false)}>×</button>
            </div>
          ) : (
            <button className="btn-small" onClick={() => setShowSaveInput(true)}>+ Save</button>
          )}

          {currentPreset.startsWith('user_') && (
            <button
              className="btn-small danger"
              onClick={() => deleteCustomPreset(currentPreset)}
            >
              Del
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        <span className="header-label">Theme</span>
        <div className="theme-buttons">
          {Object.entries(themes).map(([key, t]) => (
            <button
              key={key}
              className={`theme-dot ${currentTheme === key ? 'active' : ''}`}
              style={{ '--dot-color': t['--accent'] }}
              onClick={() => onThemeChange(key)}
              title={t.name}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
