import { zipSync } from 'fflate';

export interface NamedBlob {
  blob: Blob;
  filename: string;
}

/** Make a filename unique within a zip.
 *
 * Batch input can legitimately contain two files with the same name from
 * different folders, and zipSync would silently keep only the last one. Suffix
 * collisions instead so the user gets back as many files as they put in. */
export function uniqueName(taken: Set<string>, name: string): string {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot === -1 ? name : name.slice(0, dot);
  const ext = dot === -1 ? '' : name.slice(dot);
  let n = 2;
  while (taken.has(`${stem} (${n})${ext}`)) n++;
  const unique = `${stem} (${n})${ext}`;
  taken.add(unique);
  return unique;
}

/** Zip a set of outputs into one archive.
 *
 * Stored without compression: everything Kit-Bin produces in bulk (PNG, JPG,
 * WebP, PDF) is already compressed, so deflating again costs real time on a
 * large batch and typically saves under a percent. */
export async function zipOutputs(outputs: NamedBlob[], zipName: string): Promise<NamedBlob> {
  const taken = new Set<string>();
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};

  for (const out of outputs) {
    const bytes = new Uint8Array(await out.blob.arrayBuffer());
    entries[uniqueName(taken, out.filename)] = [bytes, { level: 0 }];
  }

  const zipped = zipSync(entries);
  return {
    blob: new Blob([zipped] as BlobPart[], { type: 'application/zip' }),
    filename: zipName,
  };
}

/** Name a batch archive after the shared job, not after one arbitrary input. */
export function batchZipName(toolSlug: string): string {
  const leaf = toolSlug.split('/').filter(Boolean).pop() ?? 'files';
  return `kit-bin-${leaf}.zip`;
}
