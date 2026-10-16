// Layar pencarian: kotak cari teks + filter cepat (lokasi, acara, isi gambar, usia),
// bisa dibatasi per anak atau semua anak.

import { daftarAnak, semuaKarya } from './db.js';
import { esc } from './ui.js';
import { gantiAlamat } from './router.js';
import { usiaKarya, urutkanTerbaru, saranDari } from './karya.js';
import { htmlGaleri, siapkanGaleri } from './galeri.js';

const KUNCI = ['q', 'anak', 'lokasi', 'acara', 'isi', 'usia'];
const MAKS_CHIP = 12;

/** Huruf kecil, tanpa tanda aksen: "Rumah Nenek" cocok dengan "rumah nenek". */
function normal(teks) {
  return (teks || '').toLocaleLowerCase('id').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export async function layarCari(query) {
  const [semuaAnak, semua] = await Promise.all([daftarAnak(), semuaKarya()]);
  const anakMap = new Map(semuaAnak.map((a) => [a.id, a]));
  const keadaan = Object.fromEntries(KUNCI.map((k) => [k, query.get(k) || '']));
  if (keadaan.anak && !anakMap.has(keadaan.anak)) keadaan.anak = '';
  urutkanTerbaru(semua);

  // Siapkan teks pencarian setiap karya sekali saja.
  const indeks = semua.map((k) => ({
    k,
    teks: normal([k.lokasi, k.acara, (k.isi || []).join(' '), k.judul, k.ceritaTeks].join('\n')),
    usia: usiaKarya(k, anakMap.get(k.anakId)),
  }));

  const chipAnak = [{ id: '', nama: 'Semua anak' }, ...semuaAnak].map((a) => `
    <button type="button" class="chip" data-filter="anak" data-nilai="${esc(a.id)}">${esc(a.nama)}</button>`).join('');

  return {
    judul: 'Cari karya',
    kembaliKe: null,
    nav: 'cari',
    isi: `
      <div class="layar-cari">
      <div class="kotak-cari">
        <input type="search" id="kotak-cari" enterkeyhint="search" autocomplete="off"
               placeholder="Cari lokasi, acara, isi gambar, judul, cerita"
               aria-label="Cari karya" value="${esc(keadaan.q)}">
      </div>
      ${semuaAnak.length > 1 ? `<div class="chip-gulir" role="group" aria-label="Anak">${chipAnak}</div>` : ''}
      <div id="filter-cepat"></div>
      <div id="hasil-cari"></div>
      </div>`,
    siapkan(main) {
      let bersihkanGaleri = () => {};
      this.bersihkan = () => bersihkanGaleri();
      const kotak = main.querySelector('#kotak-cari');
      const wadahFilter = main.querySelector('#filter-cepat');
      const wadahHasil = main.querySelector('#hasil-cari');

      const simpanKeAlamat = () => {
        const p = new URLSearchParams();
        KUNCI.forEach((k) => { if (keadaan[k]) p.set(k, keadaan[k]); });
        const qs = p.toString();
        gantiAlamat(qs ? `#/cari?${qs}` : '#/cari');
      };

      const cocokFilter = (x, kecuali) => {
        const { k } = x;
        if (keadaan.anak && k.anakId !== keadaan.anak) return false;
        if (kecuali !== 'lokasi' && keadaan.lokasi && normal(k.lokasi) !== normal(keadaan.lokasi)) return false;
        if (kecuali !== 'acara' && keadaan.acara && normal(k.acara) !== normal(keadaan.acara)) return false;
        if (kecuali !== 'isi' && keadaan.isi && !(k.isi || []).some((i) => normal(i) === normal(keadaan.isi))) return false;
        if (kecuali !== 'usia' && keadaan.usia !== '' && x.usia !== Number(keadaan.usia)) return false;
        const kata = normal(keadaan.q).split(/\s+/).filter(Boolean);
        return kata.every((w) => x.teks.includes(w));
      };

      const renderFilter = () => {
        // Pilihan setiap filter dihitung dari karya yang cocok dengan filter LAIN.
        const kelompok = [
          { kunci: 'lokasi', label: 'Lokasi', nilai: (k) => k.lokasi },
          { kunci: 'acara', label: 'Acara', nilai: (k) => k.acara },
          { kunci: 'isi', label: 'Isi gambar', nilai: (k) => k.isi },
        ].map((g) => ({
          ...g,
          pilihan: saranDari(indeks.filter((x) => cocokFilter(x, g.kunci)).map((x) => x.k), g.nilai),
        }));
        const usiaAda = [...new Set(indeks.filter((x) => cocokFilter(x, 'usia') && x.usia !== null).map((x) => x.usia))]
          .sort((a, b) => a - b);
        kelompok.push({ kunci: 'usia', label: 'Usia', pilihan: usiaAda.map(String), teks: (v) => `${v} tahun` });

        wadahFilter.innerHTML = kelompok.map((g) => {
          const aktif = keadaan[g.kunci];
          let pilihan = g.pilihan.slice(0, MAKS_CHIP);
          if (aktif && !pilihan.some((p) => normal(p) === normal(aktif))) pilihan = [aktif, ...pilihan];
          if (!pilihan.length) return '';
          return `
            <div class="kelompok-filter">
              <span class="label-filter">${g.label}</span>
              <div class="chip-gulir">
                ${pilihan.map((p) => `
                  <button type="button" class="chip" data-filter="${g.kunci}" data-nilai="${esc(p)}"
                          aria-pressed="${normal(p) === normal(aktif)}">${esc(g.teks ? g.teks(p) : p)}</button>`).join('')}
              </div>
            </div>`;
        }).join('');

        main.querySelectorAll('[data-filter="anak"]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b.dataset.nilai === keadaan.anak));
        });
      };

      const renderHasil = () => {
        bersihkanGaleri();
        const hasil = indeks.filter((x) => cocokFilter(x, null)).map((x) => x.k);
        const adaFilter = KUNCI.some((k) => keadaan[k]);
        if (!semua.length) {
          wadahHasil.innerHTML = `
            <section class="kartu kosong"><p>Belum ada karya yang tersimpan.</p></section>`;
          return;
        }
        if (!hasil.length) {
          wadahHasil.innerHTML = `
            <section class="kartu kosong">
              <p>Tidak ada karya yang cocok.</p>
              <button type="button" class="tombol" id="hapus-filter">Hapus pencarian dan filter</button>
            </section>`;
          return;
        }
        wadahHasil.innerHTML = `
          ${adaFilter ? '<button type="button" class="tombol-teks" id="hapus-filter">Hapus pencarian dan filter</button>' : ''}
          ${htmlGaleri(hasil, { anakMap, tampilkanNama: !keadaan.anak && semuaAnak.length > 1 })}`;
        bersihkanGaleri = siapkanGaleri(wadahHasil, hasil);
      };

      const perbarui = () => {
        simpanKeAlamat();
        renderFilter();
        renderHasil();
      };

      let tunda = null;
      kotak.addEventListener('input', () => {
        clearTimeout(tunda);
        tunda = setTimeout(() => { keadaan.q = kotak.value; perbarui(); }, 150);
      });
      kotak.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); kotak.blur(); }
      });

      main.querySelector('.layar-cari').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (chip) {
          const k = chip.dataset.filter;
          const nilai = chip.dataset.nilai;
          keadaan[k] = k !== 'anak' && normal(keadaan[k]) === normal(nilai) ? '' : nilai;
          perbarui();
          return;
        }
        if (e.target.closest('#hapus-filter')) {
          KUNCI.forEach((k) => { keadaan[k] = ''; });
          kotak.value = '';
          perbarui();
        }
      });

      perbarui();
    },
  };
}
