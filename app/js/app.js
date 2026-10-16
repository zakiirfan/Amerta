// Titik awal aplikasi: daftar layar, tombol kembali, service worker.

import { daftarkanServiceWorker, mintaPenyimpananPermanen } from './pwa.js';
import { siapkanPanduanPasang } from './panduan-pasang.js';
import {
  rute, mulaiRouter, pergi, kembali,
} from './router.js';
import { esc, tampilkanLayar } from './ui.js';
import {
  layarBeranda, layarAnak, layarTambahAnak, layarUbahAnak,
} from './layar-anak.js';
import { layarTambahKarya, layarUbahKarya, layarDetailKarya } from './layar-karya.js';
import { layarCari } from './layar-cari.js';
import { layarPengaturan } from './layar-pengaturan.js';

rute('/', layarBeranda);
rute('/anak/baru', layarTambahAnak);
rute('/anak/:id', layarAnak);
rute('/anak/:id/ubah', layarUbahAnak);
rute('/karya/baru', layarTambahKarya);
rute('/karya/:id', layarDetailKarya);
rute('/karya/:id/ubah', layarUbahKarya);
rute('/cari', layarCari);
rute('/pengaturan', layarPengaturan);

// Tombol apa pun dengan data-ke="#/..." memindahkan layar.
// Tambahkan data-ganti supaya layar sekarang tidak masuk riwayat.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-ke]');
  if (!el) return;
  e.preventDefault();
  pergi(el.dataset.ke, { ganti: el.hasAttribute('data-ganti') });
});

mulaiRouter({
  tampilkan: (layar) => tampilkanLayar(layar, { onKembali: kembali }),
  tidakAda: () => ({
    judul: 'Tidak ditemukan',
    kembaliKe: '#/',
    isi: `<section class="kartu"><h2>Halaman tidak ditemukan</h2></section>
          <button type="button" class="tombol tombol-utama" data-ke="#/" data-ganti>Ke beranda</button>`,
  }),
  galat: (err) => ({
    judul: 'Terjadi masalah',
    kembaliKe: '#/',
    isi: `<section class="kartu"><h2>Terjadi masalah</h2><p>${esc(err && err.message)}</p></section>
          <button type="button" class="tombol tombol-utama" data-ke="#/" data-ganti>Ke beranda</button>`,
  }),
});

siapkanPanduanPasang();

function tampilkanBannerUpdate(perbarui) {
  const banner = document.getElementById('banner-update');
  banner.hidden = false;
  document.getElementById('tombol-update').onclick = () => {
    banner.hidden = true;
    perbarui();
  };
}

daftarkanServiceWorker({
  onUpdateSiap: tampilkanBannerUpdate,
  onOfflineSiap: () => {},
}).catch((err) => console.error('Service worker gagal didaftarkan:', err));

// Statusnya ditampilkan di layar Pengaturan.
mintaPenyimpananPermanen();
