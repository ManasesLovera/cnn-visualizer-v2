import * as THREE from 'three';
import { COLOR } from './constants.js';

/**
 * Generates a procedural "feature map" texture using layered sine/cosine waves + ReLU-ish threshold.
 * Used for the stacked translucent planes in conv/pool layers.
 */
export function makeFeatureMapTexture(seed, octave) {
  const N = 32;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);

  const s = seed * 999 + octave * 17;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = 0, a = 1, f = 1 / 8;
      for (let o = 0; o < 3; o++) {
        v += a * Math.sin((x * f + s) * 1.3) * Math.cos((y * f + s * 0.7) * 1.5);
        a *= 0.5;
        f *= 2;
      }
      v = (v + 1.6) / 3.2;
      v = Math.max(0, Math.min(1, v));
      v = v < 0.32 ? 0 : (v - 0.32) / 0.68; // ReLU-ish

      const i = (y * N + x) * 4;
      // Muted blue-ish ramp on near-white background (MD3 flat aesthetic)
      img.data[i]     = Math.round(255 - v * 230); // R
      img.data[i + 1] = Math.round(255 - v * 137); // G
      img.data[i + 2] = Math.round(255 - v * 45);  // B
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
