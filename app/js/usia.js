// Tanggal dan usia. Tanggal disimpan sebagai teks 'YYYY-MM-DD'
// (tanpa jam) supaya tidak bergeser karena zona waktu.

const dua = (n) => String(n).padStart(2, '0');

export function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

function urai(teks) {
  const [t, b, h] = teks.split('-').map(Number);
  return { t, b, h };
}

/** Usia pada tanggal tertentu: { tahun, bulan }, atau null kalau belum lahir. */
export function hitungUsia(tanggalLahir, padaTanggal = hariIni()) {
  if (!tanggalLahir) return null;
  const a = urai(tanggalLahir);
  const z = urai(padaTanggal);
  let bulan = (z.t - a.t) * 12 + (z.b - a.b);
  if (z.h < a.h) bulan--;
  if (bulan < 0) return null;
  return { tahun: Math.floor(bulan / 12), bulan: bulan % 12 };
}

/** Contoh: "5 tahun 3 bulan", "5 tahun", "8 bulan". */
export function teksUsia(tanggalLahir, padaTanggal) {
  const u = hitungUsia(tanggalLahir, padaTanggal);
  if (!u) return '';
  if (u.tahun === 0) return `${u.bulan} bulan`;
  return u.bulan ? `${u.tahun} tahun ${u.bulan} bulan` : `${u.tahun} tahun`;
}

/** Contoh: "12 Maret 2019". */
export function tanggalPanjang(teks) {
  if (!teks) return '';
  const { t, b, h } = urai(teks);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
