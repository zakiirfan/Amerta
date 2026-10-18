// Lapisan penyimpanan data (IndexedDB). Semua data hanya ada di HP ini.
//
// Struktur data (lihat juga README):
//   anak:  { id, nama, tanggalLahir: 'YYYY-MM-DD' | null, contoh, dibuat, diubah }
//   karya: { id, anakId, fotoId, thumbId, fotoLebar, fotoTinggi, lokasi,
//            judul, ceritaTeks, suara: [{ id, durasi, tipe, sumber }],
//            video: null | { id, durasi, tipe },
//            acara, isi: [kata kunci], tanggal: 'YYYY-MM-DD',
//            usiaManual: null | angka tahun, contoh, dibuat, diubah }
//   media: { id, karyaId, jenis: 'foto'|'thumb'|'suara'|'video', tipe, ukuran, blob }
//   meta:  { kunci, nilai }
//
// ATURAN MIGRASI: jangan pernah mengubah atau menghapus langkah di MIGRASI.
// Untuk perubahan struktur, tambahkan langkah baru di akhir daftar.
// Langkah ke-i membawa database dari versi i ke versi i+1.

// Nama lama aplikasi (sekarang Amerta). JANGAN diganti: data di HP tersimpan dengan nama ini.
const NAMA_DB = 'museum-karya-anak';

const MIGRASI = [
  // Versi 0 → 1: direktori anak.
  (db) => {
    db.createObjectStore('anak', { keyPath: 'id' });
  },
  // Versi 1 → 2: karya, berkas media (foto, suara, video), dan catatan aplikasi.
  (db) => {
    const karya = db.createObjectStore('karya', { keyPath: 'id' });
    karya.createIndex('anakId', 'anakId');
    const media = db.createObjectStore('media', { keyPath: 'id' });
    media.createIndex('karyaId', 'karyaId');
    db.createObjectStore('meta', { keyPath: 'kunci' });
  },
];

export const VERSI_DB = MIGRASI.length;

let dbJanji = null;

export function bukaDB() {
  if (!dbJanji) {
    dbJanji = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Browser ini tidak bisa menyimpan data. Coba buka di Chrome atau Safari biasa (bukan mode samaran).'));
        return;
      }
      const req = indexedDB.open(NAMA_DB, MIGRASI.length);
      req.onupgradeneeded = (e) => {
        for (let v = e.oldVersion; v < MIGRASI.length; v++) {
          MIGRASI[v](req.result, req.transaction);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Versi aplikasi yang lebih baru dibuka di tab lain: tutup dan muat ulang.
        db.onversionchange = () => { db.close(); window.location.reload(); };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
    dbJanji.catch(() => { dbJanji = null; });
  }
  return dbJanji;
}

function hasil(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function baca(nama, fn) {
  const db = await bukaDB();
  return hasil(fn(db.transaction(nama).objectStore(nama)));
}

// Selesai hanya setelah data benar-benar tersimpan (transaksi complete).
// fn(tx) hanya boleh membuat permintaan IndexedDB, tanpa menunggu hal lain.
async function tulis(namaToko, fn) {
  const db = await bukaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(namaToko, 'readwrite');
    let keluaran;
    try {
      keluaran = fn(tx);
    } catch (err) {
      tx.abort();
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(keluaran);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Penyimpanan dibatalkan.'));
  });
}

// ---------- Anak ----------

export async function daftarAnak() {
  const semua = await baca('anak', (s) => s.getAll());
  return semua.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

export function ambilAnak(id) {
  return baca('anak', (s) => s.get(id));
}

export async function simpanAnak({ id, nama, tanggalLahir }) {
  const namaBersih = (nama || '').trim();
  if (!namaBersih) throw new Error('Nama anak wajib diisi.');
  const lama = id ? await ambilAnak(id) : null;
  const sekarang = new Date().toISOString();
  const data = {
    ...lama, // pertahankan kolom lain yang mungkin ditambah di versi mendatang
    id: lama ? lama.id : crypto.randomUUID(),
    nama: namaBersih,
    tanggalLahir: tanggalLahir || null,
    contoh: lama ? !!lama.contoh : false,
    dibuat: lama ? lama.dibuat : sekarang,
    diubah: sekarang,
  };
  await tulis('anak', (tx) => tx.objectStore('anak').put(data));
  return data;
}

/** Menyimpan data anak apa adanya (untuk impor cadangan dan data contoh). */
export function simpanAnakMentah(anak) {
  return tulis('anak', (tx) => tx.objectStore('anak').put(anak));
}

export async function hitungKaryaAnak(id) {
  const db = await bukaDB();
  if (!db.objectStoreNames.contains('karya')) return 0;
  return baca('karya', (s) => s.index('anakId').count(id));
}

export class KaryaMasihAda extends Error {
  constructor(jumlah) {
    super(`Masih ada ${jumlah} karya.`);
    this.jumlah = jumlah;
  }
}

// Menghapus anak HANYA kalau tidak punya karya.
// Pemeriksaan dan penghapusan terjadi dalam satu transaksi.
export async function hapusAnak(id) {
  const db = await bukaDB();
  const adaKarya = db.objectStoreNames.contains('karya');
  return new Promise((resolve, reject) => {
    const tx = db.transaction(adaKarya ? ['anak', 'karya'] : ['anak'], 'readwrite');
    let jumlahKarya = 0;
    if (adaKarya) {
      const r = tx.objectStore('karya').index('anakId').count(id);
      r.onsuccess = () => {
        jumlahKarya = r.result;
        if (jumlahKarya > 0) tx.abort();
        else tx.objectStore('anak').delete(id);
      };
    } else {
      tx.objectStore('anak').delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(jumlahKarya > 0 ? new KaryaMasihAda(jumlahKarya) : tx.error);
  });
}

// ---------- Karya ----------

export function semuaKarya() {
  return baca('karya', (s) => s.getAll());
}

export function karyaMilikAnak(anakId) {
  return baca('karya', (s) => s.index('anakId').getAll(anakId));
}

export function ambilKarya(id) {
  return baca('karya', (s) => s.get(id));
}

export function ambilMedia(id) {
  return baca('media', (s) => s.get(id));
}

/**
 * Menyimpan karya beserta berkas medianya dalam SATU transaksi:
 * tidak mungkin tersimpan setengah (misalnya karya tanpa foto).
 * mediaBaru: daftar rekaman media yang ditambah; mediaHapus: id media yang dibuang.
 * Karya baru (bukan data contoh) menambah hitungan "karya sejak ekspor".
 */
export function simpanKarya(karya, { mediaBaru = [], mediaHapus = [], baru = false } = {}) {
  return tulis(['karya', 'media', 'meta'], (tx) => {
    const tokoMedia = tx.objectStore('media');
    mediaHapus.forEach((id) => tokoMedia.delete(id));
    mediaBaru.forEach((m) => tokoMedia.put(m));
    tx.objectStore('karya').put(karya);

    if (baru && !karya.contoh) {
      const meta = tx.objectStore('meta');
      const r = meta.get('karyaSejakEkspor');
      r.onsuccess = () => {
        meta.put({ kunci: 'karyaSejakEkspor', nilai: ((r.result && r.result.nilai) || 0) + 1 });
      };
      const p = meta.get('karyaPertama');
      p.onsuccess = () => {
        if (!p.result) meta.put({ kunci: 'karyaPertama', nilai: new Date().toISOString() });
      };
    }
  });
}

/** Mengganti karya dan SEMUA medianya (dipakai saat impor cadangan). */
export function gantiKaryaUtuh(karya, media) {
  return tulis(['karya', 'media'], (tx) => {
    const tokoMedia = tx.objectStore('media');
    const r = tokoMedia.index('karyaId').getAllKeys(karya.id);
    r.onsuccess = () => {
      r.result.forEach((id) => tokoMedia.delete(id));
      media.forEach((m) => tokoMedia.put(m));
      tx.objectStore('karya').put(karya);
    };
  });
}

/** Menghapus karya beserta semua foto, rekaman, dan videonya. */
export function hapusKarya(id) {
  return tulis(['karya', 'media'], (tx) => {
    const tokoMedia = tx.objectStore('media');
    const r = tokoMedia.index('karyaId').getAllKeys(id);
    r.onsuccess = () => r.result.forEach((k) => tokoMedia.delete(k));
    tx.objectStore('karya').delete(id);
  });
}

/** Total ukuran semua foto, rekaman, dan video (byte). */
export async function ukuranSemuaMedia() {
  const db = await bukaDB();
  return new Promise((resolve, reject) => {
    let total = 0;
    const req = db.transaction('media').objectStore('media').openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) { resolve(total); return; }
      total += c.value.ukuran || 0;
      c.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------- Data contoh ----------

/** Menghapus semua karya contoh, lalu anak contoh yang sudah tidak punya karya. */
export async function hapusDataContoh() {
  const karyaContoh = (await semuaKarya()).filter((k) => k.contoh);
  for (const k of karyaContoh) await hapusKarya(k.id);
  let anakTerhapus = 0;
  for (const a of (await daftarAnak()).filter((x) => x.contoh)) {
    if ((await hitungKaryaAnak(a.id)) === 0) {
      await tulis('anak', (tx) => tx.objectStore('anak').delete(a.id));
      anakTerhapus++;
    }
  }
  return { karya: karyaContoh.length, anak: anakTerhapus };
}

// ---------- Meta (catatan aplikasi) ----------

export async function ambilMeta(kunci, bawaan = null) {
  const r = await baca('meta', (s) => s.get(kunci));
  return r ? r.nilai : bawaan;
}

export function aturMeta(kunci, nilai) {
  return tulis('meta', (tx) => {
    if (nilai === null || nilai === undefined) tx.objectStore('meta').delete(kunci);
    else tx.objectStore('meta').put({ kunci, nilai });
  });
}
