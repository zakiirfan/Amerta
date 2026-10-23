// Aturan kecil tentang karya yang dipakai di banyak layar.

import { hitungUsia } from './usia.js';

/** Karya dianggap sudah punya cerita kalau ada cerita tertulis, rekaman suara, atau video. */
export function punyaCerita(k) {
  return !!((k.ceritaTeks && k.ceritaTeks.trim()) || (k.suara && k.suara.length) || k.video);
}

/** Usia (tahun) saat karya dibuat: isian manual, atau dihitung dari tanggal lahir. */
export function usiaKarya(k, anak) {
  if (typeof k.usiaManual === 'number') return k.usiaManual;
  if (!anak || !anak.tanggalLahir || !k.tanggal) return null;
  const u = hitungUsia(anak.tanggalLahir, k.tanggal);
  return u ? u.tahun : null;
}

/** Terbaru di atas: menurut tanggal karya, lalu waktu disimpan. */
export function urutkanTerbaru(daftar) {
  return daftar.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')
    || (b.dibuat || '').localeCompare(a.dibuat || ''));
}

export function idMediaKarya(k) {
  return [
    k.fotoId,
    k.thumbId,
    ...(k.suara || []).map((s) => s.id),
    ...(k.video ? [k.video.id] : []),
  ].filter(Boolean);
}

/** Saran isian (lokasi/acara) dari karya sebelumnya: paling sering dipakai dulu. */
export function saranDari(daftarKarya, ambilNilai) {
  const peta = new Map();
  for (const k of daftarKarya) {
    const nilai = [].concat(ambilNilai(k) || []);
    for (const v of nilai) {
      const teks = (v || '').trim();
      if (!teks) continue;
      const kunci = teks.toLocaleLowerCase('id');
      const ada = peta.get(kunci) || { teks, jumlah: 0, terakhir: '' };
      ada.jumlah++;
      if ((k.dibuat || '') > ada.terakhir) { ada.terakhir = k.dibuat || ''; ada.teks = teks; }
      peta.set(kunci, ada);
    }
  }
  return [...peta.values()]
    .sort((a, b) => b.jumlah - a.jumlah || b.terakhir.localeCompare(a.terakhir))
    .map((x) => x.teks);
}

/** Rapikan teks isian; kalau sama dengan saran yang ada (beda huruf besar/kecil), pakai versi lama. */
export function rapikanIsian(teks, saran = []) {
  const bersih = (teks || '').replace(/\s+/g, ' ').trim();
  if (!bersih) return '';
  const sama = saran.find((s) => s.toLocaleLowerCase('id') === bersih.toLocaleLowerCase('id'));
  return sama || bersih;
}

export function uraiKataKunci(teks) {
  const hasil = [];
  for (const bagian of (teks || '').split(/[,;\n]/)) {
    const k = bagian.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id');
    if (k && !hasil.includes(k)) hasil.push(k);
  }
  return hasil;
}

/** Teks untuk nama file: "Rara (contoh)" → "rara-contoh". */
export function slug(teks) {
  return (teks || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'karya';
}
