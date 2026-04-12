import { Slider } from '../ui/Slider/Slider';
import { Toggle } from '../ui/Toggle/Toggle';
import { useSynth } from '../../contexts/SynthContext';
import './EffectsSection.css';

function EffectGroup({ title, enabled, onToggle, children }) {
  return (
    <div className="effect-group">
      <div className="effect-header">
        <div className="effect-title">{title}</div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      <div className={!enabled ? 'disabled' : ''}>
        {children}
      </div>
    </div>
  );
}

const fmtKHz = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v);

export function EffectsSection() {
  const { params, updateEffect } = useSynth();
  const { chorus, delay, reverb } = params.effects;

  return (
    <div className="effects-section synth-section">
      <div className="section-title">FX</div>

      <EffectGroup title="Chorus" enabled={chorus.enabled}
        onToggle={v => updateEffect('chorus', 'enabled', v)}>
        <Slider label="Rate"  value={chorus.rate}  min={0.1} max={10} step={0.1} decimals={1} onChange={v => updateEffect('chorus', 'rate',  v)} />
        <Slider label="Depth" value={chorus.depth} min={0}   max={1}  step={0.01} decimals={2} onChange={v => updateEffect('chorus', 'depth', v)} />
        <Slider label="Wet"   value={chorus.wet}   min={0}   max={1}  step={0.01} decimals={2} onChange={v => updateEffect('chorus', 'wet',   v)} />
      </EffectGroup>

      <EffectGroup title="Delay" enabled={delay.enabled}
        onToggle={v => updateEffect('delay', 'enabled', v)}>
        <Slider label="Time"     value={delay.time}     min={0.01} max={1}    step={0.01} decimals={2} unit="s" onChange={v => updateEffect('delay', 'time',     v)} />
        <Slider label="Feedback" value={delay.feedback} min={0}    max={0.95} step={0.01} decimals={2}          onChange={v => updateEffect('delay', 'feedback', v)} />
        <Slider label="Wet"      value={delay.wet}      min={0}    max={1}    step={0.01} decimals={2}          onChange={v => updateEffect('delay', 'wet',      v)} />
      </EffectGroup>

      <EffectGroup title="Reverb" enabled={reverb.enabled}
        onToggle={v => updateEffect('reverb', 'enabled', v)}>
        <Slider label="Decay" value={reverb.decay}         min={0.1} max={10}    step={0.1}  decimals={1} unit="s" onChange={v => updateEffect('reverb', 'decay', v)} />
        <Slider label="Tone"  value={reverb.tone ?? 20000} min={500} max={20000} log
          formatValue={fmtKHz} unit=" Hz" onChange={v => updateEffect('reverb', 'tone', Math.round(v))} />
        <Slider label="Wet"   value={reverb.wet}           min={0}   max={1}     step={0.01} decimals={2}          onChange={v => updateEffect('reverb', 'wet',   v)} />
      </EffectGroup>
    </div>
  );
}
