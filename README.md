# Amerta (dulu Museum Karya Anak)

Katalog pribadi foto karya anak (gambar dan prakarya) beserta ceritanya.
Berbentuk web app (PWA) yang bisa dipasang ke layar utama HP.

- **Tidak ada server, akun, cloud, atau analytics.** Semua data hanya disimpan di browser HP (IndexedDB).
- **Berjalan tanpa internet** setelah dibuka pertama kali (service worker).
- Dibuat dengan HTML, CSS, dan JavaScript biasa. **Tidak ada proses build dan tidak ada library luar**:
  PDF dan zip dibuat oleh kode di proyek ini sendiri.

Status: **semua fitur MVP sudah dibuat** (versi 0.9.0). Sudah diuji di browser komputer, belum diuji di HP sungguhan.

| Tahap | Isi | Versi |
|---|---|---|
| 1 | Kerangka PWA, panduan pasang, mode offline | 0.1.0 |
| 2 | Direktori anak: tambah, ubah, hapus | 0.2.0 |
| 3–10 | Tambah karya, galeri, pencarian, detail, isian opsional, unduh foto/PDF, ekspor-impor, pengaturan, data contoh | 0.9.0 |

---

## Fitur

- **Direktori anak**: nama dan tanggal lahir (opsional). Anak yang masih punya karya tidak bisa dihapus.
- **Tambah karya**: tiga isian wajib (foto dari kamera/galeri, anak, lokasi), dengan saran lokasi dari karya sebelumnya.
  Isian opsional: judul, cerita (ketik, rekam suara, impor rekaman), video maksimal 1 menit, acara, isi gambar,
  tanggal (otomatis dari foto), dan usia (otomatis dari tanggal lahir, bisa diubah).
- **Galeri per anak**, urut dari terbaru. Karya tanpa cerita diberi tanda "Belum ada cerita".
- **Pencarian**: kotak cari (lokasi, acara, isi gambar, judul, cerita ketik), filter cepat
  (lokasi → acara → isi gambar → usia), dan bisa dibatasi per anak.
- **Detail karya**: foto besar, putar rekaman dan video, ubah, hapus (dengan konfirmasi).
- **Unduh**: simpan foto ke HP, PDF satu karya, atau PDF kumpulan karya ("Pilih untuk PDF" di galeri/hasil cari).
- **Cadangan**: ekspor semua data ke satu file `.zip`, impor kembali. Pengingat muncul di beranda setelah
  10 karya baru, atau 30 hari sejak cadangan terakhir (kalau ada karya baru).
- **Pengaturan**: status penyimpanan permanen, ruang terpakai, tanggal ekspor terakhir, tombol ekspor/impor,
  penjelasan risiko data, data contoh.

## Struktur folder

```
app/                    ← SELURUH isi folder ini yang di-deploy
  index.html            kerangka halaman + menu bawah
  manifest.webmanifest  nama, ikon, warna aplikasi (untuk pasang ke layar utama)
  sw.js                 service worker: menyimpan file aplikasi agar bisa offline
  _headers              aturan keamanan untuk Cloudflare Pages (memblokir kiriman data ke situs lain)
  css/app.css           tampilan
  icons/                ikon aplikasi
  js/version.js         NOMOR VERSI aplikasi (satu-satunya tempat)
  js/app.js             titik awal: daftar layar (rute)
  js/router.js          perpindahan layar (#/...), tombol kembali, penjaga isian belum disimpan
  js/ui.js              alat bantu tampilan: dialog, pesan singkat
  js/db.js              database IndexedDB + daftar migrasi
  js/karya.js           aturan kecil tentang karya (usia, saran, urutan)
  js/usia.js            hitung usia dan format tanggal
  js/media.js           kompres foto, baca tanggal EXIF, durasi audio/video
  js/perekam.js         rekam suara dan video langsung
  js/layar-anak.js      beranda, halaman anak (galeri), formulir anak
  js/layar-karya.js     formulir tambah/ubah karya, detail karya
  js/layar-cari.js      pencarian dan filter cepat
  js/layar-pengaturan.js  layar pengaturan
  js/galeri.js          grid karya + mode pilih untuk PDF
  js/pdf.js             pembuat PDF (tanpa library)
  js/pdf-karya.js       isi PDF karya
  js/zip.js             pembuat dan pembaca zip (tanpa library)
  js/cadangan.js        ekspor/impor cadangan dan pengingatnya
  js/simpan-file.js     menyimpan file ke HP (unduh / lembar Bagikan iPhone)
  js/contoh.js          data contoh (2 anak, 10 karya)
  js/panduan-pasang.js  panduan "Pasang ke layar utama"
  js/pwa.js             service worker, pembaruan versi, penyimpanan permanen
tools/server-lokal.js   server lokal untuk mencoba di komputer (opsional)
tools/buat-satu-file.js membuat museum-karya-anak-satu-file.html dari folder app/
museum-karya-anak-satu-file.html  versi satu file untuk mencoba (hasil buatan, jangan diedit langsung)
```

## Menjalankan di komputer (opsional)

Butuh [Node.js](https://nodejs.org). Tidak perlu `npm install`.

```bash
node tools/server-lokal.js
```

Buka `http://localhost:8080` di Chrome. Tekan `Ctrl+C` di terminal untuk berhenti.

Kamera dan mikrofon di HP hanya jalan lewat HTTPS. Jadi untuk menguji di HP,
gunakan alamat hasil deploy, bukan server lokal.

## Versi satu file HTML (untuk mencoba)

`museum-karya-anak-satu-file.html` berisi seluruh aplikasi dalam satu file (HTML, CSS, JS, ikon).
Klik dua kali untuk membukanya di Chrome atau Edge, tanpa server dan tanpa internet.

- **Hanya untuk mencoba.** Versi ini tidak punya mode offline (service worker) dan tidak bisa dipasang
  ke layar utama. Untuk HP, tetap deploy folder `app/`.
- Datanya tersimpan di browser yang membukanya, **terpisah** dari data versi yang di-deploy.
  Pindahkan data lewat Ekspor/Impor cadangan.
- File ini **dibuat dari** folder `app/`. Setiap kali kode di `app/` berubah, buat ulang:

```bash
node tools/buat-satu-file.js
```

## Simpan di GitHub, deploy di Cloudflare

Kode disimpan di GitHub. Cloudflare tersambung ke GitHub dan otomatis
memperbarui situs setiap kali isi GitHub berubah. Gratis, dan HTTPS-nya otomatis.

> **Yang dipakai sekarang:** Cloudflare **Worker** bernama `karyaanak`, alamat
> <https://karyaanak.azakfan.workers.dev>. Pengaturannya ada di `wrangler.jsonc`
> (menyajikan folder `app/`). Cara menyambungkannya ke GitHub ada di
> "Langkah 2b" di bawah. Langkah 2 (Pages) hanya untuk memasang dari awal di akun lain.

Yang di-upload ke GitHub hanya **kode aplikasi**. Foto, cerita, dan data anak tidak pernah
masuk GitHub, karena semuanya tersimpan di HP. Jadi repositori publik pun aman.

### Langkah 1: simpan kode di GitHub

1. Buat akun di <https://github.com/signup> (kalau belum punya).
2. Klik **+** di kanan atas, lalu pilih **New repository**.
   - **Repository name**: `museum-karya-anak`
   - Pilih **Public** atau **Private** (keduanya bisa dipakai Cloudflare).
   - Jangan centang "Add a README file" (proyek ini sudah punya README).
   - Klik **Create repository**.
3. Di halaman repositori yang masih kosong, klik tautan **uploading an existing file**.
4. Buka folder proyek ini di File Explorer. Pilih **isinya**: folder `app`, folder `tools`,
   `README.md`, dan `museum-karya-anak-satu-file.html`. Seret semuanya ke halaman GitHub.
   Folder `.claude` tidak perlu ikut.
5. Tunggu semua file selesai ter-upload. Di bawah, tulis keterangan misalnya `Versi 0.9.0`,
   lalu klik **Commit changes**.
6. Cek: di halaman repositori harus terlihat folder `app`, dan di dalamnya ada `index.html`.

### Langkah 2: sambungkan Cloudflare Pages ke GitHub

1. Buka <https://dash.cloudflare.com>, pilih **Workers & Pages**, lalu klik **Create**.
2. Pilih tab **Pages**, lalu **Connect to Git** (Import an existing Git repository).
   Kalau yang muncul halaman "Workers", cari tautan kecil *"Looking to deploy Pages? Get started"*.
3. Klik **Connect GitHub**, masuk ke GitHub, lalu izinkan Cloudflare membaca repositori
   `museum-karya-anak` saja (**Only select repositories**).
4. Pilih repositori `museum-karya-anak`, lalu klik **Begin setup**.
5. Isi pengaturan:
   - **Project name**: misalnya `museum-karya-anak-keluargaku`. Ini menjadi alamat
     `https://museum-karya-anak-keluargaku.pages.dev`.
     ⚠️ **Pilih dengan hati-hati, jangan pernah diganti.** Data di HP terikat pada alamat ini.
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: *kosongkan*
   - **Build output directory**: `app` ← **penting**
6. Klik **Save and Deploy**. Tunggu sampai muncul "Success", lalu buka alamat `.pages.dev` di HP.

Proyek Cloudflare lama yang dibuat lewat upload langsung tidak bisa disambungkan ke GitHub.
Kalau ingin memakai nama yang sama, hapus dulu proyek lama di Cloudflare
(**Settings**, lalu **Delete project**), baru buat yang baru. Kalau sudah ada karya asli di alamat lama,
**ekspor cadangan dulu** dari alamat lama, lalu impor di alamat baru.

### Langkah 2b: sambungkan Worker `karyaanak` ke GitHub

Dipakai kalau aplikasi dipasang sebagai Worker (alamat `….workers.dev`), bukan Pages.

1. Buka <https://dash.cloudflare.com>, pilih **Workers & Pages**, lalu klik Worker **karyaanak**.
2. Buka **Settings**, lalu bagian **Build**. Klik **Connect** di samping **Git repository**.
3. Pilih akun GitHub dan repositori `Amerta` (dulu bernama `Museum-Karya-Anak`).
4. Isi pengaturan:
   - **Branch**: `main`
   - **Build command**: *kosongkan*
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory** / **Path**: *kosongkan* (atau `/`)
5. Klik **Connect**. Setiap perubahan di `main` akan otomatis dipasang (lihat tab **Deployments**).

Jangan ganti nama Worker. Data di HP terikat pada alamat `karyaanak.azakfan.workers.dev`.

⚠️ Pastikan yang tersambung adalah repositori **`Amerta`**. Saat Worker pertama dibuat,
Cloudflare sempat membuat repositori salinan bernama `karyaanak` dan menyambungkan Worker ke sana,
sehingga perubahan di `Amerta` tidak pernah terpasang. Repositori `karyaanak` itu hanya
salinan lama dan tidak dipakai lagi. Kalau di catatan build ada baris "Pushing to destination",
berarti Worker masih tersambung ke salinan, bukan ke repositori ini.

Jangan aktifkan **Web Analytics** di Cloudflare. Aplikasi ini tidak boleh memakai
analytics, dan aturan keamanan di `_headers` akan memblokirnya.

Tampilan dasbor GitHub dan Cloudflare kadang berubah sedikit. Kalau nama tombolnya berbeda,
cari pilihan dengan arti yang sama.

### Setiap ada pembaruan

1. Naikkan nomor versi di `app/js/version.js` (misalnya `0.9.0` menjadi `0.9.1`).
   **Wajib.** Tanpa ini, HP yang sudah memasang aplikasi tidak mengunduh versi baru.
2. Kalau ada file baru di `app/`, tambahkan namanya ke daftar `FILES` di `app/sw.js`.
3. Kirim perubahan ke GitHub dengan **salah satu** cara berikut:
   - **Dari laptop ini** (folder sudah tersambung ke GitHub): `git add -A`, `git commit -m "keterangan"`, lalu `git push`.
   - **Lewat situs GitHub**: buka repositori, klik **Add file**, lalu **Upload files**. Seret file
     yang berubah dengan susunan folder yang sama, lalu **Commit changes**.
4. Cloudflare otomatis deploy ulang dalam 1–2 menit. Statusnya terlihat di tab **Deployments**.
5. Di HP, buka aplikasinya. Akan muncul banner **"Ada versi baru aplikasi"**.
   Ketuk **Perbarui**.

### Bekerja dari beberapa device

Repositori GitHub adalah **sumber utama**. Supaya edit dari laptop, HP, atau situs GitHub tidak saling menimpa:

1. **Sebelum mulai mengedit** di device mana pun, ambil dulu versi terbaru:
   - di laptop: `git pull`
   - di situs GitHub: selalu edit langsung di sana, karena isinya pasti yang terbaru.
2. **Setelah selesai**, segera kirim ke GitHub (`git push` atau **Commit changes** di situs).
3. Kalau file yang sama diubah di dua device, Git akan memberi tahu ada **konflik** dan tidak
   menimpa diam-diam. Pilih versi yang dipakai, lalu kirim lagi.
4. Jangan pernah memakai `git push --force`.

Edit kode tidak memengaruhi data karya di HP, karena data tersimpan di HP masing-masing, bukan di GitHub.
Untuk memindahkan data antar-HP, pakai Ekspor/Impor cadangan.

## Struktur data

Database IndexedDB bernama `museum-karya-anak`. Versi database = jumlah langkah migrasi
di `js/db.js` (sekarang **2**).

### Toko `anak` (kunci: `id`)

| Kolom | Jenis | Keterangan |
|---|---|---|
| `id` | teks (UUID) | dibuat otomatis |
| `nama` | teks | wajib, maksimal 40 huruf, tidak boleh sama dengan anak lain |
| `tanggalLahir` | teks `YYYY-MM-DD` atau `null` | opsional, untuk menghitung usia |
| `contoh` | true/false | `true` untuk data contoh |
| `dibuat`, `diubah` | teks ISO | waktu dibuat / terakhir diubah |

### Toko `karya` (kunci: `id`, indeks: `anakId`)

| Kolom | Jenis | Keterangan |
|---|---|---|
| `id`, `anakId` | teks | karya milik anak mana |
| `fotoId`, `thumbId` | teks | id media foto (≤2000 px) dan gambar kecil (≤480 px) |
| `fotoLebar`, `fotoTinggi` | angka | ukuran foto (untuk PDF) |
| `lokasi` | teks | wajib, nama tempat sehari-hari |
| `judul`, `ceritaTeks`, `acara` | teks | opsional (boleh kosong) |
| `isi` | daftar teks | kata kunci isi gambar, huruf kecil |
| `suara` | daftar `{ id, durasi, tipe, sumber }` | rekaman cerita (`sumber`: `rekam`/`impor`) |
| `video` | `{ id, durasi, tipe }` atau `null` | video maksimal 1 menit |
| `tanggal` | teks `YYYY-MM-DD` | default dari tanggal foto, atau hari ini |
| `usiaManual` | angka atau `null` | `null` = usia dihitung otomatis dari tanggal lahir |
| `contoh` | true/false | data contoh |
| `dibuat`, `diubah` | teks ISO | |

### Toko `media` (kunci: `id`, indeks: `karyaId`)

`{ id, karyaId, jenis: 'foto'|'thumb'|'suara'|'video', tipe, ukuran, blob }`.
Karya dan medianya selalu disimpan dan dihapus dalam satu transaksi.

### Toko `meta` (kunci: `kunci`)

| Kunci | Isi |
|---|---|
| `eksporTerakhir` | waktu ekspor terakhir (ISO) |
| `karyaSejakEkspor` | jumlah karya baru sejak ekspor terakhir |
| `karyaPertama` | waktu karya asli pertama disimpan |
| `pengingatDitundaSampai` | waktu (ms) sampai pengingat ekspor muncul lagi |

### Tempat lain

| Tempat | Kunci | Isi |
|---|---|---|
| localStorage | `mka.panduanPasangDilihat` | `"1"` kalau panduan pasang sudah ditutup |
| localStorage | `mka.anakTerakhir` | anak yang terakhir dipilih saat menambah karya |
| Cache Storage | `mka-<versi>` | salinan file aplikasi untuk mode offline |

### File cadangan (.zip)

```
data.json        { aplikasi: "museum-karya-anak", format: 1, versiAplikasi, versiDB, dibuat,
                   anak: [...], karya: [...], media: [{ id, karyaId, jenis, tipe, ukuran, file }] }
media/<id>.<ext> foto, gambar kecil, rekaman, video
BACA-SAYA.txt    penjelasan singkat
```

Impor bersifat **menggabungkan**: data yang belum ada ditambahkan, data yang lebih baru
(menurut `diubah`) menggantikan yang lama, dan tidak ada data di HP yang dihapus.
Mengimpor file yang sama dua kali tidak menggandakan data. Data contoh tidak ikut diekspor.

### Aturan migrasi

Struktur data yang sudah dipakai tidak boleh diubah tanpa migrasi.
Jangan ubah atau hapus langkah yang sudah ada di `MIGRASI` (`js/db.js`).
Tambahkan langkah baru di akhir daftar. Database di HP pengguna dinaikkan
versinya secara otomatis saat aplikasi dibuka. Kalau format cadangan berubah,
naikkan `FORMAT` di `js/cadangan.js` dan tetap dukung format lama saat impor.

## Batas yang dipakai

| Hal | Batas |
|---|---|
| Foto | dikompres ke JPEG, sisi terpanjang 2000 px |
| Video | maksimal 1 menit; dari galeri maksimal 50 MB; rekam langsung ±9 MB/menit (720p) |
| Rekam suara | maksimal 5 menit per rekaman |
| Impor rekaman | maksimal 30 MB per file |

## Keterbatasan yang diketahui

- **Data hanya ada di satu browser di satu HP.** Data hilang kalau data browser dihapus,
  ganti HP, atau alamat situs berganti, kecuali sudah diekspor.
- **iPhone: data di ikon layar utama terpisah dari data di Safari.** Pasang dulu ke layar
  utama, lalu selalu buka dari ikon.
- **iPhone: menyimpan foto/PDF/cadangan lewat lembar "Bagikan"** (pilih "Simpan Gambar" atau
  "Simpan ke File"), karena iPhone tidak mengizinkan unduhan biasa ke galeri Foto.
- **Penyimpanan permanen** tergantung keputusan browser. Status "Belum diizinkan" di awal itu normal;
  biasanya berubah setelah aplikasi dipasang ke layar utama.
- **PDF hanya mendukung huruf Latin.** Emoji dan huruf non-Latin di judul/cerita tampil sebagai "?".
  Rekaman suara dan video tidak bisa dimasukkan ke PDF (hanya disebutkan).
- **Rekaman dari HP berbeda**: rekaman dibuat dalam format MP4 kalau browser mendukungnya, supaya bisa
  diputar di Android dan iPhone. Di browser lama, rekaman bisa berformat WebM yang mungkin tidak bisa
  diputar di iPhone lama setelah diimpor.
- **Video dari galeri tidak dikompres ulang** (browser tidak bisa melakukannya dengan andal). Karena itu
  ada batas 50 MB. Video yang direkam langsung di aplikasi jauh lebih kecil.
- **Cadangan sangat besar** (ratusan video) bisa gagal dibuat di HP dengan memori kecil. Batas mutlak file zip: 4 GB.
- **Tanggal foto**: diambil dari data EXIF foto JPEG. Foto yang diambil langsung dari kamera di iPhone
  sering tidak membawa tanggal, jadi tanggalnya menjadi hari ini (bisa diubah).
- **Impor**: kalau di HP baru sudah dibuat anak dengan nama yang sama sebelum impor, akan ada dua anak
  dengan nama sama (id berbeda). Sebaiknya impor dulu sebelum menambah data baru.
- Belum diuji di HP sungguhan (Android dan iPhone). Kamera dan mikrofon diuji dengan sumber tiruan di browser komputer.
