import { Knob } from '../ui/Knob/Knob';
import { Selector } from '../ui/Selector/Selector';
import { useSynth } from '../../contexts/SynthContext';
import './OscSection.css';

const WAVEFORMS = [
  { value: 'sine', label: '∿' },
  { value: 'triangle', label: '△' },
  { value: 'sawtooth', label: '/' },
  { value: 'square', label: '⊓' },
];

const OCTAVES = [
  { value: -2, label: '-2' },
  { value: -1, label: '-1' },
  { value: 0, label: '0' },
  { value: 1, label: '+1' },
  { value: 2, label: '+2' },
];

function OscPanel({ label, oscKey }) {
  const { params, updateParam } = useSynth();
  const osc = params[oscKey];

  return (
    <div className="osc-panel">
      <div className="section-title">{label}</div>

      {oscKey === 'osc2' && (
        <button
          className={`osc2-toggle ${osc.enabled ? 'active' : ''}`}
          onClick={() => updateParam(oscKey, 'enabled', !osc.enabled)}
        >
          {osc.enabled ? 'ON' : 'OFF'}
        </button>
      )}

      <div className={`osc-content ${oscKey === 'osc2' && !osc.enabled ? 'disabled' : ''}`}>
        <Selector
          label="Wave"
          options={WAVEFORMS}
          value={osc.type}
          onChange={(v) => updateParam(oscKey, 'type', v)}
        />

        <Selector
          label="Oct"
          options={OCTAVES}
          value={osc.octave}
          onChange={(v) => updateParam(oscKey, 'octave', v)}
        />

        <div className="osc-knobs">
          <Knob
            label="Detune"
            value={osc.detune}
            min={-100}
            max={100}
            step={1}
            decimals={0}
            unit=" ¢"
            onChange={(v) => updateParam(oscKey, 'detune', v)}
          />
          <Knob
            label="Vol"
            value={osc.volume}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => updateParam(oscKey, 'volume', v)}
          />
          {oscKey === 'osc2' && (
            <Knob
              label="Semi"
              value={osc.semitone}
              min={0}
              max={24}
              step={1}
              decimals={0}
              onChange={(v) => updateParam(oscKey, 'semitone', v)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function OscSection() {
  const { params, updateParam } = useSynth();
  const uni = params.unison;

  return (
    <div className="osc-section synth-section">
      <OscPanel label="OSC 1" oscKey="osc1" />
      <div className="section-divider" />
      <OscPanel label="OSC 2" oscKey="osc2" />
      <div className="section-divider" />

      <div className="unison-panel">
        <div className="section-title">Unison</div>
        <Selector
          label="Voices"
          options={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 7, label: '7' },
          ]}
          value={uni.voices}
          onChange={(v) => updateParam('unison', 'voices', v)}
        />
        <div className="osc-knobs">
          <Knob
            label="Spread"
            value={uni.spread}
            min={0}
            max={100}
            step={1}
            decimals={0}
            onChange={(v) => updateParam('unison', 'spread', v)}
          />
          <Knob
            label="Width"
            value={uni.width}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => updateParam('unison', 'width', v)}
          />
        </div>
      </div>
    </div>
  );
}
