import { zipSync } from 'fflate';
import { uniqueName } from '../zip';

export type ProgressReporter = (message: string) => void;

/** Bundle arbitrary files into a single ZIP.
 *
 * This deliberately does not reuse zipOutputs() from ../zip: that helper
 * stores everything uncompressed (level 0) because it only ever bundles
 * already-compressed batch outputs (PNG, JPG, PDF, ...), where deflating
 * again wastes CPU for near-zero size gain. This tool is the opposite case —
 * a general-purpose "zip whatever I drop in" utility, where inputs are
 * arbitrary and often compressible (text, code, spreadsheets, uncompressed
 * docs) — so it uses fflate's default deflate compression (level 6) instead.
 * uniqueName is still shared so both paths handle same-name collisions the
 * same way. */
export async function createZip(
  files: File[],
  reportProgress?: ProgressReporter,
): Promise<Blob> {
  const taken = new Set<string>();
  const entries: Record<string, Uint8Array> = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    reportProgress?.(`Reading ${file.name} (${i + 1} of ${files.length})…`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    entries[uniqueName(taken, file.name)] = bytes;
  }

  reportProgress?.('Compressing…');
  const zipped = zipSync(entries);
  return new Blob([zipped] as BlobPart[], { type: 'application/zip' });
}
