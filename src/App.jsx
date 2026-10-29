import SocialLinks from './components/SocialLinks';
import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { createSHA256 } from 'hash-wasm';
import LandingPage from './components/LandingPage';
import RenamePage from './components/RenamePage';
import CropPage from './components/CropPage';
import OrganizePage from './components/OrganizePage';
import MorePage from './components/MorePage';
import RemoveBgPage from './components/RemoveBgPage';
import ConvertPage from './components/ConvertPage';
import UpdateBanner from './components/UpdateBanner';
import MockupPage from './components/MockupPage';
import CarouselGridPage from './components/CarouselGridPage';
import UpscalePage from './components/UpscalePage';
import ScrapbookPage from './components/ScrapbookPage';

const IMAGE_SIMILARITY_THRESHOLD = 6;
const HASH_PROGRESS_SHARE = 0.8;
const PHASH_SIZE = 32;
const PHASH_FREQUENCIES = 8;
const PHASH_COSINES = Array.from({ length: PHASH_FREQUENCIES }, (_, frequency) =>
  Float64Array.from(
    { length: PHASH_SIZE },
    (_, sample) => Math.cos(((2 * sample + 1) * frequency * Math.PI) / (2 * PHASH_SIZE)),
  ),
);

function HomePage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [totalSizeStr, setTotalSizeStr] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ label: '', count: '', percent: 0 });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [scanResults, setScanResults] = useState(null);
  
  const cancelledRef = useRef(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFilesChosen = (fileList) => {
    const files = Array.from(fileList || []);
    setSelectedFiles(files);
    setScanResults(null);
    setMessage({ text: '', type: '' });

    if (files.length === 0) return;

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    setTotalSizeStr(`Total ${formatSize(totalSize)} · file asli tidak akan diubah`);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unitIndex;
    return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
  };

  const getRelativePath = (file) => file.webkitRelativePath || file.name || "file";

  const isImageFile = (file) => {
    return file.type.startsWith("image/") || /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(file.name);
  };

  const hashFile = async (file, onChunk) => {
    const hash = await createSHA256();
    hash.init();
    const reader = file.stream().getReader();
    let bytesSinceYield = 0;

    try {
      while (true) {
        if (cancelledRef.current) {
          await reader.cancel();
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        hash.update(value);
        onChunk(value.byteLength);
        bytesSinceYield += value.byteLength;
        if (bytesSinceYield >= 8 * 1024 * 1024) {
          bytesSinceYield = 0;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }
    } finally {
      reader.releaseLock();
    }
    return hash.digest("hex");
  };

  const getImageFingerprint = async (file) => {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const width = bitmap.width;
      const height = bitmap.height;
      const canvas = document.createElement("canvas");
      canvas.width = PHASH_SIZE;
      canvas.height = PHASH_SIZE;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas 2D tidak tersedia.");
      context.drawImage(bitmap, 0, 0, PHASH_SIZE, PHASH_SIZE);

      const pixels = context.getImageData(0, 0, PHASH_SIZE, PHASH_SIZE).data;
      const grayscale = new Float64Array(PHASH_SIZE * PHASH_SIZE);
      const averageColor = [0, 0, 0];
      for (let pixel = 0; pixel < grayscale.length; pixel += 1) {
        const offset = pixel * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        grayscale[pixel] = 0.299 * red + 0.587 * green + 0.114 * blue;
        averageColor[0] += red;
        averageColor[1] += green;
        averageColor[2] += blue;
      }
      for (let channel = 0; channel < averageColor.length; channel += 1) {
        averageColor[channel] /= grayscale.length;
      }

      const coefficients = [];
      for (let vertical = 0; vertical < PHASH_FREQUENCIES; vertical += 1) {
        for (let horizontal = 0; horizontal < PHASH_FREQUENCIES; horizontal += 1) {
          if (horizontal === 0 && vertical === 0) continue;
          let coefficient = 0;
          for (let y = 0; y < PHASH_SIZE; y += 1) {
            const verticalCosine = PHASH_COSINES[vertical][y];
            const rowOffset = y * PHASH_SIZE;
            for (let x = 0; x < PHASH_SIZE; x += 1) {
              coefficient += grayscale[rowOffset + x] * PHASH_COSINES[horizontal][x] * verticalCosine;
            }
          }
          const horizontalScale = horizontal === 0 ? Math.SQRT1_2 : 1;
          const verticalScale = vertical === 0 ? Math.SQRT1_2 : 1;
          coefficients.push(coefficient * horizontalScale * verticalScale);
        }
      }

      const sorted = coefficients.slice().sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      let hash = 0n;
      for (let bit = 0; bit < coefficients.length; bit += 1) {
        if (coefficients[bit] > median) hash |= 1n << BigInt(bit);
      }

      return { hash, width, height, averageColor };
    } catch {
      return null;
    } finally {
      bitmap?.close();
    }
  };

  class BKTree {
    constructor() {
      this.root = null;
    }
    add(hash, group) {
      const node = { hash, group, children: new Map() };
      if (!this.root) {
        this.root = node;
        return;
      }
      let current = this.root;
      while (true) {
        const distance = this.hashDistance(hash, current.hash);
        const child = current.children.get(distance);
        if (!child) {
          current.children.set(distance, node);
          return;
        }
        current = child;
      }
    }
    hashDistance(first, second) {
      let bits = first ^ second;
      let distance = 0;
      while (bits) {
        bits &= bits - 1n;
        distance += 1;
      }
      return distance;
    }
    colorDistance(first, second) {
      return Math.sqrt(first.reduce((sum, channel, index) => sum + (channel - second[index]) ** 2, 0));
    }
    findSimilar(hash, color, threshold) {
      if (!this.root) return null;
      const pending = [this.root];
      let bestMatch = null;
      while (pending.length) {
        const current = pending.pop();
        const distance = this.hashDistance(hash, current.hash);
        const colorsMatch = this.colorDistance(current.group.signatureColor, color) <= 55;
        if (distance <= threshold && colorsMatch && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = { group: current.group, distance };
        }
        for (const [edge, child] of current.children) {
          if (edge >= distance - threshold && edge <= distance + threshold) pending.push(child);
        }
      }
      return bestMatch;
    }
  }

  const scanFiles = async () => {
    if (selectedFiles.length === 0) return;

    cancelledRef.current = false;
    setIsScanning(true);
    setScanResults(null);
    setMessage({ text: '', type: '' });

    const contentGroups = new Map();
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    let bytesRead = 0;

    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        if (cancelledRef.current) break;
        const file = selectedFiles[index];
        setProgress({
          label: `Memeriksa ${file.name}`,
          count: `${(index + 1).toLocaleString("id-ID")} / ${selectedFiles.length.toLocaleString("id-ID")}`,
          percent: Math.min(100, (bytesRead / totalBytes) * 100 * HASH_PROGRESS_SHARE)
        });

        const hash = await hashFile(file, (chunkBytes) => {
          bytesRead += chunkBytes;
        });

        if (cancelledRef.current) break;
        const key = `${file.size}:${hash}`;
        const record = { file, path: getRelativePath(file) };
        const group = contentGroups.get(key);
        if (group) {
          group.records.push(record);
        } else {
          contentGroups.set(key, { records: [record], image: null });
        }
      }

      if (cancelledRef.current) {
        setIsScanning(false);
        setMessage({ text: "Pemindaian dibatalkan. File asli tetap aman.", type: "message-info" });
        return;
      }

      const groups = [];
      const imageIndex = new BKTree();
      let undecodableImages = 0;
      const groupsToInspect = Array.from(contentGroups.values());

      for (let index = 0; index < groupsToInspect.length; index += 1) {
        if (cancelledRef.current) break;
        const contentGroup = groupsToInspect[index];
        const representative = contentGroup.records[0];
        
        setProgress({
          label: `Mengecek kemiripan foto ${representative.file.name}`,
          count: `${(index + 1).toLocaleString("id-ID")} / ${groupsToInspect.length.toLocaleString("id-ID")}`,
          percent: HASH_PROGRESS_SHARE * 100 + ((index + 1) / groupsToInspect.length) * (1 - HASH_PROGRESS_SHARE) * 100
        });

        if (isImageFile(representative.file)) {
          contentGroup.image = await getImageFingerprint(representative.file);
          if (!contentGroup.image) undecodableImages += 1;
        }

        if (contentGroup.image) {
          const match = imageIndex.findSimilar(
            contentGroup.image.hash,
            contentGroup.image.averageColor,
            IMAGE_SIMILARITY_THRESHOLD,
          );
          if (match) {
            match.group.contentGroups.push(contentGroup);
            const cp = contentGroup.image.width * contentGroup.image.height;
            const bp = match.group.best.image.width * match.group.best.image.height;
            if (cp > bp || (cp === bp && contentGroup.records[0].file.size > match.group.best.records[0].file.size)) {
              match.group.best = contentGroup;
            }
          } else {
            const photoGroup = {
              contentGroups: [contentGroup],
              best: contentGroup,
              signatureColor: contentGroup.image.averageColor,
            };
            imageIndex.add(contentGroup.image.hash, photoGroup);
            groups.push(photoGroup);
          }
        } else {
          groups.push({ contentGroups: [contentGroup], best: contentGroup });
        }
      }

      const unique = [];
      const duplicates = [];
      for (const group of groups) {
        const keptRecord = group.best.records[0];
        keptRecord.resolution = group.best.image ? `${group.best.image.width} × ${group.best.image.height}` : null;
        unique.push(keptRecord);

        for (const contentGroup of group.contentGroups) {
          for (const record of contentGroup.records) {
            if (record === keptRecord) continue;
            record.resolution = contentGroup.image ? `${contentGroup.image.width} × ${contentGroup.image.height}` : null;
            record.reason = contentGroup === group.best ? "Isi file identik" : "Foto serupa; versi resolusi tertinggi dipertahankan";
            record.keptPath = keptRecord.path;
            duplicates.push(record);
          }
        }
      }

      setScanResults({ unique, duplicates, undecodableImages });
      setIsScanning(false);
    } catch (error) {
      setIsScanning(false);
      setMessage({ text: `Pemindaian gagal: ${error.message}`, type: "message-error" });
    }
  };

  const separateFiles = async () => {
    if (!scanResults) return;
    if (typeof window.showDirectoryPicker !== "function") {
      setMessage({ text: "Pilih folder output langsung belum didukung browser ini. Gunakan Chrome/Edge terbaru.", type: "error" });
      return;
    }

    try {
      const directory = await window.showDirectoryPicker({ mode: "readwrite" });
      const records = [
        ...scanResults.unique.map((record) => ({ ...record, bucket: "Unique" })),
        ...scanResults.duplicates.map((record) => ({ ...record, bucket: "Duplicates" })),
      ];

      let copied = 0;
      for (const record of records) {
        const pathParts = [record.bucket, ...record.path.split(/[\\/]/)];
        const fileName = pathParts.pop();
        let target = directory;
        for (const part of pathParts) {
          if (part && part !== "." && part !== "..") {
            target = await target.getDirectoryHandle(part, { create: true });
          }
        }
        const fileHandle = await target.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await record.file.stream().pipeTo(writable);
        copied += 1;
      }

      setMessage({
        text: `Selesai! ${scanResults.unique.length} file disalin ke subfolder "Unique" dan ${scanResults.duplicates.length} ke "Duplicates".`,
        type: "message-success"
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage({ text: `Penyalinan gagal: ${error.message}`, type: "message-error" });
      }
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
          <p className="eyebrow">RAPIIN FILE, TANPA RIBET</p>
          <h1 id="page-title">Yang sama, ketemu.<br /><span>Yang penting, tetap aman.</span></h1>
          <p className="intro-copy">
            Pilih foto atau folder. DupCut mencari file identik dan foto serupa,
            lalu mempertahankan foto dengan resolusi tertinggi—semuanya tanpa upload.
          </p>
        </section>

        <section className="workspace" aria-label="Pemindai file">
          <div className="picker-grid">
            <label className="picker-card" htmlFor="file-input">
              <span className="picker-icon" aria-hidden="true">↥</span>
              <span className="picker-title">Pilih file</span>
              <span className="picker-hint">Pilih banyak foto atau file sekaligus</span>
              <span className="picker-action">Pilih file <span aria-hidden="true">→</span></span>
            </label>
            <label className="picker-card" htmlFor="folder-input">
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Pilih folder</span>
              <span className="picker-hint">Pindai isi folder beserta subfoldernya</span>
              <span className="picker-action">Pilih folder <span aria-hidden="true">→</span></span>
            </label>
          </div>
          <input 
            ref={fileInputRef}
            id="file-input" 
            className="visually-hidden" 
            type="file" 
            multiple 
            onChange={(e) => handleFilesChosen(e.target.files)} 
          />
          <input
            ref={folderInputRef}
            id="folder-input"
            className="visually-hidden"
            type="file"
            webkitdirectory=""
            multiple
            onChange={(e) => handleFilesChosen(e.target.files)}
          />

          <div id="selection" className="selection" style={{ display: selectedFiles.length > 0 ? 'flex' : 'none' }}>
            <div className="selection-copy">
              <strong id="selection-title">{selectedFiles.length.toLocaleString("id-ID")} file dipilih</strong>
              <span id="selection-detail">{totalSizeStr}</span>
            </div>
            <button 
              id="scan-button" 
              className="button button-primary" 
              type="button" 
              onClick={scanFiles}
              disabled={isScanning}
            >
              {isScanning ? 'Memindai...' : 'Mulai memindai'}
            </button>
          </div>

          {isScanning && (
            <div id="progress-panel" className="progress-panel" aria-live="polite">
              <div className="progress-heading">
                <span id="progress-label">{progress.label}</span>
                <span id="progress-count">{progress.count}</span>
              </div>
              <div id="progress-track" className="progress-track" role="progressbar" aria-valuenow={Math.round(progress.percent)}>
                <span id="progress-fill" style={{ width: `${progress.percent}%` }}></span>
              </div>
              <button 
                id="cancel-button" 
                className="text-button" 
                type="button"
                onClick={() => { cancelledRef.current = true; }}
              >
                Batal
              </button>
            </div>
          )}

          {message.text && (
            <p id="message" className={`message ${message.type}`} role="status">
              {message.text}
            </p>
          )}

          {scanResults && (
            <section id="results" className="results" aria-live="polite">
              <div className="results-heading">
                <div>
                  <p className="eyebrow">HASIL PEMINDAIAN</p>
                  <h2 id="results-title">File kamu sudah dipilah.</h2>
                </div>
                <button 
                  id="separate-button" 
                  className="button button-primary" 
                  type="button" 
                  onClick={separateFiles}
                  disabled={scanResults.unique.length + scanResults.duplicates.length === 0}
                >
                  Pisahkan ke folder
                </button>
              </div>
              <p className="output-hint">
                Setelah memilih folder tujuan, cek subfolder <strong>Unique</strong> dan
                <strong>Duplicates</strong> di dalamnya. Proses ini menyalin file, bukan download ZIP.
              </p>
              <div className="summary-grid">
                <article className="summary-card">
                  <span className="summary-icon unique-icon" aria-hidden="true">✓</span>
                  <span className="summary-label">File unik</span>
                  <strong id="unique-count">{scanResults.unique.length.toLocaleString("id-ID")}</strong>
                  <span id="unique-size" className="summary-size">
                    {formatSize(scanResults.unique.reduce((sum, item) => sum + item.file.size, 0))}
                  </span>
                </article>
                <article className="summary-card duplicate-card">
                  <span className="summary-icon duplicate-icon" aria-hidden="true">↗</span>
                  <span className="summary-label">Salinan duplikat</span>
                  <strong id="duplicate-count">{scanResults.duplicates.length.toLocaleString("id-ID")}</strong>
                  <span id="duplicate-size" className="summary-size">
                    {formatSize(scanResults.duplicates.reduce((sum, item) => sum + item.file.size, 0))}
                  </span>
                  <span id="duplicate-breakdown" className="summary-breakdown">
                    {scanResults.duplicates.filter(i => i.reason === "Isi file identik").length} identik · {scanResults.duplicates.filter(i => i.reason !== "Isi file identik").length} foto serupa
                  </span>
                </article>
              </div>
              <p id="result-note" className="result-note">
                {scanResults.duplicates.length > 0 ? "Angka duplikat termasuk foto serupa dan file identik persis. " : ""}
                Versi yang dipertahankan memakai jumlah piksel tertinggi. File asli tidak dihapus.
              </p>
              
              <details className="file-details">
                <summary>Lihat rincian file</summary>
                <div id="file-list" className="file-list">
                  <div className="file-group">
                    <h3>Unik · {scanResults.unique.length.toLocaleString("id-ID")}</h3>
                    {scanResults.unique.length === 0 ? (
                      <p className="empty-list">Tidak ada file.</p>
                    ) : (
                      <ul>
                        {scanResults.unique.map((record, i) => (
                          <li key={i}>
                            <span title={record.path}>{record.path}</span>
                            <span>{[record.resolution, formatSize(record.file.size)].filter(Boolean).join(" · ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="file-group">
                    <h3>Duplikat · {scanResults.duplicates.length.toLocaleString("id-ID")}</h3>
                    {scanResults.duplicates.length === 0 ? (
                      <p className="empty-list">Tidak ada file.</p>
                    ) : (
                      <ul>
                        {scanResults.duplicates.map((record, i) => (
                          <li key={i}>
                            <span title={record.path}>{record.path}</span>
                            <span>{[record.resolution, record.reason, formatSize(record.file.size)].filter(Boolean).join(" · ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </details>
            </section>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand-info">
              <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
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

function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="bottom-nav" aria-label="Navigasi Bawah">
      <Link className={`bottom-nav-link ${currentPath === '/app' ? 'bottom-nav-active' : ''}`} to="/app">
        <span>📂</span>
        <span>Pilah</span>
      </Link>
      <Link className={`bottom-nav-link ${currentPath === '/rename' ? 'bottom-nav-active' : ''}`} to="/rename">
        <span>✏️</span>
        <span>Rename</span>
      </Link>
      <Link className={`bottom-nav-link ${currentPath === '/crop' ? 'bottom-nav-active' : ''}`} to="/crop">
        <span>✂️</span>
        <span>Crop</span>
      </Link>
      <Link className={`bottom-nav-link ${currentPath === '/organize' ? 'bottom-nav-active' : ''}`} to="/organize">
        <span>📁</span>
        <span>Kategori</span>
      </Link>
      <Link className={`bottom-nav-link ${currentPath === '/more' || currentPath === '/remove-bg' || currentPath === '/convert' || currentPath === '/mockup' || currentPath === '/carousel-grid' || currentPath === '/upscale' || currentPath === '/scrapbook' ? 'bottom-nav-active' : ''}`} to="/more">
        <span>☰</span>
        <span>More</span>
      </Link>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  const showBottomNav = location.pathname !== '/';

  return (
    <div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<HomePage />} />
        <Route path="/rename" element={<RenamePage />} />
        <Route path="/crop" element={<CropPage />} />
        <Route path="/organize" element={<OrganizePage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/remove-bg" element={<RemoveBgPage />} />
        <Route path="/convert" element={<ConvertPage />} />
        <Route path="/mockup" element={<MockupPage />} />
        <Route path="/carousel-grid" element={<CarouselGridPage />} />
        <Route path="/upscale" element={<UpscalePage />} />
      <Route path="/scrapbook" element={<ScrapbookPage />} />
      </Routes>
      {showBottomNav && <BottomNav />}
      <UpdateBanner hasBottomNav={showBottomNav} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
