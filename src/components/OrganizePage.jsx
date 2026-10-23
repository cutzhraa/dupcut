import SocialLinks from './SocialLinks';
import React, { useState } from 'react';

const sanitizeFileName = (fileName) => {
  let safeName = String(fileName || 'file')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .trim()
    .replace(/[. ]+$/g, '');

  if (!safeName || safeName === '.' || safeName === '..') safeName = 'file';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safeName)) safeName = `_${safeName}`;

  const extensionIndex = safeName.lastIndexOf('.');
  const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
  const stem = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
  const maxStemLength = Math.max(1, 180 - Array.from(extension).length);
  return `${Array.from(stem).slice(0, maxStemLength).join('')}${extension}`;
};

const getUniqueFileName = (fileName, usedNames) => {
  const safeName = sanitizeFileName(fileName);
  const extensionIndex = safeName.lastIndexOf('.');
  const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
  const stem = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
  let candidate = safeName;
  let suffix = 2;

  while (usedNames.has(candidate.toLocaleLowerCase())) {
    const suffixText = ` (${suffix})`;
    const maxStemLength = Math.max(1, 180 - Array.from(extension).length - suffixText.length);
    candidate = `${Array.from(stem).slice(0, maxStemLength).join('')}${suffixText}${extension}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLocaleLowerCase());
  return candidate;
};

export default function OrganizePage() {
  const [files, setFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ text: '', percent: 0, count: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

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
    const selectedFiles = Array.from(e.target.files).filter((file) => {
      const lowerName = file.name.toLowerCase();
      return !['desktop.ini', 'thumbs.db', '.ds_store', '.localized'].includes(lowerName)
        && !lowerName.startsWith('._')
        && !lowerName.startsWith('.pending-');
    });
    if (selectedFiles.length === 0) return;

    const firstPath = selectedFiles[0].webkitRelativePath || selectedFiles[0].name;
    const topFolder = firstPath.split('/')[0] || 'Folder Berantakan';
    
    setFolderName(topFolder);
    setFiles(selectedFiles);
    setMessage({ text: '', type: '' });
  };

  const handleStartOrganize = async () => {
    if (files.length === 0) return;

    if (!window.showDirectoryPicker) {
      setMessage({
        text: 'Browser ini belum mendukung pembuatan folder langsung. Buka DupCut di Chrome atau Edge versi terbaru untuk memilih folder tujuan.',
        type: 'message-error'
      });
      return;
    }

    let currentFileName = '';
    let opfsRoot = null;
    let stagingDirectoryName = null;
    const unavailableFiles = [];
    const unavailableIndexes = new Set();
    try {
      setIsProcessing(true);
      setMessage({ text: '', type: '' });
      
      setProgress({ text: 'Pilih folder tujuan untuk hasil pemisahan.', percent: 0, count: '' });
      const targetDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      let stagingDirectory = null;

      // Snapshot source files before creating output so mobile file-provider references
      // cannot expire or change while the destination is being written.
      if (navigator.storage?.getDirectory) {
        opfsRoot = await navigator.storage.getDirectory();
        stagingDirectoryName = `dupcut-staging-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        stagingDirectory = await opfsRoot.getDirectoryHandle(stagingDirectoryName, { create: true });

        for (let i = 0; i < files.length; i++) {
          currentFileName = files[i].name;
          setProgress({
            text: `Menyiapkan salinan sementara: ${currentFileName}`,
            percent: Math.round(((i + 1) / files.length) * 40),
            count: `${i + 1} dari ${files.length}`
          });
          const stagedHandle = await stagingDirectory.getFileHandle(`${i}.bin`, { create: true });
          const stagedWriter = await stagedHandle.createWritable();
          try {
            await stagedWriter.write(files[i]);
            await stagedWriter.close();
          } catch (stageError) {
            try { await stagedWriter.abort(); } catch { /* The writer may already be closed. */ }
            if (stageError.name === 'NotFoundError' || /could not be found/i.test(stageError.message)) {
              unavailableFiles.push(files[i].name);
              unavailableIndexes.add(i);
              try { await stagingDirectory.removeEntry(`${i}.bin`); } catch { /* Ignore incomplete staging entries. */ }
              continue;
            }
            throw new Error(`Tidak bisa menyiapkan file "${files[i].name}": ${stageError.message}`);
          }
        }
      } else if (targetDirHandle.name === folderName) {
        throw new Error('Browser ini tidak menyediakan penyimpanan sementara untuk folder yang sama. Pilih folder tujuan lain atau gunakan Chrome/Edge terbaru.');
      }

      currentFileName = '';
      const availableIndexes = files
        .map((_, index) => index)
        .filter((index) => !unavailableIndexes.has(index));
      if (availableIndexes.length === 0) {
        throw new Error('Tidak ada file yang bisa dibaca. Pilih ulang folder sumber lalu coba lagi.');
      }

      const organizedDirHandle = await targetDirHandle.getDirectoryHandle(`Hasil_Pemisahan_${folderName}`, { create: true });
      const usedNames = new Map();
      const copyingProgressStart = stagingDirectory ? 40 : 0;

      let successCount = 0;
      for (let position = 0; position < availableIndexes.length; position++) {
        const i = availableIndexes[position];
        const sourceFile = files[i];
        currentFileName = sourceFile.name;
        const file = stagingDirectory
          ? await (await stagingDirectory.getFileHandle(`${i}.bin`)).getFile()
          : sourceFile;
        const category = getCategory(sourceFile.name);
        const categoryNames = usedNames.get(category) || new Set();
        const outputName = getUniqueFileName(sourceFile.name, categoryNames);
        usedNames.set(category, categoryNames);

        setProgress({
          text: `Menyalin ke folder [${category}]: ${sourceFile.name}`,
          percent: Math.round(copyingProgressStart + ((position + 1) / availableIndexes.length) * (100 - copyingProgressStart)),
          count: `${position + 1} dari ${availableIndexes.length}`
        });

        const categoryDirHandle = await organizedDirHandle.getDirectoryHandle(category, { create: true });
        const newFileHandle = await categoryDirHandle.getFileHandle(outputName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        successCount++;
      }

      setMessage({
        text: unavailableFiles.length
          ? `Selesai dengan catatan: ${successCount} file dipisahkan. ${unavailableFiles.length} file tidak tersedia saat dibaca (${unavailableFiles.slice(0, 3).join(', ')}${unavailableFiles.length > 3 ? ', …' : ''}). Pilih ulang folder sumber untuk mencoba file tersebut lagi.`
          : `Berhasil! ${successCount} file telah dikelompokkan dan disalin ke dalam subfolder terstruktur.`,
        type: unavailableFiles.length ? 'message-error' : 'message-success'
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessage({ text: 'Pemilihan folder tujuan dibatalkan.', type: '' });
      } else {
        const fileDetail = currentFileName ? ` File yang sedang diproses: "${currentFileName}".` : '';
        setMessage({ text: `Gagal membuat folder hasil: ${err.message || 'Terjadi kesalahan saat menulis file.'}${fileDetail}`, type: 'message-error' });
      }
    } finally {
      if (opfsRoot && stagingDirectoryName) {
        try {
          await opfsRoot.removeEntry(stagingDirectoryName, { recursive: true });
        } catch {
          // Temporary data can be cleaned up by the browser if explicit cleanup is unavailable.
        }
      }
      setIsProcessing(false);
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
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <span>dupcut</span>
          </div>
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
                {isProcessing ? progress.text || 'Memproses...' : 'Pilih folder tujuan & pisahkan'}
              </button>
              
              <p className="output-hint" style={{ marginTop: '12px' }}>
                Pilih folder tujuan saat diminta. DupCut membuat folder Hasil_Pemisahan di dalamnya dan menyalin file ke subfolder kategori; file asli tetap aman. Kamu juga bisa memilih folder sumber yang sama.
              </p>
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
