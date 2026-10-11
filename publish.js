// Genera ./site (navegación para compartir) a partir de ../downloads/jemjaf.
//
// - Copia solo los .html (la navegación): el curso queda liviano, sin videos.
// - Reescribe los medios (video.mp4, assets/, resources/) para que apunten al
//   proxy local /media/... (que los trae de Hugging Face).
// - Inyecta el popup del token (app.js).
//
// Uso:  node publish.js     (o  npm run publish)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS = path.join(__dirname, '..', 'downloads');
const SRC = path.join(DOWNLOADS, 'jemjaf');
const OUT_ROOT = path.join(__dirname, 'site');
const APP_TAG = '<script src="/app.js"></script>';

if (!fs.existsSync(SRC)) {
  console.error('No existe la carpeta de contenido:', SRC);
  process.exit(1);
}

const MEDIA_EXT = /\.(mp4|webm|m4a|pdf|png|jpe?g|webp|gif|zip|drawio|excalidraw|ya?ml|txt|py|md|log|tf|json)$/i;

function rewrite(html, relDir) {
  const base = '/media/' + relDir.split(path.sep).join('/');
  html = html.replace(/(src|href)="([^"]+)"/g, (m, attr, val) => {
    if (/^(https?:|\/|#|mailto:)/i.test(val)) return m;          // absolutos / anclas: intactos
    const inMediaFolder = /(^|\/)(assets|resources)\//.test(val); // assets/... o resources/...
    if (!inMediaFolder && !MEDIA_EXT.test(val)) return m;         // no es medio (ej: index.html)
    return `${attr}="${base}/${val}"`;
  });
  if (!html.includes('/app.js')) html = html.replace('</body>', APP_TAG + '\n</body>');
  return html;
}

let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.name.endsWith('.html')) continue;

    const relFromDownloads = path.relative(DOWNLOADS, full); // jemjaf/<curso>/.../index.html
    const relDir = path.dirname(relFromDownloads);
    const outPath = path.join(OUT_ROOT, relFromDownloads);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, rewrite(fs.readFileSync(full, 'utf8'), relDir));
    count++;
  }
}

fs.rmSync(OUT_ROOT, { recursive: true, force: true });
walk(SRC);
console.log(`✅ Sitio generado en ${OUT_ROOT} (${count} páginas HTML). Sin videos: liviano.`);
