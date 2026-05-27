import * as THREE from 'three';
import { COLOR, POS, PARTICLE_COUNT } from '../constants.js';

export function createParticleSystem(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const progress = new Float32Array(PARTICLE_COUNT);
  const lanes = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = POS.input;
    positions[i * 3 + 1] = 999; // hidden
    positions[i * 3 + 2] = 0;

    progress[i] = -1;
    lanes[i] = (Math.random() - 0.5) * 1.6;
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: COLOR.primary,
    size: 0.10,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    points,
    geometry,
    positions,
    progress,
    lanes,
  };
}

/**
 * Updates particle positions along the layer path during inference playback.
 * Returns true when the animation has completed.
 */
export function updateParticles(particles, pathX, dt, progressTime, totalDuration) {
  const { positions, progress, lanes, geometry } = particles;
  const arr = positions;
  const segs = pathX.length - 1;
  let completed = false;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    progress[i] += dt * 0.35;
    const p = progress[i];

    if (p < 0 || p > 1) {
      arr[i * 3 + 1] = 999;
      continue;
    }

    const u = p * segs;
    const si = Math.min(segs - 1, Math.floor(u));
    const lt = u - si;

    const x = pathX[si] * (1 - lt) + pathX[si + 1] * lt;
    const y = lanes[i] * (1 - p) * 0.5 + Math.sin(p * Math.PI) * lanes[i] * 0.2;
    const z = Math.cos(p * Math.PI * 2 + i) * 0.3;

    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;

    if (p >= 1) completed = true;
  }

  geometry.attributes.position.needsUpdate = true;
  return completed;
}

export function hideParticles(particles) {
  const { positions, geometry } = particles;
  const arr = positions;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (arr[i * 3 + 1] !== 999) arr[i * 3 + 1] = 999;
  }
  geometry.attributes.position.needsUpdate = true;
}
