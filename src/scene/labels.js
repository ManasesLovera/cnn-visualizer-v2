import * as THREE from 'three';
import { POS, LAYER_LABELS } from '../constants.js';

const tmpV = new THREE.Vector3();

function project(camera, x, y, z) {
  tmpV.set(x, y, z).project(camera);
  return {
    x: (tmpV.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tmpV.y * 0.5 + 0.5) * window.innerHeight,
    behind: tmpV.z > 1,
  };
}

export function createLayerLabels(camera) {
  const container = document.getElementById('layer-labels');
  if (!container) return { update: () => {}, elements: {} };

  const elements = {};

  LAYER_LABELS.forEach((layer) => {
    const el = document.createElement('div');
    el.className = 'lbl';
    el.dataset.id = layer.id;
    el.innerHTML = `<b>${layer.txt}</b><span class="meta">${layer.sub}</span>`;
    container.appendChild(el);
    elements[layer.id] = el;
  });

  function update() {
    LAYER_LABELS.forEach((layer) => {
      const p = project(camera, layer.x, layer.y, 0);
      const el = elements[layer.id];
      if (!el) return;

      if (p.behind) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'flex';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    });
  }

  return { update, elements };
}

export function createVecOverlay(camera) {
  const el = document.getElementById('vec-overlay');
  if (!el) return { update: () => {}, show: () => {}, hide: () => {} };

  function update() {
    const p = project(camera, POS.flatten + 0.7, 0.0, 0.6);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  }

  function show() { el.classList.add('show'); }
  function hide() { el.classList.remove('show'); }

  return { update, show, hide, element: el };
}
