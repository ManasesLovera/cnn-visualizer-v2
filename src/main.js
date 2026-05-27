import './styles.css';
import * as THREE from 'three';
import { createScene } from './scene/core.js';
import {
  createInputPlane,
  buildFeatureStack,
  buildFlattenLayer,
  buildDenseLayer,
  buildOutputLayer,
  buildConnections,
} from './scene/layers.js';
import { createParticleSystem, updateParticles, hideParticles } from './scene/particles.js';
import { createLayerLabels, createVecOverlay } from './scene/labels.js';
import { createSimulation } from './simulation.js';
import { initUI } from './ui/panel.js';
import { COLOR, POS, IMAGES, PARTICLE_COUNT, LAYER_LABELS } from './constants.js';

// ===== Boot =====
const canvas = document.getElementById('three');
const { scene, renderer, camera, controls } = createScene(canvas);

// ===== Build CNN visualization =====
const input = createInputPlane(scene);

const conv1 = buildFeatureStack(scene, POS.conv1, 6, 1.9, 11);
const conv2 = buildFeatureStack(scene, POS.conv2, 6, 1.7, 23);
const pool = buildFeatureStack(scene, POS.pool, 6, 1.1, 41);

const flatten = buildFlattenLayer(scene);
const dense = buildDenseLayer(scene);
const output = buildOutputLayer(scene);

// Connections
const connections = [];
connections.push(buildConnections(scene, [input.mesh], conv1.planes, COLOR.outline, 0.65, 12));
connections.push(buildConnections(scene, conv1.planes, conv2.planes, COLOR.outline, 0.45, 22));
connections.push(buildConnections(scene, conv2.planes, pool.planes, COLOR.outline, 0.45, 22));
connections.push(buildConnections(scene, pool.planes, flatten.dots, COLOR.outline, 0.30, 42));
connections.push(buildConnections(scene, flatten.dots, dense.dots, COLOR.outline, 0.30, 60));
connections.push(
  buildConnections(scene, dense.dots, output.nodes.map((n) => n.sphere), COLOR.primary, 0.55, 16)
);

// Particles
const particles = createParticleSystem(scene);

// Labels & overlays
const layerLabels = createLayerLabels(camera);
const vecOverlay = createVecOverlay(camera);

// ===== Simulation (inference playback) =====
const simulation = createSimulation(controls, output.nodes, connections, particles);

// ===== Load initial image =====
let currentImage = IMAGES[0];

async function loadInitialImage() {
  const tex = await input.loadImage(currentImage.file);
  if (tex) {
    input.material.map = tex;
    input.material.needsUpdate = true;
  }
}
loadInitialImage();

// ===== UI wiring =====
const ui = initUI({
  onImageSelect: async (idx, im) => {
    currentImage = im;
    const tex = await input.loadImage(im.file);
    if (tex) {
      input.material.map = tex;
      input.material.needsUpdate = true;
    }
  },
  onClassify: () => {
    simulation.startInference(
      document.getElementById('status-text'),
      document.getElementById('status-meta')
    );
  },
  onAccuracyChange: () => {
    // Chart is drawn inside the panel module
  },
});

// ===== Idle auto-rotate handling =====
let lastInteract = performance.now();
['pointerdown', 'wheel', 'keydown'].forEach((ev) => {
  window.addEventListener(ev, () => {
    lastInteract = performance.now();
    if (!simulation.isPlaying()) controls.autoRotate = false;
  });
});

// ===== Main render loop =====
const clock = new THREE.Clock();
const PATH_X = [POS.input, POS.conv1, POS.conv2, POS.pool, POS.flatten, POS.dense, POS.output];

function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  // Auto-rotate resume after idle
  if (!simulation.isPlaying()) {
    if (performance.now() - lastInteract > 4000) {
      controls.autoRotate = true;
    }
  }
  controls.update();

  // Subtle breathing animation on feature stacks
  [conv1, conv2, pool].forEach((layer, i) => {
    layer.planes.forEach((plane, j) => {
      const base = (j / (layer.planes.length - 1) - 0.5) * 1.5;
      plane.position.z = base + Math.sin(t * 0.5 + i * 1.3 + j * 0.7) * 0.025;
    });
  });

  // Decay + apply layer pulses
  for (const k in simulation.pulses) {
    simulation.pulses[k] = Math.max(0, simulation.pulses[k] - dt * 1.6);
  }

  function applyPulse(meshes, key, maxScale = 1.18) {
    const p = simulation.pulses[key] || 0;
    const s = 1 + p * (maxScale - 1);
    meshes.forEach((m) => {
      m.scale.setScalar((m.userData.baseScale || 1) * s);
    });
  }

  applyPulse(conv1.planes, 'conv1', 1.05);
  applyPulse(conv2.planes, 'conv2', 1.05);
  applyPulse(pool.planes, 'pool', 1.05);
  applyPulse(flatten.dots, 'flatten', 1.25);
  applyPulse(dense.dots, 'dense', 1.25);
  applyPulse(output.nodes.map((n) => n.sphere), 'output', 1.2);

  // Particle simulation during inference
  const playing = simulation.isPlaying();
  if (playing) {
    const finished = simulation.tick(
      dt,
      4.0,
      (layerIndex) => {
        simulation.activateLayer(
          layerIndex,
          document.getElementById('status-text'),
          document.getElementById('status-meta')
        );
      },
      () => {
        simulation.finishInference(currentImage, ui.updateAccuracy);
      }
    );

    updateParticles(particles, PATH_X, dt, simulation.getPlayTime(), 4.0);

    if (simulation.pulses && layerLabels.elements) {
      // highlight vec overlay only on flatten
      if (simulation.pulses.flatten > 0.1) {
        vecOverlay.show();
      }
    }
  } else {
    hideParticles(particles);
    vecOverlay.hide();
  }

  // Gentle spinning rings on output nodes
  output.nodes.forEach((n, i) => {
    n.ring.rotation.z = t * (i ? 0.4 : -0.4);
  });

  // Update 2D projected labels & vector overlay
  layerLabels.update();
  vecOverlay.update();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Kick off
tick();

// Expose a tiny debug handle (useful during development)
window.__CNN_VISUALIZER__ = { scene, camera, controls, simulation };
