import { Slider } from '../ui/Slider/Slider';
import { Selector } from '../ui/Selector/Selector';
import { Toggle } from '../ui/Toggle/Toggle';
import { useSynth } from '../../contexts/SynthContext';
import './FilterSection.css';

const FILTER_TYPES = [
  { value: 'lowpass',  label: 'LP'  },
  { value: 'highpass', label: 'HP'  },
  { value: 'bandpass', label: 'BP'  },
  { value: 'notch',    label: 'Notch' },
  { value: 'allpass',  label: 'AP'  },
];

const ROLLOFFS = [
  { value: -12, label: '12' },
  { value: -24, label: '24' },
  { value: -48, label: '48' },
  { value: -96, label: '96' },
];

export function FilterSection() {
  const { params, updateParam } = useSynth();
  const f = params.filter;

  return (
    <div className="filter-section synth-section">
      <div className="section-header">
        <div className="section-title">Filter</div>
        <Toggle value={f.enabled} onChange={v => updateParam('filter', 'enabled', v)} />
      </div>
      <div className={!f.enabled ? 'disabled' : ''}>
        <Selector label="Type" options={FILTER_TYPES} value={f.type}
          onChange={v => updateParam('filter', 'type', v)} />
        <div style={{ marginTop: 8 }}>
          <Selector label="Slope (dB/oct)" options={ROLLOFFS} value={f.rolloff ?? -24}
            onChange={v => updateParam('filter', 'rolloff', v)} />
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Slider label="Cutoff" value={f.frequency} min={20} max={20000} log
            formatValue={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}
            unit=" Hz" onChange={v => updateParam('filter', 'frequency', Math.round(v))} />
          <Slider label="Res" value={f.Q} min={0.1} max={20} step={0.1}
            decimals={1} onChange={v => updateParam('filter', 'Q', v)} />
        </div>
      </div>
    </div>
  );
}
