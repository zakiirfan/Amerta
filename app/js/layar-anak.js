// Layar direktori anak: beranda (pilihan anak), halaman anak (galeri),
// serta formulir tambah/ubah/hapus anak.

import {
  daftarAnak, ambilAnak, simpanAnak, hapusAnak, KaryaMasihAda, semuaKarya, karyaMilikAnak,
} from './db.js';
import { hariIni, tanggalPanjang, teksUsia } from './usia.js';
import {
  esc, konfirmasi, pemberitahuan, kabar,
} from './ui.js';
import { pergi, kembali, keBeranda } from './router.js';
import { modeSatuFile, sudahTerpasang } from './pwa.js';
import { bukaPanduan } from './panduan-pasang.js';
import { punyaCerita, urutkanTerbaru } from './karya.js';
import { htmlGaleri, siapkanGaleri } from './galeri.js';
import { pesanPengingatEkspor, tundaPengingat, jalankanEkspor } from './cadangan.js';

const JUMLAH_WARNA_AVATAR = 6;

function kelasAvatar(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `avatar-${h % JUMLAH_WARNA_AVATAR}`;
}

function inisial(nama) {
  return (Array.from(nama.trim())[0] || '?').toUpperCase();
}

function avatar(a, besar = false) {
  return `<span class="avatar ${kelasAvatar(a.id)} ${besar ? 'avatar-besar' : ''}" aria-hidden="true">${esc(inisial(a.nama))}</span>`;
}

// ---------- Beranda ----------

export async function layarBeranda() {
  const [semua, karya, pengingat] = await Promise.all([
    daftarAnak(), semuaKarya(), pesanPengingatEkspor(),
  ]);
  const jumlahKarya = new Map();
  karya.forEach((k) => jumlahKarya.set(k.anakId, (jumlahKarya.get(k.anakId) || 0) + 1));

  const daftar = semua.map((a) => {
    const n = jumlahKarya.get(a.id) || 0;
    const info = [a.tanggalLahir ? teksUsia(a.tanggalLahir) : '', `${n} karya`].filter(Boolean).join(' · ');
    return `
      <button type="button" class="kartu-anak" data-ke="#/anak/${a.id}">
        ${avatar(a)}
        <span class="kartu-anak-teks">
          <span class="kartu-anak-nama">${esc(a.nama)}</span>
          <span class="redup">${esc(info)}</span>
        </span>
        <span class="panah" aria-hidden="true">›</span>
      </button>`;
  }).join('');

  const kosong = `
    <section class="kartu kosong">
      <h2>Belum ada anak</h2>
      <p>Tambahkan anak dulu. Setiap anak punya direktori karya sendiri.</p>
      <p class="bantuan">Ingin mencoba dulu? Muat data contoh di Pengaturan.</p>
    </section>`;

  const kartuPengingat = pengingat ? `
    <section class="kartu kartu-pengingat" role="status">
      <h2>Waktunya membuat cadangan</h2>
      <p>${esc(pengingat)} Cadangan melindungi karya kalau HP hilang atau data browser terhapus.</p>
      <button type="button" class="tombol tombol-utama" id="ekspor-sekarang">Ekspor cadangan sekarang</button>
      <button type="button" class="tombol-teks" id="tunda-pengingat">Ingatkan lagi nanti</button>
    </section>` : '';

  return {
    judul: 'Amerta',
    kembaliKe: null,
    nav: 'beranda',
    isi: `
      <p class="tagline">Abadikan Momen Berharga Anda</p>
      ${kartuPengingat}
      ${semua.length ? `<h2 class="subjudul">Pilih anak</h2><div class="daftar-anak">${daftar}</div>` : kosong}
      <button type="button" class="tombol ${semua.length ? '' : 'tombol-utama'}" data-ke="#/anak/baru">+ Tambah anak</button>
      <footer class="kaki">
        ${sudahTerpasang() || modeSatuFile ? '' :'<button type="button" class="tombol-teks" id="buka-panduan">Cara pasang ke layar utama</button>'}
        <p class="redup">Versi ${esc(self.APP_VERSION)} · Data hanya tersimpan di HP ini</p>
      </footer>`,
    siapkan(main) {
      const t = main.querySelector('#buka-panduan');
      if (t) t.addEventListener('click', bukaPanduan);
      const ekspor = main.querySelector('#ekspor-sekarang');
      if (ekspor) {
        ekspor.addEventListener('click', async () => {
          if (await jalankanEkspor()) pergi('#/', { ganti: true });
        });
        main.querySelector('#tunda-pengingat').addEventListener('click', async () => {
          await tundaPengingat();
          main.querySelector('.kartu-pengingat').remove();
        });
      }
    },
  };
}

// ---------- Halaman anak (galeri karya) ----------

export async function layarAnak(id) {
  const a = await ambilAnak(id);
  if (!a) return layarAnakTidakAda();
  const daftar = urutkanTerbaru(await karyaMilikAnak(id));
  const tanpaCerita = daftar.filter((k) => !punyaCerita(k)).length;

  const usia = a.tanggalLahir
    ? `<p>${esc(teksUsia(a.tanggalLahir))} · lahir ${esc(tanggalPanjang(a.tanggalLahir))}</p>`
    : '<p class="redup">Tanggal lahir belum diisi</p>';

  return {
    judul: a.nama,
    kembaliKe: '#/',
    nav: 'beranda',
    isi: `
      <section class="profil-anak">
        ${avatar(a, true)}
        <div>
          <h2>${esc(a.nama)}</h2>
          ${usia}
        </div>
      </section>
      <button type="button" class="tombol tombol-utama" data-ke="#/karya/baru?anak=${a.id}">+ Tambah karya untuk ${esc(a.nama)}</button>
      ${daftar.length ? `
        ${tanpaCerita ? `<p class="bantuan catatan-cerita">${tanpaCerita} karya belum punya cerita (bertanda <span class="tanda-cerita-contoh">Belum ada cerita</span>). Ketuk karyanya untuk melengkapi.</p>` : ''}
        ${htmlGaleri(daftar)}` : `
        <section class="kartu kosong"><p>Belum ada karya milik ${esc(a.nama)}.</p></section>`}
      <button type="button" class="tombol" data-ke="#/anak/${a.id}/ubah">Ubah data anak</button>`,
    siapkan(main) {
      this.bersihkan = siapkanGaleri(main, daftar);
    },
  };
}

function layarAnakTidakAda() {
  return {
    judul: 'Tidak ditemukan',
    kembaliKe: '#/',
    isi: `
      <section class="kartu">
        <h2>Data anak tidak ditemukan</h2>
        <p>Mungkin sudah dihapus.</p>
      </section>
      <button type="button" class="tombol tombol-utama" data-ke="#/" data-ganti>Ke beranda</button>`,
  };
}

// ---------- Formulir tambah / ubah anak ----------

export function layarTambahAnak() {
  return layarFormAnak(null);
}

export async function layarUbahAnak(id) {
  const a = await ambilAnak(id);
  if (!a) return layarAnakTidakAda();
  return layarFormAnak(a);
}

function layarFormAnak(lama) {
  return {
    judul: lama ? 'Ubah data anak' : 'Tambah anak',
    kembaliKe: lama ? `#/anak/${lama.id}` : '#/',
    tanpaNav: true,
    isi: `
      <form id="form-anak" class="formulir" novalidate>
        <label class="isian">
          <span class="label">Nama anak <span class="wajib">(wajib)</span></span>
          <input name="nama" type="text" maxlength="40" autocomplete="off"
                 autocapitalize="words" enterkeyhint="done" value="${esc(lama ? lama.nama : '')}">
        </label>

        <div class="isian">
          <label class="label" for="tanggal-lahir">Tanggal lahir <span class="redup">(boleh dikosongkan)</span></label>
          <input id="tanggal-lahir" name="tanggalLahir" type="date" max="${hariIni()}"
                 value="${esc(lama && lama.tanggalLahir ? lama.tanggalLahir : '')}">
          <span class="bantuan" id="pratinjau-usia"></span>
          <button type="button" class="tombol-teks" id="kosongkan-tanggal" hidden>Kosongkan tanggal lahir</button>
        </div>

        <p class="pesan-galat" id="galat" role="alert" hidden></p>
        <button type="submit" class="tombol tombol-utama" id="tombol-simpan" disabled>Simpan</button>
      </form>
      ${lama ? '<button type="button" class="tombol tombol-bahaya" id="hapus-anak">Hapus anak</button>' : ''}`,
    siapkan(main) {
      siapkanFormAnak(main, lama);
    },
  };
}

function siapkanFormAnak(main, lama) {
  const form = main.querySelector('#form-anak');
  const inputNama = form.elements.nama;
  const inputTanggal = form.elements.tanggalLahir;
  const tombolSimpan = main.querySelector('#tombol-simpan');
  const pratinjau = main.querySelector('#pratinjau-usia');
  const kosongkan = main.querySelector('#kosongkan-tanggal');
  const galat = main.querySelector('#galat');

  const tampilGalat = (pesan) => {
    galat.textContent = pesan || '';
    galat.hidden = !pesan;
  };

  const perbarui = () => {
    tombolSimpan.disabled = !inputNama.value.trim();
    const tgl = inputTanggal.value;
    kosongkan.hidden = !tgl;
    if (tgl && tgl > hariIni()) {
      pratinjau.textContent = 'Tanggal lahir tidak boleh di masa depan.';
    } else if (tgl) {
      pratinjau.textContent = `Usia sekarang: ${teksUsia(tgl)}`;
    } else {
      pratinjau.textContent = 'Dipakai untuk menghitung usia anak saat karya dibuat.';
    }
  };

  inputNama.addEventListener('input', () => { tampilGalat(''); perbarui(); });
  inputTanggal.addEventListener('input', perbarui);
  inputTanggal.addEventListener('change', perbarui);
  kosongkan.addEventListener('click', () => { inputTanggal.value = ''; perbarui(); });
  perbarui();
  if (!lama) inputNama.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = inputNama.value.trim();
    const tanggalLahir = inputTanggal.value;
    if (!nama) return;
    if (tanggalLahir && tanggalLahir > hariIni()) {
      tampilGalat('Tanggal lahir tidak boleh di masa depan.');
      return;
    }

    tombolSimpan.disabled = true;
    try {
      const kembar = (await daftarAnak()).find((a) => (!lama || a.id !== lama.id)
        && a.nama.toLocaleLowerCase('id') === nama.toLocaleLowerCase('id'));
      if (kembar) {
        tampilGalat(`Sudah ada anak bernama "${kembar.nama}".`);
        return;
      }
      const tersimpan = await simpanAnak({ id: lama && lama.id, nama, tanggalLahir });
      kabar('Data anak disimpan');
      if (lama) kembali(`#/anak/${lama.id}`);
      else pergi(`#/anak/${tersimpan.id}`, { ganti: true });
    } catch (err) {
      console.error(err);
      tampilGalat(`Gagal menyimpan: ${err.message}`);
    } finally {
      perbarui();
    }
  });

  const tombolHapus = main.querySelector('#hapus-anak');
  if (tombolHapus) {
    tombolHapus.addEventListener('click', () => mintaHapusAnak(lama));
  }
}

async function mintaHapusAnak(anak) {
  const yakin = await konfirmasi({
    judul: `Hapus ${anak.nama}?`,
    pesan: 'Data anak ini akan dihapus dari HP. Tindakan ini tidak bisa dibatalkan.',
    ya: 'Ya, hapus',
    bahaya: true,
  });
  if (!yakin) return;

  try {
    await hapusAnak(anak.id);
    kabar(`${anak.nama} sudah dihapus`);
    keBeranda();
  } catch (err) {
    if (err instanceof KaryaMasihAda) {
      await pemberitahuan({
        judul: 'Belum bisa dihapus',
        pesan: `${anak.nama} masih punya ${err.jumlah} karya. Hapus karya itu, atau pindahkan ke anak lain lewat "Ubah karya".`,
      });
    } else {
      console.error(err);
      await pemberitahuan({ judul: 'Gagal menghapus', pesan: err.message });
    }
  }
}
