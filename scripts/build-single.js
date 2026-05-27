/**
 * build-single.js
 * Post-build step that produces a single self-contained index.html
 * from the normal Vite dist output.
 *
 * Usage: npm run build && npm run build:single
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const outFile = path.resolve(__dirname, '../dist/index.single.html');

function toBase64(filePath) {
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${data.toString('base64')}`;
}

function inlineAssets(html) {
  // Inline CSS
  html = html.replace(
    /<link[^>]+href="([^"]+\.css)"[^>]*>/g,
    (match, href) => {
      const cssPath = path.join(distDir, href.replace(/^\//, ''));
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf8');
        return `<style>${css}</style>`;
      }
      return match;
    }
  );

  // Inline JS modules (simple approach — Vite produces one main chunk in our config)
  html = html.replace(
    /<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g,
    (match, src) => {
      const jsPath = path.join(distDir, src.replace(/^\//, ''));
      if (fs.existsSync(jsPath)) {
        let js = fs.readFileSync(jsPath, 'utf8');
        // Rewrite image paths to base64 where possible
        js = js.replace(/\/images\/(cat1|cat2|dog1|dog2)\.jpg/g, (m, name) => {
          const imgPath = path.join(distDir, 'images', `${name}.jpg`);
          if (fs.existsSync(imgPath)) {
            return toBase64(imgPath);
          }
          return m;
        });
        return `<script>${js}</script>`;
      }
      return match;
    }
  );

  // Inline small images referenced in the final HTML (if any remain)
  html = html.replace(
    /src="\/images\/([^"]+\.(jpg|jpeg|png))"/g,
    (match, file) => {
      const imgPath = path.join(distDir, 'images', file);
      if (fs.existsSync(imgPath)) {
        return `src="${toBase64(imgPath)}"`;
      }
      return match;
    }
  );

  return html;
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error('dist/ folder not found. Run `npm run build` first.');
    process.exit(1);
  }

  let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  html = inlineAssets(html);

  // Remove any remaining modulepreload / asset links that are now inlined
  html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');
  html = html.replace(/<link[^>]+as="script"[^>]*>/g, '');

  fs.writeFileSync(outFile, html);
  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`✅ Created self-contained build: dist/index.single.html (${sizeKB} KB)`);
}

main();
