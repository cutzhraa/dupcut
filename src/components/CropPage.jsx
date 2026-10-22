import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function CropPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [aspectRatio, setAspectRatio] = useState('free');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const imageRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageName(file.name);
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setMessage({ text: '', type: '' });
    }
  };

  const getCssAspectRatio = () => {
    switch (aspectRatio) {
      case '1:1': return '1 / 1';
      case '1:2': return '1 / 2';
      case '2:3': return '2 / 3';
      case '3:2': return '3 / 2';
      case '4:3': return '4 / 3';
      case '3:4': return '3 / 4';
      case '16:9': return '16 / 9';
      case '9:16': return '9 / 16';
      case '21:9': return '21 / 9';
      case '3x4': return '3 / 4';
      case '4x6': return '4 / 6';
      case '2x3': return '2 / 3';
      default: return 'auto';
    }
  };

  const handleSaveCrop = async () => {
    if (!imageRef.current) return;

    try {
      setIsProcessing(true);
      setMessage({ text: '', type: '' });

      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (aspectRatio === '1:1') {
        const minDim = Math.min(width, height);
        width = minDim;
        height = minDim;
      } else if (aspectRatio === '16:9') {
        if (width / height > 16 / 9) {
          width = height * (16 / 9);
        } else {
          height = width / (16 / 9);
        }
      } else if (aspectRatio === '3:4' || aspectRatio === '3x4') {
        if (width / height > 3 / 4) {
          width = height * (3 / 4);
        } else {
          height = width / (3 / 4);
        }
      } else if (aspectRatio === '4x6') {
        if (width / height > 4 / 6) {
          width = height * (4 / 6);
        } else {
          height = width / (4 / 6);
        }
      }

      canvas.width = width;
      canvas.height = height;

      const startX = (img.naturalWidth - width) / 2;
      const startY = (img.naturalHeight - height) / 2;

      ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setMessage({ text: 'Gagal memproses gambar.', type: 'message-error' });
          return;
        }

        const newFileName = `cropped_${aspectRatio.replace(':', '_')}_${imageName}`;

        if (typeof window.showDirectoryPicker === 'function') {
          try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            const croppedDirHandle = await dirHandle.directoryHandle('CroppedImages', { create: true });
            const fileHandle = await croppedDirHandle.getFileHandle(newFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await blob.stream().pipeTo(writable);

            setIsProcessing(false);
            setMessage({
              text: `Berhasil! Gambar disimpan ke subfolder "CroppedImages".`,
              type: 'message-success'
            });
            return;
          } catch (err) {
            if (err.name === 'AbortError') {
              setIsProcessing(false);
              return;
            }
          }
        }

        // Fallback unduh otomatis jika browser tidak mendukung picker folder
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = newFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsProcessing(false);
        setMessage({
          text: `Berhasil! Gambar diunduh sebagai ${newFileName}.`,
          type: 'message-success'
        });
      }, 'image/png');

    } catch (err) {
      setIsProcessing(false);
      setMessage({ text: `Terjadi kesalahan: ${err.message}`, type: 'message-error' });
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
          <p className="eyebrow">CROP GAMBAR & PASFOTO</p>
          <h1 id="page-title">Potong foto dengan mudah,<br /><span>bebas pilih ukuran & rasio.</span></h1>
          <p className="intro-copy">
            Pilih gambar, tentukan kategori rasio yang diinginkan, lalu simpan hasilnya secara instan di browser.
          </p>
        </section>

        <section className="workspace" aria-label="Pengaturan crop image">
          <div className="audio-picker audio-picker-wrap">
            <label className="picker-card rename-picker" htmlFor="crop-file-input">
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Pilih gambar</span>
              <span className="picker-hint">Mendukung format JPG, PNG, atau WebP</span>
              <span className="picker-action">Pilih gambar <span aria-hidden="true">→</span></span>
            </label>
            <input
              id="crop-file-input"
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {selectedImage && (
            <section className="rename-settings" style={{ marginTop: '28px' }}>
              <div className="settings-heading">
                <p className="eyebrow">PILIH UKURAN / RASIO</p>
                <h2>Atur format potongan gambar</h2>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label className="field-label" htmlFor="aspect-select">
                  Pilih Rasio / Ukuran
                  <select
                    id="aspect-select"
                    className="text-input"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="free">Bebas (Freeform)</option>
                    <optgroup label="Persegi & Vertikal">
                      <option value="1:1">Persegi / Square (1:1)</option>
                      <option value="3:4">Vertikal Standar (3:4)</option>
                      <option value="2:3">Vertikal Klasik (2:3)</option>
                      <option value="1:2">Vertikal Panjang (1:2)</option>
                    </optgroup>
                    <optgroup label="Lanskap & Horizontal">
                      <option value="4:3">Lanskap Standar (4:3)</option>
                      <option value="3:2">Lanskap Klasik / Kamera (3:2)</option>
                      <option value="16:9">Lanskap / Banner / YouTube (16:9)</option>
                      <option value="21:9">Ultrawide / Sinematik (21:9)</option>
                    </optgroup>
                    <optgroup label="Media Sosial Vertikal (Story / Reels)">
                      <option value="9:16">Story / Reels / TikTok (9:16)</option>
                    </optgroup>
                    <optgroup label="Pasfoto Resmi">
                      <option value="3x4">Pasfoto 3x4</option>
                      <option value="4x6">Pasfoto 4x6</option>
                      <option value="2x3">Pasfoto 2x3</option>
                    </optgroup>
                  </select>
                </label>
              </div>

              <div className="preview-heading" style={{ marginTop: '24px' }}>
                <div>
                  <p className="eyebrow">PRATINJAU</p>
                  <h2>{imageName}</h2>
                </div>
                <span className="preview-count">Format: {aspectRatio.toUpperCase()}</span>
              </div>

              <div style={{ 
                marginTop: '12px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: '#f5f7f3', 
                padding: '16px', 
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '320px',
                  aspectRatio: getCssAspectRatio(),
                  transition: 'all 0.3s ease',
                  border: '2px dashed var(--green, #285943)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt="Preview Crop"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              </div>

              <button
                className="button button-primary rename-submit"
                type="button"
                style={{ marginTop: '20px' }}
                disabled={isProcessing}
                onClick={handleSaveCrop}
              >
                {isProcessing ? 'Memproses dan Menyimpan...' : 'Simpan Hasil Crop'}
              </button>

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
            <p><strong>Hasil Tajam</strong><br />Kualitas gambar asli dipertahankan.</p>
          </div>
        </footer>
      </main>

      {/* Footer Gelap Full-Width (Di luar main shell agar melebar penuh) */}
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
                {/* Instagram */}
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="Instagram">
                  <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                {/* TikTok */}
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="TikTok">
                  <svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                </a>
                {/* Facebook */}
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="Facebook">
                  <svg viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.37 14.5 5 15.5 5H18V0h-3.808C10.59 0 9 1.581 9 4.615V8z"/></svg>
                </a>
                {/* GitHub */}
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="GitHub">
                  <svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                {/* WhatsApp */}
                <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="WhatsApp">
                  <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
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