// Membuat dan membaca file .zip di browser (tanpa library luar).
// File disimpan tanpa kompresi ("store"): foto, suara, dan video memang sudah terkompresi,
// jadi hasilnya hampir sama kecil, dan jauh lebih hemat memori HP.

const TABEL_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function lanjutCrc(crc, bytes) {
  let c = crc;
  for (let i = 0; i < bytes.length; i++) c = TABEL_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return c;
}

export function crc32(bytes) {
  return (lanjutCrc(0xFFFFFFFF, bytes) ^ 0xFFFFFFFF) >>> 0;
}

// Video bisa ratusan MB: dibaca per potongan supaya memori HP tidak penuh.
const POTONGAN = 4 * 1024 * 1024;

/** CRC32 sebuah Blob, dibaca per potongan 4 MB. */
export async function crc32Blob(blob) {
  let c = 0xFFFFFFFF;
  for (let mulai = 0; mulai < blob.size; mulai += POTONGAN) {
    const bytes = new Uint8Array(await blob.slice(mulai, mulai + POTONGAN).arrayBuffer());
    c = lanjutCrc(c, bytes);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function waktuDos(d) {
  return {
    waktu: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    tanggal: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * daftar: [{ nama: 'folder/file.ext', data: Blob | string }]
 * onProgres(selesai, total) dipanggil setiap satu file selesai.
 */
export async function buatZip(daftar, onProgres) {
  const enc = new TextEncoder();
  const { waktu, tanggal } = waktuDos(new Date());
  const bagian = [];
  const pusat = [];
  let posisi = 0;

  for (let i = 0; i < daftar.length; i++) {
    const { nama, data } = daftar[i];
    const blob = typeof data === 'string' ? new Blob([data]) : data;
    const crc = await crc32Blob(blob);
    const ukuran = blob.size;
    const namaB = enc.encode(nama);
    if (posisi + 30 + namaB.length + ukuran > 0xFFFFFFFF) {
      throw new Error('Cadangan terlalu besar (lebih dari 4 GB). Hapus beberapa video, lalu coba lagi.');
    }

    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true); // nama file UTF-8
    h.setUint16(8, 0, true);      // tanpa kompresi
    h.setUint16(10, waktu, true);
    h.setUint16(12, tanggal, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, ukuran, true);
    h.setUint32(22, ukuran, true);
    h.setUint16(26, namaB.length, true);
    h.setUint16(28, 0, true);
    bagian.push(h.buffer, namaB, blob);
    pusat.push({ namaB, crc, ukuran, posisi });
    posisi += 30 + namaB.length + ukuran;
    if (onProgres) onProgres(i + 1, daftar.length);
  }

  const awalPusat = posisi;
  let ukuranPusat = 0;
  for (const e of pusat) {
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, waktu, true);
    c.setUint16(14, tanggal, true);
    c.setUint32(16, e.crc, true);
    c.setUint32(20, e.ukuran, true);
    c.setUint32(24, e.ukuran, true);
    c.setUint16(28, e.namaB.length, true);
    c.setUint32(42, e.posisi, true);
    bagian.push(c.buffer, e.namaB);
    ukuranPusat += 46 + e.namaB.length;
  }
  if (pusat.length > 0xFFFF) throw new Error('Terlalu banyak file dalam satu cadangan.');

  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true);
  akhir.setUint16(8, pusat.length, true);
  akhir.setUint16(10, pusat.length, true);
  akhir.setUint32(12, ukuranPusat, true);
  akhir.setUint32(16, awalPusat, true);
  bagian.push(akhir.buffer);

  return new Blob(bagian, { type: 'application/zip' });
}

const BUKAN_ZIP = 'File ini bukan file cadangan yang valid.';

/** Membaca daftar isi zip. Isi file baru dibaca saat diminta (hemat memori). */
export async function bacaZip(blob) {
  const panjangEkor = Math.min(blob.size, 65557);
  const ekor = new DataView(await blob.slice(blob.size - panjangEkor).arrayBuffer());
  let p = -1;
  for (let i = ekor.byteLength - 22; i >= 0; i--) {
    if (ekor.getUint32(i, true) === 0x06054b50) { p = i; break; }
  }
  if (p < 0) throw new Error(BUKAN_ZIP);

  const jumlah = ekor.getUint16(p + 10, true);
  const ukuranPusat = ekor.getUint32(p + 12, true);
  const awalPusat = ekor.getUint32(p + 16, true);
  if (awalPusat + ukuranPusat > blob.size) throw new Error(BUKAN_ZIP);
  const cd = new DataView(await blob.slice(awalPusat, awalPusat + ukuranPusat).arrayBuffer());
  const dec = new TextDecoder();
  const isi = new Map();
  let q = 0;
  for (let i = 0; i < jumlah; i++) {
    if (cd.getUint32(q, true) !== 0x02014b50) throw new Error(BUKAN_ZIP);
    const panjangNama = cd.getUint16(q + 28, true);
    const nama = dec.decode(new Uint8Array(cd.buffer, q + 46, panjangNama));
    isi.set(nama, {
      metode: cd.getUint16(q + 10, true),
      crc: cd.getUint32(q + 16, true),
      ukuranTerkompres: cd.getUint32(q + 20, true),
      posisi: cd.getUint32(q + 42, true),
    });
    q += 46 + panjangNama + cd.getUint16(q + 30, true) + cd.getUint16(q + 32, true);
  }

  return {
    nama: [...isi.keys()],
    /** Ambil satu file sebagai Blob (null kalau tidak ada). Isi diperiksa dengan CRC. */
    async ambil(nama, tipe = '') {
      const e = isi.get(nama);
      if (!e) return null;
      const lokal = new DataView(await blob.slice(e.posisi, e.posisi + 30).arrayBuffer());
      if (lokal.getUint32(0, true) !== 0x04034b50) throw new Error(BUKAN_ZIP);
      const mulai = e.posisi + 30 + lokal.getUint16(26, true) + lokal.getUint16(28, true);
      let data = blob.slice(mulai, mulai + e.ukuranTerkompres);
      if (e.metode === 8) {
        if (!window.DecompressionStream) throw new Error('Browser ini tidak bisa membuka file zip terkompresi.');
        data = await new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      } else if (e.metode !== 0) {
        throw new Error('Jenis kompresi file ini tidak didukung.');
      }
      if (await crc32Blob(data) !== e.crc) throw new Error(`File "${nama}" di dalam cadangan rusak.`);
      // Potongan dari file zip (tidak disalin ke memori).
      return new Blob([data], { type: tipe });
    },
  };
}
