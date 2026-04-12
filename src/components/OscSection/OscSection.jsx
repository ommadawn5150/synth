import { Slider } from '../ui/Slider/Slider';
import { Selector } from '../ui/Selector/Selector';
import { Toggle } from '../ui/Toggle/Toggle';
import { useSynth } from '../../contexts/SynthContext';
import './OscSection.css';

const WAVEFORMS = [
  { value: 'sine',     label: '∿' },
  { value: 'triangle', label: '△' },
  { value: 'sawtooth', label: '/' },
  { value: 'square',   label: '⊓' },
];

const OCTAVES = [
  { value: -2, label: '-2' },
  { value: -1, label: '-1' },
  { value:  0, label:  '0' },
  { value:  1, label: '+1' },
  { value:  2, label: '+2' },
];

function OscPanel({ label, oscKey }) {
  const { params, updateParam } = useSynth();
  const osc = params[oscKey];

  return (
    <div className="osc-panel">
      <div className="section-header">
        <div className="section-title">{label}</div>
        <Toggle value={osc.enabled} onChange={v => updateParam(oscKey, 'enabled', v)} />
      </div>
      <div className={`osc-content ${!osc.enabled ? 'disabled' : ''}`}>
        <Selector label="Wave" options={WAVEFORMS} value={osc.type}
          onChange={v => updateParam(oscKey, 'type', v)} />
        <Selector label="Oct" options={OCTAVES} value={osc.octave}
          onChange={v => updateParam(oscKey, 'octave', v)} />
        <Slider label="Detune" value={osc.detune} min={-100} max={100} step={1}
          decimals={0} unit=" ¢" onChange={v => updateParam(oscKey, 'detune', v)} />
        <Slider label="Vol" value={osc.volume} min={0} max={1} step={0.01}
          decimals={2} onChange={v => updateParam(oscKey, 'volume', v)} />
        {oscKey === 'osc2' && (
          <Slider label="Semi" value={osc.semitone} min={0} max={24} step={1}
            decimals={0} onChange={v => updateParam(oscKey, 'semitone', v)} />
        )}
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
          options={[1,2,3,4,7].map(v => ({ value: v, label: String(v) }))}
          value={uni.voices}
          onChange={v => updateParam('unison', 'voices', v)}
        />
        <Slider label="Spread" value={uni.spread} min={0} max={100} step={1}
          decimals={0} onChange={v => updateParam('unison', 'spread', v)} />
        <Slider label="Width" value={uni.width} min={0} max={1} step={0.01}
          decimals={2} onChange={v => updateParam('unison', 'width', v)} />
      </div>
    </div>
  );
}
