import SocialLinks from './SocialLinks';
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
            const croppedDirHandle = await dirHandle.getDirectoryHandle('CroppedImages', { create: true });
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
          <span className="privacy-pill"><span></span> Privat di perangkat kamu</span>
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
