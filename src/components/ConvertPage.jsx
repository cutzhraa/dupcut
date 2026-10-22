import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ConvertPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [targetFormat, setTargetFormat] = useState('image/jpeg');
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageName(file.name);
      setSelectedImage(URL.createObjectURL(file));
      setConvertedUrl(null);
    }
  };

  const handleConvert = () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Beri background putih untuk format yang tidak mendukung transparansi (seperti JPEG / BMP)
      if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL(targetFormat, 0.9);
      setConvertedUrl(dataUrl);
      setIsProcessing(false);
    };
  };

  const getExtension = (mime) => {
    switch (mime) {
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      case 'image/bmp': return 'bmp';
      case 'image/gif': return 'gif';
      default: return 'jpg';
    }
  };

  return (
    <div>
      <main className="shell">
        <header className="topbar">
          <a className="brand" href="/app" aria-label="DupCut beranda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/images/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <span>dupcut</span>
          </a>
          <span className="privacy-pill"><span></span> Privat di perangkat kamu[cite: 6, 7]</span>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">KONVERTER FORMAT GAMBAR</p>
          <h1 id="page-title">Ubah format foto<br /><span>ke JPG, PNG, WebP, & lainnya.</span></h1>
          <p className="intro-copy">
            Konversi format gambar langsung di browser dengan cepat dan aman tanpa proses upload ke server.
          </p>
        </section>

        <section className="workspace" aria-label="Konverter Gambar">
          <div className="audio-picker audio-picker-wrap">
            <label className="picker-card rename-picker" htmlFor="convert-file-input">
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Pilih gambar</span>
              <span className="picker-hint">Pilih file foto yang ingin dikonversi</span>
              <span className="picker-action">Pilih gambar <span aria-hidden="true">→</span></span>
            </label>
            <input
              id="convert-file-input"
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {selectedImage && (
            <section className="rename-settings" style={{ marginTop: '28px' }}>
              <div className="preview-heading">
                <div>
                  <p className="eyebrow">PENGATURAN FORMAT</p>
                  <h2>{imageName}</h2>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  Pilih Format Tujuan:
                </label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #dcdfd8',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="image/jpeg">JPG / JPEG (Standar Universal)</option>
                  <option value="image/png">PNG (Mendukung Transparansi)</option>
                  <option value="image/webp">WebP (Optimal & Ukuran Kecil)</option>
                  <option value="image/bmp">BMP (Bitmap Tanpa Kompresi)</option>
                  <option value="image/gif">GIF (Grafik Animasi/Statis)</option>
                </select>
              </div>

              <button
                className="button button-primary rename-submit"
                type="button"
                style={{ marginTop: '20px', width: '100%' }}
                disabled={isProcessing}
                onClick={handleConvert}
              >
                {isProcessing ? 'Mengonversi...' : 'Konversi Sekarang'}
              </button>

              {convertedUrl && (
                <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '24px' }}>
                  <p className="eyebrow" style={{ marginBottom: '12px' }}>HASIL KONVERSI</p>
                  <div style={{ 
                    background: '#f5f7f3', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={convertedUrl}
                      alt="Converted"
                      style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                    />
                  </div>
                  
                  {/* Di-center menggunakan flexbox */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <a
                      href={convertedUrl}
                      download={`dupcut-converted.${getExtension(targetFormat)}`}
                      className="button button-primary"
                      style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '12px 24px' }}
                    >
                      Download File Hasil Konversi ↓
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}
        </section>

        <footer className="footnotes">
          <div className="footnote">
            <span className="footnote-number">01</span>
            <p><strong>Cepat & Lokal</strong><br />Diproses instan di dalam browser.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">02</span>
            <p><strong>Privasi Penuh</strong><br />File tidak diunggah ke internet.</p>
          </div>
        </footer>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand-info">
              <a href="/app" className="footer-logo">
                <span className="footer-logo-mark">d.</span>
                <span>dupcut</span>
              </a>
              <p className="footer-desc">
                Aplikasi pengelola dan pembersih file lokal yang aman, cepat, dan menjaga privasi data perangkatmu sepenuhnya.
              </p>
            </div>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-bottom">
            <p className="footer-copyright">© 2026 DupCut. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}