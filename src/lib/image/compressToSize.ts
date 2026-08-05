/** Compress an image down to a target file size rather than a target quality.
 *
 * Strategy, in order:
 *   1. If the file already meets the target, return it untouched (no re-encode).
 *   2. Binary-search encoder quality between 10 and 95 for the largest quality
 *      that still fits under the target.
 *   3. If even quality 10 is too big, progressively scale the pixel dimensions
 *      down (via @jsquash/resize) and repeat the quality search at each step.
 *
 * Transparency is never silently discarded: a source with an alpha channel is
 * encoded as WebP (lossy WebP keeps alpha), never as JPEG.
 */
import resize from '@jsquash/resize';
import { decodeImage, encodeImage, type SupportedMime } from './codec';

export interface CompressToSizeResult {
  blob: Blob;
  filename: string;
  originalSize: number;
  outputSize: number;
  originalDimensions: { width: number; height: number };
  outputDimensions: { width: number; height: number };
  /** MIME type of the returned blob. */
  format: SupportedMime;
  /** Encoder quality used, or null when the original file was returned as-is. */
  qualityUsed: number | null;
  targetReached: boolean;
  /** True when the source had an alpha channel and the output format keeps it. */
  hasTransparency: boolean;
  /** True when the output format differs from the input format. */
  formatChanged: boolean;
  /** True when the pixel dimensions had to be reduced to hit the target. */
  resized: boolean;
}

export type ProgressFn = (message: string) => void;

const QUALITY_FLOOR = 10;
const QUALITY_CEILING = 95;
const QUALITY_ITERATIONS = 8;
/** Successive scale factors tried once quality alone cannot reach the target. */
const SCALE_STEPS = [0.85, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** True if any pixel has an alpha value below 255. */
function hasAlpha(imageData: ImageData): boolean {
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

/** JPEG in stays JPEG. Everything else goes to WebP, which is both
 * quality-searchable and alpha-capable, so transparency always survives. */
function chooseFormat(inputType: string, transparent: boolean): SupportedMime {
  if (!transparent && (inputType === 'image/jpeg' || inputType === 'image/jpg')) return 'image/jpeg';
  return 'image/webp';
}

function extensionFor(mime: SupportedMime): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

function renameTo(filename: string, mime: SupportedMime): string {
  const stem = filename.replace(/\.[^./\\]+$/, '') || 'image';
  return `${stem}.${extensionFor(mime)}`;
}

interface Attempt {
  blob: Blob;
  quality: number;
}

/** Binary-searches quality for the largest value whose output fits the target.
 * Returns the best fitting attempt, plus the smallest attempt seen either way. */
async function searchQuality(
  imageData: ImageData,
  format: SupportedMime,
  targetBytes: number,
  iterations: number,
  onProgress: ProgressFn | undefined,
  label: string,
): Promise<{ fit: Attempt | null; smallest: Attempt }> {
  let lo = QUALITY_FLOOR;
  let hi = QUALITY_CEILING;
  let fit: Attempt | null = null;
  let smallest: Attempt | null = null;

  for (let i = 0; i < iterations && lo <= hi; i++) {
    const quality = Math.round((lo + hi) / 2);
    const blob = await encodeImage(imageData, format, quality);
    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality };
    onProgress?.(`${label} quality ${quality}: ${formatBytes(blob.size)} (target ${formatBytes(targetBytes)})`);

    if (blob.size <= targetBytes) {
      fit = { blob, quality };
      lo = quality + 1;
    } else {
      hi = quality - 1;
    }
  }

  // `smallest` is always set: the loop runs at least once because
  // QUALITY_FLOOR < QUALITY_CEILING and iterations >= 1.
  if (!smallest) {
    const blob = await encodeImage(imageData, format, QUALITY_FLOOR);
    smallest = { blob, quality: QUALITY_FLOOR };
  }
  return { fit, smallest };
}

/**
 * Compresses `file` to at most `targetBytes`. If the target is genuinely
 * unreachable, returns the smallest result achieved with `targetReached: false`
 * instead of throwing.
 */
export async function compressToSize(
  file: File,
  targetBytes: number,
  onProgress?: ProgressFn,
): Promise<CompressToSizeResult> {
  if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
    throw new Error('Enter a target size larger than zero.');
  }

  onProgress?.('Decoding image…');
  const source = await decodeImage(file);
  const originalDimensions = { width: source.width, height: source.height };

  const transparent = hasAlpha(source);
  const format = chooseFormat(file.type, transparent);
  const formatChanged = format !== file.type;
  const filename = renameTo(file.name, format);

  // Already small enough: hand back the original bytes, no re-encode at all.
  if (file.size <= targetBytes) {
    return {
      blob: file.slice(0, file.size, file.type),
      filename: file.name,
      originalSize: file.size,
      outputSize: file.size,
      originalDimensions,
      outputDimensions: originalDimensions,
      format: (file.type === 'image/jpg' ? 'image/jpeg' : (file.type as SupportedMime)) || 'image/jpeg',
      qualityUsed: null,
      targetReached: true,
      hasTransparency: transparent,
      formatChanged: false,
      resized: false,
    };
  }

  const finish = (attempt: Attempt, data: ImageData, reached: boolean, resized: boolean): CompressToSizeResult => ({
    blob: attempt.blob,
    filename,
    originalSize: file.size,
    outputSize: attempt.blob.size,
    originalDimensions,
    outputDimensions: { width: data.width, height: data.height },
    format,
    qualityUsed: attempt.quality,
    targetReached: reached,
    hasTransparency: transparent,
    formatChanged,
    resized,
  });

  // Step 1: quality only, full resolution.
  const first = await searchQuality(source, format, targetBytes, QUALITY_ITERATIONS, onProgress, 'Testing');
  if (first.fit) return finish(first.fit, source, true, false);

  // Step 2: shrink the pixel dimensions and retry the quality search.
  let best = first.smallest;
  let bestData = source;

  for (const scale of SCALE_STEPS) {
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    onProgress?.(`Quality alone was not enough. Trying ${width}×${height}…`);

    const scaled = await resize(source, { width, height, method: 'lanczos3' });
    const attempt = await searchQuality(scaled, format, targetBytes, 6, onProgress, `At ${width}×${height},`);

    if (attempt.fit) return finish(attempt.fit, scaled, true, true);
    if (attempt.smallest.blob.size < best.blob.size) {
      best = attempt.smallest;
      bestData = scaled;
    }
  }

  // Target unreachable. Return the smallest result achieved, honestly flagged.
  return finish(best, bestData, false, bestData !== source);
}
