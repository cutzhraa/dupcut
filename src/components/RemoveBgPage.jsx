import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { removeBackground } from '@imgly/background-removal';

export default function RemoveBgPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [processedUrl, setProcessedUrl] = useState(null);
  const [backgroundMode, setBackgroundMode] = useState('transparent');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(null);
  const [compositeUrl, setCompositeUrl] = useState(null);
  const compositeUrlRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (compositeUrlRef.current) {
      URL.revokeObjectURL(compositeUrlRef.current);
      compositeUrlRef.current = null;
    }
    setCompositeUrl(null);
    if (!processedUrl || backgroundMode === 'transparent' || (backgroundMode === 'image' && !customBackgroundUrl)) return undefined;

    let cancelled = false;
    const renderComposite = async () => {
      try {
        const subject = new Image();
        subject.src = processedUrl;
        await subject.decode();
        const canvas = document.createElement('canvas');
        canvas.width = subject.naturalWidth;
        canvas.height = subject.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas tidak tersedia');

        if (backgroundMode === 'color') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          const background = new Image();
          background.src = customBackgroundUrl;
          await background.decode();
          const scale = Math.max(canvas.width / background.naturalWidth, canvas.height / background.naturalHeight);
          const width = background.naturalWidth * scale;
          const height = background.naturalHeight * scale;
          ctx.drawImage(background, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        }

        ctx.drawImage(subject, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Gagal membuat gambar')), 'image/png');
        });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        compositeUrlRef.current = url;
        setCompositeUrl(url);
      } catch {
        if (!cancelled) setMessage({ text: 'Gagal membuat pratinjau background. Coba pilih gambar lain.', type: 'message-error' });
      }
    };

    renderComposite();
    return () => { cancelled = true; };
  }, [processedUrl, backgroundMode, backgroundColor, customBackgroundUrl]);

  useEffect(() => () => {
    if (compositeUrlRef.current) URL.revokeObjectURL(compositeUrlRef.current);
    if (customBackgroundUrl) URL.revokeObjectURL(customBackgroundUrl);
  }, [customBackgroundUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageName(file.name);
      setSelectedImage(URL.createObjectURL(file));
      setProcessedUrl(null);
      setBackgroundMode('transparent');
      setCustomBackgroundUrl(null);
      setProcessingStatus('');
      setMessage({ text: '', type: '' });
    }
  };

  const handleBackgroundImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomBackgroundUrl(URL.createObjectURL(file));
    setBackgroundMode('image');
    e.target.value = '';
  };

  const handleRemoveBg = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setProcessingStatus('Menyiapkan model penghapus background...');
    setMessage({ text: '', type: '' });
    try {
      // Model mengenali subjek dan memisahkannya dari latar tanpa bergantung pada warna tertentu.
      const result = await removeBackground(selectedImage, {
        progress: (key, current, total) => {
          const percent = total > 0 ? Math.round((current / total) * 100) : 0;
          const assetName = key.split('/').filter(Boolean).pop() || 'aset model';
          setProcessingStatus(`Memuat ${assetName}: ${percent}%`);
        }
      });
      setProcessedUrl(URL.createObjectURL(result));
      setIsProcessing(false);
      setProcessingStatus('');
      setMessage({
        text: 'Berhasil! Latar belakang berhasil dibersihkan. Silakan pratinjau hasilnya.',
        type: 'message-success'
      });
    } catch (error) {
      console.error('Gagal menghapus background:', error);
      setIsProcessing(false);
      setProcessingStatus('');
      setMessage({
        text: 'Proses gagal. Pastikan koneksi internet tersedia untuk memuat model, lalu coba lagi.',
        type: 'message-error'
      });
    }
  };

  return (
    <div>
      <main className="shell">
        <header className="topbar">
          <a className="brand" href="/app" aria-label="DupCut beranda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <span>dupcut</span>
          </a>
          <span className="privacy-pill"><span></span> Privat di perangkat kamu</span>
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
                  <p className="eyebrow">{processedUrl ? `PRATINJAU HASIL (${backgroundMode === 'transparent' ? 'TRANSPARAN' : 'DENGAN BACKGROUND'})` : 'GAMBAR ASLI'}</p>
                  <h2>{imageName}</h2>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: processedUrl && backgroundMode === 'transparent'
                  ? 'repeating-conic-gradient(#e1e4e8 0% 25%, #f5f7f3 0% 50%) 50% / 20px 20px' 
                  : '#f5f7f3', 
                padding: '16px', 
                borderRadius: '8px',
                overflow: 'hidden',
                minHeight: '220px',
                border: '1px solid #e1e4e8'
              }}>
                <img
                  src={compositeUrl || processedUrl || selectedImage}
                  alt="Preview Remove BG"
                  style={{
                    maxHeight: '280px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: '6px'
                  }}
                />
              </div>

              {!processedUrl ? (
                <>
                <button
                  className="button button-primary rename-submit"
                  type="button"
                  style={{ marginTop: '20px', width: '100%', textAlign: 'center', display: 'block', boxSizing: 'border-box' }}
                  disabled={isProcessing}
                  onClick={handleRemoveBg}
                >
                  {isProcessing ? 'Memproses Penghapusan BG...' : 'Hapus Background Sekarang'}
                </button>
                {isProcessing && (
                  <p className="message message-info" role="status" style={{ marginTop: '12px', textAlign: 'center' }}>
                    {processingStatus || 'Sedang memisahkan subjek dari background. Proses pertama bisa memerlukan waktu lebih lama.'}
                  </p>
                )}
                </>
              ) : (
                <>
                <section aria-label="Pilih background hasil" style={{ marginTop: '20px', padding: '16px', border: '1px solid #e1e4e8', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Pilih background</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {[
                      ['transparent', 'Transparan'],
                      ['color', 'Pilih warna'],
                      ['image', 'Pilih gambar']
                    ].map(([mode, label]) => (
                      <button key={mode} type="button" className={backgroundMode === mode ? 'button button-primary' : 'button'} onClick={() => setBackgroundMode(mode)} aria-pressed={backgroundMode === mode}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {backgroundMode === 'color' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      Warna latar
                      <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} aria-label="Pilih warna background" />
                      <span>{backgroundColor.toUpperCase()}</span>
                    </label>
                  )}
                  {backgroundMode === 'image' && (
                    <div>
                      <label className="button" htmlFor="removebg-background-input" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        {customBackgroundUrl ? 'Ganti gambar background' : 'Unggah gambar background'}
                      </label>
                      <input id="removebg-background-input" className="visually-hidden" type="file" accept="image/*" onChange={handleBackgroundImageChange} />
                      {customBackgroundUrl && <span style={{ marginLeft: '10px', fontSize: '13px' }}>Gambar background siap</span>}
                    </div>
                  )}
                </section>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex' }}>
                    <a
                      href={backgroundMode === 'transparent' ? processedUrl : compositeUrl || undefined}
                      download={backgroundMode === 'transparent' ? `no-bg-${imageName.replace(/\.[^/.]+$/, "")}.png` : `hasil-${imageName.replace(/\.[^/.]+$/, "")}.png`}
                      className="button button-primary rename-submit"
                      aria-disabled={backgroundMode !== 'transparent' && !compositeUrl}
                      onClick={(e) => { if (backgroundMode !== 'transparent' && !compositeUrl) e.preventDefault(); }}
                      style={{ 
                        width: '100%', 
                        margin: 0, 
                        textDecoration: 'none', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        textAlign: 'center'
                      }}
                    >
                      Simpan Gambar Transparan ↓
                    </a>
                  </div>
                  <button
                    className="button"
                    type="button"
                    style={{ background: '#e1e4e8', color: '#1a1a1a', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, height: '48px' }}
                    onClick={() => { setSelectedImage(null); setProcessedUrl(null); setBackgroundMode('transparent'); setCustomBackgroundUrl(null); setMessage({ text: '', type: '' }); }}
                  >
                    Pilih Lain
                  </button>
                </div>
                </>
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
