# ◈ SYNTH

A browser-based polyphonic synthesizer built with React and [Tone.js](https://tonejs.github.io/).

🔗 **Project repository:** https://github.com/ommadawn5150/synth

## Features

- **2 Oscillators** — sine / triangle / sawtooth / square waveforms, octave & detune controls, wavetable mode (load an image as a wavetable)
- **Noise oscillator** — white, pink, and brown noise
- **Unison** — up to 7 voices with configurable spread and stereo width
- **Filter** — LP / HP / BP / Notch with cutoff, resonance, and roll-off slope (-12 / -24 / -48 dB/oct)
- **ADSR Envelope**
- **LFO** — modulates filter cutoff, pitch, or volume; 4 waveforms, polarity control
- **Effects** — Chorus, Delay, Reverb
- **Amp** — master volume + oscilloscope output display
- **Step Sequencer** — up to 32 steps, BPM control, scale / root note selection, per-step note picker, pattern presets
- **Keyboard** — on-screen piano keyboard; PC keyboard shortcut support
- **4 Themes** — Dawn, Dusk, Mint, Void
- **Preset system** — factory presets + save / load user presets
- **PWA support** — installable as a standalone app

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```
