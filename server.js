// Visor local + proxy a Hugging Face. CERO dependencias: solo Node.
//
// Sirve la navegación (carpeta ./site) y expone /media/* que trae los archivos
// pesados desde el dataset PRIVADO de Hugging Face usando tu token. El token se
// pega una vez desde la web (popup) y queda guardado en .hf-token (local).
//
// Uso:  node server.js        (o  npm run serve)
// Env:  PORT (default 4317)   HF_REPO (default dev-DAJY/down)   HF_TOKEN (opcional)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4317;
const HF_REPO = process.env.HF_REPO || 'dev-DAJY/down';
const SITE_DIR = path.join(__dirname, 'site');
const TOKEN_FILE = path.join(__dirname, '.hf-token');

let TOKEN = process.env.HF_TOKEN || (fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4a': 'audio/mp4',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8'
};

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

function safeJoin(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  const resolved = path.normalize(path.join(root, decoded));
  const base = path.normalize(root);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

// ---- Proxy a Hugging Face (con Range) -------------------------------------
async function proxyMedia(req, res, rest) {
  if (!TOKEN) return send(res, 401, JSON.stringify({ error: 'no_token' }), 'application/json');
  const target = `https://huggingface.co/datasets/${HF_REPO}/resolve/main/${rest}`;
  const headers = { Authorization: `Bearer ${TOKEN}` };
  if (req.headers.range) headers.Range = req.headers.range;

  let up;
  try {
    up = await fetch(target, { headers, redirect: 'follow' });
  } catch (e) {
    return send(res, 502, JSON.stringify({ error: 'hf_unreachable', detail: String(e) }), 'application/json');
  }
  if (!up.ok && up.status !== 206) {
    return send(res, up.status, JSON.stringify({ error: 'hf_error', status: up.status }), 'application/json');
  }
  const outHeaders = {
    'Content-Type': up.headers.get('content-type') || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600'
  };
  const cl = up.headers.get('content-length');
  const cr = up.headers.get('content-range');
  if (cl) outHeaders['Content-Length'] = cl;
  if (cr) outHeaders['Content-Range'] = cr;
  res.writeHead(up.status, outHeaders);
  if (!up.body) return res.end();
  Readable.fromWeb(up.body).pipe(res);
}

// ---- API del token (popup) ------------------------------------------------
async function handleToken(req, res) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 5000) break; }
  let token = '';
  try { token = String(JSON.parse(body || '{}').token || '').trim(); } catch { token = ''; }
  if (!token) return send(res, 400, JSON.stringify({ ok: false, error: 'empty' }), 'application/json');

  try {
    const r = await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return send(res, 401, JSON.stringify({ ok: false, error: 'invalid' }), 'application/json');
    const who = await r.json();
    TOKEN = token;
    try { fs.writeFileSync(TOKEN_FILE, token); } catch { /* ignore */ }
    return send(res, 200, JSON.stringify({ ok: true, user: who.name || who.fullname || 'usuario' }), 'application/json');
  } catch (e) {
    return send(res, 500, JSON.stringify({ ok: false, error: 'validate_failed' }), 'application/json');
  }
}

// ---- Estáticos (navegación) ----------------------------------------------
function serveStatic(res, urlPath) {
  let filePath = safeJoin(SITE_DIR, urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) return send(res, 403, 'forbidden');
  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    return send(res, 404, '<h1>404 — No encontrado</h1>', 'text/html; charset=utf-8');
  }
  let data;
  try { data = fs.readFileSync(filePath); } catch {
    return send(res, 404, '<h1>404 — No encontrado</h1>', 'text/html; charset=utf-8');
  }
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  send(res, 200, data, type);
}

// ---- Router ---------------------------------------------------------------
const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0] || '/';

  if (urlPath === '/api/token') {
    if (req.method !== 'POST') return send(res, 405, 'method not allowed');
    return void handleToken(req, res);
  }
  if (urlPath === '/api/status') {
    return send(res, 200, JSON.stringify({ ok: !!TOKEN }), 'application/json');
  }
  if (urlPath === '/app.js') {
    try { return send(res, 200, fs.readFileSync(path.join(__dirname, 'app.js')), MIME['.js']); }
    catch { return send(res, 404, 'app.js no encontrado'); }
  }
  if (urlPath === '/') {
    let entry = '/jemjaf/index.html';
    try {
      const dirs = fs.readdirSync(SITE_DIR, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.'));
      if (dirs.length === 1) entry = '/' + encodeURIComponent(dirs[0].name) + '/index.html';
    } catch { /* ignore */ }
    res.writeHead(302, { Location: entry });
    return res.end();
  }
  if (urlPath.startsWith('/media/')) {
    return void proxyMedia(req, res, urlPath.slice('/media/'.length));
  }
  return serveStatic(res, urlPath);
});

server.listen(PORT, () => {
  console.log(`\n📚 Curso disponible en: http://localhost:${PORT}/`);
  console.log(`   Navegación: ${SITE_DIR}`);
  console.log(`   Videos/PDFs: Hugging Face (${HF_REPO})${TOKEN ? ' — token cargado' : ' — falta el token (se pide en la web)'}`);
  console.log('   Ctrl+C para detener.\n');
});
