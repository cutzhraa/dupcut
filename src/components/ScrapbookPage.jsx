import { useEffect, useRef, useState } from 'react';
import SocialLinks from './SocialLinks';

const MAX_PHOTOS = 12;
const LAYOUTS = [
  { id: 'grid', name: 'Grid rapi', hint: 'Kotak seimbang', icon: '▦' },
  { id: 'collage', name: 'Kolase', hint: 'Satu foto utama', icon: '▧' },
  { id: 'scatter', name: 'Scrapbook', hint: 'Miring & playful', icon: '✳' },
];
const THEMES = [
  { name: 'Vintage journal', color: '#ead9b9', ink: '#594532', accent: '#a75f43', motifs: ['✿', '❧', '✦', '◉'], wash: '#b88b53' },
  { name: 'Flower garden', color: '#e6ead8', ink: '#465b48', accent: '#b36b70', motifs: ['✿', '❀', '❧', '✽'], wash: '#8caa80' },
  { name: 'Pink memories', color: '#f3dce0', ink: '#704b55', accent: '#bc7187', motifs: ['♡', '✿', '୨୧', '✦'], wash: '#d79ba5' },
  { name: 'Blue letters', color: '#d9e3e8', ink: '#40596b', accent: '#66839a', motifs: ['✦', '✉', '❧', '⋆'], wash: '#91adba' },
  { name: 'Cottage brown', color: '#d8c2a3', ink: '#493629', accent: '#876347', motifs: ['❧', '✿', '✦', '♧'], wash: '#806044' },
];

export default function ScrapbookPage() {
  const [photos, setPhotos] = useState([]);
  const [theme, setTheme] = useState(0);
  const [layout, setLayout] = useState('scatter');
  const [title, setTitle] = useState('little moments');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const urlsRef = useRef([]);

  useEffect(() => () => urlsRef.current.forEach(URL.revokeObjectURL), []);

  useEffect(() => {
    if (!photos.length) return undefined;
    let cancelled = false;
    Promise.all(photos.map(({ url }) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Salah satu foto tidak dapat dibuka.'));
      image.src = url;
    }))).then((bitmaps) => {
      if (!cancelled) {
        setPhotos((current) => current.map((photo, index) => ({ ...photo, bitmap: bitmaps[index] })));
        setReady(true);
      }
    }).catch((loadError) => { if (!cancelled) setError(loadError.message); });
    return () => { cancelled = true; };
  }, [photos.length]);

  useEffect(() => {
    if (!ready || !photos.length) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    const width = 1200;
    const top = 210;
    const gap = 32;
    let tiles;
    let height;
    if (layout === 'grid') {
      const columns = photos.length < 3 ? Math.max(1, photos.length) : 3;
      const rows = Math.ceil(photos.length / columns);
      const cellWidth = columns === 1 ? 650 : 340;
      const cellHeight = 370;
      height = top + rows * (cellHeight + gap) + 70;
      tiles = photos.map((_, index) => {
        const row = Math.floor(index / columns);
        const rowCount = Math.min(columns, photos.length - row * columns);
        const rowWidth = rowCount * cellWidth + (rowCount - 1) * gap;
        return { x: (width - rowWidth) / 2 + (index % columns) * (cellWidth + gap), y: top + row * (cellHeight + gap), width: cellWidth, height: cellHeight, tilt: 0 };
      });
    } else if (layout === 'collage' && photos.length > 1) {
      const smallWidth = 230;
      const smallHeight = 245;
      const sideCount = photos.length - 1;
      const sideRows = Math.ceil(sideCount / 2);
      height = top + Math.max(560, sideRows * (smallHeight + gap)) + 70;
      tiles = [{ x: 70, y: top + (height - top - 70 - 560) / 2, width: 550, height: 560, tilt: -0.012 }];
      for (let index = 1; index < photos.length; index += 1) {
        const sideIndex = index - 1;
        const sideColumns = sideCount === 1 ? 1 : 2;
        const row = Math.floor(sideIndex / sideColumns);
        const rowCount = Math.min(sideColumns, sideCount - row * sideColumns);
        const rowWidth = rowCount * smallWidth + (rowCount - 1) * gap;
        tiles.push({ x: 660 + (rowWidth === smallWidth ? (2 * smallWidth + gap - rowWidth) / 2 : (sideIndex % sideColumns) * (smallWidth + gap)), y: top + row * (smallHeight + gap), width: smallWidth, height: smallHeight, tilt: [-0.025, 0.03, -0.015, 0.02][index % 4] });
      }
    } else {
      const columns = photos.length <= 2 ? photos.length : photos.length <= 6 ? 2 : 3;
      const rows = Math.ceil(photos.length / columns);
      const cellWidth = columns === 1 ? 650 : columns === 2 ? 440 : 330;
      const cellHeight = columns === 2 ? 350 : 370;
      height = top + rows * (cellHeight + gap) + 70;
      tiles = photos.map((_, index) => {
        const row = Math.floor(index / columns);
        const rowCount = Math.min(columns, photos.length - row * columns);
        const rowWidth = rowCount * cellWidth + (rowCount - 1) * gap;
        return { x: (width - rowWidth) / 2 + (index % columns) * (cellWidth + gap), y: top + row * (cellHeight + gap), width: cellWidth, height: cellHeight, tilt: [-0.055, 0.045, -0.025, 0.06, -0.04, 0.025][index % 6] };
      });
    }
    const selectedTheme = THEMES[theme];
    const selectedPaper = selectedTheme;
    canvas.width = width * 2;
    canvas.height = height * 2;
    context.scale(2, 2);
    context.fillStyle = selectedPaper.color;
    context.fillRect(0, 0, width, height);
    // Layered paper washes, grain, and a hand-drawn stitched edge.
    const wash = context.createRadialGradient(width * .82, height * .18, 10, width * .82, height * .18, width * .72);
    wash.addColorStop(0, `${selectedTheme.wash}30`);
    wash.addColorStop(1, `${selectedPaper.color}00`);
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 0.12;
    context.fillStyle = selectedTheme.ink;
    for (let y = 15; y < height; y += 19) for (let x = (y % 2) * 9; x < width; x += 19) context.fillRect(x, y, 1, 1);
    context.globalAlpha = 1;
    context.strokeStyle = `${selectedPaper.ink}70`;
    context.lineWidth = 1.5;
    context.setLineDash([2, 9]);
    context.strokeRect(44, 42, width - 88, height - 84);
    context.setLineDash([]);
    context.fillStyle = selectedPaper.ink;
    context.textAlign = 'center';
    context.font = 'italic 66px "Brush Script MT", "Segoe Script", cursive';
    context.fillText(title || 'little moments', width / 2, 112, width - 140);
    context.font = '18px Georgia, serif';
    context.globalAlpha = 0.72;
    context.fillText('—  memories collected with love  —', width / 2, 151);
    context.globalAlpha = 1;

    // Tiny printed collage scraps: ticket, postage stamp, and pressed-flower motifs.
    context.save();
    context.translate(width - 146, 110);
    context.rotate(0.11);
    context.fillStyle = '#fff9e8';
    context.fillRect(-43, -34, 86, 67);
    context.strokeStyle = `${selectedTheme.accent}88`;
    context.setLineDash([2, 3]);
    context.strokeRect(-37, -28, 74, 55);
    context.setLineDash([]);
    context.fillStyle = selectedTheme.accent;
    context.font = '12px Georgia, serif';
    context.fillText('POST', 0, 5);
    context.restore();

    const accents = [];
    for (let index = 0; index < photos.length * 2 + 7; index += 1) {
      const x = 92 + ((index * 197 + 61) % (width - 184));
      const y = top - 15 + ((index * 113 + 37) % Math.max(90, height - top - 45));
      if (tiles.some((tile) => x > tile.x - 24 && x < tile.x + tile.width + 24 && y > tile.y - 24 && y < tile.y + tile.height + 24)) continue;
      accents.push({ x, y, motif: selectedTheme.motifs[index % selectedTheme.motifs.length], angle: (index % 5 - 2) * 0.13, size: 24 + (index % 3) * 9 });
    }
    accents.forEach(({ x, y, motif, angle, size }, index) => {
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      if (index % 3 === 0) {
        context.fillStyle = index % 2 ? '#fff5d6' : '#f7e9dc';
        context.beginPath();
        context.arc(0, 0, size * .7, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = index % 2 ? selectedTheme.accent : selectedTheme.ink;
      context.globalAlpha = .83;
      context.font = `${size}px Georgia, serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(motif, 0, 0);
      context.restore();
    });

    photos.forEach((photo, index) => {
      const tile = tiles[index];
      const { x, y, width: cellWidth, height: cellHeight } = tile;
      context.save();
      context.translate(x + cellWidth / 2, y + cellHeight / 2);
      context.rotate(tile.tilt);
      context.shadowColor = 'rgba(65, 48, 32, .22)';
      context.shadowBlur = 18;
      context.shadowOffsetY = 8;
      context.fillStyle = '#fffdf8';
      context.fillRect(-cellWidth / 2, -cellHeight / 2, cellWidth, cellHeight);
      context.shadowColor = 'transparent';
      const image = photo.bitmap;
      const frame = 15;
      const boxWidth = cellWidth - frame * 2;
      const boxHeight = cellHeight - 58;
      const scale = Math.max(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.save();
      context.beginPath();
      context.rect(-boxWidth / 2, -cellHeight / 2 + frame, boxWidth, boxHeight);
      context.clip();
      context.drawImage(image, -drawWidth / 2, -cellHeight / 2 + frame + (boxHeight - drawHeight) / 2, drawWidth, drawHeight);
      context.restore();
      context.fillStyle = selectedTheme.ink;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = 'italic 15px Georgia, serif';
      const caption = photo.file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 27) || `memory no. ${index + 1}`;
      context.fillText(caption, 0, cellHeight / 2 - 21, cellWidth - 34);
      // Washi tape across the top edge of each photo.
      context.globalAlpha = 0.76;
      context.fillStyle = [selectedTheme.wash, '#e8d28e', '#b7c9b1', '#d79ba5'][index % 4];
      context.translate(0, -cellHeight / 2 + 8);
      context.rotate(-0.08);
      context.fillRect(-47, -8, 94, 18);
      context.globalAlpha = 1;
      context.restore();
    });
  }, [photos, theme, title, ready, layout]);

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    if (selected.length > MAX_PHOTOS) { setError(`Pilih maksimal ${MAX_PHOTOS} foto.`); event.target.value = ''; return; }
    if (selected.some((file) => !file.type.startsWith('image/'))) { setError('Semua file harus berupa gambar.'); event.target.value = ''; return; }
    urlsRef.current.forEach(URL.revokeObjectURL);
    const next = selected.map((file) => ({ file, url: URL.createObjectURL(file), bitmap: null }));
    urlsRef.current = next.map(({ url }) => url);
    setReady(false);
    setPhotos(next);
    setError('');
    event.target.value = '';
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    canvas.toBlob((blob) => {
      if (!blob) { setError('PNG gagal dibuat. Coba kurangi ukuran foto.'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dupcut-scrapbook.png';
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return <div className="mockup-page"><main className="shell">
    <header className="topbar"><div className="brand"><img src="/images/dupcut.png" alt="" style={{ width: 28, height: 28, borderRadius: 6 }} /><span>dupcut</span></div><span className="privacy-pill"><span /> Privat di perangkat kamu</span></header>
    <section className="intro"><p className="eyebrow">SCRAPBOOK DIGITAL</p><h1>Rangkai momen,<br /><span>jadi halaman kenangan.</span></h1><p className="intro-copy">Unggah foto-fotomu dan ubah jadi scrapbook hangat dengan bingkai, washi tape, dan kertas warna pilihan.</p></section>
    <section className="carousel-workspace scrapbook-workspace" aria-label="Pembuat scrapbook">
      <div className="carousel-controls"><div className="carousel-section-title"><span className="picker-icon" aria-hidden="true">✂</span><div><strong>Mulai merangkai</strong><small>Maksimal {MAX_PHOTOS} foto · diproses di perangkat</small></div></div>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="visually-hidden" />
        <button type="button" className="button button-secondary" onClick={() => inputRef.current?.click()}>{photos.length ? 'Ganti foto' : 'Unggah foto'}</button>
        {photos.length > 0 && <div className="carousel-file-list">{photos.map((photo, index) => <div className="carousel-file-row" key={`${photo.file.name}-${index}`}><img src={photo.url} alt="" /><span>{photo.file.name}</span></div>)}</div>}
        <fieldset className="carousel-layout-options scrapbook-layout-options"><legend>Pilih susunan foto</legend>{LAYOUTS.map((item) => <label key={item.id} className={layout === item.id ? 'selected' : ''}><input type="radio" name="scrapbook-layout" value={item.id} checked={layout === item.id} onChange={() => setLayout(item.id)} /><span>{item.icon}</span><b>{item.name}</b><small>{item.hint}</small></label>)}</fieldset>
        <label className="mockup-title-field"><span className="mockup-label">Judul halaman</span><input value={title} maxLength={32} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="carousel-background-picker"><span className="mockup-label">Pilih gaya scrapbook</span><div className="scrapbook-themes">{THEMES.map((item, index) => <button key={item.name} type="button" className={`scrapbook-theme ${theme === index ? 'active' : ''}`} onClick={() => setTheme(index)} aria-pressed={theme === index}><span className="scrapbook-theme-paper" style={{ backgroundColor: item.color, color: item.ink }}><i>{item.motifs[0]}</i><i>{item.motifs[1]}</i><i>{item.motifs[2]}</i></span><b>{item.name}</b></button>)}</div></div>
        {error && <p className="message message-error" role="alert">{error}</p>}
        <button className="button button-primary mockup-download" type="button" disabled={!photos.length || !ready} onClick={download}>Unduh scrapbook PNG</button>
      </div>
      <div className="carousel-preview"><div className="mockup-preview-heading"><p className="mockup-label">Pratinjau scrapbook</p>{photos.length > 0 && <span>{photos.length} foto</span>}</div>{photos.length ? <div className="carousel-canvas-scroll"><canvas ref={canvasRef} aria-label="Pratinjau scrapbook" /></div> : <div className="mockup-empty"><span>✂</span><strong>Halaman kenanganmu tampil di sini</strong><small>Unggah beberapa foto untuk mulai menyusun.</small></div>}</div>
    </section>
    <footer className="footnotes"><div className="footnote"><span className="footnote-number">01</span><p><strong>Gaya scrapbook</strong><br />Foto miring, bingkai putih, dan aksen pita.</p></div><div className="footnote"><span className="footnote-number">02</span><p><strong>PNG resolusi tinggi</strong><br />Simpan hasil dan bagikan dengan mudah.</p></div><div className="footnote"><span className="footnote-number">03</span><p><strong>Privasi terjaga</strong><br />Foto tidak diunggah ke server.</p></div></footer>
  </main><footer className="app-footer"><div className="footer-container"><div className="footer-top"><div className="footer-brand-info"><div className="footer-logo"><img className="footer-logo-mark" src="/dupcut.png" alt="" /><span>dupcut</span></div><p className="footer-desc">Alat kreatif yang mudah, aman, dan berjalan langsung di browser kamu.</p></div><SocialLinks /></div><div className="footer-divider" /><div className="footer-bottom"><p className="footer-copyright">© 2026 DupCut. Semua hak dilindungi.</p></div></div></footer></div>;
}
