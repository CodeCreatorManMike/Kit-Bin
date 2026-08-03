import imageCompression from 'browser-image-compression';

export interface CompressImageResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

export async function compressImage(
  file: File,
  maxSizeMB = 1,
): Promise<CompressImageResult> {
  const blob = await imageCompression(file, {
    maxSizeMB,
    useWebWorker: true,
  });
  return { blob, originalSize: file.size, compressedSize: blob.size };
}
