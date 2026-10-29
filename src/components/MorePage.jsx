import SocialLinks from './SocialLinks';
import React from 'react';
import { Link } from 'react-router-dom';

export default function MorePage() {
  return (
    <div>
      <main className="shell">
        <header className="topbar">
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <span>dupcut</span>
          </div>
          <span className="privacy-pill"><span></span> Privat di perangkat kamu</span>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">MENU LAINNYA & FITUR TAMBAHAN</p>
          <h1 id="page-title">Pilih alat kreatifmu,<br /><span>semua berjalan lokal.</span></h1>
          <p className="intro-copy">
            Akses berbagai fitur ekstra mulai dari penghapus latar belakang, kamera khusus, hingga pembuat grid foto estetik gaya photobox.
          </p>
        </section>

        <section className="workspace" aria-label="Daftar Fitur Tambahan">
          <div className="picker-grid">
            
            {/* 1. Menu Hapus Background */}
            <Link to="/remove-bg" className="picker-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Hapus Background</span>
              <span className="picker-hint">Hapus latar belakang foto secara instan & transparan</span>
              <span className="picker-action">Buka menu <span aria-hidden="true">→</span></span>
            </Link>

            {/* 2. Menu Kamera Estetik (Segera Hadir) */}
            <Link to="/more" onClick={(e) => { e.preventDefault(); alert('Fitur Kamera Estetik segera hadir!'); }} className="picker-card" style={{ textDecoration: 'none', color: 'inherit', opacity: 0.85 }}>
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Kamera Estetik</span>
              <span className="picker-hint">Ambil foto dengan filter dan efek kamera pilihan</span>
              <span className="picker-action">Segera hadir <span aria-hidden="true">⏳</span></span>
            </Link>

            {/* Scrapbook page generator */}
            <Link to="/scrapbook" className="picker-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="picker-icon folder-icon" aria-hidden="true">✂</span>
              <span className="picker-title">Scrapbook Foto</span>
              <span className="picker-hint">Unggah foto dan rangkai jadi halaman kenangan estetik</span>
              <span className="picker-action">Mulai merangkai <span aria-hidden="true">→</span></span>
            </Link>

            <Link to="/convert" className="picker-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
                <span className="picker-title">Konversi Format Gambar</span>
                <span className="picker-hint">Ubah format gambar antar JPG, PNG, dan WebP dengan mudah</span>
                <span className="picker-action">Buka menu <span aria-hidden="true">→</span></span>
            </Link>

            <Link to="/mockup" className="picker-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="picker-icon folder-icon" aria-hidden="true">▣</span>
              <span className="picker-title">Mockup Frame Generator</span>
              <span className="picker-hint">Bingkai screenshot atau kode dalam jendela browser estetik</span>
              <span className="picker-action">Buka menu <span aria-hidden="true">→</span></span>
            </Link>

            <Link to="/carousel-grid" className="picker-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="picker-icon folder-icon" aria-hidden="true">▦</span>
              <span className="picker-title">Auto Carousel & Grid</span>
              <span className="picker-hint">Gabungkan hingga 8 foto menjadi kolase PNG estetik</span>
              <span className="picker-action">Buka menu <span aria-hidden="true">→</span></span>
            </Link>

            <Link to="/upscale" className="picker-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="picker-icon folder-icon" aria-hidden="true">↗</span>
              <span className="picker-title">Pertajam Foto & HD</span>
              <span className="picker-hint">Kurangi kesan blur, tajamkan detail, dan tingkatkan resolusi</span>
              <span className="picker-action">Buka menu <span aria-hidden="true">→</span></span>
            </Link>

          </div>
        </section>

        <footer className="footnotes">
          <div className="footnote">
            <span className="footnote-number">01</span>
            <p><strong>100% Lokal</strong><br />Semua pemrosesan foto aman di perangkatmu.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">02</span>
            <p><strong>Terus Diupdate</strong><br />Fitur-fitur menarik lainnya akan segera dirilis.</p>
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
