// Layar karya: formulir tambah/ubah karya dan halaman detail karya.

import {
  daftarAnak, ambilAnak, semuaKarya, ambilKarya, ambilMedia, simpanKarya, hapusKarya,
} from './db.js';
import {
  prosesFoto, durasiMedia, formatDurasi, formatUkuran,
  VIDEO_DETIK_MAKS, VIDEO_BYTE_MAKS, SUARA_BYTE_MAKS,
} from './media.js';
import { rekamSuara, rekamVideo, bisaRekam } from './perekam.js';
import {
  esc, urlBlob, lepasUrl, kabar, konfirmasi, pemberitahuan,
} from './ui.js';
import {
  pergi, kembali, mundur, aturPenjaga,
} from './router.js';
import { hariIni, tanggalPanjang } from './usia.js';
import {
  punyaCerita, usiaKarya, saranDari, rapikanIsian, uraiKataKunci, slug,
} from './karya.js';
import { simpanFile } from './simpan-file.js';
import { rayakan } from './hiasan.js';
import { buatDanSimpanPdf } from './pdf-karya.js';

const KUNCI_ANAK_TERAKHIR = 'mka.anakTerakhir';
const MAKS_SARAN = 8;

function layarKaryaTidakAda() {
  return {
    judul: 'Tidak ditemukan',
    kembaliKe: '#/',
    isi: `
      <section class="kartu"><h2>Karya tidak ditemukan</h2><p>Mungkin sudah dihapus.</p></section>
      <button type="button" class="tombol tombol-utama" data-ke="#/" data-ganti>Ke beranda</button>`,
  };
}

function tebakTipeAudio(file) {
  if (file.type) return file.type;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return {
    m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg',
    wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm',
  }[ext] || 'audio/mp4';
}

// =====================================================================
// Formulir tambah / ubah karya
// =====================================================================

export function layarTambahKarya(query) {
  return layarFormKarya(null, query.get('anak'), null);
}

export async function layarUbahKarya(id, query) {
  const k = await ambilKarya(id);
  if (!k) return layarKaryaTidakAda();
  return layarFormKarya(k, null, query.get('bagian'));
}

async function layarFormKarya(lama, anakAwal, bagian) {
  const [semuaAnak, semua] = await Promise.all([daftarAnak(), semuaKarya()]);

  if (!semuaAnak.length) {
    return {
      judul: 'Tambah karya',
      kembaliKe: '#/',
      nav: 'tambah',
      isi: `
        <section class="kartu kosong">
          <h2>Belum ada anak</h2>
          <p>Tambahkan anak dulu, supaya karyanya tersimpan di direktori yang tepat.</p>
        </section>
        <button type="button" class="tombol tombol-utama" data-ke="#/anak/baru" data-ganti>+ Tambah anak</button>`,
    };
  }

  let anakTerakhir = null;
  try { anakTerakhir = localStorage.getItem(KUNCI_ANAK_TERAKHIR); } catch { /* abaikan */ }
  const adaAnak = (id) => id && semuaAnak.some((a) => a.id === id);
  let anakId = null;
  if (lama) anakId = lama.anakId;
  else if (adaAnak(anakAwal)) anakId = anakAwal;
  else if (semuaAnak.length === 1) anakId = semuaAnak[0].id;
  else if (adaAnak(anakTerakhir)) anakId = anakTerakhir;

  const lainnya = semua.filter((k) => !lama || k.id !== lama.id);
  const saran = {
    lokasi: saranDari(lainnya, (k) => k.lokasi),
    acara: saranDari(lainnya, (k) => k.acara),
    isi: saranDari(lainnya, (k) => k.isi),
  };

  const opsionalTerisi = lama && (lama.judul || punyaCerita(lama) || lama.video || lama.acara
    || (lama.isi && lama.isi.length) || typeof lama.usiaManual === 'number');

  const chipAnak = semuaAnak.map((a) => `
    <label class="chip">
      <input type="radio" name="anakId" value="${a.id}" ${a.id === anakId ? 'checked' : ''}>
      <span>${esc(a.nama)}</span>
    </label>`).join('');

  return {
    judul: lama ? 'Ubah karya' : 'Tambah karya',
    kembaliKe: lama ? `#/karya/${lama.id}` : '#/',
    tanpaNav: true,
    isi: `
      <form id="form-karya" class="formulir" novalidate>
        <section class="isian">
          <span class="label">Foto karya <span class="wajib">(wajib)</span></span>
          <div class="foto-pratinjau" id="foto-pratinjau" hidden><img id="img-pratinjau" alt="Foto karya"></div>
          <p class="bantuan" id="status-foto" hidden></p>
          <div class="pilihan-foto">
            <label class="tombol tombol-utama" for="input-kamera" id="label-kamera">📷 Ambil foto</label>
            <label class="tombol" for="input-galeri" id="label-galeri">🖼️ Dari galeri</label>
          </div>
          <input type="file" id="input-kamera" accept="image/*" capture="environment" class="tersembunyi">
          <input type="file" id="input-galeri" accept="image/*" class="tersembunyi">
        </section>

        <fieldset class="isian">
          <legend class="label">Anak <span class="wajib">(wajib)</span></legend>
          <div class="chip-grup">${chipAnak}</div>
        </fieldset>

        <div class="isian">
          <label class="label" for="isian-lokasi">Lokasi <span class="wajib">(wajib)</span></label>
          <input id="isian-lokasi" name="lokasi" type="text" maxlength="60" autocomplete="off"
                 placeholder="Misalnya: Rumah nenek, TK Pelangi" value="${esc(lama ? lama.lokasi : '')}">
          <div class="chip-grup" id="saran-lokasi"></div>
        </div>

        <details class="opsional" id="opsional" ${opsionalTerisi || bagian ? 'open' : ''}>
          <summary>Tambah keterangan lain <span class="redup">(opsional)</span></summary>

          <div class="isian">
            <label class="label" for="isian-judul">Judul dari anak</label>
            <input id="isian-judul" name="judul" type="text" maxlength="80" autocomplete="off"
                   placeholder="Misalnya: Kucing Pelangi" value="${esc(lama ? lama.judul : '')}">
          </div>

          <div class="isian" id="bagian-cerita">
            <label class="label" for="isian-cerita">Cerita versi anak</label>
            <textarea id="isian-cerita" name="ceritaTeks" rows="4" maxlength="4000"
                      placeholder="Ketik cerita anak di sini, atau rekam suaranya.">${esc(lama ? lama.ceritaTeks : '')}</textarea>
            <div id="daftar-suara" class="daftar-media"></div>
            <div class="baris-tombol">
              ${bisaRekam() ? '<button type="button" class="tombol" id="rekam-suara">🎙️ Rekam suara</button>' : ''}
              <label class="tombol" for="input-suara">Impor rekaman</label>
            </div>
            <!-- Sengaja tanpa "accept": di iPhone, file .aac (misalnya dari WhatsApp) tetap abu-abu
                 walau .aac disebut. Jenis file diperiksa setelah dipilih (harus bisa diputar). -->
            <input type="file" id="input-suara" class="tersembunyi">
          </div>

          <div class="isian">
            <span class="label">Video pendek <span class="redup">(maksimal 1 menit)</span></span>
            <div id="wadah-video" class="daftar-media"></div>
            <div class="baris-tombol" id="tombol-video">
              ${bisaRekam() ? '<button type="button" class="tombol" id="rekam-video">🎬 Rekam video</button>' : ''}
              <label class="tombol" for="input-video">Pilih dari galeri</label>
            </div>
            <input type="file" id="input-video" accept="video/*" class="tersembunyi">
          </div>

          <div class="isian">
            <label class="label" for="isian-acara">Acara atau momen</label>
            <input id="isian-acara" name="acara" type="text" maxlength="60" autocomplete="off"
                   placeholder="Misalnya: Lebaran, Ulang tahun ke-5" value="${esc(lama ? lama.acara : '')}">
            <div class="chip-grup" id="saran-acara"></div>
          </div>

          <div class="isian">
            <label class="label" for="isian-isi">Isi gambar</label>
            <input id="isian-isi" name="isi" type="text" maxlength="200" autocomplete="off"
                   placeholder="Misalnya: kucing, pelangi" value="${esc(lama ? (lama.isi || []).join(', ') : '')}">
            <span class="bantuan">Pisahkan dengan koma.</span>
            <div class="chip-grup" id="saran-isi"></div>
          </div>

          <div class="isian">
            <label class="label" for="isian-tanggal">Tanggal</label>
            <input id="isian-tanggal" name="tanggal" type="date" max="${hariIni()}"
                   value="${esc(lama ? lama.tanggal : hariIni())}">
            <span class="bantuan" id="catatan-tanggal"></span>
          </div>

          <div class="isian">
            <label class="label" for="isian-usia">Usia anak saat membuat (tahun)</label>
            <input id="isian-usia" name="usia" type="number" inputmode="numeric" min="0" max="18" step="1"
                   value="${lama && typeof lama.usiaManual === 'number' ? lama.usiaManual : ''}">
            <span class="bantuan" id="catatan-usia"></span>
          </div>
        </details>

        <p class="pesan-galat" id="galat" role="alert" hidden></p>
        <div class="bar-simpan">
          <button type="submit" class="tombol tombol-utama" id="tombol-simpan" disabled>Simpan karya</button>
        </div>
      </form>
      ${lama ? '<button type="button" class="tombol tombol-bahaya" id="hapus-karya">Hapus karya</button>' : ''}`,
    siapkan(main) {
      this.bersihkan = siapkanFormKarya(main, { lama, semuaAnak, saran, bagian });
    },
  };
}

function siapkanFormKarya(main, { lama, semuaAnak, saran, bagian }) {
  const form = main.querySelector('#form-karya');
  const $ = (s) => main.querySelector(s);
  const tombolSimpan = $('#tombol-simpan');
  const galat = $('#galat');

  const draf = {
    foto: null, // foto baru: { foto, thumb, fotoLebar, fotoTinggi }
    suara: (lama ? lama.suara || [] : []).map((s) => ({ ...s })),
    video: lama && lama.video ? { ...lama.video } : null,
    tanggalDiubahManual: !!lama,
  };
  let berubah = false;
  let sedangMemproses = false;

  const tandaiBerubah = () => { berubah = true; perbaruiTombol(); };
  const tampilGalat = (pesan) => { galat.textContent = pesan || ''; galat.hidden = !pesan; };

  const anakTerpilih = () => {
    const r = form.querySelector('input[name="anakId"]:checked');
    return r ? r.value : null;
  };

  function perbaruiTombol() {
    const adaFoto = !!(draf.foto || lama);
    tombolSimpan.disabled = sedangMemproses || !adaFoto || !anakTerpilih() || !form.elements.lokasi.value.trim();
  }

  // ----- Foto -----
  const imgPratinjau = $('#img-pratinjau');
  const statusFoto = $('#status-foto');
  let urlPratinjau = null;

  function tampilkanFoto(blob) {
    lepasUrl(urlPratinjau);
    urlPratinjau = urlBlob(blob);
    imgPratinjau.src = urlPratinjau;
    $('#foto-pratinjau').hidden = false;
    $('#label-kamera').textContent = '📷 Ambil ulang';
    $('#label-kamera').classList.remove('tombol-utama');
    $('#label-galeri').textContent = '🖼️ Foto lain';
  }

  if (lama) {
    ambilMedia(lama.fotoId).then((m) => { if (m && imgPratinjau.isConnected) tampilkanFoto(m.blob); });
  }

  async function terimaFoto(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    sedangMemproses = true;
    perbaruiTombol();
    statusFoto.hidden = false;
    statusFoto.textContent = 'Memproses foto…';
    try {
      const hasil = await prosesFoto(file);
      draf.foto = hasil;
      tampilkanFoto(hasil.foto);
      statusFoto.textContent = `Foto siap (${formatUkuran(hasil.foto.size)}).`;
      if (!draf.tanggalDiubahManual) {
        form.elements.tanggal.value = hasil.tanggal;
        $('#catatan-tanggal').textContent = {
          foto: 'Diambil dari tanggal foto.',
          berkas: 'Diambil dari tanggal file foto.',
          'hari-ini': 'Tanggal hari ini (foto tidak menyimpan tanggal).',
        }[hasil.sumberTanggal];
        perbaruiUsia();
      }
      tandaiBerubah();
    } catch (err) {
      console.error(err);
      statusFoto.textContent = err.message;
    } finally {
      sedangMemproses = false;
      perbaruiTombol();
    }
  }
  $('#input-kamera').addEventListener('change', (e) => terimaFoto(e.target));
  $('#input-galeri').addEventListener('change', (e) => terimaFoto(e.target));

  // ----- Saran (chip) -----
  function pasangSaran(input, wadah, daftar, { tambahkan = false } = {}) {
    const render = () => {
      const isi = input.value;
      let pilihan;
      if (tambahkan) {
        const sudah = uraiKataKunci(isi);
        const ketikan = (isi.split(',').pop() || '').trim().toLocaleLowerCase('id');
        pilihan = daftar.filter((s) => !sudah.includes(s.toLocaleLowerCase('id'))
          && (!ketikan || s.toLocaleLowerCase('id').includes(ketikan)));
      } else {
        const cari = isi.trim().toLocaleLowerCase('id');
        pilihan = daftar.filter((s) => s.toLocaleLowerCase('id') !== cari
          && (!cari || s.toLocaleLowerCase('id').includes(cari)));
      }
      wadah.innerHTML = pilihan.slice(0, MAKS_SARAN)
        .map((s) => `<button type="button" class="chip chip-saran">${esc(s)}</button>`).join('');
    };
    wadah.addEventListener('click', (e) => {
      const b = e.target.closest('.chip-saran');
      if (!b) return;
      if (tambahkan) {
        // Kata yang sedang diketik (bagian setelah koma terakhir) diganti oleh saran yang diketuk.
        const segmen = input.value.split(',');
        const akhir = segmen.pop().trim().toLocaleLowerCase('id');
        const kata = uraiKataKunci(segmen.join(','));
        const dipilih = b.textContent.toLocaleLowerCase('id');
        if (akhir && !dipilih.includes(akhir)) kata.push(akhir);
        if (!kata.includes(dipilih)) kata.push(dipilih);
        input.value = `${kata.join(', ')}, `;
      } else {
        input.value = b.textContent;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.addEventListener('input', render);
    render();
  }
  pasangSaran(form.elements.lokasi, $('#saran-lokasi'), saran.lokasi);
  pasangSaran(form.elements.acara, $('#saran-acara'), saran.acara);
  pasangSaran(form.elements.isi, $('#saran-isi'), saran.isi, { tambahkan: true });

  // ----- Suara -----
  const wadahSuara = $('#daftar-suara');
  function renderSuara() {
    wadahSuara.innerHTML = draf.suara.map((s, i) => `
      <div class="item-media">
        <audio controls preload="metadata" data-i="${i}"></audio>
        <div class="item-media-info">
          <span>Rekaman ${i + 1}${s.durasi ? ` · ${formatDurasi(s.durasi)}` : ''}</span>
          <button type="button" class="tombol-teks teks-bahaya" data-hapus-suara="${i}">Hapus</button>
        </div>
      </div>`).join('');
    wadahSuara.querySelectorAll('audio').forEach(async (el) => {
      const s = draf.suara[Number(el.dataset.i)];
      if (!s.url) {
        const blob = s.blob || (await ambilMedia(s.id) || {}).blob;
        if (!blob || !el.isConnected) return;
        s.url = urlBlob(blob);
      }
      el.src = s.url;
    });
  }
  wadahSuara.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-hapus-suara]');
    if (!b) return;
    const yakin = await konfirmasi({
      judul: 'Hapus rekaman ini?',
      pesan: 'Rekaman akan dihapus saat karya disimpan.',
      ya: 'Ya, hapus',
      bahaya: true,
    });
    if (!yakin) return;
    const [s] = draf.suara.splice(Number(b.dataset.hapusSuara), 1);
    lepasUrl(s.url);
    renderSuara();
    tandaiBerubah();
  });
  const tambahSuara = (hasil, sumber) => {
    draf.suara.push({
      id: crypto.randomUUID(), blob: hasil.blob, tipe: hasil.tipe, durasi: hasil.durasi, sumber, baru: true,
    });
    renderSuara();
    tandaiBerubah();
  };
  const tombolRekamSuara = $('#rekam-suara');
  if (tombolRekamSuara) {
    tombolRekamSuara.addEventListener('click', async () => {
      const hasil = await rekamSuara();
      if (hasil) tambahSuara(hasil, 'rekam');
    });
  }
  $('#input-suara').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > SUARA_BYTE_MAKS) {
      await pemberitahuan({
        judul: 'Rekaman terlalu besar',
        pesan: `Ukuran maksimal ${formatUkuran(SUARA_BYTE_MAKS)}. Pilih rekaman yang lebih pendek.`,
      });
      return;
    }
    const tipe = tebakTipeAudio(file);
    const blob = new Blob([file], { type: tipe });
    const durasi = await durasiMedia(blob, 'audio');
    if (durasi === null) {
      await pemberitahuan({
        judul: 'Rekaman tidak bisa diputar',
        pesan: 'File ini bukan rekaman suara, atau formatnya tidak didukung browser. Pilih file suara seperti aac, m4a, atau mp3.',
      });
      return;
    }
    tambahSuara({ blob, tipe, durasi }, 'impor');
  });

  // ----- Video -----
  const wadahVideo = $('#wadah-video');
  function renderVideo() {
    $('#tombol-video').hidden = !!draf.video;
    if (!draf.video) { wadahVideo.innerHTML = ''; return; }
    wadahVideo.innerHTML = `
      <div class="item-media">
        <video controls playsinline preload="metadata" class="video-karya"></video>
        <div class="item-media-info">
          <span>Video${draf.video.durasi ? ` · ${formatDurasi(draf.video.durasi)}` : ''}</span>
          <button type="button" class="tombol-teks teks-bahaya" id="hapus-video">Hapus</button>
        </div>
      </div>`;
    const el = wadahVideo.querySelector('video');
    (async () => {
      const v = draf.video;
      if (!v.url) {
        const blob = v.blob || (await ambilMedia(v.id) || {}).blob;
        if (!blob || !el.isConnected) return;
        v.url = urlBlob(blob);
      }
      el.src = v.url;
    })();
  }
  wadahVideo.addEventListener('click', async (e) => {
    if (!e.target.closest('#hapus-video')) return;
    const yakin = await konfirmasi({
      judul: 'Hapus video ini?',
      pesan: 'Video akan dihapus saat karya disimpan.',
      ya: 'Ya, hapus',
      bahaya: true,
    });
    if (!yakin) return;
    lepasUrl(draf.video.url);
    draf.video = null;
    renderVideo();
    tandaiBerubah();
  });
  const pasangVideo = (hasil, sumber) => {
    draf.video = {
      id: crypto.randomUUID(), blob: hasil.blob, tipe: hasil.tipe, durasi: hasil.durasi, sumber, baru: true,
    };
    renderVideo();
    tandaiBerubah();
  };
  const tombolRekamVideo = $('#rekam-video');
  if (tombolRekamVideo) {
    tombolRekamVideo.addEventListener('click', async () => {
      const hasil = await rekamVideo();
      if (hasil) pasangVideo(hasil, 'rekam');
    });
  }
  $('#input-video').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > VIDEO_BYTE_MAKS) {
      await pemberitahuan({
        judul: 'Video terlalu besar',
        pesan: `Ukuran video ini ${formatUkuran(file.size)}, maksimal ${formatUkuran(VIDEO_BYTE_MAKS)}. `
          + 'Pilih video yang lebih pendek, atau rekam langsung lewat tombol "Rekam video".',
      });
      return;
    }
    const tipe = file.type || 'video/mp4';
    const blob = new Blob([file], { type: tipe });
    const durasi = await durasiMedia(blob, 'video');
    if (durasi === null) {
      await pemberitahuan({
        judul: 'Video tidak bisa diputar',
        pesan: 'Format video ini tidak didukung browser. Coba rekam langsung lewat tombol "Rekam video".',
      });
      return;
    }
    if (durasi > VIDEO_DETIK_MAKS + 0.5) {
      await pemberitahuan({
        judul: 'Video terlalu panjang',
        pesan: `Video ini ${formatDurasi(durasi)}. Maksimal 1 menit. Pilih video yang lebih pendek.`,
      });
      return;
    }
    pasangVideo({ blob, tipe, durasi }, 'impor');
  });

  // ----- Tanggal dan usia -----
  const catatanUsia = $('#catatan-usia');
  const inputUsia = form.elements.usia;
  function perbaruiUsia() {
    const anak = semuaAnak.find((a) => a.id === anakTerpilih());
    const otomatis = usiaKarya({ tanggal: form.elements.tanggal.value, usiaManual: null }, anak);
    inputUsia.placeholder = otomatis !== null ? String(otomatis) : '';
    if (!anak) catatanUsia.textContent = 'Pilih anak dulu.';
    else if (otomatis !== null) {
      catatanUsia.textContent = inputUsia.value === ''
        ? `Otomatis dari tanggal lahir: ${otomatis} tahun. Isi hanya kalau ingin mengubah.`
        : `Diisi manual. Kosongkan untuk kembali ke hitungan otomatis (${otomatis} tahun).`;
    } else {
      catatanUsia.textContent = 'Tanggal lahir anak belum diisi, jadi usia tidak terhitung otomatis. Boleh diisi manual.';
    }
  }
  form.elements.tanggal.addEventListener('change', () => {
    draf.tanggalDiubahManual = true;
    $('#catatan-tanggal').textContent = '';
    perbaruiUsia();
    tandaiBerubah();
  });
  inputUsia.addEventListener('input', () => { perbaruiUsia(); tandaiBerubah(); });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'anakId') { perbaruiUsia(); tandaiBerubah(); }
  });
  ['lokasi', 'judul', 'ceritaTeks', 'acara', 'isi'].forEach((n) => {
    form.elements[n].addEventListener('input', () => { tampilGalat(''); tandaiBerubah(); });
  });

  renderSuara();
  renderVideo();
  perbaruiUsia();
  perbaruiTombol();
  if (!lama) $('#catatan-tanggal').textContent = 'Akan diambil dari tanggal foto kalau ada.';
  if (bagian === 'cerita') {
    setTimeout(() => $('#bagian-cerita').scrollIntoView({ block: 'start' }), 50);
  }

  // ----- Simpan -----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (tombolSimpan.disabled) return;
    const anakId = anakTerpilih();
    const tanggal = form.elements.tanggal.value || hariIni();
    if (tanggal > hariIni()) { tampilGalat('Tanggal tidak boleh di masa depan.'); return; }
    const teksUsia = inputUsia.value.trim();
    const usiaManual = teksUsia === '' ? null : Math.round(Number(teksUsia));
    if (usiaManual !== null && !(usiaManual >= 0 && usiaManual <= 18)) {
      tampilGalat('Usia harus angka 0 sampai 18.');
      return;
    }

    tombolSimpan.disabled = true;
    tombolSimpan.textContent = 'Menyimpan…';
    try {
      const sekarang = new Date().toISOString();
      const id = lama ? lama.id : crypto.randomUUID();
      const mediaBaru = [];
      const mediaHapus = [];
      const rekamMedia = (mid, jenis, blob, tipe) => mediaBaru.push({
        id: mid, karyaId: id, jenis, tipe, ukuran: blob.size, blob,
      });

      let foto = lama
        ? { fotoId: lama.fotoId, thumbId: lama.thumbId, fotoLebar: lama.fotoLebar, fotoTinggi: lama.fotoTinggi }
        : null;
      if (draf.foto) {
        foto = {
          fotoId: crypto.randomUUID(),
          thumbId: crypto.randomUUID(),
          fotoLebar: draf.foto.fotoLebar,
          fotoTinggi: draf.foto.fotoTinggi,
        };
        rekamMedia(foto.fotoId, 'foto', draf.foto.foto, 'image/jpeg');
        rekamMedia(foto.thumbId, 'thumb', draf.foto.thumb, 'image/jpeg');
        if (lama) mediaHapus.push(lama.fotoId, lama.thumbId);
      }

      draf.suara.filter((s) => s.baru).forEach((s) => rekamMedia(s.id, 'suara', s.blob, s.tipe));
      const idSuara = new Set(draf.suara.map((s) => s.id));
      if (lama) (lama.suara || []).forEach((s) => { if (!idSuara.has(s.id)) mediaHapus.push(s.id); });

      if (draf.video && draf.video.baru) rekamMedia(draf.video.id, 'video', draf.video.blob, draf.video.tipe);
      if (lama && lama.video && (!draf.video || draf.video.id !== lama.video.id)) mediaHapus.push(lama.video.id);

      const karya = {
        ...lama,
        id,
        anakId,
        ...foto,
        lokasi: rapikanIsian(form.elements.lokasi.value, saran.lokasi),
        judul: form.elements.judul.value.trim(),
        ceritaTeks: form.elements.ceritaTeks.value.trim(),
        suara: draf.suara.map((s) => ({
          id: s.id, durasi: s.durasi || null, tipe: s.tipe, sumber: s.sumber || 'rekam',
        })),
        video: draf.video ? {
          id: draf.video.id, durasi: draf.video.durasi || null, tipe: draf.video.tipe,
        } : null,
        acara: rapikanIsian(form.elements.acara.value, saran.acara),
        isi: uraiKataKunci(form.elements.isi.value),
        tanggal,
        usiaManual,
        contoh: lama ? !!lama.contoh : false,
        dibuat: lama ? lama.dibuat : sekarang,
        diubah: sekarang,
      };

      await simpanKarya(karya, { mediaBaru, mediaHapus, baru: !lama });
      try { localStorage.setItem(KUNCI_ANAK_TERAKHIR, anakId); } catch { /* abaikan */ }
      berubah = false;
      aturPenjaga(null);
      kabar('Karya disimpan 🎉');
      if (!lama) rayakan();
      if (lama) kembali(`#/karya/${id}`);
      else pergi(`#/karya/${id}`, { ganti: true });
    } catch (err) {
      console.error(err);
      tampilGalat(err && err.name === 'QuotaExceededError'
        ? 'Ruang penyimpanan HP penuh. Hapus beberapa file di HP, lalu coba lagi.'
        : `Gagal menyimpan: ${err.message}`);
      tombolSimpan.textContent = 'Simpan karya';
      perbaruiTombol();
    }
  });

  const tombolHapus = main.querySelector('#hapus-karya');
  if (tombolHapus) {
    tombolHapus.addEventListener('click', async () => {
      const terhapus = await mintaHapusKarya(lama);
      if (terhapus) {
        berubah = false;
        mundur(2, `#/anak/${lama.anakId}`);
      }
    });
  }

  // Jaga supaya isian tidak hilang karena tidak sengaja kembali.
  aturPenjaga(async () => !berubah || konfirmasi({
    judul: 'Buang isian ini?',
    pesan: 'Karya ini belum disimpan.',
    ya: 'Buang',
    tidak: 'Lanjut mengisi',
    bahaya: true,
  }));
  const cegahTutup = (e) => {
    if (!berubah) return;
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', cegahTutup);
  return () => window.removeEventListener('beforeunload', cegahTutup);
}

async function mintaHapusKarya(k) {
  const yakin = await konfirmasi({
    judul: 'Hapus karya ini?',
    pesan: 'Foto, cerita, rekaman suara, dan video karya ini akan dihapus dari aplikasi. Tindakan ini tidak bisa dibatalkan.',
    ya: 'Ya, hapus',
    bahaya: true,
  });
  if (!yakin) return false;
  try {
    await hapusKarya(k.id);
    kabar('Karya dihapus');
    return true;
  } catch (err) {
    await pemberitahuan({ judul: 'Gagal menghapus', pesan: err.message });
    return false;
  }
}

// =====================================================================
// Detail karya
// =====================================================================

export async function layarDetailKarya(id) {
  const k = await ambilKarya(id);
  if (!k) return layarKaryaTidakAda();
  const anak = await ambilAnak(k.anakId);
  const usia = usiaKarya(k, anak);
  const info = [
    anak ? esc(anak.nama) : '',
    usia !== null ? `${usia} tahun` : '',
    esc(tanggalPanjang(k.tanggal)),
  ].filter(Boolean).join(' · ');

  const baris = (label, nilai) => (nilai ? `<dt>${label}</dt><dd>${nilai}</dd>` : '');
  const suara = (k.suara || []).map((s, i) => `
    <div class="item-media">
      <audio controls preload="metadata" data-media="${s.id}"></audio>
      <span class="item-media-info">Rekaman ${i + 1}${s.durasi ? ` · ${formatDurasi(s.durasi)}` : ''}</span>
    </div>`).join('');

  return {
    judul: k.judul || 'Detail karya',
    kembaliKe: `#/anak/${k.anakId}`,
    nav: 'beranda',
    isi: `
      <figure class="foto-detail"><img data-media="${k.fotoId}" alt="${esc(k.judul || 'Foto karya')}"></figure>
      <section class="kartu">
        <h2>${esc(k.judul || 'Tanpa judul')}</h2>
        <p class="redup">${info}</p>
        <dl class="keterangan">
          ${baris('Lokasi', esc(k.lokasi))}
          ${baris('Acara', esc(k.acara))}
          ${baris('Isi gambar', esc((k.isi || []).join(', ')))}
        </dl>
      </section>
      <section class="kartu">
        <h3>Cerita</h3>
        ${k.ceritaTeks ? `<p class="cerita">${esc(k.ceritaTeks)}</p>` : ''}
        ${suara}
        ${punyaCerita(k) ? '' : `
          <p class="redup">Belum ada cerita untuk karya ini.</p>
          <button type="button" class="tombol" data-ke="#/karya/${k.id}/ubah?bagian=cerita">Tambah cerita</button>`}
      </section>
      ${k.video ? `
        <section class="kartu">
          <h3>Video</h3>
          <video controls playsinline preload="metadata" class="video-karya" data-media="${k.video.id}"></video>
        </section>` : ''}
      <button type="button" class="tombol tombol-utama" data-ke="#/karya/${k.id}/ubah">Ubah karya</button>
      <button type="button" class="tombol" id="simpan-foto">Simpan foto ke HP</button>
      <button type="button" class="tombol" id="buat-pdf">Buat PDF</button>
      <button type="button" class="tombol tombol-bahaya" id="hapus-karya">Hapus karya</button>`,
    siapkan(main) {
      main.querySelectorAll('[data-media]').forEach(async (el) => {
        const m = await ambilMedia(el.dataset.media);
        if (m && el.isConnected) el.src = urlBlob(m.blob);
      });
      main.querySelector('#simpan-foto').addEventListener('click', async () => {
        const m = await ambilMedia(k.fotoId);
        if (!m) return;
        const nama = `karya-${slug(anak && anak.nama)}-${k.tanggal}${k.judul ? `-${slug(k.judul)}` : ''}.jpg`;
        const hasil = await simpanFile(m.blob, nama);
        if (hasil === 'diunduh') kabar('Foto disimpan ke folder Download');
      });
      main.querySelector('#buat-pdf').addEventListener('click', () => buatDanSimpanPdf([k]));
      main.querySelector('#hapus-karya').addEventListener('click', async () => {
        if (await mintaHapusKarya(k)) mundur(1, `#/anak/${k.anakId}`);
      });
    },
  };
}
