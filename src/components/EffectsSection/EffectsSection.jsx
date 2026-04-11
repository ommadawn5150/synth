import { Knob } from '../ui/Knob/Knob';
import { useSynth } from '../../contexts/SynthContext';
import './EffectsSection.css';

function EffectGroup({ title, children }) {
  return (
    <div className="effect-group">
      <div className="effect-title">{title}</div>
      <div className="effect-knobs">{children}</div>
    </div>
  );
}

export function EffectsSection() {
  const { params, updateEffect } = useSynth();
  const { chorus, delay, reverb } = params.effects;

  return (
    <div className="effects-section synth-section">
      <div className="section-title">FX</div>

      <EffectGroup title="Chorus">
        <Knob
          label="Rate"
          value={chorus.rate}
          min={0.1}
          max={10}
          step={0.1}
          decimals={1}
          onChange={(v) => updateEffect('chorus', 'rate', v)}
        />
        <Knob
          label="Depth"
          value={chorus.depth}
          min={0}
          max={1}
          step={0.01}
          decimals={2}
          onChange={(v) => updateEffect('chorus', 'depth', v)}
        />
        <Knob
          label="Wet"
          value={chorus.wet}
          min={0}
          max={1}
          step={0.01}
          decimals={2}
          onChange={(v) => updateEffect('chorus', 'wet', v)}
        />
      </EffectGroup>

      <EffectGroup title="Delay">
        <Knob
          label="FB"
          value={delay.feedback}
          min={0}
          max={0.95}
          step={0.01}
          decimals={2}
          onChange={(v) => updateEffect('delay', 'feedback', v)}
        />
        <Knob
          label="Wet"
          value={delay.wet}
          min={0}
          max={1}
          step={0.01}
          decimals={2}
          onChange={(v) => updateEffect('delay', 'wet', v)}
        />
      </EffectGroup>

      <EffectGroup title="Reverb">
        <Knob
          label="Decay"
          value={reverb.decay}
          min={0.1}
          max={10}
          step={0.1}
          decimals={1}
          unit="s"
          onChange={(v) => updateEffect('reverb', 'decay', v)}
        />
        <Knob
          label="Wet"
          value={reverb.wet}
          min={0}
          max={1}
          step={0.01}
          decimals={2}
          onChange={(v) => updateEffect('reverb', 'wet', v)}
        />
      </EffectGroup>
    </div>
  );
}
