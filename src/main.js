import { createSHA256 } from "hash-wasm";
import "./style.css";

const fileInput = document.querySelector("#file-input");
const folderInput = document.querySelector("#folder-input");
const selection = document.querySelector("#selection");
const selectionTitle = document.querySelector("#selection-title");
const selectionDetail = document.querySelector("#selection-detail");
const scanButton = document.querySelector("#scan-button");
const progressPanel = document.querySelector("#progress-panel");
const progressLabel = document.querySelector("#progress-label");
const progressCount = document.querySelector("#progress-count");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const cancelButton = document.querySelector("#cancel-button");
const message = document.querySelector("#message");
const results = document.querySelector("#results");
const separateButton = document.querySelector("#separate-button");
const fileList = document.querySelector("#file-list");

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

let selectedFiles = [];
let scanResults = null;
let cancelled = false;

fileInput.addEventListener("change", () => setFiles(fileInput.files));
folderInput.addEventListener("change", () => setFiles(folderInput.files));
scanButton.addEventListener("click", scanFiles);
cancelButton.addEventListener("click", () => {
  cancelled = true;
  cancelButton.disabled = true;
  progressLabel.textContent = "Membatalkan pemindaian...";
});
separateButton.addEventListener("click", separateFiles);

function setFiles(fileList) {
  selectedFiles = Array.from(fileList || []);
  scanResults = null;
  results.hidden = true;
  hideMessage();

  if (selectedFiles.length === 0) {
    selection.hidden = true;
    return;
  }

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  selectionTitle.textContent = `${selectedFiles.length.toLocaleString("id-ID")} file dipilih`;
  selectionDetail.textContent = `Total ${formatSize(totalSize)} · file asli tidak akan diubah`;
  selection.hidden = false;
}

async function scanFiles() {
  if (selectedFiles.length === 0) return;

  cancelled = false;
  const filesToScan = selectedFiles.slice();
  fileInput.disabled = true;
  folderInput.disabled = true;
  scanButton.disabled = true;
  results.hidden = true;
  hideMessage();
  progressPanel.hidden = false;
  cancelButton.hidden = false;
  cancelButton.disabled = false;
  progressFill.style.width = "0%";
  progressTrack.setAttribute("aria-valuenow", "0");

  const contentGroups = new Map();
  const totalBytes = filesToScan.reduce((sum, file) => sum + file.size, 0);
  let bytesRead = 0;

  try {
    for (let index = 0; index < filesToScan.length; index += 1) {
      if (cancelled) break;
      const file = filesToScan[index];
      progressLabel.textContent = `Memeriksa ${file.name}`;
      progressCount.textContent = `${(index + 1).toLocaleString("id-ID")} / ${filesToScan.length.toLocaleString("id-ID")}`;

      const hash = await hashFile(file, (chunkBytes) => {
        bytesRead += chunkBytes;
        updateProgress(bytesRead, totalBytes, undefined, undefined, HASH_PROGRESS_SHARE);
      });

      if (cancelled) break;
      const key = `${file.size}:${hash}`;
      const record = {
        file,
        path: getRelativePath(file),
      };
      const group = contentGroups.get(key);

      if (group) {
        group.records.push(record);
      } else {
        contentGroups.set(key, { records: [record], image: null });
      }
      updateProgress(bytesRead, totalBytes, index + 1, filesToScan.length, HASH_PROGRESS_SHARE);
    }

    if (cancelled) {
      progressPanel.hidden = true;
      showMessage("Pemindaian dibatalkan. File asli tetap aman.", "info");
      return;
    }

    const groups = [];
    const imageIndex = new BKTree();
    let undecodableImages = 0;
    const groupsToInspect = Array.from(contentGroups.values());

    for (let index = 0; index < groupsToInspect.length; index += 1) {
      if (cancelled) break;
      const contentGroup = groupsToInspect[index];
      const representative = contentGroup.records[0];
      progressLabel.textContent = `Mengecek kemiripan foto ${representative.file.name}`;
      progressCount.textContent = `${(index + 1).toLocaleString("id-ID")} / ${groupsToInspect.length.toLocaleString("id-ID")}`;

      if (isImageFile(representative.file)) {
        contentGroup.image = await getImageFingerprint(representative.file);
        if (!contentGroup.image) undecodableImages += 1;
      }

      if (cancelled) break;
      if (contentGroup.image) {
        const match = imageIndex.findSimilar(
          contentGroup.image.hash,
          contentGroup.image.averageColor,
          IMAGE_SIMILARITY_THRESHOLD,
        );
        if (match) {
          match.group.contentGroups.push(contentGroup);
          if (isHigherResolution(contentGroup, match.group.best)) {
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

      const visualProgress = HASH_PROGRESS_SHARE
        + ((index + 1) / groupsToInspect.length) * (1 - HASH_PROGRESS_SHARE);
      progressFill.style.width = `${visualProgress * 100}%`;
      progressTrack.setAttribute("aria-valuenow", String(Math.round(visualProgress * 100)));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (cancelled) {
      progressPanel.hidden = true;
      showMessage("Pemindaian dibatalkan. File asli tetap aman.", "info");
      return;
    }

    const unique = [];
    const duplicates = [];
    for (const group of groups) {
      const keptRecord = group.best.records[0];
      keptRecord.resolution = group.best.image
        ? `${group.best.image.width} × ${group.best.image.height}`
        : null;
      unique.push(keptRecord);

      for (const contentGroup of group.contentGroups) {
        for (const record of contentGroup.records) {
          if (record === keptRecord) continue;
          record.resolution = contentGroup.image
            ? `${contentGroup.image.width} × ${contentGroup.image.height}`
            : null;
          record.reason = contentGroup === group.best
            ? "Isi file identik"
            : "Foto serupa; versi resolusi tertinggi dipertahankan";
          record.keptPath = keptRecord.path;
          duplicates.push(record);
        }
      }
    }

    scanResults = { unique, duplicates, undecodableImages };
    renderResults(scanResults);
    progressLabel.textContent = "Pemindaian selesai";
    progressCount.textContent = `${filesToScan.length.toLocaleString("id-ID")} file`;
    progressFill.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    cancelButton.hidden = true;
  } catch (error) {
    progressPanel.hidden = true;
    showMessage(`Pemindaian gagal: ${error.message || "browser tidak dapat membaca salah satu file."}`, "error");
  } finally {
    fileInput.disabled = false;
    folderInput.disabled = false;
    scanButton.disabled = false;
    if (!cancelled && scanResults) {
      cancelButton.hidden = true;
    } else {
      cancelButton.hidden = false;
    }
  }
}

async function hashFile(file, onChunk) {
  const hash = await createSHA256();
  hash.init();
  const reader = file.stream().getReader();
  let bytesSinceYield = 0;

  try {
    while (true) {
      if (cancelled) {
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
}

async function getImageFingerprint(file) {
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
            coefficient += grayscale[rowOffset + x]
              * PHASH_COSINES[horizontal][x]
              * verticalCosine;
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
}

function isImageFile(file) {
  return file.type.startsWith("image/")
    || /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(file.name);
}

function getPixelCount(image) {
  return image.width * image.height;
}

function isHigherResolution(candidate, current) {
  const candidatePixels = getPixelCount(candidate.image);
  const currentPixels = getPixelCount(current.image);
  return candidatePixels > currentPixels
    || (candidatePixels === currentPixels
      && candidate.records[0].file.size > current.records[0].file.size);
}

function colorDistance(first, second) {
  return Math.sqrt(first.reduce((sum, channel, index) => sum + (channel - second[index]) ** 2, 0));
}

function hashDistance(first, second) {
  let bits = first ^ second;
  let distance = 0;
  while (bits) {
    bits &= bits - 1n;
    distance += 1;
  }
  return distance;
}

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
      const distance = hashDistance(hash, current.hash);
      const child = current.children.get(distance);
      if (!child) {
        current.children.set(distance, node);
        return;
      }
      current = child;
    }
  }

  findSimilar(hash, color, threshold) {
    if (!this.root) return null;
    const pending = [this.root];
    let bestMatch = null;

    while (pending.length) {
      const current = pending.pop();
      const distance = hashDistance(hash, current.hash);
      const colorsMatch = colorDistance(current.group.signatureColor, color) <= 55;
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

function updateProgress(bytesRead, totalBytes, fileIndex, fileCount, scale = 1) {
  const percent = totalBytes === 0 ? 100 * scale : Math.min(100, (bytesRead / totalBytes) * 100 * scale);
  progressFill.style.width = `${percent}%`;
  progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
  if (fileIndex !== undefined) {
    progressCount.textContent = `${fileIndex.toLocaleString("id-ID")} / ${fileCount.toLocaleString("id-ID")} · ${formatSize(bytesRead)} / ${formatSize(totalBytes)}`;
  }
}

function renderResults({ unique, duplicates, undecodableImages }) {
  const uniqueBytes = unique.reduce((sum, item) => sum + item.file.size, 0);
  const duplicateBytes = duplicates.reduce((sum, item) => sum + item.file.size, 0);
  const exactDuplicateCount = duplicates.filter((item) => item.reason === "Isi file identik").length;
  const similarImageCount = duplicates.length - exactDuplicateCount;

  document.querySelector("#unique-count").textContent = unique.length.toLocaleString("id-ID");
  document.querySelector("#duplicate-count").textContent = duplicates.length.toLocaleString("id-ID");
  document.querySelector("#unique-size").textContent = formatSize(uniqueBytes);
  document.querySelector("#duplicate-size").textContent = formatSize(duplicateBytes);
  document.querySelector("#duplicate-breakdown").textContent =
    `${exactDuplicateCount.toLocaleString("id-ID")} identik · ${similarImageCount.toLocaleString("id-ID")} foto serupa`;
  const notes = [];
  if (similarImageCount) {
    notes.push(`Angka duplikat sekarang termasuk ${similarImageCount.toLocaleString("id-ID")} foto yang terdeteksi serupa, selain ${exactDuplicateCount.toLocaleString("id-ID")} file yang identik persis.`);
  } else if (exactDuplicateCount) {
    notes.push(`${exactDuplicateCount.toLocaleString("id-ID")} file identik persis ditemukan.`);
  } else {
    notes.push("Belum ada duplikat yang ditemukan.");
  }
  if (undecodableImages) {
    notes.push(`${undecodableImages.toLocaleString("id-ID")} gambar tidak dapat dibaca browser untuk dibandingkan secara visual; gambar tersebut hanya dicek sebagai duplikat persis.`);
  }
  if (similarImageCount) {
    notes.push("Foto serupa adalah perkiraan visual, bukan bukti file identik. Periksa nama dan resolusinya sebelum memisahkan.");
  }
  notes.push("Versi yang dipertahankan memakai jumlah piksel tertinggi, bukan jaminan paling tajam. File asli tidak dihapus.");
  document.querySelector("#result-note").textContent = notes.join(" ");
  separateButton.disabled = unique.length + duplicates.length === 0;
  separateButton.title = "";
  fileList.replaceChildren();

  for (const [label, records] of [["Unik", unique], ["Duplikat", duplicates]]) {
    const group = document.createElement("div");
    group.className = "file-group";
    const heading = document.createElement("h3");
    heading.textContent = `${label} · ${records.length.toLocaleString("id-ID")}`;
    group.append(heading);
    if (records.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-list";
      empty.textContent = "Tidak ada file.";
      group.append(empty);
    } else {
      const list = document.createElement("ul");
      for (const record of records) {
        const item = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = record.path;
        name.title = record.path;
        const size = document.createElement("span");
        size.textContent = [
          record.resolution,
          label === "Duplikat" ? record.reason : null,
          formatSize(record.file.size),
        ].filter(Boolean).join(" · ");
        if (record.keptPath) {
          size.title = `Versi yang dipertahankan: ${record.keptPath}`;
        }
        item.append(name, size);
        list.append(item);
      }
      group.append(list);
    }
    fileList.append(group);
  }

  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function separateFiles() {
  if (!scanResults) return;
  if (typeof window.showDirectoryPicker !== "function") {
    showMessage("Pilih folder output langsung belum didukung browser ini. Coba Chrome atau Edge versi terbaru.", "error");
    return;
  }

  separateButton.disabled = true;
  let copied = 0;
  try {
    const directory = await window.showDirectoryPicker({ mode: "readwrite" });
    const usedPaths = { Unique: new Set(), Duplicates: new Set() };
    const records = [
      ...scanResults.unique.map((record) => ({ ...record, bucket: "Unique" })),
      ...scanResults.duplicates.map((record) => ({ ...record, bucket: "Duplicates" })),
    ];
    progressPanel.hidden = false;
    cancelButton.hidden = true;
    progressFill.style.width = "0%";
    progressTrack.setAttribute("aria-valuenow", "0");
    progressCount.textContent = `0 / ${records.length.toLocaleString("id-ID")}`;
    hideMessage();

    for (const record of records) {
      const relativePath = makeAvailablePath(record.path, usedPaths[record.bucket]);
      const pathParts = [record.bucket, ...relativePath];
      const fileName = pathParts.pop();
      let target = directory;
      for (const part of pathParts) {
        target = await target.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await target.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await record.file.stream().pipeTo(writable);
      copied += 1;
      const percent = (copied / records.length) * 100;
      progressFill.style.width = `${percent}%`;
      progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
      progressCount.textContent = `${copied.toLocaleString("id-ID")} / ${records.length.toLocaleString("id-ID")}`;
      progressLabel.textContent = `Menyalin file ${copied.toLocaleString("id-ID")} / ${records.length.toLocaleString("id-ID")}`;
    }

    progressFill.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    progressCount.textContent = `${copied.toLocaleString("id-ID")} file`;
    progressLabel.textContent = "Pemisahan selesai";
    showMessage(
      `Selesai: ${scanResults.unique.length.toLocaleString("id-ID")} file disalin ke subfolder "Unique" dan ${scanResults.duplicates.length.toLocaleString("id-ID")} ke "Duplicates" di dalam folder yang kamu pilih. File asli tetap utuh.`,
      "success",
    );
  } catch (error) {
    if (error.name === "AbortError" && copied === 0) {
      showMessage("Pemilihan folder dibatalkan. Belum ada file yang disalin.", "info");
    } else if (error.name === "NotAllowedError") {
      showMessage(
        `Browser menolak izin menulis ke folder tujuan; ${copied.toLocaleString("id-ID")} file berhasil disalin. ${
          copied > 0 ? 'Periksa subfolder "Unique" dan "Duplicates" untuk file yang sudah tersalin. ' : ""
        }Buka DupCut langsung di tab Chrome atau Edge biasa (bukan browser tersemat), lalu coba lagi dengan folder yang bisa kamu edit, seperti Downloads atau Documents.`,
        "error",
      );
    } else {
      showMessage(
        `Penyalinan berhenti setelah ${copied.toLocaleString("id-ID")} file. ${
          error.message || "Browser tidak dapat menulis ke folder tujuan."
        } Periksa subfolder "Unique" dan "Duplicates" di folder yang dipilih.`,
        "error",
      );
    }
  } finally {
    separateButton.disabled = !scanResults || scanResults.unique.length + scanResults.duplicates.length === 0;
  }
}

function makeAvailablePath(path, usedPaths) {
  const parts = path
    .split(/[\\/]/)
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[<>:"|?*\u0000-\u001f]/g, "_"));
  if (parts.length === 0) parts.push("file");

  const originalName = parts.pop();
  let candidate = originalName;
  let number = 2;
  let key = [...parts, candidate].join("/");
  while (usedPaths.has(key.toLowerCase())) {
    const dot = originalName.lastIndexOf(".");
    const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
    const extension = dot > 0 ? originalName.slice(dot) : "";
    candidate = `${stem} (${number})${extension}`;
    key = [...parts, candidate].join("/");
    number += 1;
  }
  usedPaths.add(key.toLowerCase());
  return [...parts, candidate];
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
