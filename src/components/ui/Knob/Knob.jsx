import { useRef, useCallback, useEffect, useState } from 'react';
import './Knob.css';

const ANGLE_MIN = -140;
const ANGLE_MAX = 140;

export function Knob({ label, value, min, max, step = 0.001, onChange, size = 48, decimals = 2, unit = '' }) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = ANGLE_MIN + norm * (ANGLE_MAX - ANGLE_MIN);

  const clamp = useCallback(
    (v) => Math.round(Math.max(min, Math.min(max, v)) / step) * step,
    [min, max, step]
  );

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startValue.current = value;
      setShowTooltip(true);

      const onMove = (ev) => {
        if (!isDragging.current) return;
        const delta = (startY.current - ev.clientY) / 150;
        onChange(clamp(startValue.current + delta * (max - min)));
      };
      const onUp = () => {
        isDragging.current = false;
        setShowTooltip(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [value, min, max, clamp, onChange]
  );

  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      const delta = -e.deltaY / 500;
      onChange(clamp(value + delta * (max - min)));
    },
    [value, min, max, clamp, onChange]
  );

  const onDoubleClick = useCallback(() => {
    const def = (min + max) / 2;
    onChange(clamp(def));
  }, [min, max, clamp, onChange]);

  useEffect(() => {
    const el = document.getElementById(`knob-${label}-${size}`);
    if (el) el.addEventListener('wheel', onWheel, { passive: false });
    return () => el?.removeEventListener('wheel', onWheel);
  }, [label, size, onWheel]);

  const displayValue = typeof decimals === 'number' ? value.toFixed(decimals) : value;

  return (
    <div className="knob-wrapper" style={{ '--knob-size': `${size}px` }}>
      <div
        id={`knob-${label}-${size}`}
        className="knob"
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging.current && setShowTooltip(false)}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <svg viewBox="0 0 48 48" width={size} height={size}>
          {/* Track arc */}
          <circle cx="24" cy="24" r="18" className="knob-track" />
          {/* Fill arc */}
          <circle
            cx="24"
            cy="24"
            r="18"
            className="knob-fill"
            style={{
              strokeDashoffset: `${113.1 - norm * 97.4}`,
            }}
          />
          {/* Body */}
          <circle cx="24" cy="24" r="14" className="knob-body" />
          {/* Indicator line */}
          <line
            x1="24"
            y1="24"
            x2="24"
            y2="11"
            className="knob-indicator"
            transform={`rotate(${angle}, 24, 24)`}
          />
        </svg>
        {showTooltip && (
          <div className="knob-tooltip">
            {displayValue}{unit}
          </div>
        )}
      </div>
      <span className="knob-label">{label}</span>
    </div>
  );
}
