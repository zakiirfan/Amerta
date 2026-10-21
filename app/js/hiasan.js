// Hiasan gaya gambar anak untuk Beranda: maskot krayon, coretan latar,
// dan tali jemuran berisi karya terbaru. Semua digambar dengan SVG di sini
// (tanpa file gambar dari luar), memakai warna dari app.css.

import { ambilMedia } from './db.js';
import { esc, urlBlob } from './ui.js';

const T = '#1E2A44';

/** Maskot: krayon kecil yang melambai, berkedip, dan bergoyang (animasi di app.css). */
export function maskotKrayon() {
  return `
  <svg class="maskot" viewBox="0 0 120 150" aria-hidden="true">
    <g class="maskot-badan">
      <g stroke="${T}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <!-- tangan kiri melambai -->
        <g class="lengan-lambai">
          <path d="M36 78 C22 70 16 58 18 46" fill="none"/>
          <circle cx="18" cy="42" r="6" fill="#FFD8CF"/>
        </g>
        <!-- tangan kanan -->
        <path d="M84 84 C96 90 100 98 100 106" fill="none"/>
        <circle cx="100" cy="110" r="6" fill="#FFD8CF"/>
        <!-- kaki -->
        <ellipse cx="48" cy="140" rx="10" ry="5" fill="#1E2A44"/>
        <ellipse cx="72" cy="140" rx="10" ry="5" fill="#1E2A44"/>
        <!-- ujung krayon -->
        <path d="M42 34 L60 6 L78 34 Z" fill="#F7B3A6"/>
        <path d="M53 17 L60 6 L67 17 Z" fill="#EC6F5A"/>
        <!-- badan -->
        <rect x="36" y="32" width="48" height="104" rx="10" fill="#EC6F5A"/>
        <!-- pembungkus kertas -->
        <rect x="36" y="96" width="48" height="28" fill="#8FCFBF"/>
        <path d="M40 104 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6" fill="none" stroke-width="3"/>
      </g>
      <!-- wajah -->
      <g class="mata">
        <circle cx="51" cy="60" r="5" fill="${T}"/>
        <circle cx="69" cy="60" r="5" fill="${T}"/>
        <circle cx="53" cy="58" r="1.6" fill="#fff"/>
        <circle cx="71" cy="58" r="1.6" fill="#fff"/>
      </g>
      <circle cx="44" cy="72" r="4" fill="#F59A88"/>
      <circle cx="76" cy="72" r="4" fill="#F59A88"/>
      <path d="M52 72 Q60 80 68 72" fill="none" stroke="${T}" stroke-width="3.5" stroke-linecap="round"/>
    </g>
  </svg>`;
}

/** Coretan krayon di latar: bintang berkelip, awan melayang (animasi di app.css). */
export function coretanLatar() {
  return `
  <svg class="coretan" viewBox="0 0 390 800" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <g fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
      <path class="kelip" d="M340 40 l6 13 l14 2 l-10 10 l3 14 l-13 -7 l-13 7 l3 -14 l-10 -10 l14 -2 Z" stroke="#F6C760" fill="#FDF0CF"/>
      <path class="awan" d="M22 300 q8 -16 22 -8 q10 -12 22 0 q14 0 10 14 h-50 q-12 -2 -4 -6 Z" stroke="#8E9BD6" fill="#EEF1FB"/>
      <path class="putar" d="M352 360 c0 -10 16 -10 16 0 c0 16 -26 16 -26 0 c0 -22 36 -22 36 0" stroke="#8FCFBF"/>
      <path class="geser" d="M16 520 l12 -12 l12 12 l12 -12 l12 12" stroke="#EC6F5A"/>
      <path class="kelip kelip-2" d="M330 600 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 Z" stroke="#EC6F5A" fill="#FFE1D8"/>
      <circle class="kelip kelip-3" cx="40" cy="700" r="8" stroke="#F6C760"/>
      <path class="awan awan-2" d="M300 760 q10 -14 20 0 t20 0" stroke="#8E9BD6"/>
    </g>
  </svg>`;
}

/** Posisi tali (dalam piksel) pada titik t (0..1) sepanjang lebar. */
const tinggiLengkung = (t) => 10 + 112 * t * (1 - t); // sama dengan lengkung tali: M0 10 Q50 66 100 10

/** Tali jemuran berisi karya terbaru (maksimal 4). */
export function htmlJemuran(karyaTerbaru) {
  const daftar = karyaTerbaru.slice(0, 4);
  if (!daftar.length) return '';
  const n = daftar.length;
  const miring = [-5, 4, -3, 5];
  const item = daftar.map((k, i) => {
    // Posisi dipasang lewat JavaScript di siapkanJemuran (aturan keamanan melarang style="").
    const t = (i + 0.5) / n;
    return `
      <button type="button" class="jemuran-item" data-ke="#/karya/${k.id}"
              data-t="${t}" data-miring="${miring[i]}"
              aria-label="Buka karya ${esc(k.judul || 'tanpa judul')}">
        <span class="jepit" aria-hidden="true"></span>
        <img data-jemuran="${k.thumbId}" alt="">
      </button>`;
  }).join('');
  return `
    <section class="jemuran" aria-label="Karya terbaru">
      <svg class="tali" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 10 Q50 66 100 10" fill="none" stroke="${T}" stroke-width="2.5"
              vector-effect="non-scaling-stroke" stroke-linecap="round"/>
      </svg>
      ${item}
    </section>`;
}

/** Memuat gambar kecil di tali jemuran. */
export function siapkanJemuran(akar) {
  akar.querySelectorAll('.jemuran-item').forEach((b) => {
    const t = Number(b.dataset.t);
    b.style.left = `${(t * 100).toFixed(1)}%`;
    b.style.top = `${Math.round(tinggiLengkung(t) - 6)}px`;
    b.style.setProperty('--miring', `${b.dataset.miring}deg`);
    b.style.setProperty('--tunda', `${(t * 0.9).toFixed(2)}s`);
  });
  akar.querySelectorAll('img[data-jemuran]').forEach(async (img) => {
    const m = await ambilMedia(img.dataset.jemuran);
    if (m && img.isConnected) img.src = urlBlob(m.blob);
  });
}

const WARNA_KONFETI = ['#EC6F5A', '#FF8C52', '#F6C760', '#8AD6D1', '#359FA0', '#8E9BD6', '#F3B6CF'];

/** Hujan konfeti kecil untuk merayakan karya yang baru disimpan. */
export function rayakan() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wadah = document.createElement('div');
  wadah.className = 'konfeti';
  wadah.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 36; i++) {
    const k = document.createElement('span');
    k.style.left = `${Math.random() * 100}%`;
    k.style.background = WARNA_KONFETI[i % WARNA_KONFETI.length];
    k.style.animationDelay = `${Math.random() * 0.4}s`;
    k.style.animationDuration = `${1.4 + Math.random() * 0.9}s`;
    k.style.setProperty('--putar', `${Math.random() < 0.5 ? -1 : 1}`);
    if (i % 3 === 0) k.classList.add('bulat');
    wadah.append(k);
  }
  document.body.append(wadah);
  setTimeout(() => wadah.remove(), 2600);
}
