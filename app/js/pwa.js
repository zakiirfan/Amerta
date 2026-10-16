// Urusan PWA: service worker (mode offline), pembaruan versi,
// status terpasang, dan permintaan penyimpanan permanen.

// true di versi "satu file HTML" (lihat tools/buat-satu-file.js):
// tanpa service worker dan tanpa pemasangan ke layar utama.
export const modeSatuFile = !!self.MKA_SATU_FILE;

export function sudahTerpasang() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function siapOffline() {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
}

/**
 * Mendaftarkan service worker.
 * onUpdateSiap(fnPerbarui) dipanggil kalau ada versi baru yang siap dipakai.
 * onOfflineSiap() dipanggil saat aplikasi pertama kali siap dipakai tanpa internet.
 */
export async function daftarkanServiceWorker({ onUpdateSiap, onOfflineSiap }) {
  if (modeSatuFile || !('serviceWorker' in navigator)) return;

  const sudahAdaSebelumnya = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker.register('sw.js');

  const cekMenunggu = () => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      onUpdateSiap(() => reg.waiting && reg.waiting.postMessage('SKIP_WAITING'));
    }
  };
  cekMenunggu();

  reg.addEventListener('updatefound', () => {
    const baru = reg.installing;
    if (!baru) return;
    baru.addEventListener('statechange', () => {
      if (baru.state === 'installed') cekMenunggu();
    });
  });

  let sedangMuatUlang = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sudahAdaSebelumnya) {
      // Pemasangan pertama: tidak perlu muat ulang, cukup kabari.
      onOfflineSiap();
      return;
    }
    // Pengguna sudah mengetuk "Perbarui": muat ulang ke versi baru.
    if (sedangMuatUlang) return;
    sedangMuatUlang = true;
    window.location.reload();
  });

  // Cek versi baru setiap kali aplikasi dibuka kembali.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => {});
  });
}

/**
 * Meminta browser agar data aplikasi tidak dihapus otomatis.
 * Hasil: 'aktif' | 'belum' | 'tidak-didukung'
 */
export async function mintaPenyimpananPermanen() {
  if (!navigator.storage || !navigator.storage.persist) return 'tidak-didukung';
  try {
    if (await navigator.storage.persisted()) return 'aktif';
    return (await navigator.storage.persist()) ? 'aktif' : 'belum';
  } catch {
    return 'belum';
  }
}
