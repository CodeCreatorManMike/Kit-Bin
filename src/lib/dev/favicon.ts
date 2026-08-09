/** Generate a full favicon/app-icon set from one source image.
 *
 * Everything runs through <canvas>: decode the source once via
 * createImageBitmap (handles PNG/JPG/SVG natively in every evergreen
 * browser), then draw it into a square canvas per target size. Non-square
 * sources are fit inside the square (contain, centered, transparent padding)
 * rather than stretched or cropped — the same "don't distort" principle used
 * by the slideshow tool's letterboxing. */

import { zipOutputs } from '../zip';

export interface FaviconSize {
  /** Pixel dimension (icons here are always square). */
  size: number;
  /** Filename this size is written as inside the zip. */
  filename: string;
  /** Human label for the on-page preview grid. */
  label: string;
  blob: Blob;
}

export interface FaviconSet {
  sizes: FaviconSize[];
  ico: Blob;
  manifest: Blob;
  zip: Blob;
}

/** Every PNG size shipped in the zip, in the order they're displayed. */
const PNG_TARGETS: { size: number; filename: string; label: string }[] = [
  { size: 16, filename: 'favicon-16x16.png', label: '16×16 — browser tab' },
  { size: 32, filename: 'favicon-32x32.png', label: '32×32 — browser tab (retina)' },
  { size: 48, filename: 'favicon-48x48.png', label: '48×48 — Windows taskbar' },
  { size: 180, filename: 'apple-touch-icon.png', label: '180×180 — iOS home screen' },
  { size: 192, filename: 'android-chrome-192x192.png', label: '192×192 — Android / PWA' },
  { size: 512, filename: 'android-chrome-512x512.png', label: '512×512 — Android / PWA' },
];

/** Sizes packed into the .ico container — the classic Windows/browser set. */
const ICO_SIZES = [16, 32, 48];

/** Draw `bitmap` into a `size`×`size` canvas, fit-contain, centered, with
 * transparent padding where the source isn't already square. */
async function renderSquarePng(bitmap: ImageBitmap, size: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(bitmap, x, y, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
  });
}

/** Pack a set of same-format images into a classic ICO container.
 *
 * ICO layout: a 6-byte ICONDIR header, then one 16-byte ICONDIRENTRY per
 * image, then the raw image bytes back to back. Each entry's `imageOffset`
 * points into that trailing data. Modern Windows/browsers accept a full PNG
 * file as an entry's image data directly (detected by the embedded PNG
 * signature) rather than requiring a legacy BMP/DIB re-encode, which is what
 * keeps this encoder small — no bitmap conversion, just PNG bytes plus a
 * directory pointing at them. */
function packIco(images: { size: number; data: Uint8Array }[]): Uint8Array {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const dirSize = ENTRY_SIZE * images.length;

  let offset = HEADER_SIZE + dirSize;
  const offsets = images.map((img) => {
    const o = offset;
    offset += img.data.length;
    return o;
  });

  const out = new Uint8Array(offset);
  const view = new DataView(out.buffer);

  // ICONDIR: reserved(2)=0, type(2)=1 (icon), count(2)=N
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);

  let pos = HEADER_SIZE;
  images.forEach((img, i) => {
    out[pos] = img.size >= 256 ? 0 : img.size; // width (0 = 256)
    out[pos + 1] = img.size >= 256 ? 0 : img.size; // height (0 = 256)
    out[pos + 2] = 0; // color count (0 = no palette / truecolor)
    out[pos + 3] = 0; // reserved
    view.setUint16(pos + 4, 1, true); // color planes
    view.setUint16(pos + 6, 32, true); // bits per pixel
    view.setUint32(pos + 8, img.data.length, true); // size of image data
    view.setUint32(pos + 12, offsets[i], true); // offset of image data
    pos += ENTRY_SIZE;
  });

  images.forEach((img, i) => out.set(img.data, offsets[i]));

  return out;
}

function buildManifest(): string {
  return JSON.stringify(
    {
      name: 'My Site',
      short_name: 'My Site',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    },
    null,
    2,
  );
}

/** Generate the full favicon set (all PNG sizes, favicon.ico, site.webmanifest)
 * plus the packaged zip, from a single source image. */
export async function generateFaviconSet(file: File): Promise<FaviconSet> {
  const bitmap = await createImageBitmap(file);
  let sizes: FaviconSize[];
  try {
    sizes = await Promise.all(
      PNG_TARGETS.map(async (target) => ({
        ...target,
        blob: await renderSquarePng(bitmap, target.size),
      })),
    );
  } finally {
    bitmap.close();
  }

  const bySize = new Map(sizes.map((s) => [s.size, s.blob]));
  const icoImages = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      data: new Uint8Array(await bySize.get(size)!.arrayBuffer()),
    })),
  );
  const ico = new Blob([packIco(icoImages) as BlobPart], { type: 'image/x-icon' });

  const manifest = new Blob([buildManifest()], { type: 'application/manifest+json' });

  const zip = await zipOutputs(
    [
      ...sizes.map((s) => ({ blob: s.blob, filename: s.filename })),
      { blob: ico, filename: 'favicon.ico' },
      { blob: manifest, filename: 'site.webmanifest' },
    ],
    'kit-bin-favicons.zip',
  );

  return { sizes, ico, manifest, zip: zip.blob };
}

/** Convenience wrapper for callers that only want the final zip. */
export async function generateFavicons(file: File): Promise<Blob> {
  const { zip } = await generateFaviconSet(file);
  return zip;
}
