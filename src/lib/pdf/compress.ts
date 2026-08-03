import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { decode as decodeJpeg, encode as encodeJpeg } from '@jsquash/jpeg';

export interface CompressResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

/** Recompresses embedded JPEG images at a lower quality and re-saves the
 * document with object streams enabled. Non-JPEG-image bytes (vector
 * content, text, PNG-encoded raster) pass through untouched. */
export async function compressPdf(file: File, quality = 60): Promise<CompressResult> {
  const originalBytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(originalBytes);
  const context = doc.context;

  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
    if (dict.get(PDFName.of('Filter'))?.toString() !== '/DCTDecode') continue;

    try {
      const contents = obj.getContents();
      const buffer = contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength) as ArrayBuffer;
      const imageData = await decodeJpeg(buffer);
      const recompressed = await encodeJpeg(imageData, { quality });
      const newBytes = new Uint8Array(recompressed);
      if (newBytes.length >= obj.getContents().length) continue; // keep original if no win

      dict.set(PDFName.of('Length'), context.obj(newBytes.length));
      context.assign(ref, PDFRawStream.of(dict, newBytes));
    } catch {
      // Not a plain baseline JPEG stream, or codec failed — leave untouched.
      continue;
    }
  }

  const compressedBytes = await doc.save({ useObjectStreams: true });
  return {
    blob: new Blob([compressedBytes] as BlobPart[], { type: 'application/pdf' }),
    originalSize: originalBytes.byteLength,
    compressedSize: compressedBytes.byteLength,
  };
}
