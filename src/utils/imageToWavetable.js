const NUM_PARTIALS = 64;
const SAMPLE_WIDTH  = 256;

/**
 * Load an image file, compress it to a 256×1 brightness strip,
 * run a DFT to extract harmonic magnitudes, and return:
 *   partials       – normalised amplitude per harmonic (for Tone.js osc.partials)
 *   waveformSamples – raw −1…+1 brightness values (for canvas preview)
 */
export function imageFileToWavetable(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Draw the whole image scaled to SAMPLE_WIDTH × 1 px.
      // The browser averages all rows for us during downscaling.
      const canvas = document.createElement('canvas');
      canvas.width  = SAMPLE_WIDTH;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SAMPLE_WIDTH, 1);

      const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, 1);

      // Perceptual luminance → 0…1
      const raw = new Float32Array(SAMPLE_WIDTH);
      for (let x = 0; x < SAMPLE_WIDTH; x++) {
        const i = x * 4;
        raw[x] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      }

      // Contrast-stretch to −1…+1
      let lo = raw[0], hi = raw[0];
      for (let x = 1; x < SAMPLE_WIDTH; x++) {
        if (raw[x] < lo) lo = raw[x];
        if (raw[x] > hi) hi = raw[x];
      }
      const range = hi - lo || 1;
      const samples = new Float32Array(SAMPLE_WIDTH);
      for (let x = 0; x < SAMPLE_WIDTH; x++) {
        samples[x] = ((raw[x] - lo) / range) * 2 - 1;
      }

      // Remove DC offset
      let mean = 0;
      for (let x = 0; x < SAMPLE_WIDTH; x++) mean += samples[x];
      mean /= SAMPLE_WIDTH;
      for (let x = 0; x < SAMPLE_WIDTH; x++) samples[x] -= mean;

      // DFT: magnitude of each harmonic
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

      // Normalise so the loudest harmonic = 1
      if (maxMag > 0) {
        for (let i = 0; i < NUM_PARTIALS; i++) partials[i] /= maxMag;
      }

      resolve({ partials, waveformSamples: Array.from(samples) });
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
