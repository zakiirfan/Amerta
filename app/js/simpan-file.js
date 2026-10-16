// Menyimpan file (foto, PDF, cadangan) ke HP pengguna.
// Android/komputer: diunduh ke folder Download.
// iPhone: lewat lembar "Bagikan" bawaan iPhone, karena hanya itu cara menyimpan
// ke Foto atau ke aplikasi File. Tidak ada yang dikirim otomatis ke mana pun.

import { lembarPilihan } from './ui.js';
import { formatUkuran } from './media.js';

function iPhone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function pakaiLembarBagikan(file) {
  return iPhone() && !!navigator.canShare && navigator.canShare({ files: [file] });
}

function unduh(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

/**
 * Hasil: 'diunduh' | 'dibagikan' | 'batal'.
 * Kalau menyiapkan file butuh waktu lama, iPhone meminta satu ketukan lagi.
 */
export async function simpanFile(blob, namaFile) {
  const file = new File([blob], namaFile, { type: blob.type });
  if (!pakaiLembarBagikan(file)) {
    unduh(file);
    return 'diunduh';
  }
  try {
    await navigator.share({ files: [file] });
    return 'dibagikan';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'batal';
    return lembarSiap(file);
  }
}

function lembarSiap(file) {
  return new Promise((resolve) => {
    let hasil = 'batal';
    let tunggu = null;
    lembarPilihan(
      'File siap disimpan',
      `${file.name} (${formatUkuran(file.size)}). Ketuk "Simpan", lalu pilih "Simpan ke File" atau "Simpan Gambar".`,
      [
        {
          teks: 'Simpan',
          nilai: 'simpan',
          kelas: 'tombol-utama',
          aksi: () => {
            // Harus dipanggil langsung di dalam ketukan.
            tunggu = navigator.share({ files: [file] })
              .then(() => { hasil = 'dibagikan'; })
              .catch(() => { hasil = 'batal'; });
          },
        },
        { teks: 'Batal', nilai: 'batal' },
      ],
    ).then(async () => {
      if (tunggu) await tunggu;
      resolve(hasil);
    });
  });
}
