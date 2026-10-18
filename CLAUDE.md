# Museum Karya Anak — aturan kerja

Proyek ini disimpan di GitHub (https://github.com/zakiirfan/Museum-Karya-Anak) dan bisa diedit
dari beberapa device. Cloudflare Worker `karyaanak` (https://karyaanak.azakfan.workers.dev) deploy dari branch `main`
lewat `wrangler.jsonc` (menyajikan folder `app`). Jangan ganti nama Worker: data di HP terikat pada alamatnya.

## Wajib setiap sesi
1. **Sebelum mengubah file apa pun**, jalankan `git pull` untuk mengambil perubahan dari device lain.
   Kalau ada perubahan lokal yang belum di-commit, tanyakan dulu ke pengguna.
2. Kalau terjadi konflik, **jangan pilih sendiri**: tunjukkan bedanya ke pengguna dan tanyakan versi mana yang dipakai.
3. Setelah perubahan selesai dan diuji: naikkan versi di `app/js/version.js`, perbarui daftar `FILES` di `app/sw.js`
   kalau ada file baru, jalankan `node tools/buat-satu-file.js`, lalu commit dan **minta izin pengguna sebelum push**.
4. Jangan pernah `git push --force` atau menulis ulang riwayat.

## Aturan proyek (dari spesifikasi pengguna)
- Semua teks antarmuka dalam Bahasa Indonesia yang sederhana. Pengguna pemula: jelaskan langkah dengan jelas.
- Tidak ada server, akun, cloud, atau analytics. Data pengguna hanya di IndexedDB perangkat.
- Jangan menambah fitur di luar daftar tanpa izin. Jangan mengubah struktur data tanpa migrasi (`MIGRASI` di `app/js/db.js`).
- Jangan pernah menghapus data tanpa konfirmasi pengguna.
- Detail struktur data, deploy, dan keterbatasan: lihat README.md.
