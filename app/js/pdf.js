// Pembuat PDF sederhana, berjalan sepenuhnya di browser (tanpa server, tanpa library luar).
// Mendukung: foto JPEG, teks Helvetica (huruf Latin), bentuk berwarna, pindah halaman otomatis.
// Gayanya mengikuti aplikasi: kertas krem bertitik, polaroid, pil warna-warni, maskot krayon.

const LEBAR_HAL = 595.28;  // A4 dalam poin
const TINGGI_HAL = 841.89;
const TEPI = 42;
const LEBAR_ISI = LEBAR_HAL - 2 * TEPI;

// Lebar huruf Helvetica (per 1000 satuan) untuk karakter 32–126.
const LEBAR_HURUF = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

// Huruf khusus Unicode → kode WinAnsi.
const KHUSUS = {
  0x20AC: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
};

function keByte(teks) {
  const hasil = [];
  for (const ch of String(teks)) {
    const c = ch.codePointAt(0);
    if (c === 9) hasil.push(32);
    else if ((c >= 32 && c < 127) || (c >= 160 && c <= 255)) hasil.push(c);
    else if (KHUSUS[c]) hasil.push(KHUSUS[c]);
    else hasil.push(63); // '?' untuk huruf yang tidak didukung (misalnya emoji)
  }
  return hasil;
}

function lebarTeks(teks, ukuran, tebal) {
  let w = 0;
  for (const b of keByte(teks)) w += b >= 32 && b <= 126 ? LEBAR_HURUF[b - 32] : 556;
  return (w * ukuran / 1000) * (tebal ? 1.08 : 1);
}

function hex(teks) {
  return `<${keByte(teks).map((b) => b.toString(16).padStart(2, '0')).join('')}>`;
}

const angka = (n) => (Math.round(n * 100) / 100).toString();

/** Memecah teks menjadi baris. Baris pertama boleh lebih pendek (setelah label). */
function bungkus(teks, ukuran, tebal, lebar1, lebarLain = lebar1) {
  const hasil = [];
  const batas = () => (hasil.length === 0 ? lebar1 : lebarLain);
  for (const paragraf of String(teks).split(/\r?\n/)) {
    const kata = paragraf.split(/\s+/).filter(Boolean);
    if (!kata.length) { hasil.push(''); continue; }
    let baris = '';
    for (let w of kata) {
      const coba = baris ? `${baris} ${w}` : w;
      if (lebarTeks(coba, ukuran, tebal) <= batas()) { baris = coba; continue; }
      if (baris) { hasil.push(baris); baris = ''; }
      while (lebarTeks(w, ukuran, tebal) > batas()) {
        let i = w.length - 1;
        while (i > 1 && lebarTeks(w.slice(0, i), ukuran, tebal) > batas()) i--;
        hasil.push(w.slice(0, i));
        w = w.slice(i);
      }
      baris = w;
    }
    hasil.push(baris);
  }
  return hasil;
}

// ---------------------------------------------------------------------
// Gaya ceria (sama dengan aplikasi): warna, bentuk membulat, maskot krayon
// ---------------------------------------------------------------------

const W = {
  tinta: [0x1E, 0x2A, 0x44], redup: [0x55, 0x5D, 0x70], krem: [0xFB, 0xF6, 0xEC], titik: [0xE8, 0xDD, 0xC6],
  kartu: [0xFF, 0xFD, 0xF8], putih: [0xFF, 0xFF, 0xFF], mint: [0x8A, 0xD6, 0xD1], mintMuda: [0xDD, 0xF3, 0xEF],
  koral: [0xEC, 0x6F, 0x5A], koralMuda: [0xFF, 0xE1, 0xD8], kuning: [0xF6, 0xC7, 0x60], kuningMuda: [0xFF, 0xF4, 0xD9],
  lavender: [0x8E, 0x9B, 0xD6], lavenderMuda: [0xEC, 0xEE, 0xFA], teal: [0x23, 0x79, 0x7A], oranye: [0xFF, 0x8C, 0x52],
  pink: [0xF3, 0xB6, 0xCF], tip: [0xF7, 0xB3, 0xA6],
};
const rgb = (c) => c.map((v) => angka(v / 255)).join(' ');
const isi = (c) => `${rgb(c)} rg`;
const garis = (c) => `${rgb(c)} RG`;
const K = 0.5523; // konstanta lengkung Bézier untuk lingkaran

function jalurBulat(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  const k = rr * K;
  return [
    `${angka(x + rr)} ${angka(y)} m`,
    `${angka(x + w - rr)} ${angka(y)} l`,
    `${angka(x + w - rr + k)} ${angka(y)} ${angka(x + w)} ${angka(y + rr - k)} ${angka(x + w)} ${angka(y + rr)} c`,
    `${angka(x + w)} ${angka(y + h - rr)} l`,
    `${angka(x + w)} ${angka(y + h - rr + k)} ${angka(x + w - rr + k)} ${angka(y + h)} ${angka(x + w - rr)} ${angka(y + h)} c`,
    `${angka(x + rr)} ${angka(y + h)} l`,
    `${angka(x + rr - k)} ${angka(y + h)} ${angka(x)} ${angka(y + h - rr + k)} ${angka(x)} ${angka(y + h - rr)} c`,
    `${angka(x)} ${angka(y + rr)} l`,
    `${angka(x)} ${angka(y + rr - k)} ${angka(x + rr - k)} ${angka(y)} ${angka(x + rr)} ${angka(y)} c h`,
  ].join(' ');
}
function lingkaran(cx, cy, r) {
  const k = r * K;
  return [
    `${angka(cx + r)} ${angka(cy)} m`,
    `${angka(cx + r)} ${angka(cy + k)} ${angka(cx + k)} ${angka(cy + r)} ${angka(cx)} ${angka(cy + r)} c`,
    `${angka(cx - k)} ${angka(cy + r)} ${angka(cx - r)} ${angka(cy + k)} ${angka(cx - r)} ${angka(cy)} c`,
    `${angka(cx - r)} ${angka(cy - k)} ${angka(cx - k)} ${angka(cy - r)} ${angka(cx)} ${angka(cy - r)} c`,
    `${angka(cx + k)} ${angka(cy - r)} ${angka(cx + r)} ${angka(cy - k)} ${angka(cx + r)} ${angka(cy)} c h`,
  ].join(' ');
}
function bintang(cx, cy, r) {
  const t = [];
  for (let i = 0; i < 10; i++) {
    const sudut = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    t.push(`${angka(cx + Math.cos(sudut) * rr)} ${angka(cy + Math.sin(sudut) * rr)} ${i ? 'l' : 'm'}`);
  }
  return `${t.join(' ')} h`;
}

/** Maskot krayon kecil (dilihat dari kiri bawah di titik x, y; tinggi ±s*150). */
function maskot(x, y, s) {
  const P = (px, py) => `${angka(x + px * s)} ${angka(y + (150 - py) * s)}`;
  const o = [`q ${garis(W.tinta)} ${angka(3 * s)} w 1 J 1 j`];
  o.push(`${isi(W.tip)} ${P(42, 34)} m ${P(60, 6)} l ${P(78, 34)} l h B`);
  o.push(`${isi(W.koral)} ${P(53, 17)} m ${P(60, 6)} l ${P(67, 17)} l h B`);
  o.push(`${isi(W.koral)} ${jalurBulat(x + 36 * s, y + (150 - 136) * s, 48 * s, 104 * s, 9 * s)} B`);
  o.push(`${isi(W.mint)} ${angka(x + 36 * s)} ${angka(y + (150 - 124) * s)} ${angka(48 * s)} ${angka(28 * s)} re B`);
  o.push(`${P(40, 104)} m ${P(46, 110)} l ${P(52, 104)} l ${P(58, 110)} l ${P(64, 104)} l ${P(70, 110)} l ${P(76, 104)} l ${P(82, 110)} l S`);
  o.push(`${P(36, 78)} m ${P(22, 70)} ${P(16, 58)} ${P(18, 46)} c S`);
  o.push(`${isi([0xFF, 0xD8, 0xCF])} ${lingkaran(x + 18 * s, y + (150 - 42) * s, 6 * s)} B`);
  o.push(`${P(84, 84)} m ${P(96, 90)} ${P(100, 98)} ${P(100, 106)} c S`);
  o.push(`${lingkaran(x + 100 * s, y + (150 - 110) * s, 6 * s)} B`);
  o.push(`${isi(W.tinta)} ${lingkaran(x + 51 * s, y + 90 * s, 5 * s)} f ${lingkaran(x + 69 * s, y + 90 * s, 5 * s)} f`);
  o.push(`${isi(W.putih)} ${lingkaran(x + 53 * s, y + 92 * s, 1.6 * s)} f ${lingkaran(x + 71 * s, y + 92 * s, 1.6 * s)} f`);
  o.push(`${isi([0xF5, 0x9A, 0x88])} ${lingkaran(x + 44 * s, y + 78 * s, 4 * s)} f ${lingkaran(x + 76 * s, y + 78 * s, 4 * s)} f`);
  o.push(`${P(52, 72)} m ${P(60, 80)} ${P(60, 80)} ${P(68, 72)} c S`);
  o.push(`${isi(W.tinta)} ${lingkaran(x + 48 * s, y + 10 * s, 6 * s)} f ${lingkaran(x + 72 * s, y + 10 * s, 6 * s)} f`);
  o.push('Q');
  return o.join('\n');
}

/**
 * daftar: [{ gambar: { data: Uint8Array (JPEG), lebar, tinggi }, judul,
 *            pil: [{ teks, warna: 'mint'|'kuning'|'lavender'|'koral' }],
 *            isian: [{ label, nilai }], cerita: { label, teks } | null, catatan }]
 * Satu karya dimulai di halaman baru. Hasil: Blob PDF.
 */
export function buatPdf(daftar, { kaki = 'Amerta', tagline = 'Abadikan Momen Berarti Keluarga' } = {}) {
  const objek = [null, null]; // 1 = katalog, 2 = daftar halaman
  const tambah = (bagian) => { objek.push(bagian); return objek.length; };
  const fontBiasa = tambah(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']);
  const fontTebal = tambah(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']);
  const fontMiring = tambah(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>']);
  const halaman = [];
  const T = (teks, x, y, ukuran, font, warna) => `${isi(warna)} BT /${font} ${angka(ukuran)} Tf ${angka(x)} ${angka(y)} Td ${hex(teks)} Tj ET`;
  const tengah = (teks, cx, y, ukuran, font, warna) => T(teks, cx - lebarTeks(teks, ukuran, font === 'F2') / 2, y, ukuran, font, warna);

  // Latar kertas krem bertitik, hiasan bintang, dan kaki halaman.
  const latar = (nomor) => {
    const o = [`${isi(W.krem)} 0 0 ${LEBAR_HAL} ${TINGGI_HAL} re f`, isi(W.titik)];
    for (let ty = 14; ty < TINGGI_HAL; ty += 17) {
      for (let tx = 14; tx < LEBAR_HAL; tx += 17) o.push(`${angka(tx)} ${angka(ty)} 1.3 1.3 re`);
    }
    o.push('f');
    o.push(`${isi(W.kuning)} ${bintang(28, 120, 9)} f ${isi(W.mint)} ${lingkaran(570, 300, 7)} f`);
    o.push(`${isi(W.pink)} ${bintang(566, 96, 7)} f ${isi(W.lavender)} ${lingkaran(26, 420, 5)} f`);
    o.push(tengah(`${kaki} · ${tagline}`, LEBAR_HAL / 2, 26, 8.5, 'F3', W.redup));
    if (nomor > 1) o.push(T(`hal. ${nomor}`, LEBAR_HAL - TEPI - 30, 26, 8.5, 'F1', W.redup));
    return o.join('\n');
  };
  // Kepala halaman: pita bulat berisi nama aplikasi, tagline, dan maskot.
  const kepala = () => {
    const x = TEPI; const y = TINGGI_HAL - 92; const w = LEBAR_ISI; const h = 60;
    return [
      `${isi(W.tinta)} ${jalurBulat(x + 3, y - 4, w, h, 18)} f`,
      `${isi(W.mintMuda)} ${garis(W.tinta)} 2 w ${jalurBulat(x, y, w, h, 18)} B`,
      `${isi(W.kuningMuda)} ${jalurBulat(x + w * 0.55, y + 1, w * 0.45 - 1, h - 2, 17)} f`,
      `${garis(W.tinta)} 2 w ${jalurBulat(x, y, w, h, 18)} S`,
      T('Amerta', x + 20, y + 30, 24, 'F2', W.tinta),
      T(tagline, x + 20, y + 13, 10.5, 'F3', W.teal),
      maskot(x + w - 66, y + 2, 0.36),
      `${isi(W.koral)} ${bintang(x + w - 84, y + 44, 6)} f ${isi(W.kuning)} ${bintang(x + w - 96, y + 22, 4.5)} f`,
    ].join('\n');
  };

  for (const item of daftar) {
    let gambarId = null;
    if (item.gambar) {
      const g = item.gambar;
      gambarId = tambah([
        `<< /Type /XObject /Subtype /Image /Width ${g.lebar} /Height ${g.tinggi} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${g.data.length} >>\nstream\n`,
        g.data,
        '\nendstream',
      ]);
    }

    let ops = [];
    let nomor = 1;
    let y;
    const halamanBaru = () => {
      ops = [latar(nomor)];
      if (nomor === 1) { ops.push(kepala()); y = TINGGI_HAL - 112; } else { y = TINGGI_HAL - TEPI; }
    };
    const tutupHalaman = () => { halaman.push({ ops: ops.join('\n'), gambarId }); nomor++; };
    const pastikanRuang = (tinggi) => { if (y - tinggi < 50) { tutupHalaman(); halamanBaru(); } };
    halamanBaru();

    // Foto bergaya polaroid, sedikit miring, dengan selotip di dua sudut.
    if (item.gambar) {
      const g = item.gambar;
      const maksW = 380; const maksH = 330; const bingkai = 12; const bawah = 34;
      const skala = Math.min(maksW / g.lebar, maksH / g.tinggi);
      const w = g.lebar * skala; const h = g.tinggi * skala;
      const pw = w + 2 * bingkai; const ph = h + bingkai + bawah;
      const cx = LEBAR_HAL / 2; const cy = y - 10 - ph / 2;
      const sudut = (-1.6 * Math.PI) / 180;
      const cos = Math.cos(sudut); const sin = Math.sin(sudut);
      ops.push(`q ${angka(cos)} ${angka(sin)} ${angka(-sin)} ${angka(cos)} ${angka(cx)} ${angka(cy)} cm`);
      ops.push(`${isi(W.tinta)} ${angka(-pw / 2 + 5)} ${angka(-ph / 2 - 6)} ${angka(pw)} ${angka(ph)} re f`);
      ops.push(`${isi(W.putih)} ${garis(W.tinta)} 2 w ${angka(-pw / 2)} ${angka(-ph / 2)} ${angka(pw)} ${angka(ph)} re B`);
      ops.push(`q ${angka(w)} 0 0 ${angka(h)} ${angka(-w / 2)} ${angka(-ph / 2 + bawah)} cm /Im1 Do Q`);
      ops.push(`${garis(W.tinta)} 0.8 w ${angka(-w / 2)} ${angka(-ph / 2 + bawah)} ${angka(w)} ${angka(h)} re S`);
      const selotip = (tx, ty, rot, warna) => {
        const c = Math.cos(rot); const sn = Math.sin(rot);
        return `q ${angka(c)} ${angka(sn)} ${angka(-sn)} ${angka(c)} ${angka(tx)} ${angka(ty)} cm ${isi(warna)} ${garis(W.tinta)} 1 w -32 -9 64 18 re B Q`;
      };
      ops.push(selotip(-pw / 2 + 18, ph / 2 - 4, (35 * Math.PI) / 180, W.kuning));
      ops.push(selotip(pw / 2 - 18, ph / 2 - 4, (-35 * Math.PI) / 180, W.mint));
      ops.push(`${isi(W.koral)} ${lingkaran(pw / 2 - 20, -ph / 2 + bawah / 2, 5)} f ${isi(W.kuning)} ${lingkaran(pw / 2 - 34, -ph / 2 + bawah / 2, 5)} f ${isi(W.mint)} ${lingkaran(pw / 2 - 48, -ph / 2 + bawah / 2, 5)} f`);
      ops.push('Q');
      y = cy - ph / 2 - 30;
    }

    // Judul besar di tengah
    for (const baris of bungkus(item.judul || '', 24, true, LEBAR_ISI)) {
      pastikanRuang(32);
      y -= 26;
      ops.push(tengah(baris, LEBAR_HAL / 2, y, 24, 'F2', W.tinta));
    }
    y -= 16;

    // Pil warna-warni: nama anak, usia, tanggal (rata tengah, pindah baris kalau penuh)
    const pil = (item.pil || []).filter((p) => p.teks);
    if (pil.length) {
      const ukuran = 10.5; const tinggiPil = 22; const jarak = 8;
      const lebarPil = pil.map((p) => lebarTeks(p.teks, ukuran, true) + 26);
      const baris = [[]]; let lebarBaris = 0;
      pil.forEach((p, i) => {
        if (lebarBaris + lebarPil[i] > LEBAR_ISI && baris[baris.length - 1].length) { baris.push([]); lebarBaris = 0; }
        baris[baris.length - 1].push(i); lebarBaris += lebarPil[i] + jarak;
      });
      const muda = { mint: W.mintMuda, kuning: W.kuningMuda, lavender: W.lavenderMuda, koral: W.koralMuda };
      const tua = { mint: W.mint, kuning: W.kuning, lavender: W.lavender, koral: W.koral };
      for (const br of baris) {
        pastikanRuang(tinggiPil + 8);
        const total = br.reduce((t, i) => t + lebarPil[i], 0) + jarak * (br.length - 1);
        let x = (LEBAR_HAL - total) / 2;
        y -= tinggiPil;
        for (const i of br) {
          const w = pil[i].warna || 'mint';
          ops.push(`${isi(muda[w])} ${garis(W.tinta)} 1.4 w ${jalurBulat(x, y, lebarPil[i], tinggiPil, 11)} B`);
          ops.push(`${isi(tua[w])} ${lingkaran(x + 11, y + tinggiPil / 2, 3.5)} f`);
          ops.push(T(pil[i].teks, x + 19, y + 7.5, ukuran, 'F2', W.tinta));
          x += lebarPil[i] + jarak;
        }
        y -= 8;
      }
      y -= 8;
    }

    // Kartu keterangan (lokasi, acara, isi gambar)
    const isian = (item.isian || []).filter((r) => r.nilai);
    if (isian.length) {
      const ukuran = 11.5; const lebarLabel = 86; const lebarNilai = LEBAR_ISI - 40 - lebarLabel;
      const barisPer = isian.map((r) => bungkus(r.nilai, ukuran, false, lebarNilai));
      const tinggi = barisPer.reduce((t, b) => t + b.length * 16 + 6, 0) + 22;
      pastikanRuang(tinggi + 10);
      const atas = y; const bawahK = y - tinggi;
      ops.push(`${isi(W.tinta)} ${jalurBulat(TEPI + 3, bawahK - 4, LEBAR_ISI, tinggi, 14)} f`);
      ops.push(`${isi(W.kartu)} ${garis(W.tinta)} 1.6 w ${jalurBulat(TEPI, bawahK, LEBAR_ISI, tinggi, 14)} B`);
      const warnaTitik = [W.koral, W.kuning, W.mint, W.lavender];
      let yy = atas - 13;
      isian.forEach((r, i) => {
        yy -= 14;
        ops.push(`${isi(warnaTitik[i % 4])} ${lingkaran(TEPI + 20, yy + 4, 4.5)} f`);
        ops.push(T(r.label, TEPI + 32, yy, ukuran, 'F2', W.tinta));
        barisPer[i].forEach((b, j) => {
          if (j) yy -= 16;
          ops.push(T(b, TEPI + 32 + lebarLabel, yy, ukuran, 'F1', W.tinta));
        });
        yy -= 8;
      });
      y = bawahK - 22;
    }

    // Cerita anak di dalam gelembung bicara
    if (item.cerita && item.cerita.teks) {
      const ukuran = 12; const pad = 18;
      const baris = bungkus(item.cerita.teks, ukuran, false, LEBAR_ISI - 2 * pad - 50);
      let i = 0; let pertama = true;
      while (i < baris.length) {
        const ruang = Math.max(0, Math.floor((y - 60 - (pertama ? 46 : 26)) / 17));
        if (ruang < 2) { tutupHalaman(); halamanBaru(); continue; }
        const potong = baris.slice(i, i + ruang);
        const tinggi = potong.length * 17 + (pertama ? 46 : 26);
        const bx = TEPI + 50; const bw = LEBAR_ISI - 50; const by = y - tinggi;
        if (pertama) ops.push(maskot(TEPI - 6, y - 64, 0.38));
        ops.push(`${isi(W.tinta)} ${jalurBulat(bx + 3, by - 4, bw, tinggi, 16)} f`);
        ops.push(`${isi(W.koralMuda)} ${garis(W.tinta)} 1.6 w ${jalurBulat(bx, by, bw, tinggi, 16)} B`);
        if (pertama) {
          // ekor gelembung ke arah maskot
          ops.push(`${isi(W.koralMuda)} ${angka(bx + 1)} ${angka(y - 22)} m ${angka(bx - 14)} ${angka(y - 30)} l ${angka(bx + 1)} ${angka(y - 36)} l f`);
          ops.push(`${garis(W.tinta)} 1.6 w ${angka(bx)} ${angka(y - 22)} m ${angka(bx - 14)} ${angka(y - 30)} l ${angka(bx)} ${angka(y - 36)} l S`);
          ops.push(T(item.cerita.label || 'Cerita', bx + pad, y - 24, 12.5, 'F2', W.koral));
        } else {
          ops.push(T('(lanjutan)', bx + bw - pad - 52, by + 8, 9, 'F3', W.redup));
        }
        let yy = y - (pertama ? 42 : 22);
        for (const b of potong) { ops.push(T(b, bx + pad, yy, ukuran, 'F1', W.tinta)); yy -= 17; }
        y = by - 18;
        i += potong.length;
        pertama = false;
      }
    }

    // Catatan kecil (rekaman suara / video)
    if (item.catatan) {
      for (const b of bungkus(item.catatan, 10, false, LEBAR_ISI)) {
        pastikanRuang(16);
        y -= 14;
        ops.push(tengah(b, LEBAR_HAL / 2, y, 10, 'F3', W.redup));
      }
    }
    tutupHalaman();
  }

  // Objek halaman dan isinya.
  const idHalaman = halaman.map((h) => {
    const isiId = tambah([`<< /Length ${h.ops.length} >>\nstream\n${h.ops}\nendstream`]);
    const xobj = h.gambarId ? `/XObject << /Im1 ${h.gambarId} 0 R >>` : '';
    return tambah([
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LEBAR_HAL} ${TINGGI_HAL}] `
      + `/Resources << /Font << /F1 ${fontBiasa} 0 R /F2 ${fontTebal} 0 R /F3 ${fontMiring} 0 R >> ${xobj} >> /Contents ${isiId} 0 R >>`,
    ]);
  });
  objek[0] = ['<< /Type /Catalog /Pages 2 0 R >>'];
  objek[1] = [`<< /Type /Pages /Kids [${idHalaman.map((i) => `${i} 0 R`).join(' ')}] /Count ${idHalaman.length} >>`];
  const info = tambah(['<< /Producer (Amerta) /Creator (Amerta) >>']);

  // Susun file. Semua teks di atas ASCII murni, jadi panjang teks = jumlah byte.
  const bagian = [];
  let posisi = 0;
  const dorong = (b) => { bagian.push(b); posisi += typeof b === 'string' ? b.length : b.length; };
  dorong('%PDF-1.4\n');
  dorong(new Uint8Array([37, 226, 227, 207, 211, 10])); // penanda file biner
  const posisiObjek = [];
  objek.forEach((isi, i) => {
    posisiObjek.push(posisi);
    dorong(`${i + 1} 0 obj\n`);
    isi.forEach(dorong);
    dorong('\nendobj\n');
  });
  const posisiXref = posisi;
  let xref = `xref\n0 ${objek.length + 1}\n0000000000 65535 f \n`;
  posisiObjek.forEach((p) => { xref += `${String(p).padStart(10, '0')} 00000 n \n`; });
  dorong(xref);
  dorong(`trailer\n<< /Size ${objek.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${posisiXref}\n%%EOF\n`);
  return new Blob(bagian, { type: 'application/pdf' });
}
