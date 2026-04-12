import { Slider } from '../ui/Slider/Slider';
import { Selector } from '../ui/Selector/Selector';
import { useSynth } from '../../contexts/SynthContext';
import './FilterSection.css';

const FILTER_TYPES = [
  { value: 'lowpass',  label: 'LP' },
  { value: 'highpass', label: 'HP' },
  { value: 'bandpass', label: 'BP' },
];

export function FilterSection() {
  const { params, updateParam } = useSynth();
  const f = params.filter;

  return (
    <div className="filter-section synth-section">
      <div className="section-title">Filter</div>
      <Selector label="Type" options={FILTER_TYPES} value={f.type}
        onChange={v => updateParam('filter', 'type', v)} />
      <Slider label="Cutoff" value={f.frequency} min={20} max={20000} step={1}
        decimals={0} unit=" Hz" onChange={v => updateParam('filter', 'frequency', v)} />
      <Slider label="Res" value={f.Q} min={0.1} max={20} step={0.1}
        decimals={1} onChange={v => updateParam('filter', 'Q', v)} />
    </div>
  );
}
