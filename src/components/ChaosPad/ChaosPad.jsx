import { useState, useRef, useCallback, useEffect } from 'react';
import { useSynth } from '../../contexts/SynthContext';
import './ChaosPad.css';

const PARAMS = [
  { id: 'none',           label: 'None' },
  { id: 'filter_freq',    label: 'Filter Cutoff' },
  { id: 'filter_q',       label: 'Filter Q' },
  { id: 'lfo_rate',       label: 'LFO Rate' },
  { id: 'lfo_depth',      label: 'LFO Depth' },
  { id: 'reverb_wet',     label: 'Reverb Wet' },
  { id: 'delay_wet',      label: 'Delay Wet' },
  { id: 'delay_feedback', label: 'Delay FB' },
  { id: 'chorus_wet',     label: 'Chorus Wet' },
];

function applyParam(id, value, updateParam, updateEffect) {
  switch (id) {
    case 'filter_freq':
      // Log scale: 20 Hz – 20 kHz
      updateParam('filter', 'frequency', Math.round(20 * Math.pow(1000, value)));
      break;
    case 'filter_q':
      updateParam('filter', 'Q', value * 20);
      break;
    case 'lfo_rate':
      updateParam('lfo', 'rate', 0.1 + value * 19.9);
      break;
    case 'lfo_depth':
      updateParam('lfo', 'depth', value);
      break;
    case 'reverb_wet':
      updateEffect('reverb', 'wet', value);
      break;
    case 'delay_wet':
      updateEffect('delay', 'wet', value);
      break;
    case 'delay_feedback':
      updateEffect('delay', 'feedback', value * 0.95);
      break;
    case 'chorus_wet':
      updateEffect('chorus', 'wet', value);
      break;
    default:
      break;
  }
}

export function ChaosPad() {
  const { updateParam, updateEffect } = useSynth();
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [xParam, setXParam] = useState('filter_freq');
  const [yParam, setYParam] = useState('lfo_depth');
  const [gyroActive, setGyroActive] = useState(false);
  const [gyroSens, setGyroSens] = useState(1.0);
  const padRef = useRef(null);
  const isDragging = useRef(false);

  const applyPos = useCallback((x, y) => {
    if (xParam !== 'none') applyParam(xParam, x, updateParam, updateEffect);
    // Y is inverted: top = high value
    if (yParam !== 'none') applyParam(yParam, 1 - y, updateParam, updateEffect);
  }, [xParam, yParam, updateParam, updateEffect]);

  function posFromPointer(e) {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(e) {
    isDragging.current = true;
    padRef.current?.setPointerCapture(e.pointerId);
    const p = posFromPointer(e);
    if (p) { setPos(p); applyPos(p.x, p.y); }
  }

  function handlePointerMove(e) {
    if (!isDragging.current) return;
    const p = posFromPointer(e);
    if (p) { setPos(p); applyPos(p.x, p.y); }
  }

  function handlePointerUp() { isDragging.current = false; }

  // Gyroscope control
  useEffect(() => {
    if (!gyroActive) return;
    const handler = (e) => {
      // gamma = left/right tilt (-90..90), beta = forward/back tilt (-180..180)
      const gamma = e.gamma ?? 0;
      const beta  = e.beta  ?? 0;
      const x = Math.max(0, Math.min(1, 0.5 + (gamma / 90) * gyroSens * 0.5));
      const y = Math.max(0, Math.min(1, 0.5 + (beta  / 90) * gyroSens * 0.5));
      setPos({ x, y });
      applyPos(x, y);
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [gyroActive, gyroSens, applyPos]);

  async function toggleGyro() {
    if (gyroActive) { setGyroActive(false); return; }
    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return;
      } catch { return; }
    }
    setGyroActive(true);
  }

  const xLabel = PARAMS.find(p => p.id === xParam)?.label ?? '';
  const yLabel = PARAMS.find(p => p.id === yParam)?.label ?? '';

  return (
    <div className="chaos-wrapper">
      <div className="chaos-header">
        <span className="effect-title">XY PAD</span>
        <button
          className={`chaos-gyro-btn ${gyroActive ? 'active' : ''}`}
          onClick={toggleGyro}
          title="端末の傾きでコントロール"
        >
          ⟳ GYRO
        </button>
      </div>

      <div className="chaos-assign-row">
        <span className="chaos-axis-label">X →</span>
        <select className="seq-select" value={xParam} onChange={e => setXParam(e.target.value)}>
          {PARAMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <span className="chaos-axis-label">Y ↑</span>
        <select className="seq-select" value={yParam} onChange={e => setYParam(e.target.value)}>
          {PARAMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      <div
        className="chaos-pad"
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Grid lines */}
        <div className="chaos-grid-h" />
        <div className="chaos-grid-v" />

        {/* Cursor */}
        <div
          className="chaos-cursor"
          style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
        />

        {/* Axis labels */}
        <span className="chaos-label chaos-label-x">{xLabel}</span>
        <span className="chaos-label chaos-label-y">{yLabel}</span>
      </div>

      {gyroActive && (
        <div className="chaos-gyro-sens">
          <span className="seq-label">SENS</span>
          <input
            type="range" min={0.2} max={3} step={0.1} value={gyroSens}
            onChange={e => setGyroSens(Number(e.target.value))}
            className="seq-slider"
          />
          <span className="seq-bpm-val">{gyroSens.toFixed(1)}x</span>
        </div>
      )}
    </div>
  );
}
