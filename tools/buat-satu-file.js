// Menggabungkan seluruh aplikasi (HTML, CSS, JS, ikon) menjadi SATU file HTML
// untuk dicoba langsung di browser, tanpa server.
//
// Jalankan:  node tools/buat-satu-file.js
// Hasil:     museum-karya-anak-satu-file.html
//
// Catatan: versi satu file TIDAK punya mode offline (service worker) dan tidak bisa
// dipasang ke layar utama. Untuk dipakai di HP, tetap deploy folder app/.

const fs = require('fs');
const path = require('path');

const AKAR = path.join(__dirname, '..', 'app');
const KELUAR = path.join(__dirname, '..', 'museum-karya-anak-satu-file.html');
const RE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+\.js)';?/g;

const baca = (f) => fs.readFileSync(path.join(AKAR, f), 'utf8');
const dataUri = (f, tipe) => `data:${tipe};base64,${fs.readFileSync(path.join(AKAR, f)).toString('base64')}`;

// 1. Urutkan modul: yang dipakai modul lain dimuat lebih dulu.
const kodeModul = new Map();
const urutan = [];
function kunjungi(nama, jejak = []) {
  if (kodeModul.has(nama)) return;
  if (jejak.includes(nama)) throw new Error(`Impor melingkar: ${[...jejak, nama].join(' -> ')}`);
  const kode = baca(`js/${nama}`);
  for (const m of kode.matchAll(RE_IMPORT)) kunjungi(m[2], [...jejak, nama]);
  kodeModul.set(nama, kode);
  urutan.push(nama);
}
kunjungi('app.js');

// 2. Bungkus setiap modul dalam fungsinya sendiri supaya nama tidak bertabrakan.
function bungkus(nama, kode) {
  const ekspor = [];
  let hasil = kode.replace(RE_IMPORT, (_, daftar, dari) => `const {${daftar}} = __modul['${dari}'];`);
  hasil = hasil.replace(
    /^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm,
    (_, jenis, n) => { ekspor.push(n); return `${jenis} ${n}`; },
  );
  if (/^\s*export\s/m.test(hasil)) throw new Error(`Bentuk export yang belum didukung di ${nama}`);
  if (/^\s*import\s/m.test(hasil)) throw new Error(`Bentuk import yang belum didukung di ${nama}`);
  return `// ===== js/${nama} =====\n__modul['${nama}'] = (() => {\n'use strict';\n${hasil}\nreturn { ${ekspor.join(', ')} };\n})();\n`;
}

const skrip = [
  'self.MKA_SATU_FILE = true;',
  baca('js/version.js'),
  'const __modul = {};',
  ...urutan.map((n) => bungkus(n, kodeModul.get(n))),
].join('\n').replace(/<\/script/gi, '<\\/script');

// Huruf disisipkan langsung ke CSS (data URI), karena tidak ada folder fonts/ di sebelah file.
const cssAsli = baca('css/app.css').replace(
  /url\("\.\.\/(fonts\/[\w-]+\.woff2)"\)/g,
  (_, f) => `url("${dataUri(f, 'font/woff2')}")`,
);
if (cssAsli.includes('../fonts/')) throw new Error('Ada huruf di app.css yang belum tersisipkan');

const css = `${cssAsli}
/* Khusus versi satu file */
.pita-satu-file {
  padding: 6px 16px;
  background: #FDF0CF;
  color: #555D70;
  font-size: 0.85rem;
  text-align: center;
}`;

// 3. Susun HTML.
let html = baca('index.html').replace(/\r\n/g, '\n');
const ganti = (cari, isi) => {
  if (!html.includes(cari)) throw new Error(`Bagian index.html tidak ditemukan: ${cari}`);
  html = html.replace(cari, () => isi);
};
ganti('<link rel="manifest" href="manifest.webmanifest">\n', '');
ganti('href="icons/icon-192.png"', `href="${dataUri('icons/icon-192.png', 'image/png')}"`);
ganti('href="icons/apple-touch-icon.png"', `href="${dataUri('icons/apple-touch-icon.png', 'image/png')}"`);
ganti('<link rel="stylesheet" href="css/app.css">', `<style>\n${css}\n</style>`);
ganti('<script src="js/version.js"></script>\n', '');
ganti('<script type="module" src="js/app.js"></script>\n', '');
ganti('</header>\n', '</header>\n  <div class="pita-satu-file">Versi satu file untuk mencoba · tanpa mode offline · data tersimpan di browser ini</div>\n');
ganti('</body>', `<script>\n${skrip}\n</script>\n</body>`);

fs.writeFileSync(KELUAR, html);
console.log(`Selesai: ${path.basename(KELUAR)} (${Math.round(fs.statSync(KELUAR).size / 1024)} KB, ${urutan.length} modul)`);
