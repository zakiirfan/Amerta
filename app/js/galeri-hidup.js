// Galeri anak yang "hidup": foto dilempar masuk, bergerak pelan (Ken Burns),
// miring 3D mengikuti jari, memercikkan bintang saat diketuk, dan hati melayang.
// Ditambah filter waktu (tahun lalu bulan) untuk halaman anak.
// Semua gerakan dimatikan kalau HP memakai "kurangi gerakan".

import { esc, urlBlob } from './ui.js';
import { ambilMedia } from './db.js';
import { usiaKarya } from './karya.js';
import { tanggalPanjang } from './usia.js';

const geraknyaDikurangi = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------
// Filter waktu: rentang tanggal yang diisi sendiri
// ---------------------------------------------------------------------

/** Saring karya menurut rentang tanggal 'YYYY-MM-DD' (dari/sampai boleh kosong). */
export function saringRentang(daftar, { dari = '', sampai = '' } = {}) {
  if (dari && sampai && dari > sampai) [dari, sampai] = [sampai, dari];
  return daftar.filter((k) => {
    const t = k.tanggal || '';
    if (dari && t < dari) return false;
    if (sampai && t > sampai) return false;
    return true;
  });
}

/** Dua kotak tanggal "Dari" dan "Sampai", dibatasi tanggal karya paling awal dan paling akhir. */
export function htmlRentangWaktu(daftar) {
  const tanggal = daftar.map((k) => k.tanggal).filter(Boolean).sort();
  if (tanggal.length < 2 || tanggal[0] === tanggal[tanggal.length - 1]) return '';
  const min = esc(tanggal[0]);
  const max = esc(tanggal[tanggal.length - 1]);
  return `
    <span class="label-filter">Saring menurut waktu</span>
    <div class="rentang-waktu">
      <label class="isian-tanggal">
        <span>Dari</span>
        <input type="date" id="tanggal-dari" min="${min}" max="${max}">
      </label>
      <label class="isian-tanggal">
        <span>Sampai</span>
        <input type="date" id="tanggal-sampai" min="${min}" max="${max}">
      </label>
    </div>
    <p class="bantuan" id="keterangan-rentang">Semua karya, ${esc(tanggalPanjang(tanggal[0]))} sampai ${esc(tanggalPanjang(tanggal[tanggal.length - 1]))}.</p>
    <button type="button" class="tombol-teks" id="hapus-rentang" hidden>Tampilkan semua lagi</button>`;
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

// ---------------------------------------------------------------------
// Film Kenangan: foto anak diputar bergantian di layar besar
// ---------------------------------------------------------------------

const FILM_MAKS = 12;
const DURASI_FILM = 4200; // ms per foto

function acakSalin(daftar) {
  const h = [...daftar];
  for (let i = h.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [h[i], h[j]] = [h[j], h[i]];
  }
  return h;
}

/** Layar "Film Kenangan" untuk halaman anak. Kosong kalau karyanya kurang dari 2. */
export function htmlFilmKenangan(daftar, anak) {
  if (daftar.length < 2) return '';
  const film = acakSalin(daftar).slice(0, FILM_MAKS);
  const bar = film.map(() => '<i><b></b></i>').join('');
  const slide = film.map((k, i) => {
    const usia = usiaKarya(k, anak);
    const ket = [usia !== null ? `${usia} tahun` : '', tanggalPanjang(k.tanggal)].filter(Boolean).join(' · ');
    return `
      <figure class="film-slide kb-film-${i % 4}" data-i="${i}" data-id="${k.id}" data-foto="${k.fotoId}" data-thumb="${k.thumbId}">
        <img alt="${esc(k.judul || 'Karya')}">
        <figcaption>
          <strong>${esc(k.judul || k.acara || k.lokasi || 'Karya')}</strong>
          <span>${esc(ket)}</span>
        </figcaption>
      </figure>`;
  }).join('');
  return `
    <section class="film" aria-label="Film kenangan, foto berganti sendiri">
      <div class="film-judul"><span>🎬 Film Kenangan</span></div>
      <div class="film-bar" aria-hidden="true">${bar}</div>
      <div class="film-layar">${slide}</div>
      <p class="film-petunjuk" aria-hidden="true">Ketuk untuk membuka · geser untuk pindah · tahan untuk berhenti</p>
    </section>`;
}

/** Menjalankan Film Kenangan. `buka(id)` dipanggil saat foto diketuk. Mengembalikan pembersih. */
export function putarFilm(akar, buka) {
  const film = akar.querySelector('.film');
  if (!film) return () => {};
  const slide = [...film.querySelectorAll('.film-slide')];
  const bar = [...film.querySelectorAll('.film-bar i')];
  const n = slide.length;
  const gerak = !geraknyaDikurangi();
  let ke = -1;
  let jam = null;
  let ditahan = false;
  let mulaiTekan = null;

  const muat = async (i) => {
    const s = slide[(i + n) % n];
    const img = s.querySelector('img');
    if (img.src) return;
    // Foto penuh untuk layar besar; gambar kecil dipakai dulu supaya cepat tampil.
    const kecil = await ambilMedia(s.dataset.thumb);
    if (kecil && !img.src && img.isConnected) img.src = urlBlob(kecil.blob);
    const penuh = await ambilMedia(s.dataset.foto);
    if (penuh && img.isConnected) img.src = urlBlob(penuh.blob);
  };

  const tampil = (i) => {
    ke = (i + n) % n;
    slide.forEach((s, j) => {
      s.classList.toggle('aktif', j === ke);
      if (j === ke) { s.classList.remove('main'); void s.offsetWidth; s.classList.add('main'); }
    });
    bar.forEach((b, j) => {
      b.classList.toggle('selesai', j < ke);
      b.classList.remove('jalan');
      if (j === ke) { void b.offsetWidth; b.classList.add('jalan'); }
    });
    muat(ke); muat(ke + 1);
    clearTimeout(jam);
    if (gerak && !ditahan) jam = setTimeout(() => tampil(ke + 1), DURASI_FILM);
  };

  const jeda = (ya) => {
    ditahan = ya;
    film.classList.toggle('dijeda', ya);
    clearTimeout(jam);
    if (!ya && gerak) jam = setTimeout(() => tampil(ke + 1), DURASI_FILM / 2);
  };

  const onTekan = (e) => {
    mulaiTekan = { x: e.clientX, y: e.clientY, t: Date.now() };
    jeda(true);
  };
  const onLepas = (e) => {
    if (!mulaiTekan) return;
    const dx = e.clientX - mulaiTekan.x;
    const dy = e.clientY - mulaiTekan.y;
    const lama = Date.now() - mulaiTekan.t;
    mulaiTekan = null;
    jeda(false);
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { tampil(ke + (dx < 0 ? 1 : -1)); return; }
    if (lama < 350 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      percikan(e.clientX, e.clientY);
      const id = slide[ke].dataset.id;
      setTimeout(() => buka(id), gerak ? 280 : 0);
    }
  };
  const onBatal = () => { mulaiTekan = null; jeda(false); };
  const layar = film.querySelector('.film-layar');
  layar.addEventListener('pointerdown', onTekan);
  layar.addEventListener('pointerup', onLepas);
  layar.addEventListener('pointercancel', onBatal);
  const onTerlihat = () => { if (document.hidden) clearTimeout(jam); else if (!ditahan) tampil(ke); };
  document.addEventListener('visibilitychange', onTerlihat);

  tampil(0);
  return () => {
    clearTimeout(jam);
    layar.removeEventListener('pointerdown', onTekan);
    layar.removeEventListener('pointerup', onLepas);
    layar.removeEventListener('pointercancel', onBatal);
    document.removeEventListener('visibilitychange', onTerlihat);
  };
}
