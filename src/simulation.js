import { LAYER_LABELS } from './constants.js';

export function createSimulation(controls, outputNodes, connections, particles) {
  let playing = false;
  let playT = 0;
  let activeLayerIndex = -1;

  // Pulse intensity per layer (decayed in the animation loop)
  const pulses = {
    conv1: 0,
    conv2: 0,
    pool: 0,
    flatten: 0,
    dense: 0,
    output: 0,
  };

  function activateLayer(index, statusTextEl, statusMetaEl) {
    activeLayerIndex = index;

    // Update label highlighting
    Object.keys(pulses).forEach((k) => {
      const lbl = document.querySelector(`.layer-labels .lbl[data-id="${k}"]`);
      if (lbl) lbl.classList.toggle('active', false);
    });

    if (index >= 0 && index < LAYER_LABELS.length) {
      const layer = LAYER_LABELS[index];
      const lbl = document.querySelector(`.layer-labels .lbl[data-id="${layer.id}"]`);
      if (lbl) lbl.classList.add('active');

      if (statusTextEl) {
        statusTextEl.textContent = `forward pass · ${layer.txt.toLowerCase()} · ${layer.sub}`;
      }
      if (statusMetaEl) {
        statusMetaEl.textContent = 'streaming activations';
      }

      if (layer.id in pulses) {
        pulses[layer.id] = 1.0;
      }
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

    // Reset particles
    for (let i = 0; i < particles.progress.length; i++) {
      particles.progress[i] = -((i / particles.progress.length) * 1.5);
    }

    // Reset connection opacity
    connections.forEach((c) => {
      c.material.opacity = c.baseOpacity;
    });

    // Reset output rings
    outputNodes.forEach((n) => {
      n.ring.material.opacity = 0.35;
      n.sphere.material.opacity = 1;
    });

    Object.keys(pulses).forEach((k) => (pulses[k] = 0));

    // UI
    const btn = document.getElementById('classify');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Inferring…';
    }

    const pred = document.getElementById('pred');
    if (pred) pred.classList.remove('show');
  }

  function finishInference(currentImage, updateAccuracyFn) {
    playing = false;
    controls.autoRotate = true;

    const btn = document.getElementById('classify');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Classify<span class="arrow">→</span>';
    }

    const acc = updateAccuracyFn ? updateAccuracyFn() : 0.82;
    const correct = Math.random() < acc;
    const winner = correct
      ? currentImage.kind
      : currentImage.kind === 'cat'
      ? 'dog'
      : 'cat';

    let catScore, dogScore;
    if (winner === 'cat') {
      catScore = 0.55 + Math.random() * 0.4;
      dogScore = 1 - catScore;
    } else {
      dogScore = 0.55 + Math.random() * 0.4;
      catScore = 1 - dogScore;
    }

    // Update prediction bars
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
    if (winnerEl) {
      winnerEl.textContent =
        winner.charAt(0).toUpperCase() + winner.slice(1) + ' · ' + Math.max(catScore, dogScore).toFixed(3);
    }
    if (pred) pred.classList.add('show');

    const statusText = document.getElementById('status-text');
    const statusMeta = document.getElementById('status-meta');
    if (statusText) statusText.textContent = 'idle · inference complete';
    if (statusMeta) statusMeta.textContent = `predicted ${winner}`;

    activateLayer(-1, statusText, statusMeta);

    // Dim the losing output node
    outputNodes.forEach((n) => {
      if (n.name === winner) {
        n.ring.material.opacity = 0.85;
        n.sphere.material.opacity = 1;
      } else {
        n.ring.material.opacity = 0.20;
        n.sphere.material.opacity = 0.5;
      }
    });
  }

  function isPlaying() {
    return playing;
  }

  function getPlayTime() {
    return playT;
  }

  function tick(dt, totalDuration, onLayerChange, onComplete) {
    if (!playing) return false;

    playT += dt;
    const prog = Math.min(1, playT / totalDuration);
    const li = Math.min(LAYER_LABELS.length - 1, Math.floor(prog * LAYER_LABELS.length));

    if (li !== activeLayerIndex) {
      onLayerChange?.(li);
    }

    if (prog >= 1) {
      onComplete?.();
      return true;
    }
    return false;
  }

  return {
    pulses,
    startInference,
    finishInference,
    activateLayer,
    isPlaying,
    getPlayTime,
    tick,
  };
}
