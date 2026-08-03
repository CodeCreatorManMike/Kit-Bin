import { decodeImage, encodeImage, type SupportedMime } from './codec';

/** Format conversion via jSquash codecs (decode source format, encode
 * target format) — same architecture as addyosmani/squish. Falls back to
 * Canvas decode automatically inside decodeImage for non-jSquash sources
 * (SVG). */
export async function convertImageFormat(file: File, targetMime: SupportedMime, quality = 92): Promise<Blob> {
  const imageData = await decodeImage(file);
  return encodeImage(imageData, targetMime, quality);
}
