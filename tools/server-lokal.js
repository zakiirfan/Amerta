// Server lokal sederhana untuk mencoba aplikasi di komputer (opsional).
// Tidak perlu memasang apa pun selain Node.js.
// Jalankan:  node tools/server-lokal.js   lalu buka http://localhost:8080
// Memakai header yang sama dengan app/_headers, supaya hasilnya mirip Cloudflare Pages.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const AKAR = path.join(__dirname, '..', 'app');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
};

// Baca app/_headers: { '/*': {Nama: nilai}, '/sw.js': {...} }
function bacaHeaders() {
  const hasil = {};
  let pola = null;
  const isi = fs.readFileSync(path.join(AKAR, '_headers'), 'utf8');
  for (const baris of isi.split(/\r?\n/)) {
    if (!baris.trim()) continue;
    if (!/^\s/.test(baris)) { pola = baris.trim(); hasil[pola] = {}; continue; }
    const i = baris.indexOf(':');
    if (pola && i > 0) hasil[pola][baris.slice(0, i).trim()] = baris.slice(i + 1).trim();
  }
  return hasil;
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(AKAR, urlPath));
  if (!file.startsWith(AKAR) || path.basename(file) === '_headers') {
    res.writeHead(404); res.end(); return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(AKAR, 'index.html');

  const headers = bacaHeaders();
  const h = { ...headers['/*'], ...(headers[urlPath] || {}) };
  h['Content-Type'] = MIME[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, h);
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Museum Karya Anak berjalan di http://localhost:${PORT}`);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
