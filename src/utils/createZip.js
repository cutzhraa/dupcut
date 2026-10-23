const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const encoder = new TextEncoder();

async function getFileCrc32(file) {
  let crc = 0xffffffff;
  const reader = file.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const byte of value) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
    }
  } finally {
    reader.releaseLock();
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createLocalHeader(nameLength, crc, size) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0x21, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameLength, true);
  return header;
}

function createCentralHeader(nameLength, crc, size, offset) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0x21, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameLength, true);
  view.setUint32(42, offset, true);
  return header;
}

function createEndRecord(fileCount, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return record;
}

export async function createZipBlob(entries, onProgress = () => {}) {
  if (entries.length > 0xffff) throw new Error('ZIP tidak dapat berisi lebih dari 65.535 file.');
  const totalSize = entries.reduce((sum, entry) => sum + entry.file.size, 0);
  if (totalSize > 0xffffffff) throw new Error('Total ukuran file melebihi batas ZIP standar (4 GB).');

  const parts = [];
  const centralParts = [];
  let offset = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const { path, file } = entries[index];
    if (file.size > 0xffffffff) throw new Error(`${file.name} melebihi batas ukuran ZIP standar (4 GB).`);
    const name = encoder.encode(path);
    if (name.length > 0xffff) throw new Error('Nama file terlalu panjang untuk ZIP.');
    const crc = await getFileCrc32(file);
    const localHeader = createLocalHeader(name.length, crc, file.size);
    const centralHeader = createCentralHeader(name.length, crc, file.size, offset);

    parts.push(localHeader, name, file);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + file.size;
    onProgress(index + 1, entries.length, file.name);
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  if (offset > 0xffffffff || centralSize > 0xffffffff) throw new Error('Hasil ZIP melebihi batas ukuran ZIP standar (4 GB).');
  return new Blob([...parts, ...centralParts, createEndRecord(entries.length, centralSize, offset)], { type: 'application/zip' });
}
