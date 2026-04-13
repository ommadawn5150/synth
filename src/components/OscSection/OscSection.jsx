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

// ── 3D wavetable canvas ───────────────────────────────────────────────────────

const NUM_DISPLAY_FRAMES = 32;

// Interpolate audio frames (sparse) into more display layers (dense)
function interpolateDisplayFrames(audioFrames, n) {
  const A = audioFrames.length;
  return Array.from({ length: n }, (_, di) => {
    const frac = (di / (n - 1)) * (A - 1);
    const i0   = Math.floor(frac);
    const i1   = Math.min(i0 + 1, A - 1);
    const t    = frac - i0;
    const s0   = audioFrames[i0];
    const s1   = audioFrames[i1];
    return s0.map((v, k) => v * (1 - t) + s1[k] * t);
  });
}

function drawWavetable3D(canvas, frameSamples, pos) {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  if (!W || !H) return;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const N = frameSamples.length;
  if (N < 2) return;

  // Fixed total perspective spread regardless of layer count
  const padL    = 6;
  const totalPX = Math.min(W * 0.20, 52);
  const totalPY = Math.min(H * 0.42, 52);
  const PX      = totalPX / (N - 1);
  const PY      = totalPY / (N - 1);
  const waveW   = W - totalPX - padL - 4;
  const waveHalf = (H - totalPY) / 2 - 5;

  // fi=0 → front/bottom (wtPos=0), fi=N-1 → back/top (wtPos=1)
  const baseY = H / 2 + totalPY / 2;
  const getCoords = (fi) => ({
    x0: padL + fi * PX,
    yC: baseY - fi * PY,
  });

  const curFrac  = pos * (N - 1);
  const curFrame = Math.max(0, Math.min(N - 1, Math.round(curFrac)));

  // ── Left-edge spine — the depth-axis "縦線" ──────────────────────────────
  ctx.beginPath();
  for (let fi = 0; fi < N; fi++) {
    const { x0, yC } = getCoords(fi);
    fi === 0 ? ctx.moveTo(x0, yC) : ctx.lineTo(x0, yC);
  }
  ctx.strokeStyle = 'rgba(255,107,53,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Frames back → front ───────────────────────────────────────────────────
  for (let fi = N - 1; fi >= 0; fi--) {
    const { x0, yC } = getCoords(fi);
    const samples   = frameSamples[fi];
    const isCurrent = fi === curFrame;

    // Filled area
    ctx.beginPath();
    ctx.moveTo(x0, yC);
    for (let i = 0; i < samples.length; i++) {
      ctx.lineTo(x0 + (i / (samples.length - 1)) * waveW, yC - samples[i] * waveHalf);
    }
    ctx.lineTo(x0 + waveW, yC);
    ctx.closePath();
    ctx.fillStyle = isCurrent ? 'rgba(255,107,53,0.10)' : 'rgba(255,107,53,0.02)';
    ctx.fill();

    // Baseline
    ctx.strokeStyle = isCurrent ? 'rgba(255,107,53,0.35)' : 'rgba(255,107,53,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, yC);
    ctx.lineTo(x0 + waveW, yC);
    ctx.stroke();

    // Waveform line
    ctx.strokeStyle = isCurrent ? '#FF6B35' : `rgba(255,107,53,${0.12 + fi * 0.025})`;
    ctx.lineWidth   = isCurrent ? 1.5 : 0.75;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const x = x0 + (i / (samples.length - 1)) * waveW;
      const y = yC - samples[i] * waveHalf;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ── Position cursor on the spine ─────────────────────────────────────────
  const cursorX = padL + curFrac * PX;
  const cursorY = baseY - curFrac * PY;

  // Soft glow
  const grd = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 8);
  grd.addColorStop(0, 'rgba(255,107,53,0.55)');
  grd.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Solid dot
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF6B35';
  ctx.fill();
}

function WaveformCanvas3D({ frameSamples, oscKey }) {
  const canvasRef       = useRef(null);
  const displayRef      = useRef(null);    // interpolated display frames
  const { getWtDisplayPos } = useSynth();

  // Recompute interpolated display frames when source changes
  useEffect(() => {
    displayRef.current = frameSamples
      ? interpolateDisplayFrames(frameSamples, NUM_DISPLAY_FRAMES)
      : null;
  }, [frameSamples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameSamples || frameSamples.length === 0) return;
    let rafId;
    const tick = () => {
      if (displayRef.current)
        drawWavetable3D(canvas, displayRef.current, getWtDisplayPos(oscKey));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [frameSamples, oscKey, getWtDisplayPos]);

  return <canvas ref={canvasRef} className="osc-wave-canvas osc-wave-3d" />;
}

// ── Oscillator panel ──────────────────────────────────────────────────────────

function OscPanel({ label, oscKey }) {
  const { params, updateParam, wtDisplaySamples, setWtDisplaySamples } = useSynth();
  const osc = params[oscKey];
  const fileInputRef = useRef(null);
  const allFrameSamples = wtDisplaySamples[oscKey];  // persists across tab navigation
  const [loading, setLoading] = useState(false);

  // Clear display samples if wavetable is cleared externally (preset load etc.)
  useEffect(() => {
    if (!osc.wavetable) setWtDisplaySamples(prev => ({ ...prev, [oscKey]: null }));
  }, [osc.wavetable, oscKey, setWtDisplaySamples]);

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setLoading(true);
    try {
      const { frames, frameSamples } = await imageFileToWavetable(file);
      updateParam(oscKey, 'wavetable', frames);
      setWtDisplaySamples(prev => ({ ...prev, [oscKey]: frameSamples }));
    } catch (err) {
      console.error('Wavetable error:', err);
    } finally {
      setLoading(false);
    }
  }

  function clearWavetable() {
    updateParam(oscKey, 'wavetable', null);
    setWtDisplaySamples(prev => ({ ...prev, [oscKey]: null }));
  }

  function handleWaveChange(v) {
    if (hasWavetable) clearWavetable();
    updateParam(oscKey, 'type', v);
  }

  const hasWavetable = Array.isArray(osc.wavetable) && osc.wavetable.length > 0;
  const waveOptions  = hasWavetable
    ? [...WAVEFORMS, { value: 'custom', label: 'IMG' }]
    : WAVEFORMS;

  return (
    <div className="osc-panel">
      <div className="section-header">
        <div className="section-title">{label}</div>
        <Toggle value={osc.enabled} onChange={v => updateParam(oscKey, 'enabled', v)} />
      </div>
      <div className={`osc-content ${!osc.enabled ? 'disabled' : ''}`}>

        {/* Wave selector + IMG upload — full width */}
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

        {/* 3D waveform preview — full width */}
        {allFrameSamples && hasWavetable && (
          <div className="osc-wave-preview">
            <WaveformCanvas3D frameSamples={allFrameSamples} oscKey={oscKey} />
            <button className="osc-wave-clear" onClick={clearWavetable} title="Clear">×</button>
          </div>
        )}

        {/* Wavetable depth controls — horizontal row */}
        {hasWavetable && (
          <div className="wt-controls">
            <Slider label="Pos"  value={osc.wtPos  ?? 0.5} min={0}    max={1}  step={0.01} decimals={2}
              onChange={v => updateParam(oscKey, 'wtPos',  v)} />
            <Slider label="LFO"  value={osc.wtScan ?? 0}   min={0}    max={1}  step={0.01} decimals={2}
              onChange={v => updateParam(oscKey, 'wtScan', v)} />
            <Slider label="Rate" value={osc.wtRate ?? 1}   min={0.01} max={10} step={0.01} decimals={2} unit=" Hz"
              onChange={v => updateParam(oscKey, 'wtRate', v)} />
            <Slider label="Env"  value={osc.wtEnv  ?? 0}   min={-1}   max={1}  step={0.01} decimals={2}
              onChange={v => updateParam(oscKey, 'wtEnv',  v)} />
          </div>
        )}

        {/* Oct / Detune / Vol / Semi — horizontal row */}
        <div className="osc-params-row">
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
        <div className="osc-params-row">
          <Selector label="Noise" options={NOISE_TYPES} value={osc3.type}
            onChange={v => updateParam('osc3', 'type', v)} />
          <Slider label="Vol" value={osc3.volume} min={0} max={1} step={0.01}
            decimals={2} onChange={v => updateParam('osc3', 'volume', v)} />
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
      <NoisePanel />
      <div className="section-divider" />
      <div className="unison-panel">
        <div className="section-title">Unison</div>
        <div className="osc-params-row">
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
    </div>
  );
}
