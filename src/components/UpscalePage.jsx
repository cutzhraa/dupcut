import { useEffect, useRef, useState } from 'react';
import SocialLinks from './SocialLinks';

const MAX_OUTPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_DIMENSION = 12_000;

export default function UpscalePage() {
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [scale, setScale] = useState(2);
  const [sharpen, setSharpen] = useState(1.15);
  const [progress, setProgress] = useState('');
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
    setProgress('Menyiapkan foto…');
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

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new Error('Canvas tidak tersedia di browser ini.');
      sourceContext.drawImage(image, 0, 0);

      if (Number(sharpen) > 0) {
        setProgress('Menajamkan detail foto…');
        const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const source = imageData.data;
        const result = new Uint8ClampedArray(source.length);
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const amount = Number(sharpen);
        const rowsPerChunk = Math.max(16, Math.floor(500_000 / width));

        for (let startY = 0; startY < height; startY += rowsPerChunk) {
          const endY = Math.min(height, startY + rowsPerChunk);
          for (let y = startY; y < endY; y += 1) {
            const topY = Math.max(0, y - 1);
            const bottomY = Math.min(height - 1, y + 1);
            for (let x = 0; x < width; x += 1) {
              const leftX = Math.max(0, x - 1);
              const rightX = Math.min(width - 1, x + 1);
              const index = (y * width + x) * 4;
              const left = (y * width + leftX) * 4;
              const right = (y * width + rightX) * 4;
              const top = (topY * width + x) * 4;
              const bottom = (bottomY * width + x) * 4;
              for (let channel = 0; channel < 3; channel += 1) {
                const pixel = source[index + channel];
                const blurred = (pixel * 4 + source[left + channel] + source[right + channel] + source[top + channel] + source[bottom + channel]) / 8;
                result[index + channel] = pixel + amount * (pixel - blurred);
              }
              result[index + 3] = source[index + 3];
            }
          }
          if (endY < height) await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
        imageData.data.set(result);
        sourceContext.putImageData(imageData, 0, 0);
      }

      setProgress('Memperbesar resolusi…');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(sourceCanvas, 0, 0, outputWidth, outputHeight);

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
      setProgress('');
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
          <p className="eyebrow">PERTAJAM & TINGKATKAN RESOLUSI</p>
          <h1 id="upscale-title">Foto lebih tajam,<br /><span>lebih jelas saat diperbesar.</span></h1>
          <p className="intro-copy">Kurangi kesan blur dengan penajaman detail, lalu perbesar ukuran foto 2× atau 4× langsung di perangkatmu.</p>
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
              <label className="upscale-sharpen">Penajaman detail <span>{Number(sharpen) === 0 ? 'Mati' : Number(sharpen) < 1.5 ? 'Seimbang' : 'Kuat'}</span>
                <select value={sharpen} onChange={(event) => { setSharpen(Number(event.target.value)); setResultUrl(''); setResultSize(null); }}>
                  <option value={0}>Mati</option>
                  <option value={1.15}>Seimbang</option>
                  <option value={1.8}>Kuat</option>
                </select>
              </label>
              <p className="upscale-note">Penajaman membantu memperjelas tepi dan detail halus. Foto yang sangat blur atau salah fokus tetap memiliki batas; proses ini tidak bisa mengembalikan detail yang hilang sepenuhnya.</p>
              {isProcessing && <p className="message message-info" role="status">{progress}</p>}
              {message.text && <p className={`message ${message.type}`} role="status">{message.text}</p>}
              <div className="upscale-actions">
                <button className="button button-primary" type="button" disabled={isProcessing} onClick={handleUpscale}>{isProcessing ? 'Memproses foto…' : 'Pertajam & tingkatkan HD'}</button>
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
