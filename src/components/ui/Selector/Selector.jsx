import './Selector.css';

export function Selector({ options, value, onChange, label }) {
  return (
    <div className="selector-wrapper">
      {label && <span className="selector-label">{label}</span>}
      <div className="selector-buttons">
        {options.map((opt) => (
          <button
            key={opt.value ?? opt}
            className={`selector-btn ${(opt.value ?? opt) === value ? 'active' : ''}`}
            onClick={() => onChange(opt.value ?? opt)}
          >
            {opt.label ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}
