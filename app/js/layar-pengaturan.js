// Layar Pengaturan: cadangan, penyimpanan, risiko data, panduan pasang, data contoh.

import {
  daftarAnak, semuaKarya, ukuranSemuaMedia, ambilMeta, hapusDataContoh,
} from './db.js';
import { esc, konfirmasi, kabar, lembarProgres, pemberitahuan } from './ui.js';
import { pergi } from './router.js';
import { formatUkuran } from './media.js';
import { tanggalPanjang } from './usia.js';
import { mintaPenyimpananPermanen, modeSatuFile, sudahTerpasang } from './pwa.js';
import { bukaPanduan } from './panduan-pasang.js';
import { jalankanEkspor, jalankanImpor } from './cadangan.js';
import { muatDataContoh } from './contoh.js';

const TEKS_PERMANEN = {
  aktif: ['Aktif', 'status-ya', 'Browser berjanji tidak menghapus data aplikasi ini secara otomatis.'],
  belum: ['Belum diizinkan', 'status-belum', 'Browser masih boleh menghapus data kalau ruang HP hampir penuh. Memasang aplikasi ke layar utama biasanya membuat izin ini diberikan.'],
  'tidak-didukung': ['Tidak didukung', 'status-belum', 'Browser ini tidak mendukung penyimpanan permanen. Rutinlah membuat cadangan.'],
};

function hariLalu(iso) {
  const hari = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (hari <= 0) return 'hari ini';
  if (hari === 1) return 'kemarin';
  return `${hari} hari lalu`;
}

export async function layarPengaturan() {
  const [anak, karya, ukuranMedia, eksporTerakhir, sejakEkspor, permanen] = await Promise.all([
    daftarAnak(),
    semuaKarya(),
    ukuranSemuaMedia(),
    ambilMeta('eksporTerakhir'),
    ambilMeta('karyaSejakEkspor', 0),
    mintaPenyimpananPermanen(),
  ]);
  let perkiraan = null;
  try {
    if (navigator.storage && navigator.storage.estimate) perkiraan = await navigator.storage.estimate();
  } catch { /* abaikan */ }

  const [teksPermanen, kelasPermanen, penjelasanPermanen] = TEKS_PERMANEN[permanen];
  const jumlahContoh = karya.filter((k) => k.contoh).length;
  const terpasang = sudahTerpasang();

  return {
    judul: 'Pengaturan',
    kembaliKe: null,
    nav: 'pengaturan',
    isi: `
      <section class="kartu">
        <h2>Cadangan data</h2>
        <ul class="daftar-status">
          <li><span>Ekspor terakhir</span><strong class="${eksporTerakhir ? '' : 'status-belum'}">${eksporTerakhir
    ? `${esc(tanggalPanjang(eksporTerakhir.slice(0, 10)))} (${hariLalu(eksporTerakhir)})` : 'Belum pernah'}</strong></li>
          <li><span>Karya baru sejak ekspor</span><strong>${sejakEkspor}</strong></li>
        </ul>
        <p class="bantuan">File cadangan (.zip) berisi semua foto, rekaman, video, dan keterangan.
          Simpan filenya di tempat lain, misalnya laptop atau penyimpanan online pribadi Anda.</p>
        <button type="button" class="tombol tombol-utama" id="ekspor">Ekspor cadangan</button>
        <label class="tombol" for="input-impor">Impor cadangan</label>
        <input type="file" id="input-impor" accept=".zip,application/zip,application/x-zip-compressed" class="tersembunyi">
      </section>

      <section class="kartu">
        <h2>Penyimpanan</h2>
        <ul class="daftar-status">
          <li><span>Penyimpanan permanen</span><strong class="${kelasPermanen}">${teksPermanen}</strong></li>
          <li><span>Isi museum</span><strong>${anak.length} anak, ${karya.length} karya</strong></li>
          <li><span>Foto, rekaman, video</span><strong>${formatUkuran(ukuranMedia)}</strong></li>
          ${perkiraan && perkiraan.usage ? `<li><span>Total dipakai di browser</span><strong>${formatUkuran(perkiraan.usage)}</strong></li>` : ''}
        </ul>
        <p class="bantuan">${penjelasanPermanen}</p>
        <p class="bantuan">Foto dikompres (sisi terpanjang 2000 piksel). Video maksimal 1 menit.</p>
      </section>

      <section class="kartu kartu-risiko">
        <h2>Penting: risiko kehilangan data</h2>
        <p>Semua karya hanya tersimpan di browser HP ini. Tidak ada salinan di internet. Data akan <strong>hilang</strong> kalau:</p>
        <ul>
          <li>data browser atau data situs dihapus,</li>
          <li>aplikasi dihapus dari layar utama (terutama di iPhone),</li>
          <li>ganti HP atau ganti browser,</li>
          <li>alamat situs aplikasi ini berubah.</li>
        </ul>
        <p>Di iPhone, Safari bisa menghapus data situs yang tidak dibuka selama 7 hari, kecuali aplikasi sudah dipasang ke layar utama.</p>
        <p><strong>Satu-satunya pengaman: ekspor cadangan secara rutin.</strong></p>
      </section>

      ${modeSatuFile ? `
      <section class="kartu">
        <h2>Versi satu file</h2>
        <p>Ini versi satu file untuk mencoba. Mode offline dan pemasangan ke layar utama hanya ada di versi yang di-deploy.
          Data di versi ini terpisah dari data di versi yang di-deploy.</p>
      </section>` : `
      <section class="kartu">
        <h2>Pasang ke layar utama</h2>
        <p>${terpasang ? 'Aplikasi sudah dipasang di layar utama.' : 'Aplikasi belum dipasang ke layar utama.'}</p>
        ${terpasang ? '' : '<button type="button" class="tombol" id="panduan">Lihat cara pasang</button>'}
      </section>`}

      <section class="kartu">
        <h2>Data contoh</h2>
        <p class="bantuan">2 anak dan 10 karya bergambar untuk mencoba aplikasi. Data contoh tidak ikut dicadangkan.</p>
        ${jumlahContoh
    ? `<p>Ada ${jumlahContoh} karya contoh.</p>
           <button type="button" class="tombol tombol-bahaya-garis" id="hapus-contoh">Hapus data contoh</button>`
    : '<button type="button" class="tombol" id="muat-contoh">Muat data contoh</button>'}
      </section>

      <p class="kaki redup">Museum Karya Anak versi ${esc(self.APP_VERSION)}<br>
        Tanpa server, tanpa akun, tanpa analytics.</p>`,
    siapkan(main) {
      const muatUlang = () => pergi('#/pengaturan', { ganti: true });

      main.querySelector('#ekspor').addEventListener('click', async () => {
        if (await jalankanEkspor()) muatUlang();
      });
      main.querySelector('#input-impor').addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (file && await jalankanImpor(file)) muatUlang();
      });
      const panduan = main.querySelector('#panduan');
      if (panduan) panduan.addEventListener('click', bukaPanduan);

      const muat = main.querySelector('#muat-contoh');
      if (muat) {
        muat.addEventListener('click', async () => {
          const p = lembarProgres('Memuat data contoh');
          try {
            await muatDataContoh((i, n) => p.perbarui(`Menggambar karya ${i} dari ${n}…`));
            p.tutup();
            kabar('Data contoh dimuat');
            muatUlang();
          } catch (err) {
            p.tutup();
            await pemberitahuan({ judul: 'Gagal memuat data contoh', pesan: err.message });
          }
        });
      }
      const hapus = main.querySelector('#hapus-contoh');
      if (hapus) {
        hapus.addEventListener('click', async () => {
          const yakin = await konfirmasi({
            judul: 'Hapus data contoh?',
            pesan: 'Semua karya contoh dan anak contoh akan dihapus. Data asli Anda tidak ikut terhapus.',
            ya: 'Ya, hapus',
            bahaya: true,
          });
          if (!yakin) return;
          const hasil = await hapusDataContoh();
          kabar(`${hasil.karya} karya contoh dihapus`);
          muatUlang();
        });
      }
    },
  };
}
