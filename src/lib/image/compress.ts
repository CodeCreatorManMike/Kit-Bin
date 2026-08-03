import { decodeImage, encodeImage, type SupportedMime } from './codec';

export interface CompressImageResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

const SUPPORTED: SupportedMime[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Re-encodes the image via the matching jSquash codec at a fixed quality —
 * same approach as addyosmani/squish. Unlike a size-target library
 * (browser-image-compression), this always does real re-encoding work
 * rather than skipping files that are already under some size threshold. */
export async function compressImage(file: File, quality = 70): Promise<CompressImageResult> {
  const targetMime = (SUPPORTED.includes(file.type as SupportedMime) ? file.type : 'image/jpeg') as SupportedMime;
  const imageData = await decodeImage(file);
  const blob = await encodeImage(imageData, targetMime, quality);

  if (blob.size >= file.size) {
    return { blob: file.slice(0, file.size, file.type), originalSize: file.size, compressedSize: file.size };
  }
  return { blob, originalSize: file.size, compressedSize: blob.size };
}
