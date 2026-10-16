// Alat bantu tampilan: memasang layar, dialog, pesan singkat, alamat gambar.

/** Amankan teks buatan pengguna sebelum dimasukkan ke HTML. */
export function esc(teks) {
  return String(teks == null ? '' : teks).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Alamat sementara (blob:) untuk menampilkan foto/suara/video dari database.
// Semuanya dilepas saat pindah layar supaya memori HP tidak penuh.
const urlAktif = new Set();

export function urlBlob(blob) {
  const u = URL.createObjectURL(blob);
  urlAktif.add(u);
  return u;
}

export function lepasUrl(u) {
  if (u && urlAktif.delete(u)) URL.revokeObjectURL(u);
}

let layarAktif = null;

/**
 * Memasang satu layar.
 * layar = { judul, kembaliKe (null untuk beranda), isi (HTML), siapkan(main),
 *           bersihkan(), nav ('beranda'|'cari'|'tambah'|'pengaturan'), tanpaNav }
 */
export function tampilkanLayar(layar, { onKembali }) {
  if (layarAktif && layarAktif.bersihkan) {
    try { layarAktif.bersihkan(); } catch (err) { console.error(err); }
  }
  urlAktif.forEach((u) => URL.revokeObjectURL(u));
  urlAktif.clear();
  layarAktif = layar;

  const main = document.getElementById('layar');
  const tombolKembali = document.getElementById('tombol-kembali');

  document.getElementById('judul-layar').textContent = layar.judul || 'Museum Karya Anak';
  document.title = layar.judul && layar.kembaliKe
    ? `${layar.judul} · Museum Karya Anak` : 'Museum Karya Anak';

  tombolKembali.hidden = !layar.kembaliKe;
  tombolKembali.onclick = () => onKembali(layar.kembaliKe);

  const nav = document.getElementById('nav-bawah');
  nav.hidden = !!layar.tanpaNav;
  document.body.classList.toggle('ada-nav', !layar.tanpaNav);
  nav.querySelectorAll('[data-nav]').forEach((b) => {
    if (b.dataset.nav === layar.nav) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  main.innerHTML = layar.isi;
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
  if (layar.siapkan) layar.siapkan(main);
}

function buatLembar(judul, pesan) {
  const d = document.createElement('dialog');
  d.className = 'lembar';
  const h = document.createElement('h2');
  h.textContent = judul;
  d.append(h);
  if (pesan) {
    const p = document.createElement('p');
    p.className = 'pesan-lembar';
    p.textContent = pesan;
    d.append(p);
  }
  return d;
}

/**
 * Lembar dengan beberapa tombol. tombol: [{ teks, nilai, kelas, aksi }].
 * `aksi` dijalankan langsung saat diketuk (dibutuhkan untuk berbagi file di iPhone).
 */
export function lembarPilihan(judul, pesan, tombol) {
  return new Promise((resolve) => {
    const d = buatLembar(judul, pesan);
    let selesai = false;
    const akhiri = (nilai) => {
      if (selesai) return;
      selesai = true;
      if (d.open) d.close();
      d.remove();
      resolve(nilai);
    };
    tombol.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tombol ${t.kelas || ''}`;
      b.textContent = t.teks;
      b.addEventListener('click', () => {
        if (t.aksi) t.aksi();
        akhiri(t.nilai);
      });
      d.append(b);
    });
    // Tombol kembali/Escape menutup lembar tanpa memilih apa pun.
    d.addEventListener('cancel', (e) => { e.preventDefault(); akhiri(''); });
    document.body.append(d);
    d.showModal();
  });
}

/** Tanya ya/tidak. "Batal" diletakkan paling bawah, paling dekat jempol. */
export async function konfirmasi({ judul, pesan, ya = 'Ya', tidak = 'Batal', bahaya = false }) {
  const jawab = await lembarPilihan(judul, pesan, [
    { teks: ya, nilai: 'ya', kelas: bahaya ? 'tombol-bahaya-penuh' : 'tombol-utama' },
    { teks: tidak, nilai: 'tidak' },
  ]);
  return jawab === 'ya';
}

export async function pemberitahuan({ judul, pesan, ok = 'Mengerti' }) {
  await lembarPilihan(judul, pesan, [{ teks: ok, nilai: 'ok', kelas: 'tombol-utama' }]);
}

/** Lembar "sedang bekerja" yang tidak bisa ditutup sampai pekerjaan selesai. */
export function lembarProgres(judul) {
  const d = buatLembar(judul, '');
  const teks = document.createElement('p');
  teks.className = 'progres-teks';
  const putar = document.createElement('div');
  putar.className = 'pemutar';
  putar.setAttribute('aria-hidden', 'true');
  d.append(putar, teks);
  d.addEventListener('cancel', (e) => e.preventDefault());
  document.body.append(d);
  d.showModal();
  return {
    perbarui(t) { teks.textContent = t; },
    tutup() { d.close(); d.remove(); },
  };
}

let waktuKabar = null;

/** Pesan singkat di bawah layar, hilang sendiri. */
export function kabar(teks) {
  let el = document.getElementById('kabar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kabar';
    el.className = 'kabar';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = teks;
  el.hidden = false;
  clearTimeout(waktuKabar);
  waktuKabar = setTimeout(() => { el.hidden = true; }, 3000);
}
