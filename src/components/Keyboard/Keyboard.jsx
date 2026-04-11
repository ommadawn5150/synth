import { useEffect, useRef, useCallback } from 'react';
import { useSynth } from '../../contexts/SynthContext';
import './Keyboard.css';

// 3 octaves starting from C3
const BASE_OCTAVE = 3;
const OCTAVE_COUNT = 3;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

// PC keyboard mapping: two rows cover one octave each
// Row 1 (lower): A S D F G H J K L ; - white keys
// Row 2 (upper): W E   T Y U   O P - black keys
const KEY_MAP = {
  // Octave 0 (C3–B3)
  a: 'C3', w: 'C#3', s: 'D3', e: 'D#3', d: 'E3',
  f: 'F3', t: 'F#3', g: 'G3', y: 'G#3', h: 'A3', u: 'A#3', j: 'B3',
  // Octave 1 (C4–B4)
  k: 'C4', o: 'C#4', l: 'D4', p: 'D#4', ';': 'E4',
};

function buildKeys() {
  const keys = [];
  for (let oct = 0; oct < OCTAVE_COUNT; oct++) {
    for (let n = 0; n < 12; n++) {
      const note = `${NOTE_NAMES[n]}${BASE_OCTAVE + oct}`;
      keys.push({ note, isBlack: IS_BLACK[n], octave: BASE_OCTAVE + oct, name: NOTE_NAMES[n] });
    }
  }
  return keys;
}

const ALL_KEYS = buildKeys();

export function Keyboard() {
  const { noteOn, noteOff } = useSynth();
  const activeNotes = useRef(new Set());
  const pressedKeys = useRef(new Set());

  const triggerOn = useCallback((note) => {
    if (activeNotes.current.has(note)) return;
    activeNotes.current.add(note);
    noteOn(note);
  }, [noteOn]);

  const triggerOff = useCallback((note) => {
    if (!activeNotes.current.has(note)) return;
    activeNotes.current.delete(note);
    noteOff(note);
  }, [noteOff]);

  // PC keyboard
  useEffect(() => {
    const onDown = (e) => {
      if (e.repeat || e.target.tagName === 'INPUT') return;
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note && !pressedKeys.current.has(e.key)) {
        pressedKeys.current.add(e.key);
        triggerOn(note);
        // highlight key
        document.querySelector(`[data-note="${note}"]`)?.classList.add('active');
      }
    };
    const onUp = (e) => {
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note) {
        pressedKeys.current.delete(e.key);
        triggerOff(note);
        document.querySelector(`[data-note="${note}"]`)?.classList.remove('active');
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [triggerOn, triggerOff]);

  // Mouse / touch events
  const onPointerDown = (e, note) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    triggerOn(note);
  };
  const onPointerUp = (e, note) => {
    triggerOff(note);
  };
  const onPointerEnter = (e, note) => {
    if (e.buttons > 0) triggerOn(note);
  };
  const onPointerLeave = (e, note) => {
    if (e.buttons > 0) triggerOff(note);
  };

  return (
    <div className="keyboard">
      <div className="keys-container">
        {ALL_KEYS.filter((k) => !k.isBlack).map((key, i) => {
          const whiteIndex = ALL_KEYS.filter((k) => !k.isBlack).indexOf(key);
          return (
            <div
              key={key.note}
              data-note={key.note}
              className="key white"
              onPointerDown={(e) => onPointerDown(e, key.note)}
              onPointerUp={(e) => onPointerUp(e, key.note)}
              onPointerEnter={(e) => onPointerEnter(e, key.note)}
              onPointerLeave={(e) => onPointerLeave(e, key.note)}
            >
              <span className="key-label">
                {key.name === 'C' ? `C${key.octave}` : ''}
              </span>
            </div>
          );
        })}
        {/* Black keys - positioned absolutely */}
        {ALL_KEYS.filter((k) => k.isBlack).map((key) => {
          // Calculate position
          const allWhite = ALL_KEYS.filter((k) => !k.isBlack);
          const noteIndex = NOTE_NAMES.indexOf(key.name);
          const octaveOffset = (key.octave - BASE_OCTAVE) * 7;

          const blackPositions = { 'C#': 0.6, 'D#': 1.6, 'F#': 3.6, 'G#': 4.6, 'A#': 5.6 };
          const localPos = blackPositions[key.name] ?? 0;
          const posInOctave = octaveOffset + localPos;

          return (
            <div
              key={key.note}
              data-note={key.note}
              className="key black"
              style={{ left: `calc(${posInOctave} * (100% / ${OCTAVE_COUNT * 7}))` }}
              onPointerDown={(e) => onPointerDown(e, key.note)}
              onPointerUp={(e) => onPointerUp(e, key.note)}
              onPointerEnter={(e) => onPointerEnter(e, key.note)}
              onPointerLeave={(e) => onPointerLeave(e, key.note)}
            />
          );
        })}
      </div>
      <div className="keyboard-hint">
        A–J: C3–B3 &nbsp;|&nbsp; K–; : C4–E4 &nbsp;|&nbsp; W/E/T/Y/U: black keys
      </div>
    </div>
  );
}
