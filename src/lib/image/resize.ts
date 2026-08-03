export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight?: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = bitmap.height / bitmap.width;
  const width = targetWidth;
  const height = targetHeight ?? Math.round(width * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const type = file.type || 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Resize failed'))),
      type,
      0.92,
    );
  });
}
