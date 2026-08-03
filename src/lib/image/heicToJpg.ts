// NOTE: heic2any wraps libheif (LGPL-3.0) compiled to WASM. MIT wrapper, but
// the LGPL dynamic-linking condition for browser/WASM distribution hasn't
// been formally verified — flagged for a licensing sign-off per LICENSING.md
// before this ships to production, not blocking local build/dev.
import heic2any from 'heic2any';

export async function heicToJpg(file: File, quality = 0.9): Promise<Blob> {
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality });
  return Array.isArray(result) ? result[0] : result;
}
