import { useEffect, useRef } from 'react';
import { useSynth } from '../../contexts/SynthContext';
import './Oscilloscope.css';

export function Oscilloscope() {
  const canvasRef = useRef(null);
  const { getAnalyserNode } = useSynth();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId;

    const draw = () => {
      const analyser = getAnalyserNode();
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (!W || !H) { rafId = requestAnimationFrame(draw); return; }
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg-section').trim() || '#111';
      ctx.fillRect(0, 0, W, H);

      // Center & grid lines
      ctx.strokeStyle = 'rgba(255,107,53,0.12)';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach(t => {
        const y = Math.round(H * t) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      });

      if (!analyser) { rafId = requestAnimationFrame(draw); return; }

      const data = analyser.getValue(); // Float32Array [-1, 1]
      const len  = data.length;

      // Zero-crossing trigger for waveform stability
      let startIdx = 0;
      for (let i = 1; i < len / 2; i++) {
        if (data[i - 1] < 0 && data[i] >= 0) { startIdx = i; break; }
      }

      // Draw window = half the buffer after trigger
      const windowLen = Math.min(len - startIdx, Math.floor(len / 2));

      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      for (let i = 0; i < windowLen; i++) {
        const x = (i / (windowLen - 1)) * W;
        const y = H / 2 - data[startIdx + i] * (H / 2 - 4);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [getAnalyserNode]);

  return (
    <div className="oscilloscope-wrapper">
      <span className="oscilloscope-label">OUTPUT</span>
      <canvas ref={canvasRef} className="oscilloscope-canvas" />
    </div>
  );
}
