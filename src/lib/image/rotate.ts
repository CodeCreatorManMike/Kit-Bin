/** Rotate an image in 90-degree steps and/or mirror it.
 *
 * The transform runs on a canvas, so 90 and 270 degree rotations swap the
 * output width and height. Pixels are moved, not resampled: a 90-degree
 * rotation maps each pixel to exactly one new position. The file is then
 * re-encoded through the shared jSquash codecs, keeping the input format.
 */
import { decodeImage, encodeImage, type SupportedMime } from './codec';

export type RotateAngle = 0 | 90 | 180 | 270;

export interface RotateOptions {
  rotate: RotateAngle;
  flipH: boolean;
  flipV: boolean;
}

/** Quality used when the output format is lossy (JPEG, WebP). */
export const ROTATE_QUALITY = 92;

const SUPPORTED: SupportedMime[] = ['image/jpeg', 'image/png', 'image/webp'];

/** JPEG and WebP round-trip as themselves. Anything else lands on PNG,
 * which is lossless and keeps any alpha channel. */
export function outputMimeFor(inputType: string): SupportedMime {
  if (inputType === 'image/jpg') return 'image/jpeg';
  return SUPPORTED.includes(inputType as SupportedMime) ? (inputType as SupportedMime) : 'image/png';
}

/** True when the operation would leave the image exactly as it was. */
export function isNoOp(opts: RotateOptions): boolean {
  return opts.rotate === 0 && !opts.flipH && !opts.flipV;
}

export async function rotateImage(file: File, opts: RotateOptions): Promise<Blob> {
  const source = await decodeImage(file);
  const quarterTurn = opts.rotate === 90 || opts.rotate === 270;
  const outWidth = quarterTurn ? source.height : source.width;
  const outHeight = quarterTurn ? source.width : source.height;

  // The decoded pixels go onto a source-sized canvas first, so they can be
  // drawn through the transform onto the correctly-sized output canvas.
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = source.width;
  sourceCanvas.height = source.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Canvas 2D context unavailable');
  sourceCtx.putImageData(source, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Work from the centre of the output, then rotate, then mirror, then draw
  // the source centred on the origin.
  ctx.translate(outWidth / 2, outHeight / 2);
  if (opts.rotate !== 0) ctx.rotate((opts.rotate * Math.PI) / 180);
  ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1);
  ctx.drawImage(sourceCanvas, -source.width / 2, -source.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const imageData = ctx.getImageData(0, 0, outWidth, outHeight);
  return encodeImage(imageData, outputMimeFor(file.type), ROTATE_QUALITY);
}
