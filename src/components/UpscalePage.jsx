import { useEffect, useRef, useState } from 'react';
import SocialLinks from './SocialLinks';

const MAX_OUTPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_DIMENSION = 12_000;

export default function UpscalePage() {
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [scale, setScale] = useState(2);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultScale, setResultScale] = useState(1);
  const fileInputRef = useRef(null);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'Pilih file gambar yang valid.', type: 'message-error' });
      return;
    }
    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
    setResultUrl('');
    setResultSize(null);
    setResultScale(1);
    setMessage({ text: '', type: '' });
  };

  const handleUpscale = async () => {
    if (!sourceUrl || !sourceFile) return;
    setIsProcessing(true);
    setMessage({ text: '', type: '' });
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Foto tidak dapat dibuka.'));
        image.src = sourceUrl;
      });

      const requestedScale = Number(scale);
      const scaleByDimension = Math.min(MAX_OUTPUT_DIMENSION / image.naturalWidth, MAX_OUTPUT_DIMENSION / image.naturalHeight);
      const scaleByPixels = Math.sqrt(MAX_OUTPUT_PIXELS / (image.naturalWidth * image.naturalHeight));
      const outputScale = Math.min(requestedScale, scaleByDimension, scaleByPixels);
      if (!Number.isFinite(outputScale) || outputScale <= 1) {
        throw new Error('Gambar ini terlalu besar untuk diperbesar di perangkat ini.');
      }
      const outputWidth = Math.round(image.naturalWidth * outputScale);
      const outputHeight = Math.round(image.naturalHeight * outputScale);
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas tidak tersedia di browser ini.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, outputWidth, outputHeight);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Gagal membuat gambar hasil.')), 'image/png');
      });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize({ width: outputWidth, height: outputHeight });
      const limited = outputScale < requestedScale;
      setResultScale(outputScale);
      setMessage({
        text: limited
          ? `Foto berhasil diperbesar ${outputScale.toFixed(2)}×. Skala dibatasi agar aman untuk memori perangkat.`
          : `Foto berhasil diperbesar ${requestedScale}×.`,
        type: 'message-success',
      });
    } catch (error) {
      setMessage({ text: `Upscale gagal: ${error.message}`, type: 'message-error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl || !sourceFile) return;
    const filename = sourceFile.name.replace(/\.[^.]+$/, '') || 'foto';
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `${filename}-${Number(resultScale.toFixed(2))}x-hd.png`;
    link.click();
  };

  return (
    <div>
      <main className="shell">
        <header className="topbar">
          <div className="brand"><img src="/images/dupcut.png" alt="" style={{ width: 28, height: 28, borderRadius: 6 }} /><span>dupcut</span></div>
          <span className="privacy-pill"><span /> Privat di perangkat kamu</span>
        </header>

        <section className="intro" aria-labelledby="upscale-title">
          <p className="eyebrow">PERBESAR RESOLUSI FOTO</p>
          <h1 id="upscale-title">Foto lebih besar,<br /><span>siap dipakai di mana saja.</span></h1>
          <p className="intro-copy">Perbesar dimensi gambar 2× atau 4× langsung di perangkatmu, lalu simpan hasilnya sebagai PNG.</p>
        </section>

        <section className="workspace upscale-workspace" aria-label="Pengaturan upscale foto">
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleFile} />
          {!sourceFile ? (
            <button className="upscale-dropzone" type="button" onClick={() => fileInputRef.current?.click()}>
              <span className="picker-icon" aria-hidden="true">↑</span><strong>Pilih foto untuk diperbesar</strong><small>PNG, JPG, WebP, dan format gambar lain yang didukung browser</small>
            </button>
          ) : (
            <>
              <div className="upscale-preview-grid">
                <div className="upscale-preview-card"><span className="mockup-label">Foto asli</span><img src={sourceUrl} alt="Foto asli" /><small>{sourceFile.name}</small></div>
                <div className="upscale-preview-card"><span className="mockup-label">Hasil diperbesar</span>{resultUrl ? <img src={resultUrl} alt="Foto hasil upscale" /> : <div className="upscale-placeholder">Pilih skala lalu proses foto</div>}{resultSize && <small>{resultSize.width.toLocaleString('id-ID')} × {resultSize.height.toLocaleString('id-ID')} px</small>}</div>
              </div>
              <div className="upscale-options">
                <label>Ukuran hasil
                  <select value={scale} onChange={(event) => { setScale(Number(event.target.value)); setResultUrl(''); setResultSize(null); setResultScale(1); }}>
                    <option value={2}>2× — dua kali ukuran</option>
                    <option value={4}>4× — empat kali ukuran</option>
                  </select>
                </label>
                <button className="button button-secondary" type="button" onClick={() => fileInputRef.current?.click()}>Ganti foto</button>
              </div>
              <p className="upscale-note">Upscale ini memperbesar resolusi dengan interpolasi berkualitas tinggi. Hasilnya punya dimensi lebih besar, tetapi tidak menambahkan detail baru seperti AI enhancement.</p>
              {message.text && <p className={`message ${message.type}`} role="status">{message.text}</p>}
              <div className="upscale-actions">
                <button className="button button-primary" type="button" disabled={isProcessing} onClick={handleUpscale}>{isProcessing ? 'Memperbesar foto…' : 'Perbesar foto'}</button>
                <button className="button button-secondary" type="button" disabled={!resultUrl} onClick={downloadResult}>Unduh PNG HD</button>
              </div>
            </>
          )}
          {!sourceFile && message.text && <p className={`message ${message.type}`} role="status">{message.text}</p>}
        </section>

        <footer className="footnotes"><div className="footnote"><span className="footnote-number">01</span><p><strong>Diproses lokal</strong><br />Foto tidak diunggah ke server.</p></div><div className="footnote"><span className="footnote-number">02</span><p><strong>Dimensi lebih besar</strong><br />Pilih pembesaran 2× atau 4×.</p></div><div className="footnote"><span className="footnote-number">03</span><p><strong>PNG</strong><br />Transparansi gambar tetap didukung.</p></div></footer>
      </main>
      <footer className="app-footer"><div className="footer-container"><div className="footer-top"><div className="footer-brand-info"><div className="footer-logo"><img className="footer-logo-mark" src="/dupcut.png" alt="" /><span>dupcut</span></div><p className="footer-desc">Alat kreatif yang mudah, aman, dan berjalan langsung di browser kamu.</p></div><SocialLinks /></div><div className="footer-divider" /><div className="footer-bottom"><p className="footer-copyright">© 2026 DupCut. Semua hak dilindungi.</p></div></div></footer>
    </div>
  );
}
