import { Slider } from '../ui/Slider/Slider';
import { useSynth } from '../../contexts/SynthContext';
import './EnvSection.css';

export function EnvSection() {
  const { params, updateParam } = useSynth();
  const env = params.env;

  return (
    <div className="env-section synth-section">
      <div className="section-title">Env</div>
      <Slider label="Attack"  value={env.attack}  min={0.001} max={4}   step={0.001} decimals={3} unit="s" onChange={v => updateParam('env', 'attack',  v)} />
      <Slider label="Decay"   value={env.decay}   min={0.001} max={4}   step={0.001} decimals={3} unit="s" onChange={v => updateParam('env', 'decay',   v)} />
      <Slider label="Sustain" value={env.sustain} min={0}     max={1}   step={0.01}  decimals={2}          onChange={v => updateParam('env', 'sustain', v)} />
      <Slider label="Release" value={env.release} min={0.001} max={8}   step={0.001} decimals={3} unit="s" onChange={v => updateParam('env', 'release', v)} />
    </div>
  );
}
