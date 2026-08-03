/** Shared jSquash-backed decode/encode helpers, matching the architecture
 * used by addyosmani/squish (MIT) — decode via the matching WASM codec,
 * encode via the matching WASM codec, rather than routing everything
 * through Canvas (which gives inconsistent quality/behavior across
 * browser engines for lossy formats). Falls back to Canvas only for
 * formats jSquash doesn't decode (SVG). */
import decodeJpeg from '@jsquash/jpeg/decode';
import encodeJpeg from '@jsquash/jpeg/encode';
import decodePng from '@jsquash/png/decode';
import encodePng from '@jsquash/png/encode';
import decodeWebp from '@jsquash/webp/decode';
import encodeWebp from '@jsquash/webp/encode';

export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp';

async function toArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

async function decodeViaCanvas(source: File | Blob): Promise<ImageData> {
  // createImageBitmap's SVG support is inconsistent across engines (Chromium
  // has historically failed to decode SVG blobs this way), so SVG goes
  // through an <img> element instead — the reliable, standard path.
  if (source.type === 'image/svg+xml') return decodeSvgViaImg(source);

  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function decodeSvgViaImg(source: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The source image could not be decoded.'));
      img.src = url;
    });

    const width = img.naturalWidth || 300;
    const height = img.naturalHeight || 150;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes a raster image to ImageData using the matching jSquash codec.
 * Falls back to Canvas decode for formats jSquash doesn't cover (SVG). */
export async function decodeImage(file: File | Blob): Promise<ImageData> {
  const type = file.type;
  const buffer = await toArrayBuffer(file);
  try {
    if (type === 'image/jpeg' || type === 'image/jpg') return await decodeJpeg(buffer);
    if (type === 'image/png') return await decodePng(buffer);
    if (type === 'image/webp') return await decodeWebp(buffer);
  } catch {
    // Fall through to Canvas decode below — some real-world files are
    // mislabeled or use encoder quirks the WASM codec rejects.
  }
  return decodeViaCanvas(file);
}

/** Encodes ImageData to the given format using the matching jSquash codec. */
export async function encodeImage(imageData: ImageData, targetMime: SupportedMime, quality = 75): Promise<Blob> {
  if (targetMime === 'image/jpeg') {
    const buf = await encodeJpeg(imageData, { quality });
    return new Blob([buf], { type: targetMime });
  }
  if (targetMime === 'image/webp') {
    const buf = await encodeWebp(imageData, { quality });
    return new Blob([buf], { type: targetMime });
  }
  const buf = await encodePng(imageData);
  return new Blob([buf], { type: targetMime });
}
