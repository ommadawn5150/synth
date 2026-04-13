const NUM_PARTIALS = 64;
const SAMPLE_WIDTH  = 256;
const NUM_FRAMES    = 8;

function computePartials(data) {
  const raw = new Float32Array(SAMPLE_WIDTH);
  for (let x = 0; x < SAMPLE_WIDTH; x++) {
    const i = x * 4;
    raw[x] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  }

  // Contrast-stretch to −1…+1
  let lo = raw[0], hi = raw[0];
  for (const v of raw) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const range = hi - lo || 1;
  const samples = new Float32Array(SAMPLE_WIDTH);
  for (let x = 0; x < SAMPLE_WIDTH; x++) samples[x] = ((raw[x] - lo) / range) * 2 - 1;

  // Remove DC
  let mean = 0;
  for (const v of samples) mean += v;
  mean /= SAMPLE_WIDTH;
  for (let x = 0; x < SAMPLE_WIDTH; x++) samples[x] -= mean;

  // DFT magnitude → partials
  const partials = new Array(NUM_PARTIALS).fill(0);
  let maxMag = 0;
  for (let k = 1; k <= NUM_PARTIALS; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < SAMPLE_WIDTH; n++) {
      const a = (2 * Math.PI * k * n) / SAMPLE_WIDTH;
      re += samples[n] * Math.cos(a);
      im -= samples[n] * Math.sin(a);
    }
    const mag = Math.hypot(re, im) * 2 / SAMPLE_WIDTH;
    partials[k - 1] = mag;
    if (mag > maxMag) maxMag = mag;
  }
  if (maxMag > 0) for (let i = 0; i < NUM_PARTIALS; i++) partials[i] /= maxMag;

  return { partials, samples: Array.from(samples) };
}

/**
 * Load an image, extract NUM_FRAMES rows (top→bottom), compute DFT partials
 * per frame, and return:
 *   frames          – array of NUM_FRAMES partials arrays (for wavetable morphing)
 *   frameSamples    – array of NUM_FRAMES waveform sample arrays (for 3D preview)
 *   waveformSamples – brightness samples of the middle frame (compat alias)
 */
export function imageFileToWavetable(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width  = SAMPLE_WIDTH;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');

      const frames = [];
      const frameSamples = [];
      const midFrame = Math.floor(NUM_FRAMES / 2);

      for (let f = 0; f < NUM_FRAMES; f++) {
        // Sample evenly from top (f=0) to bottom (f=NUM_FRAMES-1)
        const srcY = Math.round((f / (NUM_FRAMES - 1)) * Math.max(0, img.naturalHeight - 1));
        ctx.clearRect(0, 0, SAMPLE_WIDTH, 1);
        ctx.drawImage(img, 0, srcY, img.naturalWidth, 1, 0, 0, SAMPLE_WIDTH, 1);
        const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, 1);
        const { partials, samples } = computePartials(data);
        frames.push(partials);
        frameSamples.push(samples);
      }

      resolve({ frames, frameSamples, waveformSamples: frameSamples[midFrame] });
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
