// Perpindahan layar berdasarkan alamat (#/...).
// Setiap entri riwayat diberi nomor urut, supaya tombol "Kembali" di aplikasi
// dan gestur kembali di HP selalu sejalan.

const daftarRute = [];
let indeks = 0;     // posisi di riwayat aplikasi (0 = layar pertama yang dibuka)
let giliran = 0;    // mencegah layar lama menimpa layar baru
let render = null;
let penjaga = null; // fungsi async → true kalau boleh meninggalkan layar
let sedangMemulihkan = false;

/**
 * pola contoh: '/anak/:id/ubah'.
 * buat(...param, query) mengembalikan deskripsi layar. query = URLSearchParams dari "#/...?a=b".
 */
export function rute(pola, buat) {
  const re = new RegExp('^' + pola.replace(/:\w+/g, '([^/]+)') + '$');
  daftarRute.push({ re, buat });
}

/** Pasang penjaga untuk layar sekarang (misalnya formulir yang belum disimpan). */
export function aturPenjaga(fn) {
  penjaga = fn;
}

export async function pergi(alamat, { ganti = false } = {}) {
  if (penjaga && !(await penjaga())) return;
  penjaga = null;
  if (ganti) {
    history.replaceState({ i: indeks }, '', alamat);
  } else {
    indeks++;
    history.pushState({ i: indeks }, '', alamat);
  }
  jalankan();
}

/** Ganti alamat tanpa memuat ulang layar (misalnya menyimpan isi kotak cari). */
export function gantiAlamat(alamat) {
  history.replaceState({ i: indeks }, '', alamat);
}

/** Kembali satu layar. Kalau tidak ada riwayat, pindah ke `cadangan`. */
export function kembali(cadangan = '#/') {
  if (indeks > 0) history.back();
  else pergi(cadangan, { ganti: true });
}

/** Mundur beberapa layar sekaligus (misalnya setelah menghapus). */
export function mundur(jumlah, cadangan = '#/') {
  penjaga = null;
  if (indeks >= jumlah) history.go(-jumlah);
  else pergi(cadangan, { ganti: true });
}

/** Kembali ke beranda, sambil membuang riwayat di atasnya. */
export function keBeranda() {
  penjaga = null;
  if (indeks > 0) history.go(-indeks);
  else pergi('#/', { ganti: true });
}

export function mulaiRouter({ tampilkan, galat, tidakAda }) {
  render = { tampilkan, galat, tidakAda };
  if (history.state && typeof history.state.i === 'number') indeks = history.state.i;
  else history.replaceState({ i: 0 }, '');

  window.addEventListener('popstate', async (e) => {
    const iBaru = e.state && typeof e.state.i === 'number' ? e.state.i : 0;
    if (sedangMemulihkan) { sedangMemulihkan = false; return; }
    if (penjaga) {
      const iLama = indeks;
      const boleh = await penjaga();
      if (!boleh) {
        // Batal pergi: kembalikan alamat ke layar yang sedang dibuka.
        sedangMemulihkan = true;
        history.go(iLama - iBaru);
        return;
      }
    }
    penjaga = null;
    indeks = iBaru;
    jalankan();
  });
  jalankan();
}

async function jalankan() {
  const g = ++giliran;
  penjaga = null;
  const [jalurMentah, qs = ''] = location.hash.replace(/^#/, '').split('?');
  const jalur = jalurMentah || '/';
  const query = new URLSearchParams(qs);
  const cocok = daftarRute
    .map((r) => ({ r, m: jalur.match(r.re) }))
    .find((x) => x.m);
  try {
    const layar = cocok
      ? await cocok.r.buat(...cocok.m.slice(1).map(decodeURIComponent), query)
      : render.tidakAda();
    if (g === giliran) render.tampilkan(layar);
  } catch (err) {
    console.error(err);
    if (g === giliran) render.tampilkan(render.galat(err));
  }
}
