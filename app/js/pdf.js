// Pembuat PDF sederhana, berjalan sepenuhnya di browser (tanpa server, tanpa library luar).
// Mendukung: foto JPEG, teks Helvetica (huruf Latin), pindah halaman otomatis.

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

/**
 * daftar: [{ gambar: { data: Uint8Array (JPEG), lebar, tinggi }, judul, subjudul,
 *            isian: [{ label, nilai, paragraf? }] }]
 * Satu karya dimulai di halaman baru. Hasil: Blob PDF.
 */
export function buatPdf(daftar, { kaki = 'Museum Karya Anak' } = {}) {
  const objek = [null, null]; // 1 = katalog, 2 = daftar halaman
  const tambah = (bagian) => { objek.push(bagian); return objek.length; };
  const fontBiasa = tambah(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']);
  const fontTebal = tambah(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']);
  const halaman = [];

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
    let y = TINGGI_HAL - TEPI;
    const tutupHalaman = () => {
      ops.push(`0.55 g BT /F1 8 Tf ${angka(TEPI)} ${angka(TEPI / 2)} Td ${hex(kaki)} Tj ET`);
      halaman.push({ ops: ops.join('\n'), gambarId });
      ops = [];
      y = TINGGI_HAL - TEPI;
    };
    const pastikanRuang = (tinggi) => {
      if (y - tinggi < TEPI) tutupHalaman();
    };
    const tulis = (teks, x, ukuran, tebal, abu) => {
      ops.push(`${abu} g BT /${tebal ? 'F2' : 'F1'} ${ukuran} Tf ${angka(x)} ${angka(y)} Td ${hex(teks)} Tj ET`);
    };

    if (item.gambar) {
      const g = item.gambar;
      const skala = Math.min(LEBAR_ISI / g.lebar, 440 / g.tinggi);
      const w = g.lebar * skala;
      const h = g.tinggi * skala;
      const x = (LEBAR_HAL - w) / 2;
      y -= h;
      ops.push(`q ${angka(w)} 0 0 ${angka(h)} ${angka(x)} ${angka(y)} cm /Im1 Do Q`);
      y -= 14;
    }

    for (const baris of bungkus(item.judul || '', 18, true, LEBAR_ISI)) {
      pastikanRuang(24);
      y -= 22;
      tulis(baris, TEPI, 18, true, '0.1');
    }
    if (item.subjudul) {
      for (const baris of bungkus(item.subjudul, 11, false, LEBAR_ISI)) {
        pastikanRuang(16);
        y -= 16;
        tulis(baris, TEPI, 11, false, '0.35');
      }
    }
    y -= 8;

    for (const { label, nilai, paragraf } of item.isian || []) {
      if (!nilai) continue;
      if (paragraf) {
        pastikanRuang(34);
        y -= 20;
        tulis(label, TEPI, 11, true, '0.15');
        for (const baris of bungkus(nilai, 11, false, LEBAR_ISI)) {
          pastikanRuang(16);
          y -= 15;
          tulis(baris, TEPI, 11, false, '0.15');
        }
        continue;
      }
      const teksLabel = `${label}: `;
      const lebarLabel = lebarTeks(teksLabel, 11, true);
      const barisNilai = bungkus(nilai, 11, false, LEBAR_ISI - lebarLabel, LEBAR_ISI);
      barisNilai.forEach((baris, i) => {
        pastikanRuang(16);
        y -= 16;
        if (i === 0) {
          tulis(teksLabel, TEPI, 11, true, '0.15');
          tulis(baris, TEPI + lebarLabel, 11, false, '0.15');
        } else {
          tulis(baris, TEPI, 11, false, '0.15');
        }
      });
    }
    tutupHalaman();
  }

  // Objek halaman dan isinya.
  const idHalaman = halaman.map((h) => {
    const isi = tambah([`<< /Length ${h.ops.length} >>\nstream\n${h.ops}\nendstream`]);
    const xobj = h.gambarId ? `/XObject << /Im1 ${h.gambarId} 0 R >>` : '';
    return tambah([
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LEBAR_HAL} ${TINGGI_HAL}] `
      + `/Resources << /Font << /F1 ${fontBiasa} 0 R /F2 ${fontTebal} 0 R >> ${xobj} >> /Contents ${isi} 0 R >>`,
    ]);
  });
  objek[0] = ['<< /Type /Catalog /Pages 2 0 R >>'];
  objek[1] = [`<< /Type /Pages /Kids [${idHalaman.map((i) => `${i} 0 R`).join(' ')}] /Count ${idHalaman.length} >>`];
  const info = tambah(['<< /Producer (Museum Karya Anak) /Creator (Museum Karya Anak) >>']);

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
