// Ekspor dan impor cadangan: semua data (foto, suara, video, keterangan) dalam satu file .zip.
//
// Isi file cadangan:
//   data.json      → { aplikasi, format, versiAplikasi, versiDB, dibuat, anak[], karya[], media[] }
//   media/<id>.<ext> → foto, gambar kecil, rekaman suara, video
//   BACA-SAYA.txt  → penjelasan singkat

import {
  daftarAnak, semuaKarya, ambilMedia, ambilAnak, ambilKarya,
  simpanAnakMentah, gantiKaryaUtuh, ambilMeta, aturMeta, VERSI_DB,
} from './db.js';
import { buatZip, bacaZip } from './zip.js';
import { ekstensi, formatUkuran } from './media.js';
import { idMediaKarya } from './karya.js';
import { hariIni, tanggalPanjang } from './usia.js';
import { simpanFile } from './simpan-file.js';
import {
  lembarProgres, pemberitahuan, konfirmasi, kabar,
} from './ui.js';

const FORMAT = 1;
const BATAS_KARYA_BARU = 10;
const BATAS_HARI = 30;
const HARI_MS = 24 * 60 * 60 * 1000;

// ---------- Ekspor ----------

export async function buatFileCadangan(onProgres) {
  const semua = await semuaKarya();
  // Data contoh tidak ikut dicadangkan.
  const karya = semua.filter((k) => !k.contoh);
  const anakDipakai = new Set(karya.map((k) => k.anakId));
  const anak = (await daftarAnak()).filter((a) => !a.contoh || anakDipakai.has(a.id));

  const media = [];
  const entri = [];
  for (const k of karya) {
    for (const id of idMediaKarya(k)) {
      const m = await ambilMedia(id);
      if (!m) continue;
      const file = `media/${m.id}.${ekstensi(m.tipe)}`;
      media.push({
        id: m.id, karyaId: m.karyaId, jenis: m.jenis, tipe: m.tipe, ukuran: m.ukuran, file,
      });
      entri.push({ nama: file, data: m.blob });
    }
  }

  const data = {
    aplikasi: 'museum-karya-anak', // penanda format cadangan; JANGAN diganti walau nama aplikasi kini Amerta
    format: FORMAT,
    versiAplikasi: self.APP_VERSION,
    versiDB: VERSI_DB,
    dibuat: new Date().toISOString(),
    anak,
    karya,
    media,
  };
  entri.unshift(
    { nama: 'data.json', data: JSON.stringify(data, null, 1) },
    {
      nama: 'BACA-SAYA.txt',
      data: 'Cadangan Amerta (dulu Museum Karya Anak).\r\n'
        + 'Untuk mengembalikan data: buka aplikasi > Pengaturan > Impor cadangan, lalu pilih file .zip ini.\r\n'
        + 'Jangan mengubah isi file ini.\r\n',
    },
  );
  const blob = await buatZip(entri, onProgres);
  return { blob, jumlahAnak: anak.length, jumlahKarya: karya.length };
}

/** Alur lengkap ekspor: siapkan file, simpan ke HP, catat tanggalnya. */
export async function jalankanEkspor() {
  const progres = lembarProgres('Membuat cadangan');
  progres.perbarui('Mengumpulkan data…');
  let hasil;
  try {
    hasil = await buatFileCadangan((i, n) => progres.perbarui(`Menyiapkan file ${i} dari ${n}…`));
  } catch (err) {
    console.error(err);
    progres.tutup();
    await pemberitahuan({ judul: 'Cadangan gagal dibuat', pesan: err.message });
    return false;
  }
  progres.tutup();

  if (!hasil.jumlahKarya && !hasil.jumlahAnak) {
    await pemberitahuan({ judul: 'Belum ada data', pesan: 'Belum ada anak atau karya untuk dicadangkan (data contoh tidak ikut).' });
    return false;
  }

  const nama = `cadangan-amerta-${hariIni()}.zip`;
  const status = await simpanFile(hasil.blob, nama);
  if (status === 'batal') {
    kabar('Cadangan tidak disimpan');
    return false;
  }
  await aturMeta('eksporTerakhir', new Date().toISOString());
  await aturMeta('karyaSejakEkspor', 0);
  await aturMeta('pengingatDitundaSampai', null);
  await pemberitahuan({
    judul: 'Cadangan dibuat',
    pesan: `${hasil.jumlahAnak} anak dan ${hasil.jumlahKarya} karya (${formatUkuran(hasil.blob.size)}). `
      + (status === 'diunduh' ? 'File ada di folder Download. ' : '')
      + 'Simpan file ini di tempat lain juga, misalnya laptop atau penyimpanan online pribadi Anda.',
  });
  return true;
}

// ---------- Pengingat ekspor ----------

/** Teks pengingat kalau sudah waktunya membuat cadangan, atau null. */
export async function pesanPengingatEkspor() {
  const sejak = await ambilMeta('karyaSejakEkspor', 0);
  if (!sejak) return null;
  const tunda = await ambilMeta('pengingatDitundaSampai');
  if (tunda && Date.now() < tunda) return null;

  const terakhir = await ambilMeta('eksporTerakhir');
  if (sejak >= BATAS_KARYA_BARU) {
    return terakhir
      ? `Sudah ada ${sejak} karya baru sejak cadangan terakhir.`
      : `Sudah ada ${sejak} karya, tetapi belum pernah dicadangkan.`;
  }
  const acuan = terakhir || await ambilMeta('karyaPertama');
  if (acuan && Date.now() - new Date(acuan).getTime() >= BATAS_HARI * HARI_MS) {
    return terakhir
      ? `Cadangan terakhir dibuat ${tanggalPanjang(terakhir.slice(0, 10))}. Ada ${sejak} karya baru sejak itu.`
      : 'Karya pertama disimpan lebih dari 30 hari lalu dan belum pernah dicadangkan.';
  }
  return null;
}

export function tundaPengingat(hari = 3) {
  return aturMeta('pengingatDitundaSampai', Date.now() + hari * HARI_MS);
}

// ---------- Impor ----------

export async function bacaFileCadangan(file) {
  const zip = await bacaZip(file);
  const json = await zip.ambil('data.json');
  if (!json) throw new Error('File ini bukan cadangan Amerta.');
  let data;
  try {
    data = JSON.parse(await json.text());
  } catch {
    throw new Error('Isi cadangan rusak (data.json tidak terbaca).');
  }
  if (!data || data.aplikasi !== 'museum-karya-anak' || !Array.isArray(data.karya) || !Array.isArray(data.anak)) {
    throw new Error('File ini bukan cadangan Amerta.');
  }
  if (data.format > FORMAT) {
    throw new Error('Cadangan ini dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi dulu, lalu coba lagi.');
  }
  return { zip, data };
}

// Gabungkan: data yang belum ada ditambahkan, data yang lebih baru menggantikan yang lama.
// Tidak ada data di HP yang dihapus.
export async function imporCadangan({ zip, data }, onProgres) {
  const hasil = {
    anakBaru: 0, anakDiperbarui: 0, karyaBaru: 0, karyaDiperbarui: 0, karyaSama: 0, dilewati: 0,
  };
  for (const a of data.anak) {
    if (!a || typeof a.id !== 'string' || typeof a.nama !== 'string') continue;
    const lama = await ambilAnak(a.id);
    if (!lama) { await simpanAnakMentah(a); hasil.anakBaru++; } else if ((a.diubah || '') > (lama.diubah || '')) {
      await simpanAnakMentah(a);
      hasil.anakDiperbarui++;
    }
  }

  const mediaPerKarya = new Map();
  (data.media || []).forEach((m) => {
    if (!mediaPerKarya.has(m.karyaId)) mediaPerKarya.set(m.karyaId, []);
    mediaPerKarya.get(m.karyaId).push(m);
  });

  for (const [i, k] of data.karya.entries()) {
    onProgres(i + 1, data.karya.length);
    if (!k || typeof k.id !== 'string' || !k.fotoId || !(await ambilAnak(k.anakId))) {
      hasil.dilewati++;
      continue;
    }
    const lama = await ambilKarya(k.id);
    if (lama && !((k.diubah || '') > (lama.diubah || ''))) { hasil.karyaSama++; continue; }

    const media = [];
    let rusak = false;
    for (const m of mediaPerKarya.get(k.id) || []) {
      try {
        const blob = await zip.ambil(m.file, m.tipe);
        if (!blob) { rusak = true; break; }
        media.push({
          id: m.id, karyaId: k.id, jenis: m.jenis, tipe: m.tipe, ukuran: blob.size, blob,
        });
      } catch (err) {
        console.error(err);
        rusak = true;
        break;
      }
    }
    if (rusak || !media.some((m) => m.id === k.fotoId)) { hasil.dilewati++; continue; }
    await gantiKaryaUtuh(k, media);
    if (lama) hasil.karyaDiperbarui++; else hasil.karyaBaru++;
  }
  return hasil;
}

/** Alur lengkap impor dari file yang dipilih pengguna. */
export async function jalankanImpor(file) {
  const progres = lembarProgres('Membaca cadangan');
  let cadangan;
  try {
    cadangan = await bacaFileCadangan(file);
  } catch (err) {
    progres.tutup();
    await pemberitahuan({ judul: 'Cadangan tidak bisa dibuka', pesan: err.message });
    return false;
  }
  progres.tutup();

  const { data } = cadangan;
  const tgl = data.dibuat ? tanggalPanjang(String(data.dibuat).slice(0, 10)) : 'tidak diketahui';
  const yakin = await konfirmasi({
    judul: 'Impor cadangan ini?',
    pesan: `Dibuat ${tgl}, berisi ${data.anak.length} anak dan ${data.karya.length} karya. `
      + 'Data yang belum ada akan ditambahkan, dan data yang sama tidak digandakan. '
      + 'Tidak ada data di HP ini yang dihapus.',
    ya: 'Impor',
  });
  if (!yakin) return false;

  const p = lembarProgres('Mengimpor cadangan');
  let hasil;
  try {
    hasil = await imporCadangan(cadangan, (i, n) => p.perbarui(`Karya ${i} dari ${n}…`));
  } catch (err) {
    console.error(err);
    p.tutup();
    await pemberitahuan({
      judul: 'Impor terhenti',
      pesan: `${err && err.name === 'QuotaExceededError' ? 'Ruang penyimpanan HP penuh.' : err.message} `
        + 'Sebagian data mungkin sudah masuk. Impor boleh diulang, data tidak akan digandakan.',
    });
    return false;
  }
  p.tutup();

  const bagian = [
    `${hasil.anakBaru} anak baru`,
    `${hasil.karyaBaru} karya baru`,
  ];
  if (hasil.anakDiperbarui || hasil.karyaDiperbarui) {
    bagian.push(`${hasil.anakDiperbarui + hasil.karyaDiperbarui} data diperbarui`);
  }
  if (hasil.karyaSama) bagian.push(`${hasil.karyaSama} karya sudah ada`);
  if (hasil.dilewati) bagian.push(`${hasil.dilewati} karya dilewati karena datanya tidak lengkap`);
  await pemberitahuan({ judul: 'Impor selesai', pesan: `${bagian.join(', ')}.` });
  return true;
}
