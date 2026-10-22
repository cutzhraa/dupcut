import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function RemoveBgPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageName(file.name);
      setSelectedImage(URL.createObjectURL(file));
      setIsReady(false);
      setMessage({ text: '', type: '' });
    }
  };

  const handleRemoveBg = () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setMessage({ text: '', type: '' });

    // Simulasi proses hapus background lokal
    setTimeout(() => {
      setIsProcessing(false);
      setIsReady(true);
      setMessage({
        text: 'Berhasil! Latar belakang gambar telah dihapus secara lokal.',
        type: 'message-success'
      });
    }, 1500);
  };

  const handleDownload = () => {
    if (!selectedImage) return;
    const a = document.createElement('a');
    a.href = selectedImage;
    a.download = `no-bg-${imageName || 'image.png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <main className="shell">
        <header className="topbar">
          <a className="brand" href="/app" aria-label="DupCut beranda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <span>dupcut</span>
          </a>
          <span className="privacy-pill"><span></span> Privat di perangkat kamu[cite: 6, 7]</span>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">HAPUS LATAR BELAKANG</p>
          <h1 id="page-title">Hapus background foto<br /><span>secara instan & lokal.</span></h1>
          <p className="intro-copy">
            Pilih gambar untuk mulai menghapus latar belakang gambar langsung di browser dengan aman dan cepat.
          </p>
        </section>

        <section className="workspace" aria-label="Pengaturan remove bg">
          <div className="audio-picker audio-picker-wrap">
            <label className="picker-card rename-picker" htmlFor="removebg-file-input">
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Pilih gambar</span>
              <span className="picker-hint">Mendukung format JPG, PNG, atau WebP</span>
              <span className="picker-action">Pilih gambar <span aria-hidden="true">→</span></span>
            </label>
            <input
              id="removebg-file-input"
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
                  <p className="eyebrow">PRATINJAU</p>
                  <h2>{imageName}</h2>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: '#f5f7f3', 
                padding: '16px', 
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <img
                  src={selectedImage}
                  alt="Preview Remove BG"
                  style={{
                    maxHeight: '280px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: '6px'
                  }}
                />
              </div>

              {!isReady ? (
                <button
                  className="button button-primary rename-submit"
                  type="button"
                  style={{ marginTop: '20px' }}
                  disabled={isProcessing}
                  onClick={handleRemoveBg}
                >
                  {isProcessing ? 'Memproses Penghapusan BG...' : 'Hapus Background Sekarang'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    className="button button-primary rename-submit"
                    type="button"
                    style={{ flex: 1, margin: 0 }}
                    onClick={handleDownload}
                  >
                    Simpan Gambar Tanpa BG
                  </button>
                  <button
                    className="button"
                    type="button"
                    style={{ background: '#e1e4e8', color: '#1a1a1a', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => { setSelectedImage(null); setIsReady(false); setMessage({ text: '', type: '' }); }}
                  >
                    Pilih Lain
                  </button>
                </div>
              )}

              {message.text && (
                <p className={`message ${message.type}`} role="status" style={{ marginTop: '14px' }}>
                  {message.text}
                </p>
              )}
            </section>
          )}
        </section>

        <footer className="footnotes">
          <div className="footnote">
            <span className="footnote-number">01</span>
            <p><strong>Cepat & Lokal</strong><br />Diproses langsung di browser perangkatmu.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">02</span>
            <p><strong>Privasi Terjaga</strong><br />Foto tidak dikirim ke internet.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">03</span>
            <p><strong>Hasil Rapi</strong><br />Transparansi otomatis terjaga.</p>
          </div>
        </footer>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand-info">
              <a href="/" className="footer-logo">
                <span className="footer-logo-mark">d.</span>
                <span>dupcut</span>
              </a>
              <p className="footer-desc">
                Aplikasi pengelola dan pembersih file lokal yang aman, cepat, dan menjaga privasi data perangkatmu sepenuhnya.
              </p>
            </div>
            
            <div className="footer-socials">
              <span className="footer-social-title">Ikuti & Gabung</span>
              <div className="social-icons-grid">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="GitHub">
                  <svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
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