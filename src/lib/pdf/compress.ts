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
export async function compressPdf(
  file: File,
  quality = 60,
  onProgress?: (message: string) => void,
): Promise<CompressResult> {
  const originalBytes = await file.arrayBuffer();
  onProgress?.('Reading PDF…');
  const doc = await PDFDocument.load(originalBytes);
  const context = doc.context;

  const imageEntries = Array.from(context.enumerateIndirectObjects()).filter(([, obj]) => {
    if (!(obj instanceof PDFRawStream)) return false;
    const dict = obj.dict;
    return (
      dict.get(PDFName.of('Subtype'))?.toString() === '/Image' &&
      dict.get(PDFName.of('Filter'))?.toString() === '/DCTDecode'
    );
  });

  for (let i = 0; i < imageEntries.length; i++) {
    const [ref, obj] = imageEntries[i];
    onProgress?.(`Recompressing image ${i + 1} of ${imageEntries.length}…`);
    const dict = (obj as PDFRawStream).dict;

    try {
      const contents = (obj as PDFRawStream).getContents();
      const buffer = contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength) as ArrayBuffer;
      const imageData = await decodeJpeg(buffer);
      const recompressed = await encodeJpeg(imageData, { quality });
      const newBytes = new Uint8Array(recompressed);
      if (newBytes.length >= contents.length) continue; // keep original if no win

      dict.set(PDFName.of('Length'), context.obj(newBytes.length));
      context.assign(ref, PDFRawStream.of(dict, newBytes));
    } catch {
      // Not a plain baseline JPEG stream, or codec failed — leave untouched.
      continue;
    }
  }

  onProgress?.('Finalizing compressed PDF…');
  const compressedBytes = await doc.save({ useObjectStreams: true });
  return {
    blob: new Blob([compressedBytes] as BlobPart[], { type: 'application/pdf' }),
    originalSize: originalBytes.byteLength,
    compressedSize: compressedBytes.byteLength,
  };
}
