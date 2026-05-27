import * as THREE from 'three';
import { COLOR, POS } from '../constants.js';
import { makeFeatureMapTexture } from '../textures.js';

export function createInputPlane(scene) {
  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    material
  );
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
      texLoader.load(
        url,
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  return { mesh, frame, material, loadImage };
}

/** Stacked translucent feature map planes (used for conv1, conv2, pool) */
export function buildFeatureStack(scene, x, count, size, seedBase) {
  const group = new THREE.Group();
  group.position.x = x;

  const planes = [];
  const spread = 1.5;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const tex = makeFeatureMapTexture(seedBase + i, i);

    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.z = (t - 0.5) * spread;
    mesh.position.y = (t - 0.5) * 0.25;
    mesh.userData.baseScale = 1;

    // Soft outline
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({
        color: COLOR.outline,
        transparent: true,
        opacity: 0.7,
      })
    );
    mesh.add(edges);

    group.add(mesh);
    planes.push(mesh);
  }

  scene.add(group);
  return { group, planes };
}

/** Column of small spheres representing the flatten layer */
export function buildFlattenLayer(scene) {
  const group = new THREE.Group();
  group.position.x = POS.flatten;

  const N = 24;
  const dots = [];
  const geo = new THREE.SphereGeometry(0.07, 14, 14);

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const mat = new THREE.MeshLambertMaterial({
      color: COLOR.primary,
      transparent: true,
      opacity: 0.8,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = (t - 0.5) * 3.6;
    m.userData.baseScale = 1;
    group.add(m);
    dots.push(m);
  }

  scene.add(group);
  return { group, dots };
}

/** Column of larger spheres for the dense layer */
export function buildDenseLayer(scene) {
  const group = new THREE.Group();
  group.position.x = POS.dense;

  const N = 8;
  const dots = [];
  const geo = new THREE.SphereGeometry(0.16, 18, 18);

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const mat = new THREE.MeshLambertMaterial({
      color: i % 2 ? COLOR.secondary : COLOR.primary,
      transparent: true,
      opacity: 0.92,
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

/** Final output nodes (cat + dog) with spinning rings */
export function buildOutputLayer(scene) {
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
      new THREE.MeshBasicMaterial({
        color: L.color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
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

/** Draw sparse connection lines between two sets of objects */
export function buildConnections(scene, srcObjects, dstObjects, color, opacity, maxLines = 64) {
  const positions = [];
  const pairs = [];

  for (let i = 0; i < srcObjects.length; i++) {
    for (let j = 0; j < dstObjects.length; j++) {
      pairs.push([i, j]);
    }
  }

  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[r]] = [pairs[r], pairs[i]];
  }

  const selected = pairs.slice(0, Math.min(maxLines, pairs.length));

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  selected.forEach(([i, j]) => {
    const src = srcObjects[i];
    const dst = dstObjects[j];
    if (!src || !dst) return;

    src.getWorldPosition(tmpA);
    dst.getWorldPosition(tmpB);
    positions.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geo, mat);
  scene.add(lines);

  return { lines, material: mat, baseOpacity: opacity };
}
