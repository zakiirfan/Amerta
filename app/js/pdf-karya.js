// Membuat PDF berisi foto dan keterangan karya (satu karya per halaman).

import { ambilMedia, daftarAnak } from './db.js';
import { buatPdf } from './pdf.js';
import { usiaKarya, slug, urutkanTerbaru } from './karya.js';
import { tanggalPanjang, hariIni } from './usia.js';
import { simpanFile } from './simpan-file.js';
import { kabar, lembarProgres, pemberitahuan } from './ui.js';

async function halamanKarya(k, anak) {
  const foto = await ambilMedia(k.fotoId);
  const usia = usiaKarya(k, anak);
  const sub = [
    anak ? anak.nama : '',
    usia !== null ? `${usia} tahun` : '',
    tanggalPanjang(k.tanggal),
  ].filter(Boolean).join(' · ');
  const jumlahSuara = (k.suara || []).length;
  return {
    gambar: foto ? {
      data: new Uint8Array(await foto.blob.arrayBuffer()),
      lebar: k.fotoLebar,
      tinggi: k.fotoTinggi,
    } : null,
    judul: k.judul || 'Karya tanpa judul',
    subjudul: sub,
    isian: [
      { label: 'Lokasi', nilai: k.lokasi },
      { label: 'Acara', nilai: k.acara },
      { label: 'Isi gambar', nilai: (k.isi || []).join(', ') },
      { label: 'Cerita', nilai: k.ceritaTeks, paragraf: true },
      {
        label: 'Rekaman suara',
        nilai: jumlahSuara ? `${jumlahSuara} rekaman (dengarkan di aplikasi)` : '',
      },
      { label: 'Video', nilai: k.video ? 'Ada (tonton di aplikasi)' : '' },
    ],
  };
}

/** Buat PDF dari daftar karya, lalu simpan ke HP. */
export async function buatDanSimpanPdf(daftarKarya) {
  if (!daftarKarya.length) return;
  const progres = lembarProgres('Membuat PDF');
  let blob;
  let nama;
  try {
    const anakMap = new Map((await daftarAnak()).map((a) => [a.id, a]));
    const urut = urutkanTerbaru([...daftarKarya]);
    const halaman = [];
    for (const [i, k] of urut.entries()) {
      progres.perbarui(`Menyiapkan karya ${i + 1} dari ${urut.length}…`);
      halaman.push(await halamanKarya(k, anakMap.get(k.anakId)));
    }
    progres.perbarui('Menyusun file…');
    blob = buatPdf(halaman);
    if (urut.length === 1) {
      const anak = anakMap.get(urut[0].anakId);
      nama = `karya-${slug(anak && anak.nama)}-${urut[0].tanggal || hariIni()}.pdf`;
    } else {
      nama = `kumpulan-karya-${urut.length}-${hariIni()}.pdf`;
    }
  } catch (err) {
    console.error(err);
    progres.tutup();
    await pemberitahuan({ judul: 'PDF gagal dibuat', pesan: err.message });
    return;
  }
  progres.tutup();
  const hasil = await simpanFile(blob, nama);
  if (hasil === 'diunduh') kabar('PDF disimpan ke folder Download');
}
