import { useEffect, useRef, useState } from 'react';
import SocialLinks from './SocialLinks';

const BACKGROUNDS = [
  { name: 'Aurora', colors: ['#c7d2fe', '#fbcfe8', '#fde68a'] },
  { name: 'Mint', colors: ['#a7f3d0', '#bae6fd', '#ddd6fe'] },
  { name: 'Sunset', colors: ['#fdba74', '#fda4af', '#c4b5fd'] },
  { name: 'Berry', colors: ['#f5d0fe', '#c4b5fd', '#93c5fd'] },
  { name: 'Gelap', colors: ['#1e293b', '#475569', '#334155'] },
];

const MAX_IMAGES = 8;

export default function CarouselGridPage() {
  const [sourceImages, setSourceImages] = useState([]);
  const [images, setImages] = useState([]);
  const [layout, setLayout] = useState('grid');
  const [background, setBackground] = useState(0);
  const [customColor, setCustomColor] = useState('#c7d2fe');
  const [customBackground, setCustomBackground] = useState(false);
  const [gap, setGap] = useState(36);
  const [showFrame, setShowFrame] = useState(true);
  const [showShadow, setShowShadow] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const urlsRef = useRef([]);

  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    if (!sourceImages.length) return undefined;
    let cancelled = false;
    const loadImages = async () => {
      try {
        const loaded = await Promise.all(sourceImages.map(({ url }) => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Salah satu gambar tidak dapat dibuka.'));
          img.src = url;
        })));
        if (!cancelled) {
          setImages(sourceImages.map((item, index) => ({ ...item, bitmap: loaded[index] })));
          setIsReady(true);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      }
    };
    loadImages();
    return () => { cancelled = true; };
  }, [sourceImages]);

  const drawLayout = () => {
    const canvas = canvasRef.current;
    if (!canvas || !images.length || images.some((image) => !image.bitmap)) return false;
    const context = canvas.getContext('2d');
    if (!context) return false;
    const scale = 2;
    const outerPadding = layout === 'carousel' ? 184 : 144;
    const spacing = Number(gap);
    let tiles;
    let width;
    let height;
    if (layout === 'carousel') {
      const tileWidth = 660;
      const tileHeight = 820;
      const middle = (images.length - 1) / 2;
      const stepX = images.length <= 3 ? 300 : 146;
      const verticalFan = images.length <= 3 ? 0 : 24;
      width = tileWidth + (images.length - 1) * stepX + outerPadding * 2;
      height = tileHeight + outerPadding * 2 + Math.ceil(images.length / 2) * verticalFan * 2;
      tiles = images.map((_, index) => {
        const distanceFromMiddle = index - middle;
        const top = height / 2 + Math.abs(distanceFromMiddle) * verticalFan - tileHeight / 2;
        return {
          x: width / 2 + distanceFromMiddle * stepX - tileWidth / 2,
          y: top,
          width: tileWidth,
          height: tileHeight,
          rotation: distanceFromMiddle * (images.length <= 3 ? 0.025 : 0.04),
        };
      });
    } else if (images.length === 1) {
      width = 1200 + outerPadding * 2;
      height = 880 + outerPadding * 2;
      tiles = [{ x: outerPadding, y: outerPadding, width: 1200, height: 880, rotation: 0 }];
    } else {
      const contentWidth = 1200;
      const heroHeight = 700;
      const remaining = images.length - 1;
      const columns = remaining <= 3 ? 2 : remaining <= 6 ? 3 : 4;
      const smallTile = (contentWidth - (columns - 1) * spacing) / columns;
      const rows = Math.ceil(remaining / columns);
      const smallGridHeight = rows * smallTile + (rows - 1) * spacing;
      width = contentWidth + outerPadding * 2;
      height = heroHeight + spacing + smallGridHeight + outerPadding * 2;
      tiles = [{ x: outerPadding, y: outerPadding, width: contentWidth, height: heroHeight, rotation: 0 }];
      for (let row = 0; row < rows; row += 1) {
        const rowCount = Math.min(columns, remaining - row * columns);
        const rowWidth = rowCount * smallTile + (rowCount - 1) * spacing;
        const rowStart = outerPadding + (contentWidth - rowWidth) / 2;
        for (let column = 0; column < rowCount; column += 1) {
          tiles.push({
            x: rowStart + column * (smallTile + spacing),
            y: outerPadding + heroHeight + spacing + row * (smallTile + spacing),
            width: smallTile,
            height: smallTile,
            rotation: 0,
          });
        }
      }
    }
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);

    const gradient = context.createLinearGradient(0, 0, width, height);
    if (customBackground) {
      gradient.addColorStop(0, customColor);
      gradient.addColorStop(1, customColor);
    } else {
      BACKGROUNDS[background].colors.forEach((color, index, colors) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const drawOrder = tiles.map((tile, index) => ({ tile, bitmap: images[index].bitmap, index }));
    if (layout === 'carousel') {
      const middle = (images.length - 1) / 2;
      drawOrder.sort((first, second) => Math.abs(second.index - middle) - Math.abs(first.index - middle));
    }
    drawOrder.forEach(({ tile, bitmap }) => {
      const frame = showFrame ? 10 : 0;
      const imageWidth = tile.width - frame * 2;
      const imageHeight = tile.height - frame * 2;
      const radius = tile.width > 700 ? 30 : 23;

      context.save();
      context.translate(tile.x + tile.width / 2, tile.y + tile.height / 2);
      context.rotate(tile.rotation || 0);
      if (showShadow) {
        context.shadowColor = layout === 'carousel' ? 'rgba(15, 23, 42, .32)' : 'rgba(20, 28, 38, .20)';
        context.shadowBlur = layout === 'carousel' ? 48 : 36;
        context.shadowOffsetY = layout === 'carousel' ? 28 : 15;
      }
      context.fillStyle = showFrame ? '#fff' : 'rgba(255,255,255,.12)';
      context.beginPath();
      context.roundRect(-tile.width / 2, -tile.height / 2, tile.width, tile.height, radius + frame);
      context.fill();
      context.beginPath();
      context.roundRect(-imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight, radius);
      context.clip();
      const imageRatio = bitmap.naturalWidth / bitmap.naturalHeight;
      const boxRatio = imageWidth / imageHeight;
      let cropX = 0;
      let cropY = 0;
      let cropWidth = bitmap.naturalWidth;
      let cropHeight = bitmap.naturalHeight;
      if (imageRatio > boxRatio) {
        cropWidth = bitmap.naturalHeight * boxRatio;
        cropX = (bitmap.naturalWidth - cropWidth) / 2;
      } else {
        cropHeight = bitmap.naturalWidth / boxRatio;
        cropY = (bitmap.naturalHeight - cropHeight) / 2;
      }
      context.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      context.restore();
    });
    return true;
  };

  useEffect(() => {
    if (isReady) drawLayout();
  });

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    if (selected.length > MAX_IMAGES) {
      setError(`Pilih maksimal ${MAX_IMAGES} gambar sekaligus.`);
      event.target.value = '';
      return;
    }
    const invalid = selected.find((file) => !file.type.startsWith('image/'));
    if (invalid) {
      setError('Semua file harus berupa gambar.');
      event.target.value = '';
      return;
    }
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const nextImages = selected.map((file) => ({ file, url: URL.createObjectURL(file), bitmap: null }));
    urlsRef.current = nextImages.map(({ url }) => url);
    setIsReady(false);
    setImages([]);
    setSourceImages(nextImages);
    setError('');
    event.target.value = '';
  };

  const downloadPng = () => {
    if (!drawLayout()) {
      setError('Tunggu sampai semua gambar selesai dimuat, lalu coba lagi.');
      return;
    }
    setIsDownloading(true);
    canvasRef.current.toBlob((blob) => {
      setIsDownloading(false);
      if (!blob) {
        setError('PNG gagal dibuat. Coba kurangi ukuran atau jumlah gambar.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dupcut-${layout === 'grid' ? 'grid' : 'carousel'}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError('');
    }, 'image/png');
  };

  return (
    <div className="mockup-page">
      <main className="shell">
        <header className="topbar">
          <div className="brand"><img src="/images/dupcut.png" alt="" style={{ width: 28, height: 28, borderRadius: 6 }} /><span>dupcut</span></div>
          <span className="privacy-pill"><span /> Privat di perangkat kamu</span>
        </header>
        <section className="intro" aria-labelledby="carousel-title">
          <p className="eyebrow">KOLASE FOTO ESTETIK</p>
          <h1 id="carousel-title">Satukan momen,<br /><span>dalam satu gambar.</span></h1>
          <p className="intro-copy">Pilih hingga 8 foto, susun jadi carousel atau kolase editorial yang dinamis, lalu unduh sebagai satu PNG berkualitas tinggi.</p>
        </section>

        <section className="carousel-workspace" aria-label="Pengaturan carousel dan grid">
          <div className="carousel-controls">
            <div className="carousel-section-title"><span className="picker-icon" aria-hidden="true">▧</span><div><strong>Pilih foto</strong><small>Maksimal 8 gambar sekaligus</small></div></div>
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="visually-hidden" />
            <button type="button" className="button button-secondary" onClick={() => inputRef.current?.click()}>{images.length ? 'Ganti pilihan gambar' : 'Pilih beberapa gambar'}</button>
            {images.length > 0 && <div className="carousel-file-list">{images.map((image, index) => <div className="carousel-file-row" key={`${image.file.name}-${index}`}><img src={image.url} alt="" /><span>{index + 1}. {image.file.name}</span></div>)}</div>}

            <fieldset className="carousel-layout-options"><legend>Layout</legend>
              <label className={layout === 'grid' ? 'selected' : ''}><input type="radio" name="carousel-layout" checked={layout === 'grid'} onChange={() => setLayout('grid')} /><span>▦</span><b>Editorial</b><small>Foto utama + grid</small></label>
              <label className={layout === 'carousel' ? 'selected' : ''}><input type="radio" name="carousel-layout" checked={layout === 'carousel'} onChange={() => setLayout('carousel')} /><span>▤</span><b>Carousel</b><small>Floating cards</small></label>
            </fieldset>

            {layout === 'grid' && <label className="carousel-range-label">Jarak antar foto <span>{gap}px</span><input type="range" min="24" max="64" step="4" value={gap} onChange={(event) => setGap(Number(event.target.value))} /></label>}
            <div className="carousel-background-picker"><span className="mockup-label">Template background</span><div className="mockup-swatches">{BACKGROUNDS.map((item, index) => <button key={item.name} type="button" className={!customBackground && background === index ? 'active' : ''} title={item.name} aria-label={`Background ${item.name}`} style={{ background: `linear-gradient(135deg, ${item.colors.join(', ')})` }} onClick={() => { setBackground(index); setCustomBackground(false); }} />)}<label className={`mockup-color-swatch ${customBackground ? 'active' : ''}`} title="Warna sendiri"><input type="color" value={customColor} aria-label="Pilih background sendiri" onChange={(event) => { setCustomColor(event.target.value); setCustomBackground(true); }} /><span>＋</span></label></div></div>

            <div className="carousel-toggles"><label><input type="checkbox" checked={showFrame} onChange={(event) => setShowFrame(event.target.checked)} /> Bingkai foto</label><label><input type="checkbox" checked={showShadow} onChange={(event) => setShowShadow(event.target.checked)} /> Shadow</label></div>
            {error && <p className="message message-error" role="alert">{error}</p>}
            <button className="button button-primary mockup-download" type="button" disabled={!images.length || !isReady || isDownloading} onClick={downloadPng}>{isDownloading ? 'Menyiapkan PNG…' : 'Unduh hasil sebagai PNG'}</button>
          </div>

          <div className="carousel-preview"><div className="mockup-preview-heading"><p className="mockup-label">Pratinjau hasil</p>{images.length > 0 && <span>{images.length} foto · resolusi 2×</span>}</div>{images.length ? <div className="carousel-canvas-scroll"><canvas ref={canvasRef} aria-label="Pratinjau layout foto" /></div> : <div className="mockup-empty"><span>▦</span><strong>Kolase kamu akan tampil di sini</strong><small>Pilih beberapa foto untuk mulai merangkai.</small></div>}</div>
        </section>
        <footer className="footnotes"><div className="footnote"><span className="footnote-number">01</span><p><strong>Hingga 8 foto</strong><br />Pilih banyak gambar dalam satu kali unggah.</p></div><div className="footnote"><span className="footnote-number">02</span><p><strong>Resolusi tinggi</strong><br />PNG dirender pada skala 2×.</p></div><div className="footnote"><span className="footnote-number">03</span><p><strong>Privat</strong><br />Semua gambar diproses di perangkat.</p></div></footer>
      </main>
      <footer className="app-footer"><div className="footer-container"><div className="footer-top"><div className="footer-brand-info"><div className="footer-logo"><img className="footer-logo-mark" src="/dupcut.png" alt="" /><span>dupcut</span></div><p className="footer-desc">Alat kreatif yang mudah, aman, dan berjalan langsung di browser kamu.</p></div><SocialLinks /></div><div className="footer-divider" /><div className="footer-bottom"><p className="footer-copyright">© 2026 DupCut. Semua hak dilindungi.</p></div></div></footer>
    </div>
  );
}
