import { Knob } from '../ui/Knob/Knob';
import { useSynth } from '../../contexts/SynthContext';
import './AmpSection.css';

export function AmpSection() {
  const { params, updateParam } = useSynth();

  return (
    <div className="amp-section synth-section">
      <div className="section-title">Amp</div>
      <Knob
        label="Vol"
        value={params.amp.volume}
        min={0}
        max={1}
        step={0.01}
        decimals={2}
        size={56}
        onChange={(v) => updateParam('amp', 'volume', v)}
      />
    </div>
  );
}
