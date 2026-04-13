import { useState, useRef, useEffect } from 'react';
import { Slider } from '../ui/Slider/Slider';
import { Selector } from '../ui/Selector/Selector';
import { Toggle } from '../ui/Toggle/Toggle';
import { useSynth } from '../../contexts/SynthContext';
import { imageFileToWavetable } from '../../utils/imageToWavetable';
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

const NOISE_TYPES = [
  { value: 'white', label: 'W' },
  { value: 'pink',  label: 'P' },
  { value: 'brown', label: 'B' },
];

function WaveformCanvas({ samples }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !samples) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,107,53,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    samples.forEach((v, i) => {
      const x = (i / (samples.length - 1)) * W;
      const y = H / 2 - v * (H / 2 - 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [samples]);

  return <canvas ref={canvasRef} className="osc-wave-canvas" width={220} height={30} />;
}

function OscPanel({ label, oscKey }) {
  const { params, updateParam } = useSynth();
  const osc = params[oscKey];
  const fileInputRef = useRef(null);
  const [waveformSamples, setWaveformSamples] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync preview when wavetable cleared externally (preset load etc.)
  useEffect(() => {
    if (!osc.wavetable) setWaveformSamples(null);
  }, [osc.wavetable]);

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setLoading(true);
    try {
      const { partials, waveformSamples: ws } = await imageFileToWavetable(file);
      updateParam(oscKey, 'wavetable', partials);
      setWaveformSamples(ws);
    } catch (err) {
      console.error('Wavetable error:', err);
    } finally {
      setLoading(false);
    }
  }

  function clearWavetable() {
    updateParam(oscKey, 'wavetable', null);
    setWaveformSamples(null);
  }

  const hasWavetable = !!osc.wavetable;
  const waveOptions  = hasWavetable
    ? [...WAVEFORMS, { value: 'custom', label: 'IMG' }]
    : WAVEFORMS;

  function handleWaveChange(v) {
    if (hasWavetable) clearWavetable();
    updateParam(oscKey, 'type', v);
  }

  return (
    <div className="osc-panel">
      <div className="section-header">
        <div className="section-title">{label}</div>
        <Toggle value={osc.enabled} onChange={v => updateParam(oscKey, 'enabled', v)} />
      </div>
      <div className={`osc-content ${!osc.enabled ? 'disabled' : ''}`}>

        <div className="osc-wave-row">
          <Selector
            label="Wave"
            options={waveOptions}
            value={hasWavetable ? 'custom' : osc.type}
            onChange={handleWaveChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageFile}
          />
          <button
            className={`osc-img-btn ${hasWavetable ? 'active' : ''}`}
            title="Load image as wavetable"
            onClick={() => fileInputRef.current?.click()}
          >
            {loading ? '…' : 'IMG'}
          </button>
        </div>

        {waveformSamples && hasWavetable && (
          <div className="osc-wave-preview">
            <WaveformCanvas samples={waveformSamples} />
            <button className="osc-wave-clear" onClick={clearWavetable}>×</button>
          </div>
        )}

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

function NoisePanel() {
  const { params, updateParam } = useSynth();
  const osc3 = params.osc3 ?? { type: 'white', volume: 0, enabled: false };

  return (
    <div className="osc-panel noise-panel">
      <div className="section-header">
        <div className="section-title">OSC 3</div>
        <Toggle value={osc3.enabled} onChange={v => updateParam('osc3', 'enabled', v)} />
      </div>
      <div className={`osc-content ${!osc3.enabled ? 'disabled' : ''}`}>
        <Selector label="Noise" options={NOISE_TYPES} value={osc3.type}
          onChange={v => updateParam('osc3', 'type', v)} />
        <Slider label="Vol" value={osc3.volume} min={0} max={1} step={0.01}
          decimals={2} onChange={v => updateParam('osc3', 'volume', v)} />
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
      <NoisePanel />
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
