import './Slider.css';

export function Slider({ label, value, min, max, step = 0.001, onChange, decimals = 2, unit = '' }) {
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const display = typeof decimals === 'number' ? Number(value).toFixed(decimals) : value;

  return (
    <div className="slider-wrapper">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{display}{unit}</span>
      </div>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--fill': `${norm * 100}%` }}
      />
    </div>
  );
}
