// Decodes via libheif (LGPL-3.0) — see docs/LICENSING.md for the licensing
// review (proper LGPL attribution vs. the previous heic2any dependency, plus
// the accepted HEVC patent-pool risk shared by every HEIC decoder).
import libheif from 'libheif-js/wasm-bundle';

export async function heicToJpg(file: File, quality = 0.9): Promise<Blob> {
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
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed.'))),
      'image/jpeg',
      quality,
    );
  });
}
