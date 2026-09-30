import "./style.css";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 15 * 60;
const OUTPUT_SAMPLE_RATE = 44100;

const fileInput = document.querySelector("#audio-input");
const details = document.querySelector("#audio-details");
const nameOutput = document.querySelector("#audio-file-name");
const player = document.querySelector("#audio-player");
const sizeOutput = document.querySelector("#audio-size");
const durationOutput = document.querySelector("#audio-duration");
const sampleRateOutput = document.querySelector("#audio-sample-rate");
const channelsOutput = document.querySelector("#audio-channels");
const extensionOutput = document.querySelector("#audio-extension");
const diagnosis = document.querySelector("#audio-diagnosis");
const bitrateInput = document.querySelector("#audio-bitrate");
const convertButton = document.querySelector("#convert-button");
const progressPanel = document.querySelector("#audio-progress-panel");
const progressLabel = document.querySelector("#audio-progress-label");
const progressCount = document.querySelector("#audio-progress-count");
const progressTrack = document.querySelector("#audio-progress-panel [role=progressbar]");
const progressFill = document.querySelector("#audio-progress-fill");
const message = document.querySelector("#audio-message");

let currentFile = null;
let audioUrl = null;
let audioReady = false;

fileInput.addEventListener("change", () => loadAudio(fileInput.files?.[0]));
document.querySelector("#replace-audio").addEventListener("click", () => fileInput.click());
convertButton.addEventListener("click", convertToMp3);

async function loadAudio(file) {
  if (!file) return;
  releaseAudioUrl();
  currentFile = file;
  audioReady = false;
  hideMessage();
  convertButton.disabled = true;
  details.hidden = false;
  nameOutput.textContent = file.name;
  nameOutput.title = file.name;
  sizeOutput.textContent = formatSize(file.size);
  extensionOutput.textContent = getExtension(file.name) || "tanpa ekstensi";
  player.pause();
  player.removeAttribute("src");
  player.load();

  if (file.size > MAX_FILE_SIZE) {
    diagnosis.textContent = "File lebih dari 25 MB. Untuk mencegah browser kehabisan memori, pemeriksaan dan konversi perlu aplikasi desktop.";
    sampleRateOutput.textContent = "Belum diperiksa";
    channelsOutput.textContent = "Belum diperiksa";
    durationOutput.textContent = "Belum diperiksa";
    showMessage("File terlalu besar untuk dikonversi dengan aman di browser (maksimum 25 MB).", "error");
    return;
  }

  audioUrl = URL.createObjectURL(file);
  player.src = audioUrl;
  progressPanel.hidden = false;
  progressLabel.textContent = "Mengecek apakah browser bisa membaca file...";
  progressCount.textContent = "";
  progressFill.style.width = "15%";
  progressTrack.setAttribute("aria-valuenow", "15");

  const mediaDuration = await readMediaDuration(player);
  if (currentFile !== file) return;
  if (mediaDuration !== null) {
    durationOutput.textContent = formatDuration(mediaDuration);
    if (mediaDuration > MAX_DURATION_SECONDS) {
      diagnosis.textContent = "Durasi lebih dari 15 menit. Untuk mencegah browser kehabisan memori, gunakan aplikasi konverter desktop.";
      sampleRateOutput.textContent = "Belum diperiksa";
      channelsOutput.textContent = "Belum diperiksa";
      progressPanel.hidden = true;
      showMessage("Durasi file lebih dari 15 menit; konversi di browser dibatasi untuk melindungi memori perangkat.", "error");
      return;
    }
  }

  let context;
  try {
    context = new AudioContext();
    const audioBuffer = await context.decodeAudioData(await file.arrayBuffer());
    if (currentFile !== file) return;
    durationOutput.textContent = formatDuration(audioBuffer.duration);
    sampleRateOutput.textContent = `${audioBuffer.sampleRate.toLocaleString("id-ID")} Hz`;
    channelsOutput.textContent = audioBuffer.numberOfChannels === 1
      ? "Mono (1)"
      : `${audioBuffer.numberOfChannels} channel`;
    const isAlreadyCommonMp3 = getExtension(file.name).toLowerCase() === "mp3"
      && audioBuffer.numberOfChannels <= 2;
    diagnosis.textContent = isAlreadyCommonMp3
      ? "File berekstensi MP3 dan browser berhasil membacanya. Kalau speaker tetap menolak, penyebabnya mungkin bitrate, nama file, folder, atau format USB—coba konversi MP3 standar."
      : "Browser berhasil membaca audio. Konversi akan membuat MP3 stereo 44.1 kHz; codec MP3 umumnya lebih kompatibel dengan speaker USB.";
    audioReady = true;
    convertButton.disabled = !audioReady;
    progressLabel.textContent = "Pemeriksaan selesai";
    progressCount.textContent = `${formatDuration(audioBuffer.duration)} · ${audioBuffer.numberOfChannels} channel`;
    progressFill.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    hideMessage();
  } catch (error) {
    if (currentFile !== file) return;
    durationOutput.textContent = "Tidak terbaca";
    sampleRateOutput.textContent = "Tidak terbaca";
    channelsOutput.textContent = "Tidak terbaca";
    audioReady = false;
    diagnosis.textContent = "Browser tidak dapat mendekode file. Format mungkin tidak didukung atau file mungkin rusak. Konverter ini tidak bisa memperbaiki file yang tak dapat dibaca.";
    showMessage("Gagal membaca audio. Coba pastikan file bisa diputar penuh di laptop atau gunakan aplikasi desktop yang mendukung formatnya.", "error");
    progressLabel.textContent = "Pemeriksaan gagal";
    progressFill.style.width = "0%";
    progressTrack.setAttribute("aria-valuenow", "0");
    console.error("Audio decode failed", error);
  } finally {
    await context?.close();
  }
}

async function convertToMp3() {
  if (!currentFile || !audioReady || convertButton.disabled) return;
  const file = currentFile;
  const bitrate = Number(bitrateInput.value);
  convertButton.disabled = true;
  document.querySelector("#replace-audio").disabled = true;
  fileInput.disabled = true;
  hideMessage();
  progressPanel.hidden = false;
  progressLabel.textContent = "Menyiapkan konversi...";
  progressCount.textContent = "";
  progressFill.style.width = "0%";
  progressTrack.setAttribute("aria-valuenow", "0");

  let context;
  try {
    context = new AudioContext();
    const sourceBuffer = await context.decodeAudioData(await file.arrayBuffer());
    if (currentFile !== file) return;
    if (sourceBuffer.duration > MAX_DURATION_SECONDS) {
      throw new Error("Durasi lebih dari 15 menit. Untuk menghindari penggunaan memori berlebihan, gunakan aplikasi konverter desktop.");
    }

    progressLabel.textContent = "Mengubah sample rate...";
    const offline = new OfflineAudioContext(
      2,
      Math.ceil(sourceBuffer.duration * OUTPUT_SAMPLE_RATE),
      OUTPUT_SAMPLE_RATE,
    );
    const source = offline.createBufferSource();
    source.buffer = sourceBuffer;
    source.connect(offline.destination);
    source.start();
    const normalizedBuffer = await offline.startRendering();

    progressLabel.textContent = "Membuat file MP3...";
    const left = new Float32Array(normalizedBuffer.getChannelData(0));
    const right = new Float32Array(normalizedBuffer.getChannelData(1));
    const outputBuffer = await encodeMp3InWorker(left, right, bitrate);
    const outputBlob = new Blob([outputBuffer], { type: "audio/mpeg" });
    const outputUrl = URL.createObjectURL(outputBlob);
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `${getSafeBaseName(file.name)}-speaker.mp3`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(outputUrl), 60_000);

    progressLabel.textContent = "Konversi selesai";
    progressCount.textContent = `${formatSize(outputBlob.size)} · MP3 ${bitrate} kbps`;
    progressFill.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    showMessage(
      "MP3 sudah diunduh. Coba putar dulu di laptop, lalu salin ke USB. Kalau masih gagal di speaker, cek manual speaker—batasan sistem file USB atau nama file juga bisa jadi penyebab.",
      "success",
    );
    audioReady = false;
  } catch (error) {
    progressLabel.textContent = "Konversi gagal";
    showMessage(`Konversi gagal: ${error.message || "format tidak didukung atau memori browser tidak cukup."}`, "error");
    console.error("Audio conversion failed", error);
  } finally {
    await context?.close();
    fileInput.disabled = false;
    document.querySelector("#replace-audio").disabled = false;
    convertButton.disabled = !audioReady;
  }
}

function readMediaDuration(audioElement) {
  if (Number.isFinite(audioElement.duration)) return Promise.resolve(audioElement.duration);
  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timeout);
      audioElement.removeEventListener("loadedmetadata", onMetadata);
      audioElement.removeEventListener("error", onError);
    };
    const onMetadata = () => {
      cleanup();
      resolve(Number.isFinite(audioElement.duration) ? audioElement.duration : null);
    };
    const onError = () => {
      cleanup();
      resolve(null);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);
    audioElement.addEventListener("loadedmetadata", onMetadata, { once: true });
    audioElement.addEventListener("error", onError, { once: true });
    audioElement.load();
  });
}

function encodeMp3InWorker(left, right, bitrate) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./mp3.worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event) => {
      if (event.data.type === "progress") {
        const percent = Math.round((event.data.frames / event.data.totalFrames) * 100);
        progressFill.style.width = `${percent}%`;
        progressTrack.setAttribute("aria-valuenow", String(percent));
        progressCount.textContent = `${formatDuration(event.data.frames / OUTPUT_SAMPLE_RATE)} / ${formatDuration(event.data.totalFrames / OUTPUT_SAMPLE_RATE)}`;
      } else if (event.data.type === "done") {
        worker.terminate();
        resolve(event.data.buffer);
      } else if (event.data.type === "error") {
        worker.terminate();
        reject(new Error(event.data.message));
      }
    });
    worker.addEventListener("error", (event) => {
      worker.terminate();
      reject(new Error(event.message || "MP3 encoder worker failed."));
    });
    worker.postMessage(
      { left, right, sampleRate: OUTPUT_SAMPLE_RATE, bitrate },
      [left.buffer, right.buffer],
    );
  });
}

function getExtension(fileName) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(index + 1).toUpperCase() : "";
}

function getSafeBaseName(fileName) {
  const index = fileName.lastIndexOf(".");
  const name = index > 0 ? fileName.slice(0, index) : fileName;
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") || "audio";
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

function releaseAudioUrl() {
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
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
