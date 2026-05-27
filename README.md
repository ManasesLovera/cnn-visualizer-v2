# CNN Visualizer

An interactive 3D visualization of a convolutional neural network classifying cat vs. dog images (64×64 input).

Built with **Three.js** + vanilla JavaScript. The visualization shows the forward pass through the network layers with animated particles, pulsing feature maps, and a live inference panel.

<img width="1914" height="979" alt="image" src="https://github.com/user-attachments/assets/2bd59124-0db7-4ea5-92aa-6c46d195907f" />


## Features

- **3D CNN architecture** — Input → Conv2D ×2 → MaxPool → Flatten → Dense → Output
- **Live particle flow** during simulated inference
- **Interactive camera** (OrbitControls): drag to orbit, right-drag to pan, scroll to zoom
- **Procedural feature map textures** with a clean, muted blue aesthetic
- **Inference panel** with:
  - 4 sample images (2 cats, 2 dogs)
  - Adjustable "dataset size" affecting simulated accuracy
  - Accuracy curve visualization
  - Prediction bars + winner display
- Auto-rotate resumes after inactivity
- Fully responsive (collapses panel on mobile)

## Quick Start

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Building

### Standard build (recommended)

```bash
npm run build
npm run preview
```

Output goes to `dist/`.

### Single-file self-contained build

```bash
npm run build
npm run build:single
```

This produces `dist/index.single.html` — a completely standalone HTML file (all JS, CSS, and images inlined as base64). Great for sharing via email, USB, or `file://`.

## Project Structure

```
cnn-visualizer/
├── public/
│   └── images/           # cat1.jpg, cat2.jpg, dog1.jpg, dog2.jpg
├── src/
│   ├── main.js           # Entry point + render loop
│   ├── constants.js      # Colors, positions, layer metadata
│   ├── textures.js       # Procedural feature map generator
│   ├── simulation.js     # Inference playback state machine
│   ├── scene/
│   │   ├── core.js       # Scene, camera, renderer, lights, controls
│   │   ├── layers.js     # All layer construction (input, conv, dense, output…)
│   │   ├── particles.js  # Particle system + animation
│   │   └── labels.js     # 3D→2D projected HTML labels + vector overlay
│   └── ui/
│       └── panel.js      # Thumbs, slider, chart, classify button, panel toggle
├── scripts/
│   └── build-single.js   # Post-build inliner for single-file distribution
├── index.html            # Vite shell
├── vite.config.js
└── package.json
```

## Architecture Notes

- **No React** — despite the original bundler scaffolding suggesting otherwise, this is pure vanilla + Three.js.
- The "inference" is a **deterministic-looking simulation** (not a real model). This is intentional for a visual teaching tool.
- Layer positions and animation timings are centralized in `constants.js` and `simulation.js`.
- The particle path follows the exact X positions defined in `POS`.
- All DOM overlays (layer labels, vector view) are projected from 3D using `Vector3.project()`.

## Customization Ideas

- Add real model inference using TensorFlow.js or ONNX Runtime Web
- Support drag-and-drop of custom images (with proper preprocessing to 64×64)
- Visualize actual activation maps from a small trained CNN
- Add more layer types (BatchNorm, Dropout visualization, etc.)
- Export the current camera view or a short animation as video/GIF

## Original Version

The previous version was a single 627 KB `index.html` with a custom base64 bundler. This refactored version:

- Is much easier to read and modify
- Uses modern tooling (Vite + ES modules)
- Preserves the exact same visual experience
- Still supports single-file distribution via `build:single`

## License

MIT
