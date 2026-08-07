import { decodeImage, encodeImage, sniffMime, type SupportedMime } from './codec';

export interface CompressImageResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  /** What the output actually is. Formats with no encoder here (GIF, BMP, ...)
   * come back as JPEG, and the caller has to fix the extension to match —
   * otherwise the user gets JPEG bytes in a file named `.gif`. */
  mimeType: string;
}

// QOI is deliberately absent: it's lossless with no quality knob, so
// "compressing" one just re-emits the same bytes.
const SUPPORTED: SupportedMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jxl'];

/** Re-encodes the image via the matching jSquash codec at a fixed quality —
 * same approach as addyosmani/squish. Unlike a size-target library
 * (browser-image-compression), this always does real re-encoding work
 * rather than skipping files that are already under some size threshold. */
export async function compressImage(file: File, quality = 70): Promise<CompressImageResult> {
  const sourceMime = sniffMime(file);
  const targetMime = (SUPPORTED.includes(sourceMime as SupportedMime) ? sourceMime : 'image/jpeg') as SupportedMime;
  const imageData = await decodeImage(file);
  const blob = await encodeImage(imageData, targetMime, quality);

  if (blob.size >= file.size) {
    return {
      blob: file.slice(0, file.size, sourceMime),
      originalSize: file.size,
      compressedSize: file.size,
      mimeType: sourceMime,
    };
  }
  return { blob, originalSize: file.size, compressedSize: blob.size, mimeType: targetMime };
}
