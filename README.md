# CNN Visualizer

An interactive 3D visualization of a convolutional neural network classifying cat vs. dog images (64×64 input).

Built with **plain HTML + CSS + JavaScript** + Three.js (loaded from CDN via classic script).  
**Zero npm, zero build step, zero bundler required.**

## Run it (no installation)

### GitHub Pages (easiest)
1. Push the files to your repository.
2. Go to **Settings → Pages**.
3. Set Source to your branch + folder `/ (root)`.
4. The site will be live shortly.

### Local (any static server)

```bash
# Python (built-in, works everywhere)
python3 -m http.server 8080

# Then open http://localhost:8080
```

Other options:
- VS Code "Live Server" extension
- `npx serve .` (if you have Node)

**Important:** Double-clicking `index.html` directly (`file://`) often has issues with image loading. Use one of the methods above.

## Files

This is a true plain project:

- `index.html` — the page
- `styles.css` — all styles
- `app.js` — all the visualization logic (no modules)
- `images/` — the 4 sample photos
- `three.min.js` — only present if you want a fully offline copy (currently the app loads Three.js from CDN)

## How to customize

Just edit `app.js` and `styles.css` with any text editor. No build step.

## Optional: fully offline single-file version

If you need one `index.html` that works with double-click / email / USB (everything inlined):

```bash
npm install          # only needed once
npm run build:single
```

Then use `dist/index.single.html`.

## Original modular source

The `src/` folder + `vite.config.js` + `package.json` are the old modular (Vite) version.  
They are kept only for reference. The active plain version lives in the root files.

## License

MIT