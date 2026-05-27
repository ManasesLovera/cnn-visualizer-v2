/**
 * CNN Visualizer — Plain HTML + CSS + JS version
 * No npm, no Vite, no ES modules. Works with a simple HTTP server or GitHub Pages.
 * Three.js is loaded via classic script (r134 global build).
 */

// ===== CONSTANTS =====
const COLOR = {
  bg:        0xfafafa,
  primary:   0x1976d2,
  primary2:  0x90caf9,
  secondary: 0x7c4dff,
  cat:       0x26a69a,
  dog:       0xef5350,
  surface:   0xffffff,
  outline:   0xe0e0e0,
  textSoft:  0x9e9e9e,
};

const POS = {
  input:   -9,
  conv1:   -5.5,
  conv2:   -2,
  pool:     1.2,
  flatten:  4,
  dense:    6.5,
  output:   9,
};

const LAYER_LABELS = [
  { id: 'input',   txt: 'Input',     sub: '64×64×3',  x: POS.input,   y: 1.7 },
  { id: 'conv1',   txt: 'Conv2D',    sub: '32@30×30', x: POS.conv1,   y: 1.7 },
  { id: 'conv2',   txt: 'Conv2D',    sub: '64@13×13', x: POS.conv2,   y: 1.7 },
  { id: 'pool',    txt: 'MaxPool',   sub: '64@6×6',   x: POS.pool,    y: 1.7 },
  { id: 'flatten', txt: 'Flatten',   sub: '2304',     x: POS.flatten, y: 2.3 },
  { id: 'dense',   txt: 'Dense',     sub: 'ReLU · 128', x: POS.dense,  y: 1.9 },
  { id: 'output',  txt: 'Output',    sub: 'softmax',  x: POS.output,  y: 1.7 },
];

const IMAGES = [
  { kind: 'cat', label: 'Cat · 01', file: 'images/cat1.jpg' },
  { kind: 'cat', label: 'Cat · 02', file: 'images/cat2.jpg' },
  { kind: 'dog', label: 'Dog · 01', file: 'images/dog1.jpg' },
  { kind: 'dog', label: 'Dog · 02', file: 'images/dog2.jpg' },
];

const PARTICLE_COUNT = 160;

// ===== SIMPLE ORBIT CONTROLS (plain JS, no external dependency) =====
function createSimpleControls(camera, domElement) {
  // Sensitivity constants (lower = slower / more precise movement)
  const ROTATE_SPEED = 0.002;
  const PAN_SPEED_FACTOR = 0.0012;
  const ZOOM_SPEED = 0.009;

  const state = {
    rotate: false,
    pan: false,
    autoRotate: true,
    autoRotateSpeed: 0.2, // slightly slower auto-rotation too
    enableDamping: true,
    dampingFactor: 0.07,
    minDistance: 6,
    maxDistance: 30,
  };

  let spherical = new THREE.Spherical();
  let target = new THREE.Vector3(0, 0, 0);
  let lastX = 0, lastY = 0;
  let phi = Math.PI / 2, theta = 0;
  let radius = 15;

  function updateSpherical() {
    camera.position.setFromSphericalCoords(radius, phi, theta);
    camera.lookAt(target);
  }

  function onPointerDown(e) {
    if (e.button === 0) state.rotate = true;
    if (e.button === 2) state.pan = true;
    lastX = e.clientX;
    lastY = e.clientY;
    state.autoRotate = false;
  }

  function onPointerUp() {
    state.rotate = false;
    state.pan = false;
  }

  function onPointerMove(e) {
    if (!state.rotate && !state.pan) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (state.rotate) {
      theta -= dx * ROTATE_SPEED;
      // dy is positive when mouse moves down on screen.
      // We add dy so that dragging the mouse up (negative dy) decreases phi,
      // which moves the camera upward (orbits toward the top of the scene).
      phi = Math.max(0.2, Math.min(Math.PI - 0.2, phi + dy * ROTATE_SPEED));
    }
    if (state.pan) {
      const panSpeed = radius * PAN_SPEED_FACTOR;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      right.crossVectors(camera.position, up).normalize();
      target.add(right.multiplyScalar(-dx * panSpeed));
      target.add(up.multiplyScalar(dy * panSpeed));
    }
    updateSpherical();
  }

  function onWheel(e) {
    e.preventDefault();
    radius = Math.max(state.minDistance, Math.min(state.maxDistance, radius + e.deltaY * ZOOM_SPEED));
    updateSpherical();
    state.autoRotate = false;
  }

  function onContextMenu(e) { e.preventDefault(); }

  domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('wheel', onWheel, { passive: false });
  domElement.addEventListener('contextmenu', onContextMenu);

  // Public API (mimics minimal OrbitControls)
  return {
    update: () => {
      if (state.autoRotate) {
        theta += state.autoRotateSpeed * 0.015;
        updateSpherical();
      }
      if (state.enableDamping) {
        // simple inertia for rotate state
      }
    },
    get autoRotate() { return state.autoRotate; },
    set autoRotate(v) { state.autoRotate = v; },
    get autoRotateSpeed() { return state.autoRotateSpeed; },
    set autoRotateSpeed(v) { state.autoRotateSpeed = v; },
    reset: () => {
      radius = 15; phi = Math.PI / 2; theta = 0; target.set(0, 0, 0);
      updateSpherical();
    }
  };
}

// ===== TEXTURES (procedural feature maps) =====
function makeFeatureMapTexture(seed, octave) {
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
      v = v < 0.32 ? 0 : (v - 0.32) / 0.68;

      const i = (y * N + x) * 4;
      img.data[i]     = Math.round(255 - v * 230);
      img.data[i + 1] = Math.round(255 - v * 137);
      img.data[i + 2] = Math.round(255 - v * 45);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// ===== SCENE CORE =====
function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR.bg);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 2, 15);
  camera.lookAt(0, 0, 0);

  const controls = createSimpleControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(4, 8, 6);
  scene.add(dirLight);

  // Grid
  const grid = new THREE.GridHelper(40, 40, 0xeeeeee, 0xeeeeee);
  grid.position.y = -4;
  grid.material.transparent = true;
  grid.material.opacity = 0.9;
  scene.add(grid);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return { scene, renderer, camera, controls, resize };
}

// ===== LAYERS =====
function createInputPlane(scene) {
  const texLoader = new THREE.TextureLoader();
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), material);
  mesh.position.set(POS.input, 0, 0);
  scene.add(mesh);

  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.5, 2.5)),
    new THREE.LineBasicMaterial({ color: COLOR.outline })
  );
  frame.position.set(POS.input, 0, 0.01);
  scene.add(frame);

  function loadImage(url) {
    return new Promise((resolve) => {
      texLoader.load(url,
        (texture) => { texture.minFilter = THREE.LinearFilter; resolve(texture); },
        undefined,
        () => resolve(null)
      );
    });
  }
  return { mesh, frame, material, loadImage };
}

function buildFeatureStack(scene, x, count, size, seedBase) {
  const group = new THREE.Group();
  group.position.x = x;
  const planes = [];
  const spread = 1.5;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const tex = makeFeatureMapTexture(seedBase + i, i);

    const material = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false
    });
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.z = (t - 0.5) * spread;
    mesh.position.y = (t - 0.5) * 0.25;
    mesh.userData.baseScale = 1;

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: COLOR.outline, transparent: true, opacity: 0.7 })
    );
    mesh.add(edges);

    group.add(mesh);
    planes.push(mesh);
  }
  scene.add(group);
  return { group, planes };
}

function buildFlattenLayer(scene) {
  const group = new THREE.Group();
  group.position.x = POS.flatten;
  const N = 24, dots = [];
  const geo = new THREE.SphereGeometry(0.07, 14, 14);

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const mat = new THREE.MeshLambertMaterial({ color: COLOR.primary, transparent: true, opacity: 0.8 });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = (t - 0.5) * 3.6;
    m.userData.baseScale = 1;
    group.add(m);
    dots.push(m);
  }
  scene.add(group);
  return { group, dots };
}

function buildDenseLayer(scene) {
  const group = new THREE.Group();
  group.position.x = POS.dense;
  const N = 8, dots = [];
  const geo = new THREE.SphereGeometry(0.16, 18, 18);

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const mat = new THREE.MeshLambertMaterial({
      color: i % 2 ? COLOR.secondary : COLOR.primary,
      transparent: true, opacity: 0.92
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = (t - 0.5) * 2.6;
    m.userData.baseScale = 1;
    group.add(m);
    dots.push(m);
  }
  scene.add(group);
  return { group, dots };
}

function buildOutputLayer(scene) {
  const group = new THREE.Group();
  group.position.x = POS.output;
  const nodes = [];
  const data = [
    { name: 'cat', y: 0.9, color: COLOR.cat },
    { name: 'dog', y: -0.9, color: COLOR.dog },
  ];

  data.forEach((L) => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 26, 26),
      new THREE.MeshLambertMaterial({ color: L.color })
    );
    sphere.position.y = L.y;
    sphere.userData.baseScale = 1;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.53, 40),
      new THREE.MeshBasicMaterial({ color: L.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.position.copy(sphere.position);
    ring.rotation.y = Math.PI / 2;

    group.add(ring);
    group.add(sphere);
    nodes.push({ sphere, ring, ...L });
  });
  scene.add(group);
  return { group, nodes };
}

function buildConnections(scene, srcObjects, dstObjects, color, opacity, maxLines = 64) {
  const positions = [], pairs = [];
  for (let i = 0; i < srcObjects.length; i++) {
    for (let j = 0; j < dstObjects.length; j++) pairs.push([i, j]);
  }
  for (let i = pairs.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[r]] = [pairs[r], pairs[i]];
  }
  const selected = pairs.slice(0, Math.min(maxLines, pairs.length));

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  selected.forEach(([i, j]) => {
    const src = srcObjects[i], dst = dstObjects[j];
    if (!src || !dst) return;
    src.getWorldPosition(tmpA);
    dst.getWorldPosition(tmpB);
    positions.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  scene.add(lines);
  return { lines, material: mat, baseOpacity: opacity };
}

// ===== PARTICLES =====
function createParticleSystem(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const progress = new Float32Array(PARTICLE_COUNT);
  const lanes = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = POS.input;
    positions[i * 3 + 1] = 999;
    positions[i * 3 + 2] = 0;
    progress[i] = -1;
    lanes[i] = (Math.random() - 0.5) * 1.6;
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: COLOR.primary, size: 0.10, transparent: true,
    opacity: 0.9, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { points, geometry, positions, progress, lanes };
}

function updateParticles(particles, pathX, dt) {
  const { positions, progress, lanes, geometry } = particles;
  const arr = positions;
  const segs = pathX.length - 1;
  let completed = false;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    progress[i] += dt * 0.35;
    const p = progress[i];
    if (p < 0 || p > 1) { arr[i * 3 + 1] = 999; continue; }

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

function hideParticles(particles) {
  const { positions, geometry } = particles;
  const arr = positions;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (arr[i * 3 + 1] !== 999) arr[i * 3 + 1] = 999;
  }
  geometry.attributes.position.needsUpdate = true;
}

// ===== LABELS & OVERLAY =====
function createLayerLabels(camera) {
  const container = document.getElementById('layer-labels');
  if (!container) return { update: () => {}, elements: {} };

  const elements = {};
  const tmpV = new THREE.Vector3();

  LAYER_LABELS.forEach((layer) => {
    const el = document.createElement('div');
    el.className = 'lbl';
    el.dataset.id = layer.id;
    el.innerHTML = `<b>${layer.txt}</b><span class="meta">${layer.sub}</span>`;
    container.appendChild(el);
    elements[layer.id] = el;
  });

  function project(x, y, z) {
    tmpV.set(x, y, z).project(camera);
    return {
      x: (tmpV.x * 0.5 + 0.5) * window.innerWidth,
      y: (-tmpV.y * 0.5 + 0.5) * window.innerHeight,
      behind: tmpV.z > 1,
    };
  }

  function update() {
    LAYER_LABELS.forEach((layer) => {
      const p = project(layer.x, layer.y, 0);
      const el = elements[layer.id];
      if (!el) return;
      if (p.behind) { el.style.display = 'none'; return; }
      el.style.display = 'flex';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    });
  }
  return { update, elements };
}

function createVecOverlay(camera) {
  const el = document.getElementById('vec-overlay');
  if (!el) return { update: () => {}, show: () => {}, hide: () => {}, render: () => {} };

  const tmpV = new THREE.Vector3();
  function project(x, y, z) {
    tmpV.set(x, y, z).project(camera);
    return {
      x: (tmpV.x * 0.5 + 0.5) * window.innerWidth,
      y: (-tmpV.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function update() {
    const p = project(POS.flatten + 0.7, 0.0, 0.6);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  }

  function render(samples = []) {
    if (!samples.length) {
      el.innerHTML = '<div class="vhead">Flatten vector</div>';
      return;
    }
    el.innerHTML = `
      <div class="vhead">Flatten activations (sample)</div>
      ${samples.map(s => `
        <div class="v">
          <span class="idx">${s.idx}</span>
          <span class="num">${s.value.toFixed(2)}</span>
          <div class="bar" style="--w: ${Math.max(3, s.value * 100)}%"></div>
        </div>
      `).join('')}
    `;
  }

  function show() { el.classList.add('show'); }
  function hide() {
    el.classList.remove('show');
    el.innerHTML = '';
  }

  return { update, show, hide, render };
}

// ===== SIMULATION =====
function createSimulation(controls, outputNodes, connections, particles) {
  let playing = false;
  let playT = 0;
  let activeLayerIndex = -1;

  const pulses = { conv1: 0, conv2: 0, pool: 0, flatten: 0, dense: 0, output: 0 };

  function activateLayer(index, statusTextEl, statusMetaEl) {
    activeLayerIndex = index;
    Object.keys(pulses).forEach(k => {
      const lbl = document.querySelector(`.layer-labels .lbl[data-id="${k}"]`);
      if (lbl) lbl.classList.remove('active');
    });

    if (index >= 0 && index < LAYER_LABELS.length) {
      const layer = LAYER_LABELS[index];
      const lbl = document.querySelector(`.layer-labels .lbl[data-id="${layer.id}"]`);
      if (lbl) lbl.classList.add('active');
      if (statusTextEl) statusTextEl.textContent = `forward pass · ${layer.txt.toLowerCase()} · ${layer.sub}`;
      if (statusMetaEl) statusMetaEl.textContent = 'streaming activations';
      if (layer.id in pulses) pulses[layer.id] = 1.0;
    } else {
      if (statusTextEl) statusTextEl.textContent = 'idle · inference complete';
      if (statusMetaEl) statusMetaEl.textContent = 'drag to orbit';
    }
  }

  function startInference(statusTextEl, statusMetaEl) {
    if (playing) return;
    playing = true;
    playT = 0;
    controls.autoRotate = false;

    if (statusTextEl) statusTextEl.textContent = 'forward pass · starting';
    if (statusMetaEl) statusMetaEl.textContent = 'streaming activations';

    for (let i = 0; i < particles.progress.length; i++) {
      particles.progress[i] = -((i / particles.progress.length) * 1.5);
    }
    connections.forEach(c => { c.material.opacity = c.baseOpacity; });
    outputNodes.forEach(n => {
      n.ring.material.opacity = 0.35;
      n.sphere.material.opacity = 1;
    });
    Object.keys(pulses).forEach(k => (pulses[k] = 0));

    const btn = document.getElementById('classify');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Inferring…'; }
    const pred = document.getElementById('pred');
    if (pred) pred.classList.remove('show');
  }

  function finishInference(currentImage, updateAccuracyFn) {
    playing = false;
    controls.autoRotate = true;

    const btn = document.getElementById('classify');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Classify<span class="arrow">→</span>'; }

    const acc = updateAccuracyFn ? updateAccuracyFn() : 0.82;
    const correct = Math.random() < acc;
    const winner = correct ? currentImage.kind : (currentImage.kind === 'cat' ? 'dog' : 'cat');

    let catScore, dogScore;
    if (winner === 'cat') {
      catScore = 0.55 + Math.random() * 0.4;
      dogScore = 1 - catScore;
    } else {
      dogScore = 0.55 + Math.random() * 0.4;
      catScore = 1 - dogScore;
    }

    const barCat = document.getElementById('bar-cat');
    const barDog = document.getElementById('bar-dog');
    const pctCat = document.getElementById('pct-cat');
    const pctDog = document.getElementById('pct-dog');
    const winnerEl = document.getElementById('winner');
    const pred = document.getElementById('pred');

    if (barCat) barCat.style.width = (catScore * 100).toFixed(1) + '%';
    if (barDog) barDog.style.width = (dogScore * 100).toFixed(1) + '%';
    if (pctCat) pctCat.textContent = (catScore * 100).toFixed(1) + '%';
    if (pctDog) pctDog.textContent = (dogScore * 100).toFixed(1) + '%';
    if (winnerEl) winnerEl.textContent = winner.charAt(0).toUpperCase() + winner.slice(1) + ' · ' + Math.max(catScore, dogScore).toFixed(3);
    if (pred) pred.classList.add('show');

    const statusText = document.getElementById('status-text');
    const statusMeta = document.getElementById('status-meta');
    if (statusText) statusText.textContent = 'idle · inference complete';
    if (statusMeta) statusMeta.textContent = `predicted ${winner}`;

    activateLayer(-1, statusText, statusMeta);

    outputNodes.forEach(n => {
      if (n.name === winner) {
        n.ring.material.opacity = 0.85;
        n.sphere.material.opacity = 1;
      } else {
        n.ring.material.opacity = 0.20;
        n.sphere.material.opacity = 0.5;
      }
    });
  }

  function isPlaying() { return playing; }
  function getPlayTime() { return playT; }

  function tick(dt, totalDuration, onLayerChange, onComplete) {
    if (!playing) return false;
    playT += dt;
    const prog = Math.min(1, playT / totalDuration);
    const li = Math.min(LAYER_LABELS.length - 1, Math.floor(prog * LAYER_LABELS.length));
    if (li !== activeLayerIndex) onLayerChange?.(li);
    if (prog >= 1) { onComplete?.(); return true; }
    return false;
  }

  return { pulses, startInference, finishInference, activateLayer, isPlaying, getPlayTime, tick };
}

// ===== UI (panel, thumbs, slider, chart) =====
function initUI({ onImageSelect, onClassify, onAccuracyChange }) {
  const thumbsEl = document.getElementById('thumbs');
  let currentImageIdx = 0;

  IMAGES.forEach((im, idx) => {
    const wrap = document.createElement('div');
    wrap.className = `thumb${idx === 0 ? ' active' : ''}`;

    const img = document.createElement('img');
    img.src = im.file;
    img.alt = im.label;

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = im.kind;

    wrap.appendChild(img);
    wrap.appendChild(tag);

    wrap.addEventListener('click', () => {
      [...thumbsEl.children].forEach(ch => ch.classList.remove('active'));
      wrap.classList.add('active');
      currentImageIdx = idx;
      onImageSelect?.(idx, im);
      document.getElementById('lbl-input').textContent = im.label;
      document.getElementById('pred')?.classList.remove('show');
    });
    thumbsEl.appendChild(wrap);
  });

  const slider = document.getElementById('dataset');
  const accVal = document.getElementById('acc-val');
  const accDelta = document.getElementById('acc-delta');
  const lblSamples = document.getElementById('lbl-samples');
  const chart = document.getElementById('chart');
  const cctx = chart?.getContext('2d');

  function samplesFromSlider(v) {
    const t = v / 100;
    return Math.round(100 * Math.pow(100, t));
  }
  function accuracyBase(samples) {
    return 0.5 + 0.45 * (1 - Math.exp(-samples / 2000));
  }
  function accuracyFor(samples) {
    const base = accuracyBase(samples);
    const jitter = (Math.random() * 2 - 1) * 0.02;
    return Math.max(0.5, Math.min(0.97, base + jitter));
  }

  let lastAcc = null;

  function updateAccuracy() {
    const v = +slider.value;
    const samples = samplesFromSlider(v);
    const a = accuracyFor(samples);
    const pct = a * 100;

    if (lastAcc !== null) {
      const d = pct - lastAcc;
      accDelta.textContent = (d >= 0 ? '+' : '') + d.toFixed(1) + ' vs prev';
      accDelta.style.color = d >= 0 ? 'var(--cat)' : 'var(--dog)';
    } else {
      accDelta.textContent = 'baseline';
      accDelta.style.color = 'var(--on-surface-3)';
    }
    lastAcc = pct;

    accVal.textContent = pct.toFixed(1);
    lblSamples.textContent = samples.toLocaleString();
    drawChart(v);
    onAccuracyChange?.(a);
    return a;
  }

  function drawChart(currentV) {
    if (!cctx || !chart) return;
    const W = chart.clientWidth * window.devicePixelRatio;
    const H = chart.clientHeight * window.devicePixelRatio;
    if (chart.width !== W) { chart.width = W; chart.height = H; }
    cctx.clearRect(0, 0, W, H);

    cctx.strokeStyle = '#eeeeee';
    cctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * H;
      cctx.beginPath(); cctx.moveTo(0, y); cctx.lineTo(W, y); cctx.stroke();
    }

    cctx.strokeStyle = '#1976d2';
    cctx.lineWidth = 2 * window.devicePixelRatio;
    cctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const s = samplesFromSlider(i);
      const a = accuracyBase(s);
      const x = (i / 100) * W;
      const y = H - ((a - 0.5) / (0.97 - 0.5)) * (H - 8) - 4;
      if (i === 0) cctx.moveTo(x, y); else cctx.lineTo(x, y);
    }
    cctx.stroke();

    cctx.lineTo(W, H); cctx.lineTo(0, H); cctx.closePath();
    const grad = cctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(25,118,210,.18)');
    grad.addColorStop(1, 'rgba(25,118,210,0)');
    cctx.fillStyle = grad;
    cctx.fill();

    const s = samplesFromSlider(currentV);
    const a = accuracyBase(s);
    const mx = (currentV / 100) * W;
    const my = H - ((a - 0.5) / (0.97 - 0.5)) * (H - 8) - 4;

    cctx.strokeStyle = '#bdbdbd';
    cctx.setLineDash([3, 3]);
    cctx.lineWidth = 1 * window.devicePixelRatio;
    cctx.beginPath(); cctx.moveTo(mx, 0); cctx.lineTo(mx, H); cctx.stroke();
    cctx.setLineDash([]);

    cctx.fillStyle = '#1976d2';
    cctx.beginPath();
    cctx.arc(mx, my, 3.5 * window.devicePixelRatio, 0, Math.PI * 2);
    cctx.fill();
    cctx.strokeStyle = '#fff';
    cctx.lineWidth = 1.5 * window.devicePixelRatio;
    cctx.stroke();
  }

  slider.addEventListener('input', updateAccuracy);
  updateAccuracy();

  const btn = document.getElementById('classify');
  btn.addEventListener('click', (e) => {
    const rect = btn.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.left = e.clientX - rect.left - size / 2 + 'px';
    r.style.top = e.clientY - rect.top - size / 2 + 'px';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
    onClassify?.();
  });

  const panelEl = document.getElementById('panel');
  const toggle = document.getElementById('panel-toggle');
  const close = document.getElementById('panel-close');

  function setPanelHidden(hidden) {
    panelEl.classList.toggle('hidden', hidden);
    document.body.classList.toggle('panel-hidden', hidden);
  }
  close.addEventListener('click', () => setPanelHidden(true));
  toggle.addEventListener('click', () => setPanelHidden(false));
  if (window.matchMedia('(max-width: 720px)').matches) setPanelHidden(true);

  return {
    getCurrentImage: () => IMAGES[currentImageIdx],
    updateAccuracy
  };
}

// ===== MAIN APPLICATION =====
(function main() {
  const canvas = document.getElementById('three');
  const { scene, renderer, camera, controls } = createScene(canvas);

  // Build CNN visualization
  const input = createInputPlane(scene);

  const conv1 = buildFeatureStack(scene, POS.conv1, 6, 1.9, 11);
  const conv2 = buildFeatureStack(scene, POS.conv2, 6, 1.7, 23);
  const pool  = buildFeatureStack(scene, POS.pool, 6, 1.1, 41);

  const flatten = buildFlattenLayer(scene);
  const dense   = buildDenseLayer(scene);
  const output  = buildOutputLayer(scene);

  const connections = [];
  connections.push(buildConnections(scene, [input.mesh], conv1.planes, COLOR.outline, 0.65, 12));
  connections.push(buildConnections(scene, conv1.planes, conv2.planes, COLOR.outline, 0.45, 22));
  connections.push(buildConnections(scene, conv2.planes, pool.planes, COLOR.outline, 0.45, 22));
  connections.push(buildConnections(scene, pool.planes, flatten.dots, COLOR.outline, 0.30, 42));
  connections.push(buildConnections(scene, flatten.dots, dense.dots, COLOR.outline, 0.30, 60));
  connections.push(buildConnections(scene, dense.dots, output.nodes.map(n => n.sphere), COLOR.primary, 0.55, 16));

  const particles = createParticleSystem(scene);
  const layerLabels = createLayerLabels(camera);
  const vecOverlay = createVecOverlay(camera);

  const simulation = createSimulation(controls, output.nodes, connections, particles);

  // Load images
  let currentImage = IMAGES[0];
  async function loadInitialImage() {
    const tex = await input.loadImage(currentImage.file);
    if (tex) {
      input.material.map = tex;
      input.material.needsUpdate = true;
    }
  }
  loadInitialImage();

  // UI
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
    }
  });

  // Idle auto-rotate
  let lastInteract = performance.now();
  ['pointerdown', 'wheel', 'keydown'].forEach(ev => {
    window.addEventListener(ev, () => {
      lastInteract = performance.now();
      if (!simulation.isPlaying()) controls.autoRotate = false;
    });
  });

  // Render loop
  const clock = new THREE.Clock();
  const PATH_X = [POS.input, POS.conv1, POS.conv2, POS.pool, POS.flatten, POS.dense, POS.output];

  function tick() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    if (!simulation.isPlaying()) {
      if (performance.now() - lastInteract > 4000) {
        controls.autoRotate = true;
      }
    }
    controls.update();

    // Breathing animation
    [conv1, conv2, pool].forEach((layer, i) => {
      layer.planes.forEach((plane, j) => {
        const base = (j / (layer.planes.length - 1) - 0.5) * 1.5;
        plane.position.z = base + Math.sin(t * 0.5 + i * 1.3 + j * 0.7) * 0.025;
      });
    });

    // Pulses
    for (const k in simulation.pulses) {
      simulation.pulses[k] = Math.max(0, simulation.pulses[k] - dt * 1.6);
    }
    function applyPulse(meshes, key, maxScale = 1.18) {
      const p = simulation.pulses[key] || 0;
      const s = 1 + p * (maxScale - 1);
      meshes.forEach(m => {
        m.scale.setScalar((m.userData.baseScale || 1) * s);
      });
    }
    applyPulse(conv1.planes, 'conv1', 1.05);
    applyPulse(conv2.planes, 'conv2', 1.05);
    applyPulse(pool.planes, 'pool', 1.05);
    applyPulse(flatten.dots, 'flatten', 1.25);
    applyPulse(dense.dots, 'dense', 1.25);
    applyPulse(output.nodes.map(n => n.sphere), 'output', 1.2);

    const playing = simulation.isPlaying();
    if (playing) {
      const finished = simulation.tick(
        dt, 4.0,
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
      updateParticles(particles, PATH_X, dt);

      if (simulation.pulses.flatten > 0.1) {
        vecOverlay.show();

        // Live sample of the flatten vector (simulated activations)
        const pulse = simulation.pulses.flatten;
        const samples = Array.from({ length: 9 }, (_, i) => {
          const baseIdx = i * 255 + Math.floor((t * 2.5) % 60);
          const idx = Math.min(2303, Math.max(0, baseIdx));
          // Values "stream" and react to the pulse intensity
          const v = 0.15 + Math.sin(t * 3.8 + i * 1.7) * 0.35 * pulse + (Math.sin(t * 7 + i) * 0.1 * pulse);
          const value = Math.max(0.02, Math.min(0.98, v));
          return { idx, value };
        });
        vecOverlay.render(samples);
      }
    } else {
      hideParticles(particles);
      vecOverlay.hide();
    }

    output.nodes.forEach((n, i) => {
      n.ring.rotation.z = t * (i ? 0.4 : -0.4);
    });

    layerLabels.update();
    vecOverlay.update();

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();

  // Debug handle
  window.__CNN_VISUALIZER__ = { scene, camera, controls, simulation };
})();
