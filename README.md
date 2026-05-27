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
- Any other static file server

**Important:** Double-clicking `index.html` directly (`file://`) often has issues with image loading. Use one of the methods above.

## Files

This is a true plain static project:

- `index.html` — the page
- `styles.css` — all styles
- `app.js` — all the visualization logic (plain JavaScript, no modules)
- `images/` — the 4 sample photos

## How to customize

Just edit `app.js` and `styles.css` with any text editor. There is no build step.

## Fully offline / single-file version

If you need one self-contained `index.html` (for email, USB, or `file://` use), you can manually create one by:

1. Inlining the contents of `styles.css` into a `<style>` tag
2. Inlining `app.js` into a `<script>` tag
3. Embedding the images as base64

Or use an external tool to bundle it.

## License

MIT