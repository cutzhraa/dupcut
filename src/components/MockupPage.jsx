import { useEffect, useRef, useState } from 'react';
import SocialLinks from './SocialLinks';

const BACKGROUNDS = [
  { name: 'Aurora', value: 'linear-gradient(135deg, #c7d2fe 0%, #fbcfe8 52%, #fde68a 100%)' },
  { name: 'Mint', value: 'linear-gradient(135deg, #a7f3d0 0%, #bae6fd 52%, #ddd6fe 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #fdba74 0%, #fda4af 50%, #c4b5fd 100%)' },
  { name: 'Berry', value: 'linear-gradient(135deg, #f5d0fe 0%, #c4b5fd 50%, #93c5fd 100%)' },
  { name: 'Gelap', value: 'linear-gradient(135deg, #1e293b 0%, #475569 52%, #334155 100%)' },
];

export default function MockupPage() {
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [code, setCode] = useState('');
  const [windowTitle, setWindowTitle] = useState('');
  const [mode, setMode] = useState('image');
  const [style, setStyle] = useState('macos');
  const [background, setBackground] = useState(BACKGROUNDS[0].value);
  const [customColor, setCustomColor] = useState('#c7d2fe');
  const [padding, setPadding] = useState(48);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const imageUrlsRef = useRef([]);
  const canvasRef = useRef(null);
  const imageObjectRef = useRef(null);

  useEffect(() => {
    const image = images[currentImageIndex];
    if (!image) return undefined;
    const bitmap = new Image();
    bitmap.onload = () => { imageObjectRef.current = bitmap; setImageReady(true); };
    bitmap.onerror = () => setError(`Gambar ${image.file.name} tidak dapat dibuka.`);
    bitmap.src = image.url;
    return () => { bitmap.onload = null; };
  }, [images, currentImageIndex]);

  useEffect(() => () => {
    imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const image = images[currentImageIndex];
  const hasContent = mode === 'image' ? images.length > 0 : Boolean(code.trim());

  const drawMockup = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const sourceWidth = mode === 'image' ? imageObjectRef.current?.naturalWidth : 1200;
    const sourceHeight = mode === 'image' ? imageObjectRef.current?.naturalHeight : 760;
    if (!sourceWidth || !sourceHeight) return false;

    const scale = Math.min(1, 1100 / sourceWidth, 700 / sourceHeight);
    const contentWidth = Math.max(1, Math.round(sourceWidth * scale));
    const contentHeight = Math.max(1, Math.round(sourceHeight * scale));
    const barHeight = style === 'macos' ? 44 : 40;
    const frameWidth = contentWidth;
    const frameHeight = contentHeight + barHeight;
    const outerPadding = Number(padding);
    canvas.width = frameWidth + outerPadding * 2;
    canvas.height = frameHeight + outerPadding * 2;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (background === 'custom') {
      gradient.addColorStop(0, customColor);
      gradient.addColorStop(1, customColor);
    } else {
      const preset = BACKGROUNDS.find((item) => item.value === background) || BACKGROUNDS[0];
      const colors = preset.value.match(/#[0-9a-f]{6}/gi) || ['#c7d2fe', '#fbcfe8', '#fde68a'];
      colors.forEach((color, index) => gradient.addColorStop(index / Math.max(1, colors.length - 1), color));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const frameX = outerPadding;
    const frameY = outerPadding;
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, .24)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameWidth, frameHeight, 12);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameWidth, frameHeight, 12);
    ctx.clip();
    ctx.fillStyle = style === 'windows' ? '#f3f4f6' : '#f5f5f7';
    ctx.fillRect(frameX, frameY, frameWidth, barHeight);
    if (style === 'macos') {
      ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(frameX + 20 + index * 20, frameY + barHeight / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#8b8b91';
      ctx.font = '500 12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(windowTitle.trim() || 'Nama situs', frameX + frameWidth / 2, frameY + 27, Math.max(40, frameWidth - 140));
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = '500 12px Arial, sans-serif';
      ctx.fillText(windowTitle.trim() || 'Nama situs', frameX + 18, frameY + 25, Math.max(40, frameWidth - 110));
      ['—', '□', '×'].forEach((icon, index) => {
        ctx.fillStyle = '#4b5563';
        ctx.textAlign = 'center';
        ctx.fillText(icon, frameX + frameWidth - 64 + index * 22, frameY + 25);
      });
    }

    if (mode === 'image' && imageObjectRef.current) {
      ctx.drawImage(imageObjectRef.current, frameX, frameY + barHeight, contentWidth, contentHeight);
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillRect(frameX, frameY + barHeight, contentWidth, contentHeight);
      ctx.fillStyle = '#d1d5db';
      ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'left';
      const lines = code.split(/\r?\n/).slice(0, 38);
      lines.forEach((line, index) => {
        const clipped = line.length > 130 ? `${line.slice(0, 127)}...` : line;
        ctx.fillText(clipped, frameX + 28, frameY + barHeight + 32 + index * 19);
      });
    }
    ctx.restore();
    return true;
  };

  useEffect(() => {
    if (hasContent && (mode === 'code' || imageReady)) drawMockup();
  });

  const handleFile = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const invalidFile = files.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      setError('Pilih file gambar seperti PNG, JPG, atau WebP.');
      event.target.value = '';
      return;
    }
    setError('');
    imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const newImages = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    imageUrlsRef.current = newImages.map(({ url }) => url);
    imageObjectRef.current = null;
    setImageReady(false);
    setMode('image');
    setCurrentImageIndex(0);
    setImages(newImages);
    event.target.value = '';
  };

  const selectImage = (index) => {
    if (index < 0 || index >= images.length) return;
    imageObjectRef.current = null;
    setImageReady(false);
    setCurrentImageIndex(index);
  };

  const downloadPng = () => {
    if (!drawMockup()) {
      setError('Tunggu sampai pratinjau selesai dimuat, lalu coba lagi.');
      return;
    }
    const link = document.createElement('a');
    const safeName = (image?.file.name || 'mockup').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-');
    link.download = `${safeName}-mockup.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setError('');
  };

  return (
    <div className="mockup-page">
      <main className="shell">
        <header className="topbar">
          <div className="brand"><img src="/images/dupcut.png" alt="" style={{ width: 28, height: 28, borderRadius: 6 }} /><span>dupcut</span></div>
          <span className="privacy-pill"><span /> Privat di perangkat kamu</span>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">PEMBUAT MOCKUP GAMBAR</p>
          <h1 id="page-title">Bingkai desainmu,<br /><span>siap dibagikan.</span></h1>
          <p className="intro-copy">Bungkus screenshot atau kode dalam mockup jendela browser. Atur latar dan unduh hasilnya sebagai PNG.</p>
        </section>

        <section className="mockup-workspace" aria-label="Pengaturan mockup">
          <div className="mockup-controls">
            <div className="mockup-tabs" role="tablist" aria-label="Jenis konten">
              <button type="button" className={mode === 'image' ? 'selected' : ''} onClick={() => { setMode('image'); setError(''); }}>Screenshot</button>
              <button type="button" className={mode === 'code' ? 'selected' : ''} onClick={() => { setMode('code'); setError(''); }}>Tempel kode</button>
            </div>

            {mode === 'image' ? (
              <div className="mockup-upload">
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFile} />
                <button type="button" className="button button-secondary" onClick={() => fileRef.current?.click()}>{image ? 'Ganti gambar' : 'Pilih screenshot'}</button>
                <span>{images.length ? `${images.length} gambar dipilih` : 'Pilih satu atau banyak · PNG, JPG, WebP'}</span>
                {images.length > 0 && <div className="mockup-image-picker" aria-label="Pilih gambar untuk pratinjau">
                  {images.map((item, index) => <button key={`${item.file.name}-${index}`} type="button" className={index === currentImageIndex ? 'active' : ''} onClick={() => selectImage(index)} title={item.file.name} aria-label={`Pratinjau ${item.file.name}`}><img src={item.url} alt="" /><span>{index + 1}</span></button>)}
                </div>}
              </div>
            ) : (
              <label className="mockup-code-label">Tempel HTML atau kode yang ingin ditampilkan
                <textarea value={code} onChange={(event) => setCode(event.target.value)} placeholder={'<h1>Halo, dunia!</h1>\n<p>Mockup pertamaku</p>'} rows={5} />
              </label>
            )}

            <div className="mockup-option-row">
              <label className="mockup-title-field">Judul di title bar
                <input type="text" value={windowTitle} onChange={(event) => setWindowTitle(event.target.value)} placeholder="Contoh: dupcut.vercel.app" maxLength={80} />
              </label>
            </div>

            <div className="mockup-option-row">
              <label>Gaya jendela
                <select value={style} onChange={(event) => setStyle(event.target.value)}>
                  <option value="macos">macOS</option><option value="windows">Windows</option>
                </select>
              </label>
              <label>Ruang latar <span>{padding}px</span>
                <input type="range" min="24" max="100" step="4" value={padding} onChange={(event) => setPadding(event.target.value)} />
              </label>
            </div>

            <div className="mockup-backgrounds">
              <span className="mockup-label">Latar belakang</span>
              <div className="mockup-swatches">
                {BACKGROUNDS.map((item) => (
                  <button key={item.name} type="button" aria-label={`Latar ${item.name}`} title={item.name} className={background === item.value ? 'active' : ''} style={{ background: item.value }} onClick={() => setBackground(item.value)} />
                ))}
                <label className={`mockup-color-swatch ${background === 'custom' ? 'active' : ''}`} title="Pilih warna sendiri">
                  <input type="color" value={customColor} onChange={(event) => { setCustomColor(event.target.value); setBackground('custom'); }} aria-label="Pilih warna latar kustom" />
                  <span>＋</span>
                </label>
              </div>
            </div>

            {error && <p className="message message-error" role="alert">{error}</p>}
            <button className="button button-primary mockup-download" type="button" disabled={!hasContent} onClick={downloadPng}>Unduh sebagai PNG</button>
          </div>

          <div className="mockup-preview-wrap">
            <div className="mockup-preview-heading"><p className="mockup-label">Pratinjau</p>{mode === 'image' && images.length > 1 && <div className="mockup-image-nav"><button type="button" onClick={() => selectImage(currentImageIndex - 1)} disabled={currentImageIndex === 0} aria-label="Gambar sebelumnya">←</button><span>{currentImageIndex + 1} / {images.length}</span><button type="button" onClick={() => selectImage(currentImageIndex + 1)} disabled={currentImageIndex === images.length - 1} aria-label="Gambar berikutnya">→</button></div>}</div>
            {mode === 'image' && image && <p className="mockup-current-name">{image.file.name}</p>}
            {hasContent ? (
              <div className="mockup-canvas-scroll"><canvas ref={canvasRef} aria-label="Pratinjau mockup browser" /></div>
            ) : (
              <div className="mockup-empty"><span>▧</span><strong>Pratinjau mockup muncul di sini</strong><small>Pilih screenshot atau tempel kode untuk mulai.</small></div>
            )}
          </div>
        </section>

        <footer className="footnotes">
          <div className="footnote"><span className="footnote-number">01</span><p><strong>Privat</strong><br />Gambar diproses langsung di browser.</p></div>
          <div className="footnote"><span className="footnote-number">02</span><p><strong>Resolusi asli</strong><br />PNG dibuat dari dimensi screenshot sumber.</p></div>
          <div className="footnote"><span className="footnote-number">03</span><p><strong>Siap dibagikan</strong><br />Unduh mockup sekali klik.</p></div>
        </footer>
      </main>

      <footer className="app-footer"><div className="footer-container"><div className="footer-top"><div className="footer-brand-info"><div className="footer-logo"><img className="footer-logo-mark" src="/dupcut.png" alt="" /><span>dupcut</span></div><p className="footer-desc">Alat kreatif yang mudah, aman, dan berjalan langsung di browser kamu.</p></div><SocialLinks /></div><div className="footer-divider" /><div className="footer-bottom"><p className="footer-copyright">© 2026 DupCut. Semua hak dilindungi.</p></div></div></footer>
    </div>
  );
}
