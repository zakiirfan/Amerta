// Foto, suara, dan video: kompres foto, baca tanggal foto, cek durasi.

import { hariIni } from './usia.js';

export const FOTO_SISI_MAKS = 2000;   // piksel, sisi terpanjang
const THUMB_SISI_MAKS = 480;
export const VIDEO_DETIK_MAKS = 180; // 3 menit
/** Teks batas durasi video untuk ditampilkan, misalnya "3 menit". */
export const TEKS_VIDEO_MAKS = `${VIDEO_DETIK_MAKS / 60} menit`;
export const VIDEO_BYTE_MAKS = 300 * 1024 * 1024;
export const SUARA_BYTE_MAKS = 30 * 1024 * 1024;

function muatGambar(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto tidak bisa dibuka. Coba pilih foto lain (JPG atau PNG).'));
    };
    img.src = url;
  });
}

function kanvasKeBlob(kanvas, kualitas) {
  return new Promise((resolve, reject) => {
    kanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal mengompres foto.'))),
      'image/jpeg',
      kualitas,
    );
  });
}

/** Perkecil gambar/kanvas sampai sisi terpanjang = sisiMaks, simpan sebagai JPEG. */
export async function perkecil(sumber, sisiMaks, kualitas) {
  const w0 = sumber.naturalWidth || sumber.width;
  const h0 = sumber.naturalHeight || sumber.height;
  const skala = Math.min(1, sisiMaks / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * skala));
  const h = Math.max(1, Math.round(h0 * skala));
  const k = document.createElement('canvas');
  k.width = w;
  k.height = h;
  const ctx = k.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sumber, 0, 0, w, h);
  const blob = await kanvasKeBlob(k, kualitas);
  k.width = 0; // lepaskan memori (penting di iPhone)
  k.height = 0;
  return { blob, lebar: w, tinggi: h };
}

/**
 * Siapkan foto untuk disimpan: kompres ke 2000 px, buat gambar kecil untuk galeri,
 * dan ambil tanggal foto (dari data EXIF, kalau ada).
 */
export async function prosesFoto(file) {
  const tanggalExif = await bacaTanggalExif(file).catch(() => null);
  const img = await muatGambar(file);
  const foto = await perkecil(img, FOTO_SISI_MAKS, 0.85);
  const thumb = await perkecil(img, THUMB_SISI_MAKS, 0.75);
  const tanggal = tanggalExif || tanggalBerkas(file) || hariIni();
  return {
    foto: foto.blob,
    fotoLebar: foto.lebar,
    fotoTinggi: foto.tinggi,
    thumb: thumb.blob,
    tanggal,
    sumberTanggal: tanggalExif ? 'foto' : (tanggal === hariIni() ? 'hari-ini' : 'berkas'),
  };
}

function tanggalBerkas(file) {
  if (!file.lastModified) return null;
  const d = new Date(file.lastModified);
  const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return t > hariIni() || t < '1990-01-01' ? null : t;
}

/** Membaca tanggal pengambilan dari data EXIF foto JPEG. Hasil 'YYYY-MM-DD' atau null. */
export async function bacaTanggalExif(file) {
  const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
  try {
    if (v.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 10 < v.byteLength) {
      const penanda = v.getUint16(p);
      const panjang = v.getUint16(p + 2);
      if (penanda === 0xFFE1 && v.getUint32(p + 4) === 0x45786966) return tanggalDariTiff(v, p + 10);
      if ((penanda & 0xFF00) !== 0xFF00 || penanda === 0xFFDA) return null;
      p += 2 + panjang;
    }
  } catch {
    return null;
  }
  return null;
}

function tanggalDariTiff(v, t) {
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o) => v.getUint16(t + o, le);
  const u32 = (o) => v.getUint32(t + o, le);
  const bacaIfd = (off) => {
    const isi = {};
    const n = u16(off);
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      isi[u16(e)] = { jumlah: u32(e + 4), nilai: e + 8 };
    }
    return isi;
  };
  const teks = (ent) => {
    if (!ent) return null;
    const off = ent.jumlah > 4 ? u32(ent.nilai) : ent.nilai;
    let s = '';
    for (let i = 0; i < Math.min(ent.jumlah, 32); i++) {
      const c = v.getUint8(t + off + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const ifd0 = bacaIfd(u32(4));
  let tgl = null;
  if (ifd0[0x8769]) {
    const exif = bacaIfd(u32(ifd0[0x8769].nilai));
    tgl = teks(exif[0x9003]) || teks(exif[0x9004]);
  }
  tgl = tgl || teks(ifd0[0x0132]);
  const m = tgl && tgl.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const hasilTgl = `${m[1]}-${m[2]}-${m[3]}`;
  if (hasilTgl < '1990-01-01' || hasilTgl > hariIni()) return null;
  return hasilTgl;
}

/** Durasi audio/video dalam detik, atau null kalau tidak bisa dibaca. */
export function durasiMedia(blob, jenis = 'video') {
  return new Promise((resolve) => {
    const el = document.createElement(jenis);
    el.preload = 'metadata';
    el.muted = true;
    const url = URL.createObjectURL(blob);
    let selesai = false;
    const akhiri = (d) => {
      if (selesai) return;
      selesai = true;
      URL.revokeObjectURL(url);
      el.removeAttribute('src');
      resolve(Number.isFinite(d) && d > 0 ? d : null);
    };
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration)) { akhiri(el.duration); return; }
      // Rekaman WebM sering tidak mencatat durasi: lompat ke akhir untuk mengetahuinya.
      el.ontimeupdate = () => { el.ontimeupdate = null; akhiri(el.duration); };
      el.currentTime = 1e101;
    };
    el.onerror = () => akhiri(null);
    setTimeout(() => akhiri(null), 8000);
    el.src = url;
  });
}

export function formatDurasi(detik) {
  const d = Math.max(0, Math.round(detik || 0));
  return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
}

export function formatUkuran(byte) {
  if (!byte) return '0 KB';
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`;
  if (byte < 1024 * 1024 * 1024) {
    return `${(byte / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
  }
  return `${(byte / 1024 / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 2 })} GB`;
}

export function ekstensi(tipe) {
  const dasar = (tipe || '').split(';')[0].trim().toLowerCase();
  return {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/json': 'json',
  }[dasar] || 'bin';
}
