// Data contoh untuk mencoba aplikasi: 2 anak dan 10 karya bergambar.
// Semua ditandai `contoh: true`, jadi mudah dihapus tanpa menyentuh data asli.

import { simpanAnakMentah, simpanKarya } from './db.js';
import { perkecil } from './media.js';

const ANAK = [
  { id: 'contoh-anak-1', nama: 'Rara (contoh)', tanggalLahir: '2018-05-14' },
  { id: 'contoh-anak-2', nama: 'Bima (contoh)', tanggalLahir: '2020-11-02' },
];

const KARYA = [
  ['contoh-anak-1', 'Rumah nenek', 'Lebaran', ['rumah', 'matahari'], '2024-04-10', 'Rumah Nenek di Kampung', 'Ini rumah nenek. Mataharinya besar karena hari Lebaran cerah.'],
  ['contoh-anak-1', 'TK Pelangi', '', ['pelangi', 'awan'], '2023-08-17', 'Pelangi Tujuh Warna', ''],
  ['contoh-anak-1', 'Rumah', 'Ulang tahun ke-6', ['kue', 'balon'], '2024-05-14', 'Kue Ulang Tahunku', 'Kuenya cokelat, lilinnya enam.'],
  ['contoh-anak-1', 'SD Harapan', '', ['kucing'], '2025-09-02', 'Si Oren', ''],
  ['contoh-anak-1', 'Rumah nenek', 'Liburan sekolah', ['pohon', 'kucing'], '2026-07-05', 'Kebun Nenek', 'Kucing nenek suka tidur di bawah pohon mangga.'],
  ['contoh-anak-2', 'Rumah', '', ['mobil'], '2024-02-11', 'Mobil Merah', ''],
  ['contoh-anak-2', 'Rumah nenek', 'Lebaran', ['ketupat', 'rumah'], '2025-03-31', '', 'Bima menggambar ketupat untuk nenek.'],
  ['contoh-anak-2', 'TK Pelangi', 'Ulang tahun ke-5', ['balon', 'kue'], '2025-11-02', 'Pesta Bima', ''],
  ['contoh-anak-2', 'Taman kota', '', ['matahari', 'pohon'], '2026-06-20', 'Main di Taman', 'Ada pohon tinggi sekali.'],
  ['contoh-anak-2', 'TK Pelangi', '', ['pelangi', 'kucing'], '2026-09-15', '', ''],
];

// Angka acak yang selalu sama (supaya gambar contoh tidak berubah-ubah).
function acak(benih) {
  let s = benih;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function goresan(ctx, r, warna, tebal) {
  ctx.strokeStyle = warna;
  ctx.lineWidth = tebal + r() * 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function garis(ctx, r, titik) {
  ctx.beginPath();
  titik.forEach(([x, y], i) => {
    const jx = x + (r() - 0.5) * 8;
    const jy = y + (r() - 0.5) * 8;
    if (i) ctx.lineTo(jx, jy); else ctx.moveTo(jx, jy);
  });
  ctx.stroke();
}

function lingkaran(ctx, r, x, y, rad, warna, isi) {
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.3; a += 0.3) {
    const rr = rad + (r() - 0.5) * rad * 0.12;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  if (isi) { ctx.fillStyle = isi; ctx.fill(); }
  goresan(ctx, r, warna, 10);
  ctx.stroke();
}

const GAMBAR = {
  matahari(ctx, r, x, y, s) {
    lingkaran(ctx, r, x, y, 70 * s, '#E9A100', '#FFD23F');
    goresan(ctx, r, '#E9A100', 10);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      garis(ctx, r, [[x + Math.cos(a) * 95 * s, y + Math.sin(a) * 95 * s], [x + Math.cos(a) * 140 * s, y + Math.sin(a) * 140 * s]]);
    }
  },
  rumah(ctx, r, x, y, s) {
    ctx.fillStyle = '#F4A6A0';
    ctx.fillRect(x - 130 * s, y - 40 * s, 260 * s, 200 * s);
    goresan(ctx, r, '#8C3B2E', 12);
    garis(ctx, r, [[x - 130 * s, y - 40 * s], [x + 130 * s, y - 40 * s], [x + 130 * s, y + 160 * s], [x - 130 * s, y + 160 * s], [x - 130 * s, y - 40 * s]]);
    goresan(ctx, r, '#B23A28', 14);
    garis(ctx, r, [[x - 160 * s, y - 30 * s], [x, y - 170 * s], [x + 160 * s, y - 30 * s]]);
    goresan(ctx, r, '#5B3A1E', 10);
    garis(ctx, r, [[x - 30 * s, y + 160 * s], [x - 30 * s, y + 60 * s], [x + 30 * s, y + 60 * s], [x + 30 * s, y + 160 * s]]);
  },
  pelangi(ctx, r, x, y, s) {
    ['#E63946', '#F4A261', '#FFD23F', '#2A9D8F', '#457B9D', '#6A4C93'].forEach((w, i) => {
      goresan(ctx, r, w, 22);
      ctx.beginPath();
      ctx.arc(x, y + 120 * s, (260 - i * 26) * s, Math.PI, 0);
      ctx.stroke();
    });
  },
  awan(ctx, r, x, y, s) {
    [[-60, 0, 55], [0, -30, 65], [60, 0, 55]].forEach(([dx, dy, rad]) => lingkaran(ctx, r, x + dx * s, y + dy * s, rad * s, '#7FA7C9', '#EAF4FB'));
  },
  kue(ctx, r, x, y, s) {
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(x - 140 * s, y, 280 * s, 140 * s);
    ctx.fillStyle = '#F7C6D9';
    ctx.fillRect(x - 140 * s, y - 10 * s, 280 * s, 40 * s);
    for (let i = 0; i < 6; i++) {
      const lx = x - 100 * s + i * 40 * s;
      goresan(ctx, r, '#3D85C6', 10);
      garis(ctx, r, [[lx, y - 10 * s], [lx, y - 70 * s]]);
      lingkaran(ctx, r, lx, y - 85 * s, 10 * s, '#F4A100', '#FFD23F');
    }
  },
  balon(ctx, r, x, y, s) {
    [['#E63946', -70], ['#2A9D8F', 0], ['#F4A261', 70]].forEach(([w, dx], i) => {
      lingkaran(ctx, r, x + dx * s, y - (i % 2) * 40 * s, 50 * s, w, w);
      goresan(ctx, r, '#555', 4);
      garis(ctx, r, [[x + dx * s, y + 50 * s - (i % 2) * 40 * s], [x + dx * 0.4 * s, y + 220 * s]]);
    });
  },
  kucing(ctx, r, x, y, s) {
    lingkaran(ctx, r, x, y + 80 * s, 110 * s, '#C46A12', '#F4A261');
    lingkaran(ctx, r, x, y - 70 * s, 75 * s, '#C46A12', '#F4A261');
    goresan(ctx, r, '#C46A12', 10);
    garis(ctx, r, [[x - 60 * s, y - 110 * s], [x - 55 * s, y - 175 * s], [x - 15 * s, y - 135 * s]]);
    garis(ctx, r, [[x + 60 * s, y - 110 * s], [x + 55 * s, y - 175 * s], [x + 15 * s, y - 135 * s]]);
    lingkaran(ctx, r, x - 28 * s, y - 80 * s, 8 * s, '#222', '#222');
    lingkaran(ctx, r, x + 28 * s, y - 80 * s, 8 * s, '#222', '#222');
    goresan(ctx, r, '#333', 4);
    garis(ctx, r, [[x - 20 * s, y - 45 * s], [x - 90 * s, y - 55 * s]]);
    garis(ctx, r, [[x + 20 * s, y - 45 * s], [x + 90 * s, y - 55 * s]]);
  },
  pohon(ctx, r, x, y, s) {
    ctx.fillStyle = '#7B4B2A';
    ctx.fillRect(x - 25 * s, y, 50 * s, 190 * s);
    [[0, -60, 100], [-70, 0, 70], [70, 0, 70]].forEach(([dx, dy, rad]) => lingkaran(ctx, r, x + dx * s, y + dy * s, rad * s, '#2D6A4F', '#52B788'));
  },
  mobil(ctx, r, x, y, s) {
    ctx.fillStyle = '#E63946';
    ctx.fillRect(x - 170 * s, y, 340 * s, 90 * s);
    ctx.fillRect(x - 90 * s, y - 70 * s, 180 * s, 75 * s);
    goresan(ctx, r, '#8B1E28', 10);
    garis(ctx, r, [[x - 170 * s, y + 90 * s], [x - 170 * s, y], [x - 90 * s, y], [x - 90 * s, y - 70 * s], [x + 90 * s, y - 70 * s], [x + 90 * s, y], [x + 170 * s, y], [x + 170 * s, y + 90 * s]]);
    lingkaran(ctx, r, x - 95 * s, y + 100 * s, 38 * s, '#222', '#444');
    lingkaran(ctx, r, x + 95 * s, y + 100 * s, 38 * s, '#222', '#444');
  },
  ketupat(ctx, r, x, y, s) {
    ctx.fillStyle = '#9BC53D';
    ctx.beginPath();
    ctx.moveTo(x, y - 120 * s); ctx.lineTo(x + 110 * s, y); ctx.lineTo(x, y + 120 * s); ctx.lineTo(x - 110 * s, y);
    ctx.closePath();
    ctx.fill();
    goresan(ctx, r, '#3E7C17', 8);
    for (let i = -2; i <= 2; i++) {
      garis(ctx, r, [[x - 55 * s + i * 27 * s, y - 60 * s - i * 27 * s], [x + 55 * s + i * 27 * s, y + 60 * s - i * 27 * s]]);
    }
    goresan(ctx, r, '#3E7C17', 6);
    garis(ctx, r, [[x, y - 120 * s], [x + 20 * s, y - 190 * s]]);
  },
};

function gambarKarya(isi, benih) {
  const k = document.createElement('canvas');
  k.width = 1200;
  k.height = 900;
  const ctx = k.getContext('2d');
  const r = acak(benih);
  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(0, 0, 1200, 900);
  goresan(ctx, r, '#7CB518', 16);
  garis(ctx, r, [[40, 800], [400, 780], [800, 805], [1160, 785]]);
  const [utama, kedua] = isi;
  if (GAMBAR[kedua]) GAMBAR[kedua](ctx, r, 930, 230, 0.8);
  if (GAMBAR[utama]) GAMBAR[utama](ctx, r, 520, 470, 1.1);
  return k;
}

export async function muatDataContoh(onProgres) {
  for (const a of ANAK) {
    const sekarang = new Date().toISOString();
    await simpanAnakMentah({ ...a, contoh: true, dibuat: sekarang, diubah: sekarang });
  }
  for (const [i, [anakId, lokasi, acara, isi, tanggal, judul, ceritaTeks]] of KARYA.entries()) {
    if (onProgres) onProgres(i + 1, KARYA.length);
    const id = `contoh-karya-${i + 1}`;
    const kanvas = gambarKarya(isi, i + 7);
    const foto = await perkecil(kanvas, 2000, 0.85);
    const thumb = await perkecil(kanvas, 480, 0.75);
    const fotoId = `${id}-foto`;
    const thumbId = `${id}-thumb`;
    const waktu = new Date(`${tanggal}T10:00:00`).toISOString();
    await simpanKarya({
      id,
      anakId,
      fotoId,
      thumbId,
      fotoLebar: foto.lebar,
      fotoTinggi: foto.tinggi,
      lokasi,
      judul,
      ceritaTeks,
      suara: [],
      video: null,
      acara,
      isi,
      tanggal,
      usiaManual: null,
      contoh: true,
      dibuat: waktu,
      diubah: waktu,
    }, {
      mediaBaru: [
        { id: fotoId, karyaId: id, jenis: 'foto', tipe: 'image/jpeg', ukuran: foto.blob.size, blob: foto.blob },
        { id: thumbId, karyaId: id, jenis: 'thumb', tipe: 'image/jpeg', ukuran: thumb.blob.size, blob: thumb.blob },
      ],
    });
  }
  return { anak: ANAK.length, karya: KARYA.length };
}
