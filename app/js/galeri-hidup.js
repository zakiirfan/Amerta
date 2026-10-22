// Galeri anak yang "hidup": foto dilempar masuk, bergerak pelan (Ken Burns),
// miring 3D mengikuti jari, memercikkan bintang saat diketuk, dan hati melayang.
// Ditambah filter waktu (tahun lalu bulan) untuk halaman anak.
// Semua gerakan dimatikan kalau HP memakai "kurangi gerakan".

import { esc } from './ui.js';

const geraknyaDikurangi = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// ---------------------------------------------------------------------
// Filter waktu
// ---------------------------------------------------------------------

/** Saring daftar karya menurut tahun ('2025') dan bulan ('07'); kosong = semua. */
export function saringWaktu(daftar, { tahun = '', bulan = '' } = {}) {
  return daftar.filter((k) => {
    const t = k.tanggal || '';
    if (tahun && t.slice(0, 4) !== tahun) return false;
    if (bulan && t.slice(5, 7) !== bulan) return false;
    return true;
  });
}

function hitung(daftar, ambil) {
  const peta = new Map();
  daftar.forEach((k) => {
    const v = ambil(k.tanggal || '');
    if (v) peta.set(v, (peta.get(v) || 0) + 1);
  });
  return [...peta.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Tombol filter tahun, dan bulan kalau satu tahun dipilih. Kosong kalau semua karya di bulan yang sama. */
export function htmlFilterWaktu(daftar, { tahun = '', bulan = '' } = {}) {
  const daftarTahun = hitung(daftar, (t) => t.slice(0, 4));
  const semuaBulan = hitung(daftar, (t) => t.slice(0, 7));
  if (semuaBulan.length < 2) return '';
  const chip = (label, data, aktif) => `
    <button type="button" class="chip" ${data} aria-pressed="${aktif}">${label}</button>`;
  const barisTahun = [
    chip(`Semua · ${daftar.length}`, 'data-tahun=""', !tahun),
    ...daftarTahun.map(([t, n]) => chip(`${esc(t)} · ${n}`, `data-tahun="${esc(t)}"`, tahun === t)),
  ].join('');
  let barisBulan = '';
  if (tahun) {
    const bulanIni = hitung(daftar.filter((k) => (k.tanggal || '').startsWith(tahun)), (t) => t.slice(5, 7))
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (bulanIni.length > 1) {
      barisBulan = `
      <div class="chip-gulir" role="group" aria-label="Bulan">
        ${chip('Semua bulan', 'data-bulan=""', !bulan)}
        ${bulanIni.map(([b, n]) => chip(`${NAMA_BULAN[Number(b) - 1]} · ${n}`, `data-bulan="${esc(b)}"`, bulan === b)).join('')}
      </div>`;
    }
  }
  return `
    <span class="label-filter">Waktu</span>
    <div class="chip-gulir" role="group" aria-label="Tahun">${barisTahun}</div>
    ${barisBulan}`;
}

// ---------------------------------------------------------------------
// Gerakan
// ---------------------------------------------------------------------

/** Percikan bintang kecil di titik (x, y) layar. */
export function percikan(x, y) {
  if (geraknyaDikurangi()) return;
  const wadah = document.createElement('div');
  wadah.className = 'percikan';
  wadah.setAttribute('aria-hidden', 'true');
  wadah.style.left = `${x}px`;
  wadah.style.top = `${y}px`;
  const warna = ['#F6C760', '#EC6F5A', '#8AD6D1', '#8E9BD6', '#FF8C52', '#F3B6CF'];
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span');
    const sudut = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
    const jauh = 34 + Math.random() * 30;
    s.style.setProperty('--dx', `${Math.cos(sudut) * jauh}px`);
    s.style.setProperty('--dy', `${Math.sin(sudut) * jauh}px`);
    s.style.color = warna[i % warna.length];
    s.textContent = i % 3 ? '★' : '✦';
    wadah.append(s);
  }
  document.body.append(wadah);
  setTimeout(() => wadah.remove(), 800);
}

/**
 * Menghidupkan galeri di dalam `akar` (wadah .galeri-hidup).
 * Mengembalikan fungsi pembersih.
 */
export function hidupkanGaleri(akar) {
  const grid = akar.querySelector('.grid-karya');
  if (!grid) return () => {};
  const kotak = [...grid.querySelectorAll('.sel-karya')];

  // Setiap foto sedikit miring dan bergerak ke arah berbeda, masuk bergantian.
  kotak.forEach((k, i) => {
    const miring = ((i * 37) % 9) / 2 - 2; // -2 .. 2 derajat, tetap sama tiap dibuka
    k.style.setProperty('--miring', `${miring}deg`);
    k.style.setProperty('--tunda', `${Math.min(i * 0.07, 0.8).toFixed(2)}s`);
    k.classList.add(`kb-${i % 4}`);
  });
  if (geraknyaDikurangi()) return () => {};

  // Ken Burns hanya untuk foto yang sedang terlihat (hemat baterai).
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entri) => {
      entri.forEach((e) => e.target.classList.toggle('tampak', e.isIntersecting));
    })
    : null;
  kotak.forEach((k) => (io ? io.observe(k) : k.classList.add('tampak')));

  // Miring 3D mengikuti jari/mouse, dengan kilau.
  const miringKe = (k, e) => {
    const r = k.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    k.style.setProperty('--ry', `${(px - 0.5) * 18}deg`);
    k.style.setProperty('--rx', `${(0.5 - py) * 18}deg`);
    k.style.setProperty('--kx', `${px * 100}%`);
    k.style.setProperty('--ky', `${py * 100}%`);
  };
  const lepas = (k) => {
    k.classList.remove('ditekan');
    k.style.setProperty('--rx', '0deg');
    k.style.setProperty('--ry', '0deg');
  };
  const onTekan = (e) => {
    const k = e.target.closest('.sel-karya');
    if (!k || grid.classList.contains('mode-pilih')) return;
    k.classList.add('ditekan');
    miringKe(k, e);
  };
  const onGerak = (e) => {
    const k = e.target.closest('.sel-karya');
    if (!k || grid.classList.contains('mode-pilih')) return;
    if (e.pointerType === 'mouse' || k.classList.contains('ditekan')) miringKe(k, e);
  };
  const onLepas = (e) => {
    const k = e.target.closest('.sel-karya');
    if (k) lepas(k);
  };
  const onKeluar = (e) => {
    if (e.target.classList && e.target.classList.contains('sel-karya')) lepas(e.target);
  };
  grid.addEventListener('pointerdown', onTekan);
  grid.addEventListener('pointermove', onGerak);
  grid.addEventListener('pointerup', onLepas);
  grid.addEventListener('pointercancel', onLepas);
  grid.addEventListener('pointerout', onKeluar);

  // Sesekali hati kecil melayang dari salah satu foto yang terlihat.
  const jamHati = setInterval(() => {
    if (document.hidden || grid.classList.contains('mode-pilih')) return;
    const tampak = kotak.filter((k) => k.classList.contains('tampak'));
    if (!tampak.length) return;
    const k = tampak[Math.floor(Math.random() * tampak.length)];
    const h = document.createElement('span');
    h.className = 'hati-melayang';
    h.setAttribute('aria-hidden', 'true');
    h.textContent = Math.random() < 0.7 ? '♥' : '★';
    h.style.left = `${k.offsetLeft + k.offsetWidth * (0.3 + Math.random() * 0.4)}px`;
    h.style.top = `${k.offsetTop + k.offsetHeight * 0.35}px`;
    h.style.color = ['#EC6F5A', '#FF8C52', '#F3B6CF', '#F6C760'][Math.floor(Math.random() * 4)];
    grid.append(h);
    setTimeout(() => h.remove(), 2200);
  }, 2600);

  return () => {
    if (io) io.disconnect();
    clearInterval(jamHati);
    grid.removeEventListener('pointerdown', onTekan);
    grid.removeEventListener('pointermove', onGerak);
    grid.removeEventListener('pointerup', onLepas);
    grid.removeEventListener('pointercancel', onLepas);
    grid.removeEventListener('pointerout', onKeluar);
  };
}
