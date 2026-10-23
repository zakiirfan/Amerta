// Service worker: menyimpan semua file aplikasi di HP
// supaya aplikasi bisa dibuka tanpa internet.
// Service worker ini TIDAK pernah mengirim data pengguna ke mana pun.

// Versi: 0.17.0
// Baris "Versi" di atas diisi otomatis oleh tools/buat-satu-file.js dari js/version.js.
// Jangan dihapus: HP hanya tahu ada versi baru kalau isi file sw.js ini berubah.
// (Safari tidak selalu memeriksa perubahan di js/version.js.)

importScripts('js/version.js');

const CACHE = 'mka-' + self.APP_VERSION;

// Daftar semua file aplikasi. Setiap ada file baru, tambahkan di sini
// dan naikkan versi di js/version.js.
// Catatan: jangan tulis 'index.html' — Cloudflare Pages mengalihkannya ke './'.
const FILES = [
  './',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/nunito.woff2',
  'fonts/fredoka.woff2',
  'js/version.js',
  'js/app.js',
  'js/pwa.js',
  'js/panduan-pasang.js',
  'js/db.js',
  'js/usia.js',
  'js/router.js',
  'js/ui.js',
  'js/layar-anak.js',
  'js/karya.js',
  'js/media.js',
  'js/perekam.js',
  'js/simpan-file.js',
  'js/pdf.js',
  'js/pdf-karya.js',
  'js/galeri.js',
  'js/galeri-hidup.js',
  'js/layar-karya.js',
  'js/layar-cari.js',
  'js/zip.js',
  'js/cadangan.js',
  'js/contoh.js',
  'js/layar-pengaturan.js',
  'js/hiasan.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('mka-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Dipanggil saat pengguna mengetuk "Perbarui" di banner versi baru.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Semua halaman diarahkan ke kerangka aplikasi yang sama.
      if (req.mode === 'navigate') {
        return (await cache.match('./')) || fetch(req);
      }
      return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
    })
  );
});
