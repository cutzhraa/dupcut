import SocialLinks from './SocialLinks';
import { useEffect, useState } from 'react';

export default function ConvertPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [targetFormat, setTargetFormat] = useState('image/jpeg');
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionError, setConversionError] = useState('');

  useEffect(() => () => {
    if (downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  useEffect(() => () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
  }, [selectedImage]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageName(file.name);
      setSelectedImage(URL.createObjectURL(file));
      setConvertedUrl(null);
      setDownloadUrl(null);
      setConversionError('');
    }
  };

  const blobFromCanvas = (canvas, type = 'image/png') => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal membuat gambar.'));
    }, type);
  });

  const createIco = async (image) => {
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngs = await Promise.all(sizes.map(async (size) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas tidak tersedia di browser ini.');
      const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      return blobFromCanvas(canvas);
    }));

    const headerSize = 6 + sizes.length * 16;
    const totalSize = pngs.reduce((total, blob) => total + blob.size, headerSize);
    const output = new Uint8Array(totalSize);
    const view = new DataView(output.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, sizes.length, true);
    let offset = headerSize;
    pngs.forEach((blob, index) => {
      const entry = 6 + index * 16;
      const size = sizes[index];
      output[entry] = size === 256 ? 0 : size;
      output[entry + 1] = size === 256 ? 0 : size;
      output[entry + 2] = 0;
      output[entry + 3] = 0;
      view.setUint16(entry + 4, 1, true);
      view.setUint16(entry + 6, 32, true);
      view.setUint32(entry + 8, blob.size, true);
      view.setUint32(entry + 12, offset, true);
      offset += blob.size;
    });
    let dataOffset = headerSize;
    for (const png of pngs) {
      output.set(new Uint8Array(await png.arrayBuffer()), dataOffset);
      dataOffset += png.size;
    }
    return new Blob([output], { type: 'image/x-icon' });
  };

  const handleConvert = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setConversionError('');

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Gambar tidak dapat dibuka.'));
        img.src = selectedImage;
      });
      if (targetFormat === 'image/x-icon') {
        const icoBlob = await createIco(img);
        const icoUrl = URL.createObjectURL(icoBlob);
        setConvertedUrl(selectedImage);
        setDownloadUrl(icoUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak tersedia di browser ini.');
      
      // Beri background putih untuk format yang tidak mendukung transparansi (seperti JPEG / BMP)
      if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      if (targetFormat === 'image/svg+xml') {
        const pngData = canvas.toDataURL('image/png');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image width="${canvas.width}" height="${canvas.height}" href="${pngData}" xlink:href="${pngData}" /></svg>`;
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        setConvertedUrl(pngData);
        setDownloadUrl(svgUrl);
        return;
      }
      
      const dataUrl = canvas.toDataURL(targetFormat, 0.9);
      setConvertedUrl(dataUrl);
      setDownloadUrl(dataUrl);
    } catch (error) {
      setConversionError(`Konversi gagal: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getExtension = (mime) => {
    switch (mime) {
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      case 'image/bmp': return 'bmp';
      case 'image/gif': return 'gif';
      case 'image/x-icon': return 'ico';
      case 'image/svg+xml': return 'svg';
      default: return 'jpg';
    }
  };

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
                  <option value="image/x-icon">ICO (Ikon multi-ukuran)</option>
                  <option value="image/svg+xml">SVG (Vektor dengan gambar tertanam)</option>
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

              {conversionError && <p className="message message-error" role="alert">{conversionError}</p>}

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
                      href={downloadUrl}
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
              <div className="footer-logo">
                <img className="footer-logo-mark" src="/dupcut.png" alt="" />
                <span>dupcut</span>
              </div>
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
