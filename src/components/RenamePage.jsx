import SocialLinks from './SocialLinks';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function RenamePage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [folderName, setFolderName] = useState('File');
  const [renameMode, setRenameMode] = useState('number'); // 'number', 'folder', atau 'manual'
  const [prefix, setPrefix] = useState('File');
  const [startNum, setStartNum] = useState('1');
  const [padding, setPadding] = useState('3');
  
  const [manualNames, setManualNames] = useState({});
  const [previewFiles, setPreviewFiles] = useState([]);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [validationError, setValidationError] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ label: 'Menyiapkan...', count: '', percent: 0 });
  const [message, setMessage] = useState({ text: '', type: '' });

  const prefixInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const getRelativePath = (file) => file.webkitRelativePath || file.name || "file";

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unitIndex;
    return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
  };

  const sanitizeFileName = (name) => {
    return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "");
  };

  const handleFilesChosen = (fileList) => {
    const rawFiles = Array.from(fileList || []);
    const sortedFiles = rawFiles.sort((first, second) =>
      getRelativePath(first).localeCompare(getRelativePath(second), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    setMessage({ text: '', type: '' });
    if (sortedFiles.length === 0) {
      setSelectedFiles([]);
      setManualNames({});
      return;
    }

    const topPath = getRelativePath(sortedFiles[0]);
    const topFolder = topPath.includes('/') || topPath.includes('\\') ? topPath.split(/[\\/]/)[0] : "File";
    
    setFolderName(topFolder);
    setPrefix(topFolder);
    setSelectedFiles(sortedFiles);

    const initialManual = {};
    sortedFiles.forEach((file, index) => {
      const originalName = getRelativePath(file).split(/[\\/]/).pop() || "file";
      initialManual[index] = originalName;
    });
    setManualNames(initialManual);
  };

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviewFiles([]);
      return;
    }

    const sanitizedPrefix = sanitizeFileName(prefix.trim());
    const startVal = Number(startNum);
    const paddingVal = Number(padding);

    const names = selectedFiles.map((file, index) => {
      const originalName = getRelativePath(file).split(/[\\/]/).pop() || "file";
      const extensionIndex = originalName.lastIndexOf(".");
      const extension = extensionIndex > 0 ? originalName.slice(extensionIndex) : "";

      if (renameMode === "manual") {
        return manualNames[index] !== undefined ? manualNames[index] : originalName;
      } else if (renameMode === "number") {
        const number = String(startVal + index).padStart(paddingVal, "0");
        return `${number}${extension}`;
      } else {
        const number = String(startVal + index).padStart(paddingVal, "0");
        return `${sanitizedPrefix}_${number}${extension}`;
      }
    });

    const newPreviews = selectedFiles.map((file, index) => ({ file, name: names[index] }));
    setPreviewFiles(newPreviews);

    const invalidName = newPreviews.some((item) => !item.name || /[<>:"/\\|?*\u0000-\u001f]/.test(item.name));
    const tooLong = newPreviews.some((item) => item.name.length > 255);
    const duplicateNames = new Set(newPreviews.map((item) => item.name.toLowerCase())).size !== newPreviews.length;
    const invalidStart = !Number.isSafeInteger(startVal) || startNum === "" || startVal < 0 || startVal + Math.max(0, newPreviews.length - 1) > 999999999;
    const invalidPadding = !Number.isSafeInteger(paddingVal) || padding === "" || paddingVal < 1 || paddingVal > 9;
    const emptyPrefix = renameMode === "folder" && !sanitizedPrefix;

    setIsButtonDisabled(invalidName || tooLong || duplicateNames || invalidStart || invalidPadding || emptyPrefix);

    if (duplicateNames) {
      setValidationError("Pola ini menghasilkan nama yang sama. Pastikan tidak ada nama file kembar.");
    } else if (invalidName || tooLong || invalidStart || invalidPadding || emptyPrefix) {
      setValidationError("Periksa kembali nama file. Karakter terlarang tidak diizinkan.");
    } else {
      setValidationError("");
    }
  }, [selectedFiles, renameMode, prefix, startNum, padding, manualNames]);

  const fileExists = async (directory, name) => {
    try {
      await directory.getFileHandle(name);
      return true;
    } catch (error) {
      if (error.name === "NotFoundError") return false;
      throw error;
    }
  };

  const findAvailableName = async (directory, requestedName, usedNames) => {
    const extensionIndex = requestedName.lastIndexOf(".");
    const stem = extensionIndex > 0 ? requestedName.slice(0, extensionIndex) : requestedName;
    const extension = extensionIndex > 0 ? requestedName.slice(extensionIndex) : "";
    let candidate = requestedName;
    let suffix = 2;

    while (usedNames.has(candidate.toLowerCase()) || await fileExists(directory, candidate)) {
      candidate = `${stem} (${suffix})${extension}`;
      suffix += 1;
    }
    return candidate;
  };

  const copyRenamedFiles = async () => {
    if (previewFiles.length === 0 || isButtonDisabled) return;
    if (typeof window.showDirectoryPicker !== "function") {
      setMessage({ text: "Fitur pilih folder belum didukung di browser ini. Gunakan Chrome atau Edge terbaru.", type: "error" });
      return;
    }

    setIsButtonDisabled(true);
    setIsProcessing(true);
    let copied = 0;

    try {
      const outputDirectory = await window.showDirectoryPicker({ mode: "readwrite" });
      const renamedDirectory = await outputDirectory.getDirectoryHandle("Renamed", { create: true });
      const usedNames = new Set();
      
      setProgress({ label: "Menyiapkan...", count: `0 / ${previewFiles.length.toLocaleString("id-ID")}`, percent: 0 });
      setMessage({ text: '', type: '' });

      for (const item of previewFiles) {
        const availableName = await findAvailableName(renamedDirectory, item.name, usedNames);
        const fileHandle = await renamedDirectory.getFileHandle(availableName, { create: true });
        const writable = await fileHandle.createWritable();
        await item.file.stream().pipeTo(writable);
        usedNames.add(availableName.toLowerCase());
        copied += 1;
        const percent = (copied / previewFiles.length) * 100;
        setProgress({
          label: `Menyalin ${availableName}`,
          count: `${copied.toLocaleString("id-ID")} / ${previewFiles.length.toLocaleString("id-ID")}`,
          percent: percent
        });
      }

      setIsProcessing(false);
      setMessage({
        text: `Selesai. ${copied.toLocaleString("id-ID")} file sudah disalin ke subfolder "Renamed". File asli tidak berubah.`,
        type: "success"
      });
    } catch (error) {
      setIsProcessing(false);
      if (error.name === "AbortError" && copied === 0) {
        setMessage({ text: "Pemilihan folder dibatalkan. Belum ada file yang disalin.", type: "info" });
      } else {
        setMessage({
          text: `Penyalinan berhenti setelah ${copied.toLocaleString("id-ID")} file. ${error.message || ""}`,
          type: "error"
        });
      }
    } finally {
      setIsButtonDisabled(previewFiles.length === 0);
    }
  };

  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div>
      <main className="shell">
        <header className="topbar">
          <a className="brand" href="/app" aria-label="DupCut beranda" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/images/dupcut.png" alt="DupCut Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <span>dupcut</span>
          </a>
          <span className="privacy-pill"><span></span> Privat di perangkat kamu[cite: 6, 7]</span>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">RENAME FILE & FOLDER</p>
          <h1 id="page-title">Ubah nama file otomatis<br /><span>atau sesuai keinginan satu per satu.</span></h1>
          <p className="intro-copy">
            Pilih file atau folder, atur pola atau ubah nama file secara manual, lalu salin hasilnya dengan aman.
          </p>
        </section>

        <section className="workspace" aria-label="Pengaturan rename file">
          <div className="picker-grid">
            <label className="picker-card" htmlFor="rename-file-input">
              <span className="picker-icon" aria-hidden="true">↥</span>
              <span className="picker-title">Pilih file</span>
              <span className="picker-hint">Pilih banyak file atau foto sekaligus</span>
              <span className="picker-action">Pilih file <span aria-hidden="true">→</span></span>
            </label>
            <label className="picker-card" htmlFor="rename-folder-input">
              <span className="picker-icon folder-icon" aria-hidden="true">▱</span>
              <span className="picker-title">Pilih folder</span>
              <span className="picker-hint">Pindai isi folder beserta subfoldernya</span>
              <span className="picker-action">Pilih folder <span aria-hidden="true">→</span></span>
            </label>
          </div>

          <input 
            ref={fileInputRef}
            id="rename-file-input" 
            className="visually-hidden" 
            type="file" 
            multiple 
            onChange={(e) => handleFilesChosen(e.target.files)} 
          />
          <input
            ref={folderInputRef}
            id="rename-folder-input"
            className="visually-hidden"
            type="file"
            webkitdirectory=""
            multiple
            onChange={(e) => handleFilesChosen(e.target.files)}
          />

          <div id="rename-selection" className="selection" style={{ display: selectedFiles.length > 0 ? 'flex' : 'none', marginTop: '20px' }}>
            <div className="selection-copy">
              <strong id="rename-selection-title">{folderName} · {selectedFiles.length.toLocaleString("id-ID")} file dipilih</strong>
              <span id="rename-selection-detail">Total {formatSize(totalBytes)}</span>
            </div>
          </div>

          <section id="rename-settings" className="rename-settings" style={{ display: selectedFiles.length > 0 ? 'block' : 'none', marginTop: '24px' }} aria-label="Atur nama file">
            <div className="settings-heading">
              <p className="eyebrow">MODE RENAME</p>
              <h2>Pilih cara mengubah nama file</h2>
            </div>
            
            {/* Menggunakan struktur label dan span standar tanpa override CSS yang merusak */}
            <div className="rename-options" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <label className="rename-option" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fafbfc', border: '1px solid #e1e4e8', borderRadius: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="rename-mode" 
                  value="number" 
                  checked={renameMode === 'number'} 
                  onChange={() => setRenameMode('number')} 
                />
                <span className="option-content" style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>Nomor berurutan</strong>
                  <span style={{ fontSize: '13px', color: '#57606a' }}>Contoh: <code>001.jpg</code>, <code>002.png</code></span>
                </span>
              </label>

              <label className="rename-option" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fafbfc', border: '1px solid #e1e4e8', borderRadius: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="rename-mode" 
                  value="folder" 
                  checked={renameMode === 'folder'} 
                  onChange={() => setRenameMode('folder')} 
                />
                <span className="option-content" style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>Nama folder + nomor</strong>
                  <span style={{ fontSize: '13px', color: '#57606a' }}>Contoh: <code>Folder_001.jpg</code></span>
                </span>
              </label>

              <label className="rename-option" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fafbfc', border: '1px solid #e1e4e8', borderRadius: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="rename-mode" 
                  value="manual" 
                  checked={renameMode === 'manual'} 
                  onChange={() => setRenameMode('manual')} 
                />
                <span className="option-content" style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>Manual per file</strong>
                  <span style={{ fontSize: '13px', color: '#57606a' }}>Ubah nama satu per satu sesuai keinginan</span>
                </span>
              </label>
            </div>

            {renameMode !== 'manual' && (
              <div className="rename-controls" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <label className="field-label" htmlFor="rename-prefix" style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Nama depan
                  <input 
                    ref={prefixInputRef}
                    id="rename-prefix" 
                    className="text-input" 
                    type="text" 
                    maxLength="80" 
                    value={prefix} 
                    disabled={renameMode === 'number'}
                    onChange={(e) => setPrefix(e.target.value)}
                    style={{ marginTop: '6px', padding: '10px', borderRadius: '6px', border: '1px solid #dcdfd8' }}
                  />
                </label>
                <label className="field-label field-number" htmlFor="rename-start" style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Mulai dari
                  <input 
                    id="rename-start" 
                    className="text-input" 
                    type="number" 
                    min="0" 
                    max="999999999" 
                    value={startNum} 
                    onChange={(e) => setStartNum(e.target.value)}
                    style={{ marginTop: '6px', padding: '10px', borderRadius: '6px', border: '1px solid #dcdfd8' }}
                  />
                </label>
                <label className="field-label field-number" htmlFor="rename-padding" style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Digit nomor
                  <input 
                    id="rename-padding" 
                    className="text-input" 
                    type="number" 
                    min="1" 
                    max="9" 
                    value={padding} 
                    onChange={(e) => setPadding(e.target.value)}
                    style={{ marginTop: '6px', padding: '10px', borderRadius: '6px', border: '1px solid #dcdfd8' }}
                  />
                </label>
              </div>
            )}

            <div className="preview-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>DAFTAR & PREVIEW</p>
                <h2 id="rename-preview-title" style={{ fontSize: '16px', margin: '4px 0 0' }}>
                  {renameMode === 'manual' ? 'Ketik nama baru di bawah ini' : 'Nama file yang akan dibuat'}
                </h2>
              </div>
              <span id="rename-preview-count" className="preview-count">{previewFiles.length.toLocaleString("id-ID")} file</span>
            </div>

            <div id="rename-preview" className="rename-preview" style={{ maxHeight: '320px', overflowY: 'auto', background: '#f5f7f3', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              {previewFiles.map((item, index) => (
                <div key={index} className="rename-preview-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="preview-original" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }} title={getRelativePath(item.file)}>
                    {getRelativePath(item.file)}
                  </span>
                  <span className="preview-arrow">→</span>
                  
                  {renameMode === 'manual' ? (
                    <input
                      type="text"
                      className="text-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #dcdfd8', background: '#fff' }}
                      value={manualNames[index] !== undefined ? manualNames[index] : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualNames((prev) => ({ ...prev, [index]: val }));
                      }}
                    />
                  ) : (
                    <strong className="preview-new" style={{ flex: 1, fontSize: '13px' }} title={item.name}>{item.name}</strong>
                  )}
                </div>
              ))}
            </div>

            {validationError && (
              <p className="message message-error" style={{ marginBottom: '16px' }}>
                {validationError}
              </p>
            )}

            <button 
              id="rename-copy-button" 
              className="button button-primary rename-submit" 
              type="button" 
              disabled={isButtonDisabled}
              style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}
              onClick={copyRenamedFiles}
            >
              Salin file dengan nama baru
            </button>
            <p className="output-hint" style={{ textAlign: 'center', marginTop: '10px' }}>
              Pilih folder tujuan. Hasil masuk ke subfolder <strong>Renamed</strong> tanpa mengubah file asli.
            </p>
          </section>

          {isProcessing && (
            <div id="rename-progress-panel" className="progress-panel" aria-live="polite" style={{ marginTop: '24px' }}>
              <div className="progress-heading">
                <span id="rename-progress-label">{progress.label}</span>
                <span id="rename-progress-count">{progress.count}</span>
              </div>
              <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress.percent)}>
                <span id="rename-progress-fill" style={{ width: `${progress.percent}%` }}></span>
              </div>
            </div>
          )}

          {message.text && (
            <p id="rename-message" className={`message message-${message.type}`} role="status" style={{ marginTop: '14px' }}>
              {message.text}
            </p>
          )}
        </section>

        <footer className="footnotes">
          <div className="footnote">
            <span className="footnote-number">01</span>
            <p><strong>Ekstensi tetap</strong><br />Format file tetap seperti aslinya.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">02</span>
            <p><strong>Fleksibel</strong><br />Bisa pilih file satuan atau satu folder.</p>
          </div>
          <div className="footnote">
            <span className="footnote-number">03</span>
            <p><strong>Lokal dan aman</strong><br />Tidak ada file yang di-upload ke server.</p>
          </div>
        </footer>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand-info">
              <a href="/app" className="footer-logo">
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