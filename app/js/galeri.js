// Galeri grid karya (dipakai di halaman anak dan hasil pencarian),
// termasuk mode "pilih beberapa" untuk membuat PDF kumpulan karya.

import { ambilMedia } from './db.js';
import { esc, urlBlob } from './ui.js';
import { pergi } from './router.js';
import { punyaCerita } from './karya.js';
import { buatDanSimpanPdf } from './pdf-karya.js';
import { percikan } from './galeri-hidup.js';

export function htmlGaleri(daftar, { anakMap = null, tampilkanNama = false, labelJudul = false } = {}) {
  if (!daftar.length) return '';
  const kotak = daftar.map((k) => {
    const anak = anakMap && anakMap.get(k.anakId);
    const label = [k.judul || 'Karya tanpa judul', anak && anak.nama, k.lokasi].filter(Boolean).join(', ');
    return `
      <button type="button" class="sel-karya" data-id="${k.id}" aria-label="${esc(label)}">
        <img data-thumb="${k.thumbId}" alt="">
        ${tampilkanNama && anak ? `<span class="tag-anak">${esc(anak.nama)}</span>` : ''}
        ${labelJudul ? `<span class="label-judul">${esc(k.judul || k.acara || k.lokasi || 'Tanpa judul')}</span>` : ''}
        ${punyaCerita(k) ? '' : `<span class="tanda-cerita${labelJudul ? ' tanda-atas' : ''}">Belum ada cerita</span>`}
        <span class="centang" aria-hidden="true">✓</span>
      </button>`;
  }).join('');
  return `
    <div class="galeri">
      <div class="baris-galeri">
        <span class="redup">${daftar.length} karya</span>
        <button type="button" class="tombol-teks" data-galeri="mulai-pilih">Pilih untuk PDF</button>
      </div>
      <div class="grid-karya">${kotak}</div>
      <div class="bar-aksi" data-galeri="bar" hidden>
        <span data-galeri="jumlah">0 dipilih</span>
        <button type="button" class="tombol tombol-kecil" data-galeri="semua">Pilih semua</button>
        <button type="button" class="tombol tombol-kecil" data-galeri="batal">Batal</button>
        <button type="button" class="tombol tombol-utama tombol-kecil" data-galeri="pdf" disabled>Buat PDF</button>
      </div>
    </div>`;
}

async function muatThumb(img) {
  try {
    const m = await ambilMedia(img.dataset.thumb);
    if (m && img.isConnected) img.src = urlBlob(m.blob);
  } catch (err) {
    console.error(err);
  }
}

/** Menghidupkan galeri di dalam `akar`. Mengembalikan fungsi pembersih. */
export function siapkanGaleri(akar, daftar, { hidup = false } = {}) {
  const galeri = akar.querySelector('.galeri');
  if (!galeri) return () => {};
  const grid = galeri.querySelector('.grid-karya');
  const peta = new Map(daftar.map((k) => [k.id, k]));

  // Gambar kecil dimuat hanya saat hampir terlihat (hemat memori).
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entri) => {
      entri.forEach((e) => {
        if (e.isIntersecting) { io.unobserve(e.target); muatThumb(e.target); }
      });
    }, { rootMargin: '300px' })
    : null;
  grid.querySelectorAll('img[data-thumb]').forEach((img) => (io ? io.observe(img) : muatThumb(img)));

  const bar = galeri.querySelector('[data-galeri="bar"]');
  const jumlah = galeri.querySelector('[data-galeri="jumlah"]');
  const tombolPdf = galeri.querySelector('[data-galeri="pdf"]');
  const terpilih = new Set();
  let modePilih = false;

  const perbaruiBar = () => {
    jumlah.textContent = `${terpilih.size} dipilih`;
    tombolPdf.disabled = terpilih.size === 0;
  };
  const aturMode = (aktif) => {
    modePilih = aktif;
    terpilih.clear();
    grid.classList.toggle('mode-pilih', aktif);
    grid.querySelectorAll('.sel-karya').forEach((b) => {
      b.classList.remove('terpilih');
      if (aktif) b.setAttribute('aria-pressed', 'false');
      else b.removeAttribute('aria-pressed');
    });
    bar.hidden = !aktif;
    document.body.classList.toggle('ada-bar-aksi', aktif);
    perbaruiBar();
  };

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.sel-karya');
    if (!b) return;
    if (!modePilih) {
      const tujuan = `#/karya/${b.dataset.id}`;
      if (hidup && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Memantul dan memercikkan bintang dulu, baru dibuka.
        percikan(e.clientX, e.clientY);
        b.classList.add('diketuk');
        setTimeout(() => pergi(tujuan), 320);
      } else {
        pergi(tujuan);
      }
      return;
    }
    const id = b.dataset.id;
    if (terpilih.has(id)) terpilih.delete(id); else terpilih.add(id);
    b.classList.toggle('terpilih', terpilih.has(id));
    b.setAttribute('aria-pressed', String(terpilih.has(id)));
    perbaruiBar();
  });

  galeri.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-galeri]');
    if (!t) return;
    const aksi = t.dataset.galeri;
    if (aksi === 'mulai-pilih') aturMode(true);
    else if (aksi === 'batal') aturMode(false);
    else if (aksi === 'semua') {
      grid.querySelectorAll('.sel-karya').forEach((b) => {
        terpilih.add(b.dataset.id);
        b.classList.add('terpilih');
        b.setAttribute('aria-pressed', 'true');
      });
      perbaruiBar();
    } else if (aksi === 'pdf') {
      await buatDanSimpanPdf([...terpilih].map((id) => peta.get(id)));
      aturMode(false);
    }
  });

  return () => {
    if (io) io.disconnect();
    document.body.classList.remove('ada-bar-aksi');
  };
}
