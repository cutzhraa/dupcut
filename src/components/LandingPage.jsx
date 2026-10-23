import SocialLinks from './SocialLinks';
import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div>
      <main className="shell">
        <header className="topbar">
            <a className="brand" href="/" aria-label="DupCut beranda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <img src="/images/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>dupcut</span>
            </a>
            <span className="privacy-pill"><span></span> Privat di perangkat kamu</span>
        </header>

        <section className="intro" aria-labelledby="page-title" style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <p className="eyebrow">APLIKASI PENGELOLA FILE & MEDIA</p>
          <h1 id="page-title" style={{ fontSize: '2.5rem', lineHeight: '1.2', marginTop: '10px' }}>
            Kelola, Bersihkan, & Edit File<br />
            <span>Tanpa Upload ke Server.</span>
          </h1>
          <p className="intro-copy" style={{ maxWidth: '600px', margin: '20px auto 0' }}>
            DupCut membantu merapikan file dan foto: cari duplikat, kelompokkan file ke folder, ubah nama, crop, konversi gambar, dan hapus background langsung di browser.
          </p>

          <div style={{ marginTop: '32px' }}>
            <Link 
              to="/app" 
              className="button button-primary" 
              style={{ textDecoration: 'none', display: 'inline-block', padding: '14px 32px', fontSize: '1rem', borderRadius: '8px' }}
            >
              Mulai Gunakan Aplikasi <span aria-hidden="true">→</span>
            </Link>
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
              <a href="/" className="footer-logo">
                <img className="footer-logo-mark" src="/dupcut.png" alt="" />
                <span>dupcut</span>
              </a>
              <p className="footer-desc">
                Aplikasi pengelola dan pembersih file lokal yang aman, cepat, dan menjaga privasi data perangkatmu sepenuhnya.
              </p>
            </div>
            
            <SocialLinks />
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
