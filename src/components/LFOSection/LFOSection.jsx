import { Knob } from '../ui/Knob/Knob';
import { Selector } from '../ui/Selector/Selector';
import { useSynth } from '../../contexts/SynthContext';
import './LFOSection.css';

const LFO_SHAPES = [
  { value: 'sine', label: '∿' },
  { value: 'triangle', label: '△' },
  { value: 'sawtooth', label: '/' },
  { value: 'square', label: '⊓' },
];

const LFO_DESTS = [
  { value: 'filter', label: 'Filter' },
  { value: 'pitch', label: 'Pitch' },
  { value: 'amp', label: 'Amp' },
];

export function LFOSection() {
  const { params, updateParam } = useSynth();
  const lfo = params.lfo;

  return (
    <div className="lfo-section synth-section">
      <div className="section-title">LFO</div>

      <Selector
        label="Shape"
        options={LFO_SHAPES}
        value={lfo.type}
        onChange={(v) => updateParam('lfo', 'type', v)}
      />

      <Selector
        label="Dest"
        options={LFO_DESTS}
        value={lfo.destination}
        onChange={(v) => updateParam('lfo', 'destination', v)}
      />

      <div className="lfo-knobs">
        <Knob
          label="Rate"
          value={lfo.rate}
          min={0.01}
          max={20}
          step={0.01}
          decimals={2}
          unit=" Hz"
          onChange={(v) => updateParam('lfo', 'rate', v)}
        />
        <Knob
          label="Depth"
          value={lfo.depth}
          min={0}
          max={1}
          step={0.01}
          decimals={2}
          onChange={(v) => updateParam('lfo', 'depth', v)}
        />
      </div>
    </div>
  );
}
