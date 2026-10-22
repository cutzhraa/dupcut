# DupCut ✂️📂

DupCut adalah aplikasi utilitas file dan media lokal berbasis web yang dirancang untuk membantu pengguna mengelola, merapikan, memindai duplikat, mengubah nama file secara massal, memotong foto, hingga mengonversi format gambar dengan **100% privasi terjaga** langsung di dalam perangkat (tanpa upload ke server/cloud).

## 🚀 Fitur Utama

- **Pilah File & Duplikat (Duplicate Finder):** Memindai file identik dan foto serupa menggunakan algoritma *pHash* & *BK-Tree*, secara otomatis mempertahankan versi resolusi tertinggi.
- **Rename File Fleksibel:** Mengubah nama file secara massal (berurutan atau berbasis nama folder) maupun secara manual satu per satu sesuai keinginan.
- **Konverter Format Gambar:** Mengubah format gambar antar format populer (JPG, PNG, WebP, BMP, GIF) secara instan di browser.
- **Crop & Utilitas Lainnya:** Memotong foto dan menghapus latar belakang langsung secara lokal.
- **100% Privat & Aman:** Semua proses berjalan murni di dalam *browser* menggunakan JavaScript & Web APIs, file kamu tidak pernah dikirim ke server luar.

## 🛠️ Teknologi yang Digunakan

- **Frontend:** React.js, React Router, Vite, Tailwind CSS / Custom CSS.
- **Pemrosesan File & Kriptografi:** `hash-wasm` (SHA-256), HTML5 Canvas API, File System Access API.
- **Deployment & PWA:** Vercel & Progressive Web App (PWA) ready (bisa diinstal sebagai aplikasi atau di-build ke `.apk`).

## 📦 Menjalankan Proyek Secara Lokal

1. Clone repositori ini:
   ```bash
   git clone [https://github.com/username/dupcut.git](https://github.com/username/dupcut.git)

## Masuk ke direktori proyek:

Bash
cd dupcut
Install dependensi:

Bash
npm install
Jalankan server development:

Bash
npm run dev

🌐 Live Demo Akses aplikasi secara langsung melalui: [https://dupcut.vercel.app](https://dupcut.vercel.app)

© 2026 DupCut.