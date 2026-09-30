import * as lame from "@breezystack/lamejs";

const FRAMES_PER_CHUNK = 1152;
let encoder = null;

self.addEventListener("message", (event) => {
  try {
    if (event.data.type === "init") {
      encoder = new lame.Mp3Encoder(2, event.data.sampleRate, event.data.bitrate);
      self.postMessage({ type: "ready" });
      return;
    }

    if (!encoder) throw new Error("MP3 encoder is not initialized.");
    if (event.data.type === "chunk") {
      encodeChunk(event.data);
      return;
    }

    if (event.data.type === "finish") {
      const flushed = new Uint8Array(encoder.flush());
      encoder = null;
      self.postMessage({ type: "chunk", buffer: flushed.buffer }, [flushed.buffer]);
      self.postMessage({ type: "done" });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "MP3 encoding failed.",
    });
  }
});

function encodeChunk({ left, right, offset, end, totalFrames }) {
  const encodedParts = [];
  let totalBytes = 0;
  for (let chunkOffset = 0; chunkOffset < left.length; chunkOffset += FRAMES_PER_CHUNK) {
    const chunkEnd = Math.min(chunkOffset + FRAMES_PER_CHUNK, left.length);
    const encoded = encoder.encodeBuffer(left.subarray(chunkOffset, chunkEnd), right.subarray(chunkOffset, chunkEnd));
    if (encoded.length) {
      const part = new Uint8Array(encoded);
      encodedParts.push(part);
      totalBytes += part.length;
    }
  }

  const output = new Uint8Array(totalBytes);
  let outputOffset = 0;
  for (const part of encodedParts) {
    output.set(part, outputOffset);
    outputOffset += part.length;
  }
  self.postMessage({ type: "chunk", buffer: output.buffer }, [output.buffer]);
  self.postMessage({ type: "progress", frames: end, totalFrames });
  self.postMessage({ type: "chunkDone", end });
}
