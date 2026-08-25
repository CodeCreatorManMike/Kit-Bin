// Decodes via libheif (LGPL-3.0) — see docs/LICENSING.md for the licensing
// review (proper LGPL attribution vs. the previous heic2any dependency, plus
// the accepted HEVC patent-pool risk shared by every HEIC decoder).
import libheif from 'libheif-js/wasm-bundle';

/** Shared HEIC/HEIF decode step, reused by every heic-to-* page so the
 * libheif wiring only has to be gotten right once. Returns plain ImageData;
 * callers encode it into whatever target format they need (via
 * `canvas.toBlob` for JPEG/PNG/WebP, or `encodeImage` from `./codec` for
 * AVIF/JXL/QOI). */
export async function decodeHeicToImageData(file: File): Promise<ImageData> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(buffer);
  if (!images.length) throw new Error('No image found in this HEIC file.');

  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);

  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData) => {
      if (!displayData) return reject(new Error('Failed to decode HEIC image data.'));
      resolve();
    });
  });

  return imageData;
}

export async function heicToJpg(file: File, quality = 0.9): Promise<Blob> {
  const imageData = await decodeHeicToImageData(file);
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed.'))),
      'image/jpeg',
      quality,
    );
  });
}
