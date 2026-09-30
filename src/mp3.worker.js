import * as lame from "@breezystack/lamejs";

const FRAMES_PER_CHUNK = 1152;

self.addEventListener("message", (event) => {
  const { left, right, sampleRate, bitrate } = event.data;
  try {
    const encoder = new lame.Mp3Encoder(2, sampleRate, bitrate);
    const chunks = [];
    let totalBytes = 0;

    for (let offset = 0; offset < left.length; offset += FRAMES_PER_CHUNK) {
      const end = Math.min(offset + FRAMES_PER_CHUNK, left.length);
      const encoded = encoder.encodeBuffer(
        toInt16(left.subarray(offset, end)),
        toInt16(right.subarray(offset, end)),
      );
      if (encoded.length) {
        const chunk = new Uint8Array(encoded);
        chunks.push(chunk);
        totalBytes += chunk.length;
      }
      if (offset % (FRAMES_PER_CHUNK * 32) === 0) {
        self.postMessage({
          type: "progress",
          frames: end,
          totalFrames: left.length,
        });
      }
    }

    const flushed = encoder.flush();
    if (flushed.length) {
      const finalChunk = new Uint8Array(flushed);
      chunks.push(finalChunk);
      totalBytes += finalChunk.length;
    }

    const output = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    self.postMessage({ type: "done", buffer: output.buffer }, [output.buffer]);
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "MP3 encoding failed.",
    });
  }
});

function toInt16(samples) {
  const result = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    result[index] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return result;
}
