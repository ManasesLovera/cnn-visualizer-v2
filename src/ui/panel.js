import { IMAGES } from '../constants.js';

export function initUI({ onImageSelect, onClassify, onAccuracyChange }) {
  // Thumbnails
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
      [...thumbsEl.children].forEach((ch) => ch.classList.remove('active'));
      wrap.classList.add('active');
      currentImageIdx = idx;
      onImageSelect?.(idx, im);
      document.getElementById('lbl-input').textContent = im.label;
      document.getElementById('pred')?.classList.remove('show');
    });

    thumbsEl.appendChild(wrap);
  });

  // Dataset slider + accuracy
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
    slider.style.setProperty('--pct', v + '%');

    drawChart(v);
    onAccuracyChange?.(a);
    return a;
  }

  function drawChart(currentV) {
    if (!cctx || !chart) return;

    const W = chart.clientWidth * window.devicePixelRatio;
    const H = chart.clientHeight * window.devicePixelRatio;
    if (chart.width !== W) {
      chart.width = W;
      chart.height = H;
    }
    cctx.clearRect(0, 0, W, H);

    // Grid
    cctx.strokeStyle = '#eeeeee';
    cctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * H;
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(W, y);
      cctx.stroke();
    }

    // Accuracy curve
    cctx.strokeStyle = '#1976d2';
    cctx.lineWidth = 2 * window.devicePixelRatio;
    cctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const s = samplesFromSlider(i);
      const a = accuracyBase(s);
      const x = (i / 100) * W;
      const y = H - ((a - 0.5) / (0.97 - 0.5)) * (H - 8) - 4;
      if (i === 0) cctx.moveTo(x, y);
      else cctx.lineTo(x, y);
    }
    cctx.stroke();

    // Fill under curve
    cctx.lineTo(W, H);
    cctx.lineTo(0, H);
    cctx.closePath();
    const grad = cctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(25,118,210,.18)');
    grad.addColorStop(1, 'rgba(25,118,210,0)');
    cctx.fillStyle = grad;
    cctx.fill();

    // Current marker
    const s = samplesFromSlider(currentV);
    const a = accuracyBase(s);
    const mx = (currentV / 100) * W;
    const my = H - ((a - 0.5) / (0.97 - 0.5)) * (H - 8) - 4;

    cctx.strokeStyle = '#bdbdbd';
    cctx.setLineDash([3, 3]);
    cctx.lineWidth = 1 * window.devicePixelRatio;
    cctx.beginPath();
    cctx.moveTo(mx, 0);
    cctx.lineTo(mx, H);
    cctx.stroke();
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

  // Classify button + ripple
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

  // Panel toggle
  const panelEl = document.getElementById('panel');
  const toggle = document.getElementById('panel-toggle');
  const close = document.getElementById('panel-close');

  function setPanelHidden(hidden) {
    panelEl.classList.toggle('hidden', hidden);
    document.body.classList.toggle('panel-hidden', hidden);
  }

  close.addEventListener('click', () => setPanelHidden(true));
  toggle.addEventListener('click', () => setPanelHidden(false));

  // Start collapsed on mobile
  if (window.matchMedia('(max-width: 720px)').matches) {
    setPanelHidden(true);
  }

  // Expose a few helpers
  return {
    getCurrentImage: () => IMAGES[currentImageIdx],
    getCurrentImageIndex: () => currentImageIdx,
    drawChart,
    updateAccuracy,
  };
}
