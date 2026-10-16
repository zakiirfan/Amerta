// Panduan "Pasang ke layar utama" untuk Android dan iPhone.
// Muncul sekali saat pertama dibuka (kalau belum terpasang),
// dan bisa dibuka lagi kapan saja.

import { modeSatuFile, sudahTerpasang } from './pwa.js';

const KUNCI_SUDAH_DILIHAT = 'mka.panduanPasangDilihat';

let promptPasang = null; // khusus Chrome Android: tombol "Pasang sekarang"

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptPasang = e;
  perbaruiTombolLangsung();
});

window.addEventListener('appinstalled', () => {
  promptPasang = null;
  perbaruiTombolLangsung();
  tutupPanduan();
});

function dialog() {
  return document.getElementById('panduan-pasang');
}

function perbaruiTombolLangsung() {
  const tombol = document.getElementById('tombol-pasang-langsung');
  if (tombol) tombol.hidden = !promptPasang;
}

function tebakJenisHP() {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS ? 'iphone' : 'android';
}

function pilihTab(os) {
  const d = dialog();
  d.querySelectorAll('[role="tab"]').forEach((t) => {
    t.setAttribute('aria-selected', String(t.dataset.os === os));
  });
  d.querySelectorAll('[data-panel]').forEach((p) => {
    p.hidden = p.dataset.panel !== os;
  });
}

export function bukaPanduan() {
  const d = dialog();
  pilihTab(tebakJenisHP());
  perbaruiTombolLangsung();
  if (!d.open) d.showModal();
}

function tutupPanduan() {
  const d = dialog();
  if (d && d.open) d.close();
}

export function siapkanPanduanPasang() {
  const d = dialog();

  d.querySelectorAll('[role="tab"]').forEach((t) => {
    t.addEventListener('click', () => pilihTab(t.dataset.os));
  });

  const tandaiDilihat = () => {
    try { localStorage.setItem(KUNCI_SUDAH_DILIHAT, '1'); } catch { /* abaikan */ }
  };
  d.querySelector('[data-tutup]').addEventListener('click', () => { tandaiDilihat(); tutupPanduan(); });
  d.addEventListener('cancel', tandaiDilihat);

  document.getElementById('tombol-pasang-langsung').addEventListener('click', async () => {
    if (!promptPasang) return;
    promptPasang.prompt();
    await promptPasang.userChoice.catch(() => {});
    promptPasang = null;
    perbaruiTombolLangsung();
  });

  let sudahDilihat = false;
  try { sudahDilihat = localStorage.getItem(KUNCI_SUDAH_DILIHAT) === '1'; } catch { /* abaikan */ }
  if (!modeSatuFile && !sudahTerpasang() && !sudahDilihat) bukaPanduan();
}
