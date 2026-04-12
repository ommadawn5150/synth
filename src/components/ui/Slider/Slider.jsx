import './Slider.css';

export function Slider({ label, value, min, max, step = 0.001, onChange, decimals = 2, unit = '', log = false, formatValue }) {
  // For log scale, slider mechanics operate in natural-log space
  const logMin = log ? Math.log(min) : min;
  const logMax = log ? Math.log(max) : max;
  const logVal = log ? Math.log(Math.max(min, value)) : value;

  const norm = Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin)));

  let display;
  if (formatValue) {
    display = formatValue(value);
  } else {
    display = typeof decimals === 'number' ? Number(value).toFixed(decimals) : value;
  }

  function handleChange(e) {
    const raw = Number(e.target.value);
    onChange(log ? Math.exp(raw) : raw);
  }

  return (
    <div className="slider-wrapper">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{display}{unit}</span>
      </div>
      <input
        type="range"
        className="slider-input"
        min={log ? logMin : min}
        max={log ? logMax : max}
        step={log ? (logMax - logMin) / 1000 : step}
        value={logVal}
        onChange={handleChange}
        style={{ '--fill': `${norm * 100}%` }}
      />
    </div>
  );
}
