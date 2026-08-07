/** Shared jSquash-backed decode/encode helpers, matching the architecture
 * used by addyosmani/squish (MIT) — decode via the matching WASM codec,
 * encode via the matching WASM codec, rather than routing everything
 * through Canvas (which gives inconsistent quality/behavior across
 * browser engines for lossy formats). Falls back to Canvas only for
 * formats jSquash doesn't decode (SVG). */
import decodeJpeg from '@jsquash/jpeg/decode';
import encodeJpeg from '@jsquash/jpeg/encode';
import decodePng from '@jsquash/png/decode';
import encodePng from '@jsquash/png/encode';
import decodeWebp from '@jsquash/webp/decode';
import encodeWebp from '@jsquash/webp/encode';

export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/jxl' | 'image/qoi';

/** AVIF/JXL/QOI are dynamically imported rather than statically, like the
 * three above. Their encoder payloads are large (avif_enc is ~3.3MB, jxl_enc
 * ~1.3MB) and most tools never touch them — a static import would drag that
 * weight into the shared chunk every image page loads. */
// Typed as the 8-bit path we actually use. The published declarations are
// overloaded for 10/12/16-bit surfaces this site never touches, and pulling
// `.default` out of a dynamic import collapses those overloads onto the
// high-bit-depth one, which then rejects a plain ImageData.
type Decode8 = (buffer: ArrayBuffer) => Promise<ImageData | null>;
type Encode8 = (data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer>;

const lazy = {
  decodeAvif: () => import('@jsquash/avif/decode').then((m) => m.default as unknown as Decode8),
  encodeAvif: () => import('@jsquash/avif/encode').then((m) => m.default as unknown as Encode8),
  decodeJxl: () => import('@jsquash/jxl/decode').then((m) => m.default as unknown as Decode8),
  encodeJxl: () => import('@jsquash/jxl/encode').then((m) => m.default as unknown as Encode8),
  decodeQoi: () => import('@jsquash/qoi/decode').then((m) => m.default as unknown as Decode8),
  encodeQoi: () => import('@jsquash/qoi/encode').then((m) => m.default as unknown as Encode8),
};

/** jSquash's AVIF/JXL decoders resolve to null rather than throwing on some
 * malformed inputs; normalise that into the throw the caller expects. */
async function required(result: ImageData | null): Promise<ImageData> {
  if (!result) throw new Error('That image could not be decoded.');
  return result;
}

/** QOI has no IANA-registered media type and browsers report an empty string
 * for it, so type sniffing has to fall back to the extension. AVIF and JXL
 * are registered, but Safari/Firefox still hand back '' for .jxl. */
export function sniffMime(file: File | Blob): string {
  if (file.type) return file.type;
  const name = (file as File).name?.toLowerCase() ?? '';
  if (name.endsWith('.qoi')) return 'image/qoi';
  if (name.endsWith('.jxl')) return 'image/jxl';
  if (name.endsWith('.avif')) return 'image/avif';
  return '';
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/jxl': 'jxl',
  'image/qoi': 'qoi',
};

/** Rewrites a filename's extension to match what the bytes actually are.
 * Returns the name unchanged for mime types we have no mapping for. */
export function renameToMime(filename: string, mimeType: string): string {
  const ext = EXTENSIONS[mimeType];
  if (!ext) return filename;
  const current = filename.toLowerCase().match(/\.([^.]+)$/)?.[1];
  // Leave a correct-but-differently-spelled extension alone (.jpeg stays
  // .jpeg) — only rewrite when it actually disagrees with the bytes.
  if (current && EXTENSIONS[`image/${current}`] === ext) return filename;
  const base = filename.replace(/\.[^.]+$/, '');
  return `${base}.${ext}`;
}

async function toArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

async function decodeViaCanvas(source: File | Blob): Promise<ImageData> {
  // createImageBitmap's SVG support is inconsistent across engines (Chromium
  // has historically failed to decode SVG blobs this way), so SVG goes
  // through an <img> element instead — the reliable, standard path.
  if (source.type === 'image/svg+xml') return decodeSvgViaImg(source);

  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function decodeSvgViaImg(source: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The source image could not be decoded.'));
      img.src = url;
    });

    const width = img.naturalWidth || 300;
    const height = img.naturalHeight || 150;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes a raster image to ImageData using the matching jSquash codec.
 * Falls back to Canvas decode for formats jSquash doesn't cover (SVG). */
export async function decodeImage(file: File | Blob): Promise<ImageData> {
  const type = sniffMime(file);

  // JPEG/WebP may carry an EXIF orientation tag. jSquash's raw WASM decode
  // returns un-rotated pixels and ignores it; only createImageBitmap (used
  // by decodeViaCanvas) applies it, matching what every browser shows as
  // the "upright" image. Decoding those two formats via Canvas keeps every
  // tool (compress, resize, rotate, format conversion) consistent with what
  // the user actually sees in a preview — otherwise a portrait phone photo
  // comes out sideways from every tool except the ones already using
  // createImageBitmap directly.
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/webp') {
    try {
      return await decodeViaCanvas(file);
    } catch {
      // Some real-world files are mislabeled or use encoder quirks Canvas
      // rejects — fall through to the raw jSquash decode below.
    }
  }

  const buffer = await toArrayBuffer(file);
  try {
    if (type === 'image/jpeg' || type === 'image/jpg') return await decodeJpeg(buffer);
    if (type === 'image/png') return await decodePng(buffer);
    if (type === 'image/webp') return await decodeWebp(buffer);
    if (type === 'image/avif') return await required(await (await lazy.decodeAvif())(buffer));
    if (type === 'image/jxl') return await required(await (await lazy.decodeJxl())(buffer));
    if (type === 'image/qoi') return await required(await (await lazy.decodeQoi())(buffer));
  } catch {
    // Fall through to Canvas decode below — some real-world files are
    // mislabeled or use encoder quirks the WASM codec rejects.
  }
  try {
    return await decodeViaCanvas(file);
  } catch {
    // Canvas is a dead end for JXL and QOI (no browser decodes either), so a
    // failure here means the file itself is bad, not that we picked the wrong
    // path. Say that instead of surfacing a bare createImageBitmap error.
    throw new Error("That file couldn't be decoded — it may be corrupt or not the format its extension claims.");
  }
}

/** Encodes ImageData to the given format using the matching jSquash codec. */
export async function encodeImage(imageData: ImageData, targetMime: SupportedMime, quality = 75): Promise<Blob> {
  if (targetMime === 'image/jpeg') {
    const buf = await encodeJpeg(imageData, { quality });
    return new Blob([buf], { type: targetMime });
  }
  if (targetMime === 'image/webp') {
    const buf = await encodeWebp(imageData, { quality });
    return new Blob([buf], { type: targetMime });
  }
  if (targetMime === 'image/avif') {
    // libavif takes a constant-quality level, not a quality percentage, and
    // it runs backwards: 0 is lossless, 63 is worst. Map our 0-100 scale onto
    // it so callers keep one consistent quality argument.
    const cqLevel = Math.round((1 - quality / 100) * 63);
    const buf = await (await lazy.encodeAvif())(imageData, { cqLevel });
    return new Blob([buf], { type: targetMime });
  }
  if (targetMime === 'image/jxl') {
    const buf = await (await lazy.encodeJxl())(imageData, { quality });
    return new Blob([buf], { type: targetMime });
  }
  if (targetMime === 'image/qoi') {
    // QOI is lossless by design — no quality knob exists.
    const buf = await (await lazy.encodeQoi())(imageData);
    return new Blob([buf], { type: targetMime });
  }
  const buf = await encodePng(imageData);
  return new Blob([buf], { type: targetMime });
}
