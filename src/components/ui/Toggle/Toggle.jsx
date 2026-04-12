import './Toggle.css';

export function Toggle({ value, onChange }) {
  return (
    <button
      className={`toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
