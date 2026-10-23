# DupCut

DupCut adalah aplikasi web untuk membantu merapikan dan mengolah file langsung dari browser.

**Demo:** [dupcut.vercel.app](https://dupcut.vercel.app)

## Fitur

- **Pilah file:** Pindai file identik dan foto yang mirip.
- **Rename:** Ubah nama banyak file sekaligus dengan pratinjau.
- **Crop gambar:** Potong gambar dengan rasio yang tersedia.
- **Kategori:** Kelompokkan file ke folder berdasarkan jenisnya.
- **Hapus background:** Hapus latar gambar, lalu pilih warna atau gambar untuk latar baru.
- **Konversi gambar:** Ubah gambar ke format lain yang didukung aplikasi.

## Privasi

File diproses di browser pada perangkat pengguna. Fitur hapus background dapat mengunduh model pemrosesan saat pertama kali digunakan; model tersebut digunakan di browser.

## Menjalankan secara lokal

Pastikan Node.js dan npm sudah terpasang.

```bash
git clone https://github.com/cutzhraa/dupcut.git
cd dupcut
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite di terminal.

Untuk membuat dan melihat build produksi:

```bash
npm run build
npm run preview
```

## Teknologi

- React
- Vite
- React Router
- hash-wasm untuk pemeriksaan file
- @imgly/background-removal untuk penghapusan background
- Canvas dan Web APIs untuk pemrosesan di browser
