import SocialLinks from './SocialLinks';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createZipBlob } from '../utils/createZip';

export default function OrganizePage() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const [files, setFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ text: '', percent: 0, count: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [zipUrl, setZipUrl] = useState(null);
  const [zipFileName, setZipFileName] = useState('');

  // Kamus kategori beserta label Indonesia dan daftar ekstensi file-nya
  const categoriesDef = {
    Gambar: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'] },
    Video: { extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'] },
    Audio: { extensions: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'] },
    Dokumen: { extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'] },
    Arsip: { extensions: ['zip', 'rar', '7z', 'tar', 'gz'] },
    Kode: { extensions: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'] },
    Lainnya: { extensions: [] }
  };

  const getCategory = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    for (const [catName, def] of Object.entries(categoriesDef)) {
      if (def.extensions.includes(ext)) {
        return catName;
      }
    }
    return 'Lainnya';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFolderSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    const firstPath = selectedFiles[0].webkitRelativePath || selectedFiles[0].name;
    const topFolder = firstPath.split('/')[0] || 'Folder Berantakan';
    
    setFolderName(topFolder);
    setFiles(selectedFiles);
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setZipUrl(null);
    setZipFileName('');
    setMessage({ text: '', type: '' });
  };

  const downloadOrganizedZip = async (fallback = false) => {
    setIsProcessing(true);
    setMessage({ text: '', type: '' });
    setProgress({ text: 'Menyiapkan arsip ZIP...', percent: 0, count: '' });

    try {
      const rootName = `Organized_${folderName || 'Files'}`;
      const usedPaths = new Set();
      const entries = files.map((file) => {
        const category = getCategory(file.name);
        const extensionIndex = file.name.lastIndexOf('.');
        const stem = extensionIndex > 0 ? file.name.slice(0, extensionIndex) : file.name;
        const extension = extensionIndex > 0 ? file.name.slice(extensionIndex) : '';
        let name = file.name;
        let suffix = 2;
        let path = `${rootName}/${category}/${name}`;
        while (usedPaths.has(path)) {
          name = `${stem} (${suffix})${extension}`;
          path = `${rootName}/${category}/${name}`;
          suffix += 1;
        }
        usedPaths.add(path);
        return { file, path };
      });

      const zipBlob = await createZipBlob(entries, (done, total, fileName) => {
        setProgress({
          text: `Menyiapkan ZIP: ${fileName}`,
          percent: Math.round((done / total) * 100),
          count: `${done} dari ${total}`
        });
      });
      if (zipUrl) URL.revokeObjectURL(zipUrl);
      setZipUrl(URL.createObjectURL(zipBlob));
      setZipFileName(`${rootName}.zip`);
      setMessage({
        text: fallback
          ? 'Browser HP tidak berhasil membuat folder langsung. Arsip ZIP sudah siap; ekstrak ZIP untuk melihat folder kategori.'
          : 'Arsip ZIP berisi file yang sudah dikelompokkan dan siap diunduh.',
        type: 'message-success'
      });
    } catch (error) {
      setMessage({ text: `Gagal membuat ZIP: ${error.message}`, type: 'message-error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartOrganize = async () => {
    if (files.length === 0) return;

    // Android may expose the picker while its file provider cannot reliably create nested files.
    if (!window.showDirectoryPicker || isAndroid) {
      await downloadOrganizedZip();
      return;
    }

    try {
      setIsProcessing(true);
      setMessage({ text: '', type: '' });
      
      const targetDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const organizedDirHandle = await targetDirHandle.getDirectoryHandle(`Organized_${folderName}`, { create: true });

      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const category = getCategory(file.name);

        setProgress({
          text: `Memindahkan ke folder [${category}]: ${file.name}`,
          percent: Math.round(((i + 1) / files.length) * 100),
          count: `${i + 1} dari ${files.length}`
        });

        const categoryDirHandle = await organizedDirHandle.getDirectoryHandle(category, { create: true });
        const newFileHandle = await categoryDirHandle.getFileHandle(file.name, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        successCount++;
      }

      setIsProcessing(false);
      setMessage({
        text: `Berhasil! ${successCount} file telah dikelompokkan dan disalin ke dalam subfolder terstruktur.`,
        type: 'message-success'
      });
    } catch (err) {
      setIsProcessing(false);
      if (err.name === 'AbortError') return;
      await downloadOrganizedZip(true);
    }
  };

  // Mengelompokkan file ke dalam objek berdasarkan kategori
  const groupedFiles = files.reduce((acc, file) => {
    const cat = getCategory(file.name);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(file);
    return acc;
  }, {});

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
          <p className="eyebrow">RAPIHIN FOLDER BERANTAKAN</p>
          <h1 id="page-title">Pisahkan file otomatis,<br /><span>berdasarkan jenisnya.</span></h1>
          <p className="intro-copy">
            Pilih folder yang berantakan, DupCut akan menyortir gambar, video, musik, dan dokumen ke folder masing-masing.
          </p>
        </section>

        <section className="workspace" aria-label="Pengaturan organize file">
          <div className="rename-picker-wrap">
            <label className="picker-card rename-picker" htmlFor="organize-folder-input">
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Pilih folder berantakan</span>
              <span className="picker-hint">Semua file dan subfolder di dalamnya akan dipindai</span>
              <span className="picker-action">Pilih folder <span aria-hidden="true">→</span></span>
            </label>
            <input
              id="organize-folder-input"
              className="visually-hidden"
              type="file"
              webkitdirectory=""
              multiple
              onChange={handleFolderSelect}
            />
            
            {files.length > 0 && (
              <div className="selection rename-selection" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="selection-copy">
                  <strong>{folderName}</strong>
                  <span>Ditemukan {files.length} file campur aduk</span>
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <section className="rename-settings" style={{ marginTop: '28px' }}>
              <div className="settings-heading">
                <p className="eyebrow">PRATINJAU KATEGORI</p>
                <h2>Hasil pemisahan otomatis</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {Object.keys(categoriesDef).map((catName) => {
                  const count = groupedFiles[catName] ? groupedFiles[catName].length : 0;
                  if (count === 0) return null;
                  return (
                    <article key={catName} className="summary-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e9e3' }}>
                      <span className="summary-label" style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{catName}</span>
                      <strong style={{ fontSize: '1.25rem', marginTop: '6px', color: '#1a2e22' }}>{count} file</strong>
                    </article>
                  );
                })}
              </div>

              {/* Kotak Rincian File yang Masuk ke Masing-Masing Kategori */}
              <details className="file-details" style={{ marginTop: '24px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--green, #285943)' }}>Lihat rincian file per kategori</summary>
                <div className="file-list" style={{ marginTop: '12px' }}>
                  {Object.entries(groupedFiles).map(([catName, catFiles]) => (
                    <div key={catName} className="file-group" style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: '#333' }}>{catName} · {catFiles.length}</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {catFiles.map((file, i) => (
                          <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                            <span title={file.webkitRelativePath || file.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                              {file.webkitRelativePath || file.name}
                            </span>
                            <span style={{ color: '#666' }}>{formatBytes(file.size)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>

              <button 
                className="button button-primary rename-submit" 
                type="button" 
                disabled={isProcessing}
                style={{ marginTop: '24px', width: '100%' }}
                onClick={handleStartOrganize}
              >
                {isProcessing ? 'Memproses...' : isAndroid ? 'Rapihin & Siapkan ZIP' : 'Mulai Rapihin & Pisahkan ke Folder'}
              </button>
              
              <p className="output-hint" style={{ marginTop: '12px' }}>
                File asli di folder asal aman dan tidak dihapus. Di HP, hasil sortir diunduh sebagai ZIP berisi folder kategori.
              </p>
              {zipUrl && (
                <a className="button button-primary rename-submit" href={zipUrl} download={zipFileName} style={{ display: 'block', marginTop: '12px', textAlign: 'center', textDecoration: 'none' }}>
                  Unduh ZIP Hasil Kategori
                </a>
              )}
            </section>
          )}

          {isProcessing && (
            <div className="progress-panel" aria-live="polite" style={{ marginTop: '24px' }}>
              <div className="progress-heading">
                <span>{progress.text}</span>
                <span>{progress.count}</span>
              </div>
              <div className="progress-track" role="progressbar">
                <span style={{ width: `${progress.percent}%` }}></span>
              </div>
            </div>
          )}

          {message.text && (
            <p className={`message ${message.type}`} role="status" style={{ marginTop: '14px' }}>
              {message.text}
            </p>
          )}
        </section>

        <footer className="footnotes">
          <div className="footnote">
            <span className="footnote-number">01</span>
            <p><strong>Sortir Otomatis</strong><br />Mengenali ekstensi file dengan cepat.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">02</span>
            <p><strong>Tanpa Kehilangan Data</strong><br />File disalin, bukan dipindah paksa atau dihapus.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">03</span>
            <p><strong>100% Privat</strong><br />Diproses secara lokal di browser kamu.</p>
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
