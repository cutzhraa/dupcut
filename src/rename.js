import "./style.css";

const folderInput = document.querySelector("#rename-folder-input");
const selection = document.querySelector("#rename-selection");
const selectionTitle = document.querySelector("#rename-selection-title");
const selectionDetail = document.querySelector("#rename-selection-detail");
const settings = document.querySelector("#rename-settings");
const prefixInput = document.querySelector("#rename-prefix");
const startInput = document.querySelector("#rename-start");
const paddingInput = document.querySelector("#rename-padding");
const preview = document.querySelector("#rename-preview");
const previewCount = document.querySelector("#rename-preview-count");
const copyButton = document.querySelector("#rename-copy-button");
const progressPanel = document.querySelector("#rename-progress-panel");
const progressLabel = document.querySelector("#rename-progress-label");
const progressCount = document.querySelector("#rename-progress-count");
const progressTrack = document.querySelector("#rename-progress-panel [role=progressbar]");
const progressFill = document.querySelector("#rename-progress-fill");
const message = document.querySelector("#rename-message");

let selectedFiles = [];
let folderName = "File";
let previewFiles = [];

folderInput.addEventListener("change", () => setFiles(folderInput.files));
document.querySelectorAll('input[name="rename-mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    prefixInput.disabled = getMode() === "number";
    if (getMode() === "folder" && !prefixInput.value.trim()) prefixInput.value = folderName;
    renderPreview();
  });
});
[prefixInput, startInput, paddingInput].forEach((input) => {
  input.addEventListener("input", renderPreview);
});
copyButton.addEventListener("click", copyRenamedFiles);

function setFiles(fileList) {
  selectedFiles = Array.from(fileList || []).sort((first, second) =>
    getRelativePath(first).localeCompare(getRelativePath(second), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  hideMessage();
  if (selectedFiles.length === 0) {
    selection.hidden = true;
    settings.hidden = true;
    return;
  }

  folderName = getRelativePath(selectedFiles[0]).split(/[\\/]/)[0] || "File";
  prefixInput.value = folderName;
  prefixInput.disabled = getMode() === "number";
  selectionTitle.textContent = `${folderName} · ${selectedFiles.length.toLocaleString("id-ID")} file`;
  selectionDetail.textContent = `Total ${formatSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}`;
  selection.hidden = false;
  settings.hidden = false;
  renderPreview();
}

function getMode() {
  return document.querySelector('input[name="rename-mode"]:checked').value;
}

function renderPreview() {
  if (selectedFiles.length === 0) return;
  const names = createRenamedNames();
  previewFiles = selectedFiles.map((file, index) => ({ file, name: names[index] }));
  preview.replaceChildren();
  previewCount.textContent = `${selectedFiles.length.toLocaleString("id-ID")} file`;

  const previewLimit = 12;
  for (const item of previewFiles.slice(0, previewLimit)) {
    const row = document.createElement("div");
    row.className = "rename-preview-row";
    const originalName = document.createElement("span");
    originalName.className = "preview-original";
    originalName.textContent = getRelativePath(item.file);
    originalName.title = originalName.textContent;
    const arrow = document.createElement("span");
    arrow.className = "preview-arrow";
    arrow.textContent = "→";
    const newName = document.createElement("strong");
    newName.className = "preview-new";
    newName.textContent = item.name;
    newName.title = item.name;
    row.append(originalName, arrow, newName);
    preview.append(row);
  }

  if (previewFiles.length > previewLimit) {
    const more = document.createElement("p");
    more.className = "preview-more";
    more.textContent = `dan ${ (previewFiles.length - previewLimit).toLocaleString("id-ID")} file lainnya...`;
    preview.append(more);
  }

  const invalidName = previewFiles.some((item) => !item.name || /[<>:"/\\|?*\u0000-\u001f]/.test(item.name));
  const tooLong = previewFiles.some((item) => item.name.length > 255);
  const duplicateNames = new Set(previewFiles.map((item) => item.name.toLowerCase())).size !== previewFiles.length;
  const invalidStart = !Number.isSafeInteger(Number(startInput.value))
    || startInput.value === ""
    || Number(startInput.value) < 0
    || Number(startInput.value) + Math.max(0, previewFiles.length - 1) > 999999999;
  const invalidPadding = !Number.isSafeInteger(Number(paddingInput.value))
    || paddingInput.value === ""
    || Number(paddingInput.value) < 1
    || Number(paddingInput.value) > 9;
  const emptyPrefix = getMode() === "folder" && !sanitizeFileName(prefixInput.value.trim());
  copyButton.disabled = invalidName || tooLong || duplicateNames || invalidStart || invalidPadding || emptyPrefix;
  if (duplicateNames) {
    showMessage("Pola ini menghasilkan nama yang sama. Ubah nama depan atau nomor mulai.", "error");
  } else if (invalidName || tooLong || invalidStart || invalidPadding || emptyPrefix) {
    showMessage("Periksa nama depan dan pengaturan nomor. Nama file tidak boleh memakai karakter terlarang.", "error");
  } else {
    hideMessage();
  }
}

function createRenamedNames() {
  const mode = getMode();
  const prefix = sanitizeFileName(prefixInput.value.trim());
  const start = Number(startInput.value);
  const padding = Number(paddingInput.value);

  return selectedFiles.map((file, index) => {
    const originalName = getRelativePath(file).split(/[\\/]/).pop() || "file";
    const extensionIndex = originalName.lastIndexOf(".");
    const extension = extensionIndex > 0 ? originalName.slice(extensionIndex) : "";
    const number = String(start + index).padStart(padding, "0");
    return mode === "number" ? `${number}${extension}` : `${prefix}_${number}${extension}`;
  });
}

async function copyRenamedFiles() {
  if (previewFiles.length === 0 || copyButton.disabled) return;
  if (typeof window.showDirectoryPicker !== "function") {
    showMessage("Fitur pilih folder belum didukung di browser ini. Gunakan Chrome atau Edge terbaru.", "error");
    return;
  }

  copyButton.disabled = true;
  let copied = 0;
  try {
    const outputDirectory = await window.showDirectoryPicker({ mode: "readwrite" });
    const renamedDirectory = await outputDirectory.getDirectoryHandle("Renamed", { create: true });
    const usedNames = new Set();
    progressPanel.hidden = false;
    progressFill.style.width = "0%";
    progressTrack.setAttribute("aria-valuenow", "0");
    progressCount.textContent = `0 / ${previewFiles.length.toLocaleString("id-ID")}`;
    hideMessage();

    for (const item of previewFiles) {
      const availableName = await findAvailableName(renamedDirectory, item.name, usedNames);
      const fileHandle = await renamedDirectory.getFileHandle(availableName, { create: true });
      const writable = await fileHandle.createWritable();
      await item.file.stream().pipeTo(writable);
      usedNames.add(availableName.toLowerCase());
      copied += 1;
      const percent = (copied / previewFiles.length) * 100;
      progressFill.style.width = `${percent}%`;
      progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
      progressCount.textContent = `${copied.toLocaleString("id-ID")} / ${previewFiles.length.toLocaleString("id-ID")}`;
      progressLabel.textContent = `Menyalin ${availableName}`;
    }

    progressLabel.textContent = "Rename selesai";
    showMessage(`Selesai. ${copied.toLocaleString("id-ID")} file sudah disalin ke subfolder "Renamed". File asli tidak berubah.`, "success");
  } catch (error) {
    if (error.name === "AbortError" && copied === 0) {
      showMessage("Pemilihan folder dibatalkan. Belum ada file yang disalin.", "info");
    } else if (error.name === "NotAllowedError") {
      showMessage(
        `Browser menolak izin menulis; ${copied.toLocaleString("id-ID")} file berhasil disalin. ${
          copied ? 'Periksa subfolder "Renamed" untuk hasil yang sudah tersalin. ' : ""
        }Buka halaman langsung di Chrome atau Edge biasa dan pilih folder yang bisa kamu edit.`,
        "error",
      );
    } else {
      showMessage(
        `Penyalinan berhenti setelah ${copied.toLocaleString("id-ID")} file. ${
          error.message || "Browser tidak dapat menulis ke folder tujuan."
        } Periksa subfolder "Renamed" untuk hasil yang sudah tersalin.`,
        "error",
      );
    }
  } finally {
    copyButton.disabled = previewFiles.length === 0;
  }
}

async function findAvailableName(directory, requestedName, usedNames) {
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
}

async function fileExists(directory, name) {
  try {
    await directory.getFileHandle(name);
    return true;
  } catch (error) {
    if (error.name === "NotFoundError") return false;
    throw error;
  }
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "");
}

function getRelativePath(file) {
  return file.webkitRelativePath || file.name || "file";
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message message-${type}`;
  message.hidden = false;
}

function hideMessage() {
  message.hidden = true;
  message.textContent = "";
}
