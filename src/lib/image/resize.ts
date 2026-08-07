const CANVAS_ENCODABLE = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface ResizeResult {
  blob: Blob;
  /** The MIME type actually written — differs from the input's when the
   * input format isn't one Canvas can re-encode (e.g. GIF, BMP), in which
   * case the result silently becomes PNG and the caller should rename the
   * output file to match rather than keep the original extension. */
  mimeType: string;
}

export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight?: number,
): Promise<ResizeResult> {
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

  // Canvas's toBlob only honors these three types — anything else (GIF, BMP,
  // etc.) silently falls back to PNG in the browser, so match that here
  // explicitly rather than letting the caller keep the original extension
  // on what's actually now a PNG.
  const type = CANVAS_ENCODABLE.has(file.type) ? file.type : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Resize failed'))),
      type,
      0.92,
    );
  });
  return { blob, mimeType: type };
}
