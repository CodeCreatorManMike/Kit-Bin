import { unzipSync } from 'fflate';

export interface ExtractedFile {
  path: string;
  blob: Blob;
}

/** Read every file entry out of a ZIP archive.
 *
 * Directory-only entries (folders added explicitly by some zip tools) come
 * back from unzipSync as zero-length Uint8Arrays at paths ending in '/' —
 * verified directly against fflate's behavior, not assumed — so those are
 * skipped here rather than handed back as empty "files". Nested paths are
 * not re-nested into a tree; fflate already returns full relative paths
 * (e.g. "folder/file.txt") as flat keys, and the UI shows that path as-is. */
export function extractZip(zipBytes: Uint8Array): ExtractedFile[] {
  const unzipped = unzipSync(zipBytes);
  const files: ExtractedFile[] = [];

  for (const [path, bytes] of Object.entries(unzipped)) {
    if (path.endsWith('/') && bytes.length === 0) continue;
    files.push({ path, blob: new Blob([bytes as BlobPart]) });
  }

  return files;
}
