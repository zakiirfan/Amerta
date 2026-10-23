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
  const jumlahSuara = (k.suara || []).length;
  const catatan = [
    jumlahSuara ? `${jumlahSuara} rekaman suara` : '',
    k.video ? 'video' : '',
  ].filter(Boolean).join(' dan ');
  return {
    gambar: foto ? {
      data: new Uint8Array(await foto.blob.arrayBuffer()),
      lebar: k.fotoLebar,
      tinggi: k.fotoTinggi,
    } : null,
    judul: k.judul || 'Karya tanpa judul',
    pil: [
      { teks: anak ? anak.nama : '', warna: 'mint' },
      { teks: usia !== null ? `${usia} tahun` : '', warna: 'kuning' },
      { teks: tanggalPanjang(k.tanggal), warna: 'lavender' },
    ],
    isian: [
      { label: 'Lokasi', nilai: k.lokasi },
      { label: 'Acara', nilai: k.acara },
      { label: 'Isi gambar', nilai: (k.isi || []).join(', ') },
    ],
    cerita: k.ceritaTeks ? { label: `Cerita dari ${anak ? anak.nama : 'anak'}`, teks: k.ceritaTeks } : null,
    catatan: catatan ? `Ada ${catatan} untuk karya ini. Dengarkan dan tonton di aplikasi Amerta.` : '',
  };
}

/** Susun PDF dari daftar karya. Hasil: { blob, nama }. */
export async function susunPdf(daftarKarya, onProgres) {
  const anakMap = new Map((await daftarAnak()).map((a) => [a.id, a]));
  const urut = urutkanTerbaru([...daftarKarya]);
  const halaman = [];
  for (const [i, k] of urut.entries()) {
    if (onProgres) onProgres(i + 1, urut.length);
    halaman.push(await halamanKarya(k, anakMap.get(k.anakId)));
  }
  const anak = anakMap.get(urut[0].anakId);
  const nama = urut.length === 1
    ? `karya-${slug(anak && anak.nama)}-${urut[0].tanggal || hariIni()}.pdf`
    : `kumpulan-karya-${urut.length}-${hariIni()}.pdf`;
  return { blob: buatPdf(halaman), nama };
}

/** Buat PDF dari daftar karya, lalu simpan ke HP. */
export async function buatDanSimpanPdf(daftarKarya) {
  if (!daftarKarya.length) return;
  const progres = lembarProgres('Membuat PDF');
  let blob;
  let nama;
  try {
    progres.perbarui('Menyiapkan karya…');
    ({ blob, nama } = await susunPdf(daftarKarya, (i, n) => progres.perbarui(`Menyiapkan karya ${i} dari ${n}…`)));
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
