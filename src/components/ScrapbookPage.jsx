import { useEffect, useRef, useState } from 'react';
import SocialLinks from './SocialLinks';

const MAX_PHOTOS = 12;
const PAPERS = [
  { name: 'Krem', color: '#f4ead8', ink: '#554a3c' },
  { name: 'Pink', color: '#f5dfe2', ink: '#684b50' },
  { name: 'Mint', color: '#dce9db', ink: '#455c4a' },
  { name: 'Biru', color: '#dce8ef', ink: '#455969' },
];

export default function ScrapbookPage() {
  const [photos, setPhotos] = useState([]);
  const [paper, setPaper] = useState(0);
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
    const columns = photos.length < 3 ? photos.length : 3;
    const rows = Math.ceil(photos.length / columns);
    const cellWidth = 330;
    const cellHeight = 370;
    const gap = 34;
    const top = 210;
    const height = top + rows * (cellHeight + gap) + 70;
    const selectedPaper = PAPERS[paper];
    canvas.width = width * 2;
    canvas.height = height * 2;
    context.scale(2, 2);
    context.fillStyle = selectedPaper.color;
    context.fillRect(0, 0, width, height);
    // Subtle paper grain and a hand-drawn page border.
    context.globalAlpha = 0.09;
    context.fillStyle = '#8c7358';
    for (let y = 15; y < height; y += 28) for (let x = (y % 2) * 9; x < width; x += 28) context.fillRect(x, y, 1.5, 1.5);
    context.globalAlpha = 1;
    context.strokeStyle = `${selectedPaper.ink}55`;
    context.lineWidth = 2;
    context.setLineDash([4, 9]);
    context.strokeRect(30, 30, width - 60, height - 60);
    context.setLineDash([]);
    context.fillStyle = selectedPaper.ink;
    context.textAlign = 'center';
    context.font = 'italic 64px Georgia, serif';
    context.fillText(title || 'little moments', width / 2, 118, width - 100);
    context.font = '20px Georgia, serif';
    context.globalAlpha = 0.72;
    context.fillText('✦  memories collected with love  ✦', width / 2, 158);
    context.globalAlpha = 1;

    photos.forEach((photo, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, photos.length - row * columns);
      const rowWidth = rowCount * cellWidth + (rowCount - 1) * gap;
      const x = (width - rowWidth) / 2 + (index % columns) * (cellWidth + gap);
      const y = top + row * (cellHeight + gap);
      const tilt = [-0.045, 0.035, -0.025, 0.05, -0.035][index % 5];
      context.save();
      context.translate(x + cellWidth / 2, y + cellHeight / 2);
      context.rotate(tilt);
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
      // Washi tape across the top edge of each photo.
      context.globalAlpha = 0.76;
      context.fillStyle = ['#e9b9a9', '#e8d28e', '#b7c9b1', '#b9cad8'][index % 4];
      context.translate(0, -cellHeight / 2 + 8);
      context.rotate(-0.08);
      context.fillRect(-47, -8, 94, 18);
      context.globalAlpha = 1;
      context.restore();
    });
  }, [photos, paper, title, ready]);

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
        <label className="mockup-title-field"><span className="mockup-label">Judul halaman</span><input value={title} maxLength={32} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="carousel-background-picker"><span className="mockup-label">Warna kertas</span><div className="mockup-swatches">{PAPERS.map((item, index) => <button key={item.name} type="button" title={item.name} aria-label={`Kertas ${item.name}`} className={paper === index ? 'active' : ''} style={{ background: item.color }} onClick={() => setPaper(index)} />)}</div></div>
        {error && <p className="message message-error" role="alert">{error}</p>}
        <button className="button button-primary mockup-download" type="button" disabled={!photos.length || !ready} onClick={download}>Unduh scrapbook PNG</button>
      </div>
      <div className="carousel-preview"><div className="mockup-preview-heading"><p className="mockup-label">Pratinjau scrapbook</p>{photos.length > 0 && <span>{photos.length} foto</span>}</div>{photos.length ? <div className="carousel-canvas-scroll"><canvas ref={canvasRef} aria-label="Pratinjau scrapbook" /></div> : <div className="mockup-empty"><span>✂</span><strong>Halaman kenanganmu tampil di sini</strong><small>Unggah beberapa foto untuk mulai menyusun.</small></div>}</div>
    </section>
    <footer className="footnotes"><div className="footnote"><span className="footnote-number">01</span><p><strong>Gaya scrapbook</strong><br />Foto miring, bingkai putih, dan aksen pita.</p></div><div className="footnote"><span className="footnote-number">02</span><p><strong>PNG resolusi tinggi</strong><br />Simpan hasil dan bagikan dengan mudah.</p></div><div className="footnote"><span className="footnote-number">03</span><p><strong>Privasi terjaga</strong><br />Foto tidak diunggah ke server.</p></div></footer>
  </main><footer className="app-footer"><div className="footer-container"><div className="footer-top"><div className="footer-brand-info"><div className="footer-logo"><img className="footer-logo-mark" src="/dupcut.png" alt="" /><span>dupcut</span></div><p className="footer-desc">Alat kreatif yang mudah, aman, dan berjalan langsung di browser kamu.</p></div><SocialLinks /></div><div className="footer-divider" /><div className="footer-bottom"><p className="footer-copyright">© 2026 DupCut. Semua hak dilindungi.</p></div></div></footer></div>;
}
