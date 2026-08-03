/** Generic raster format conversion via native Canvas decode/encode.
 * Covers WebP<->PNG<->JPEG — all natively supported by Canvas.toBlob in
 * every modern engine, no codec library needed. */
export async function convertImageFormat(file: File, targetMime: string, quality = 0.92): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Conversion failed'))),
      targetMime,
      quality,
    );
  });
}
