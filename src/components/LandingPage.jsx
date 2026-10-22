import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Pengguna menyetujui instalasi PWA');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  return (
    <div>
      <main className="shell">
        <header className="topbar">
            <a className="brand" href="/" aria-label="DupCut beranda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <img src="/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>dupcut</span>
            </a>
            <span className="privacy-pill"><span></span> Privat di perangkat kamu</span>
        </header>

        <section className="intro" aria-labelledby="page-title" style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <p className="eyebrow">APLIKASI UTILITY & MEDIA LOKAL</p>
          <h1 id="page-title" style={{ fontSize: '2.5rem', lineHeight: '1.2', marginTop: '10px' }}>
            Kelola, Bersihkan, & Edit File<br />
            <span>Tanpa Upload ke Server.</span>
          </h1>
          <p className="intro-copy" style={{ maxWidth: '600px', margin: '20px auto 0' }}>
            DupCut adalah alat pengelola file dan foto lokal yang aman, super cepat, dan menjaga privasi data perangkatmu sepenuhnya tanpa koneksi ke cloud.
          </p>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link 
              to="/app" 
              className="button button-primary" 
              style={{ textDecoration: 'none', display: 'inline-block', padding: '14px 32px', fontSize: '1rem', borderRadius: '8px' }}
            >
              Mulai Gunakan Aplikasi <span aria-hidden="true">→</span>
            </Link>

            {showInstallBtn && (
              <button 
                onClick={handleInstallClick}
                className="button"
                style={{ 
                  background: '#121814', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '14px 24px', 
                  fontSize: '1rem', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                📱 Install ke HP
              </button>
            )}
          </div>
        </section>

        <section className="workspace" aria-label="Fitur Unggulan" style={{ marginTop: '30px' }}>
          <div className="picker-grid">
            <div className="picker-card" style={{ cursor: 'default' }}>
              <span className="picker-icon" aria-hidden="true">📂</span>
              <span className="picker-title">Pilah File & Duplikat</span>
              <span className="picker-hint">Pindai file identik & foto serupa, pertahankan resolusi tertinggi secara otomatis.</span>
            </div>
            <div className="picker-card" style={{ cursor: 'default' }}>
              <span className="picker-icon" aria-hidden="true">✏️</span>
              <span className="picker-title">Rename & Crop Cepat</span>
              <span className="picker-hint">Ubah nama file secara massal dan potong foto langsung di browser dengan mudah.</span>
            </div>
            <div className="picker-card" style={{ cursor: 'default' }}>
              <span className="picker-icon" aria-hidden="true">📁</span>
              <span className="picker-title">Kategori Otomatis</span>
              <span className="picker-hint">Pisahkan file berantakan ke folder khusus berdasarkan jenisnya secara instan.</span>
            </div>
            <div className="picker-card" style={{ cursor: 'default' }}>
              <span className="picker-icon" aria-hidden="true">🖼️</span>
              <span className="picker-title">Hapus Background & Lainnya</span>
              <span className="picker-hint">Hapus latar belakang foto transparan dan akses berbagai fitur kreatif tambahan.</span>
            </div>
          </div>
        </section>

        <footer className="footnotes" style={{ marginTop: '40px' }}>
          <div className="footnote">
            <span className="footnote-number">01</span>
            <p><strong>Aman & Privat</strong><br />File diproses murni di perangkat kamu.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">02</span>
            <p><strong>Tanpa Install</strong><br />Berjalan mulus langsung di browser.</p>
          </div>
        </footer>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand-info">
              <a href="/" className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <img src="/dupcut.png" alt="DupCut Logo" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
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