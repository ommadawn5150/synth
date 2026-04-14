import './SignalFlow.css';

// Layout constants
const CY = 32;       // chain center Y
const BH = 26;       // box height
const BW = 56;       // box width
const BY = CY - BH / 2;  // box top Y

// Main signal chain positions
const CHAIN = [
  { id: 'unison', label: 'UNISON', x: 76 },
  { id: 'env',    label: 'ENV',    x: 146 },
  { id: 'filter', label: 'FILTER', x: 216, accent: true },
  { id: 'chorus', label: 'CHORUS', x: 288 },
  { id: 'delay',  label: 'DELAY',  x: 358 },
  { id: 'reverb', label: 'REVERB', x: 428 },
  { id: 'amp',    label: 'AMP',    x: 498, accent: true },
];
const OUT_X = 570;

// OSC source boxes (stacked), OSC2 center aligned with chain
const OSC_BOXES = [
  { label: 'OSC 1', y: 2  },
  { label: 'OSC 2', y: 19 },  // center = 30 ≈ CY
  { label: 'OSC 3', y: 38 },
];

function Box({ x, y, w = BW, h = BH, label, cls = '' }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" className={`sf-box ${cls}`} />
      <text x={x + w / 2} y={y + h / 2 + 4} className="sf-text">{label}</text>
    </g>
  );
}

export function SignalFlow() {
  return (
    <svg
      viewBox="0 0 638 170"
      className="sf-svg"
      aria-label="シグナルフロー図"
    >
      <defs>
        <marker id="sf-arr" viewBox="0 0 7 7" refX="7" refY="3.5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5 Z" className="sf-arrow" />
        </marker>
        <marker id="sf-arr-mod" viewBox="0 0 7 7" refX="7" refY="3.5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5 Z" className="sf-arrow-mod" />
        </marker>
        <marker id="sf-arr-ctrl" viewBox="0 0 7 7" refX="7" refY="3.5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0.5 L7,3.5 L0,6.5 Z" className="sf-arrow-ctrl" />
        </marker>
      </defs>

      {/* ── OSC sources ───────────────────────────────────── */}
      {OSC_BOXES.map(({ label, y }) => (
        <Box key={label} x={2} y={y} w={58} h={22} label={label} cls="sf-box-osc" />
      ))}

      {/* Merge lines: each OSC right edge → vertical trunk → UNISON */}
      {OSC_BOXES.map(({ y }) => {
        const cy = y + 11;
        return <line key={y} x1={60} y1={cy} x2={68} y2={cy} className="sf-wire" />;
      })}
      <line x1={68} y1={OSC_BOXES[0].y + 11} x2={68} y2={OSC_BOXES[2].y + 11} className="sf-wire" />
      <line x1={68} y1={CY} x2={76} y2={CY} className="sf-wire" markerEnd="url(#sf-arr)" />

      {/* ── Main chain ────────────────────────────────────── */}
      {CHAIN.map(({ label, x, accent }) => (
        <Box key={label} x={x} y={BY} label={label} cls={accent ? 'sf-box-accent' : ''} />
      ))}

      {/* Chain connecting arrows */}
      {CHAIN.slice(0, -1).map((box, i) => (
        <line key={i}
          x1={box.x + BW} y1={CY}
          x2={CHAIN[i + 1].x} y2={CY}
          className="sf-wire" markerEnd="url(#sf-arr)"
        />
      ))}

      {/* Last chain → OUT */}
      <line x1={498 + BW} y1={CY} x2={OUT_X} y2={CY}
        className="sf-wire" markerEnd="url(#sf-arr)" />

      {/* OUT box */}
      <Box x={OUT_X} y={BY} w={62} label="◈ OUT" cls="sf-box-out" />

      {/* ── Section label row ─────────────────────────────── */}
      <text x={31}  y={72} className="sf-cat">SOURCES</text>
      <text x={116} y={72} className="sf-cat">VOICES</text>
      <text x={530} y={72} className="sf-cat">MASTER</text>

      {/* ── LFO (modulation) ──────────────────────────────── */}
      <Box x={148} y={120} label="LFO" cls="sf-box-mod" />

      {/* LFO → FILTER dashed */}
      <path d="M 176 120 L 176 96 L 244 96 L 244 45"
        className="sf-wire-mod" fill="none" markerEnd="url(#sf-arr-mod)" />
      <text x={247} y={92} className="sf-dot-label">Cutoff</text>

      {/* LFO → AMP dashed */}
      <path d="M 176 120 L 176 86 L 526 86 L 526 45"
        className="sf-wire-mod" fill="none" markerEnd="url(#sf-arr-mod)" />
      <text x={529} y={82} className="sf-dot-label">Vol</text>

      {/* LFO → Pitch (back to OSC area) */}
      <path d="M 176 120 L 176 106 L 31 106 L 31 61"
        className="sf-wire-mod" fill="none" markerEnd="url(#sf-arr-mod)" />
      <text x={36} y={103} className="sf-dot-label">Pitch</text>

      {/* LFO label */}
      <text x={176} y={158} className="sf-cat">MODULATION</text>

      {/* ── SEQ / KBD (control) ───────────────────────────── */}
      <Box x={380} y={120} label="SEQ" cls="sf-box-ctrl" />
      <Box x={450} y={120} label="KBD" cls="sf-box-ctrl" />

      {/* SEQ + KBD converge → ENV note trigger */}
      <line x1={408} y1={120} x2={408} y2={111} className="sf-wire-ctrl" />
      <line x1={478} y1={120} x2={478} y2={111} className="sf-wire-ctrl" />
      <line x1={408} y1={111} x2={478} y2={111} className="sf-wire-ctrl" />
      <line x1={443} y1={111} x2={443} y2={100} className="sf-wire-ctrl" />
      <path d="M 443 100 L 174 100 L 174 45"
        className="sf-wire-ctrl" fill="none" markerEnd="url(#sf-arr-ctrl)" />
      <text x={310} y={97} className="sf-dot-label">Note Trigger</text>

      {/* SEQ/KBD label */}
      <text x={415} y={158} className="sf-cat">CONTROL</text>
    </svg>
  );
}
