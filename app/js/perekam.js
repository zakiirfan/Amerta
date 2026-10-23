// Perekam suara dan video langsung dari aplikasi.
// Izin mikrofon/kamera baru diminta saat perekam dibuka (saat fiturnya dipakai).

import { formatDurasi, VIDEO_DETIK_MAKS } from './media.js';

const SUARA_DETIK_MAKS = 5 * 60;

export function bisaRekam() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function pilihTipe(daftar) {
  if (!MediaRecorder.isTypeSupported) return '';
  return daftar.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function pesanGalat(err, video) {
  const nama = err && err.name;
  if (nama === 'NotAllowedError' || nama === 'SecurityError') {
    return video
      ? 'Izin kamera atau mikrofon ditolak. Izinkan lewat pengaturan browser, lalu coba lagi.'
      : 'Izin mikrofon ditolak. Izinkan lewat pengaturan browser, lalu coba lagi.';
  }
  if (nama === 'NotFoundError') return video ? 'Kamera tidak ditemukan.' : 'Mikrofon tidak ditemukan.';
  if (nama === 'NotReadableError') return 'Kamera atau mikrofon sedang dipakai aplikasi lain.';
  return `Tidak bisa merekam. ${(err && err.message) || ''}`;
}

/** Hasil: { blob, tipe, durasi } atau null kalau batal. */
export function rekamSuara() {
  return bukaPerekam(false);
}

/** Hasil: { blob, tipe, durasi } atau null kalau batal. Video maksimal VIDEO_DETIK_MAKS (3 menit). */
export function rekamVideo() {
  return bukaPerekam(true);
}

function bukaPerekam(video) {
  return new Promise((resolve) => {
    const batas = video ? VIDEO_DETIK_MAKS : SUARA_DETIK_MAKS;
    const d = document.createElement('dialog');
    d.className = 'lembar perekam';
    d.innerHTML = `
      <h2>${video ? 'Rekam video' : 'Rekam cerita anak'}</h2>
      ${video ? '' : '<p class="redup">Minta anak bercerita tentang karyanya.</p>'}
      ${video ? '<video class="pratinjau-video" playsinline muted autoplay></video>' : ''}
      <div class="hasil-rekam" hidden></div>
      <p class="waktu-rekam" aria-live="polite">0:00 / ${formatDurasi(batas)}</p>
      <p class="pesan-galat" hidden></p>
      <button type="button" class="tombol tombol-utama" data-aksi="mulai">● Mulai rekam</button>
      <button type="button" class="tombol tombol-rekam" data-aksi="berhenti" hidden>■ Berhenti</button>
      <button type="button" class="tombol tombol-utama" data-aksi="pakai" hidden>Pakai rekaman ini</button>
      <button type="button" class="tombol" data-aksi="ulang" hidden>Rekam ulang</button>
      <button type="button" class="tombol" data-aksi="batal">Batal</button>`;

    const el = (s) => d.querySelector(s);
    const tombol = (a) => d.querySelector(`[data-aksi="${a}"]`);
    const pratinjau = el('.pratinjau-video');
    const wadahHasil = el('.hasil-rekam');
    const waktu = el('.waktu-rekam');
    const galat = el('.pesan-galat');

    let stream = null;
    let perekam = null;
    let potongan = [];
    let mulaiPada = 0;
    let pewaktu = null;
    let hasil = null;
    let urlHasil = null;
    let selesai = false;

    const tampil = (aksiTerlihat) => {
      ['mulai', 'berhenti', 'pakai', 'ulang'].forEach((a) => { tombol(a).hidden = !aksiTerlihat.includes(a); });
    };
    const tampilGalat = (pesan) => { galat.textContent = pesan; galat.hidden = !pesan; };

    const hentikanStream = () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    const akhiri = (nilai) => {
      if (selesai) return;
      selesai = true;
      clearInterval(pewaktu);
      if (perekam && perekam.state !== 'inactive') {
        perekam.onstop = null;
        perekam.stop();
      }
      hentikanStream();
      if (urlHasil) URL.revokeObjectURL(urlHasil);
      if (pratinjau) pratinjau.srcObject = null;
      if (d.open) d.close();
      d.remove();
      resolve(nilai);
    };

    const siapkanStream = async () => {
      if (stream) return true;
      try {
        stream = await navigator.mediaDevices.getUserMedia(video
          ? { audio: true, video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } }
          : { audio: true });
        if (selesai) { hentikanStream(); return false; }
        if (pratinjau) { pratinjau.srcObject = stream; pratinjau.hidden = false; }
        return true;
      } catch (err) {
        tampilGalat(pesanGalat(err, video));
        return false;
      }
    };

    const mulai = async () => {
      tampilGalat('');
      tombol('mulai').disabled = true;
      const ok = await siapkanStream();
      tombol('mulai').disabled = false;
      if (!ok) return;

      // Utamakan MP4 dengan AAC/H.264: paling mudah diputar di Android maupun iPhone.
      const tipe = video
        ? pilihTipe(['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4',
          'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'])
        : pilihTipe(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']);
      const opsi = { audioBitsPerSecond: 64000 };
      if (video) opsi.videoBitsPerSecond = 1200000; // ±9 MB per menit
      if (tipe) opsi.mimeType = tipe;
      try {
        perekam = new MediaRecorder(stream, opsi);
      } catch {
        perekam = new MediaRecorder(stream);
      }
      potongan = [];
      perekam.ondataavailable = (e) => { if (e.data && e.data.size) potongan.push(e.data); };
      perekam.onstop = () => {
        clearInterval(pewaktu);
        const durasi = (Date.now() - mulaiPada) / 1000;
        const tipeAkhir = perekam.mimeType || tipe || (video ? 'video/webm' : 'audio/webm');
        const blob = new Blob(potongan, { type: tipeAkhir });
        hasil = { blob, tipe: tipeAkhir, durasi };
        urlHasil = URL.createObjectURL(blob);
        wadahHasil.innerHTML = video
          ? '<video controls playsinline class="video-karya"></video>'
          : '<audio controls></audio>';
        wadahHasil.firstElementChild.src = urlHasil;
        wadahHasil.hidden = false;
        if (pratinjau) pratinjau.hidden = true;
        hentikanStream();
        tampil(['pakai', 'ulang']);
      };
      perekam.start(1000);
      mulaiPada = Date.now();
      tampil(['berhenti']);
      pewaktu = setInterval(() => {
        const detik = (Date.now() - mulaiPada) / 1000;
        waktu.textContent = `${formatDurasi(detik)} / ${formatDurasi(batas)}`;
        if (detik >= batas && perekam.state === 'recording') perekam.stop();
      }, 250);
    };

    tombol('mulai').addEventListener('click', mulai);
    tombol('berhenti').addEventListener('click', () => {
      if (perekam && perekam.state === 'recording') perekam.stop();
    });
    tombol('ulang').addEventListener('click', async () => {
      if (urlHasil) URL.revokeObjectURL(urlHasil);
      urlHasil = null;
      hasil = null;
      wadahHasil.innerHTML = '';
      wadahHasil.hidden = true;
      waktu.textContent = `0:00 / ${formatDurasi(batas)}`;
      tampil(['mulai']);
      if (video) await siapkanStream();
    });
    tombol('pakai').addEventListener('click', () => akhiri(hasil));
    tombol('batal').addEventListener('click', () => akhiri(null));
    d.addEventListener('cancel', (e) => { e.preventDefault(); akhiri(null); });

    document.body.append(d);
    d.showModal();
    if (video) siapkanStream();
  });
}
