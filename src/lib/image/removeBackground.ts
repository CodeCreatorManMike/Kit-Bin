/** Cut the background out of a photo, entirely on the user's device.
 *
 * Runs the `ormbg` segmentation model through transformers.js. Both the model
 * (`onnx-community/ormbg-ONNX`) and its base (`schirrmacher/ormbg`) are
 * Apache-2.0. The obvious alternatives are not usable here — `rembg-webgpu`
 * hardcodes the non-commercial `briaai/RMBG-1.4`, and `@imgly/background-removal`
 * is AGPL. See docs/LICENSING.md before changing the model.
 *
 * Everything below stays local: transformers.js fetches the weights from the
 * Hugging Face CDN once and the browser caches them, but the image itself is
 * only ever a canvas and a tensor in this tab.
 */
import type { ProgressReporter } from '../ui';

/** Model repo. Changing this is a licensing decision, not just a quality one. */
const MODEL_ID = 'onnx-community/ormbg-ONNX';

/** Longest edge the model sees. The network runs at a fixed internal size
 * anyway, so feeding it a 6000px phone photo costs decode time and memory for
 * no extra mask detail. The mask is scaled back up to full resolution after,
 * so the saved PNG keeps the original dimensions. */
const MAX_INFERENCE_EDGE = 1024;

/** The `background-removal` pipeline hands back a single RGBA image with the
 * cutout already applied to its alpha channel — not a separate mask, and not
 * an array. We only want its alpha, because the colour channels are at the
 * reduced inference size and we want full-resolution pixels in the output. */
type CutoutImage = { data: Uint8Array | Uint8ClampedArray; width: number; height: number; channels: number };
type Segmenter = (input: unknown) => Promise<CutoutImage | CutoutImage[]>;

/** The pipeline is expensive to construct and the weights are tens of MB, so
 * it is built once per page and reused for every subsequent image. */
let segmenterPromise: Promise<Segmenter> | null = null;

/** True when the browser exposes WebGPU. Inference falls back to WASM
 * otherwise, which works everywhere but is noticeably slower. */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

async function getSegmenter(report?: ProgressReporter): Promise<Segmenter> {
  if (segmenterPromise) return segmenterPromise;

  segmenterPromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const device = hasWebGPU() ? 'webgpu' : 'wasm';

    // Weights are cached by the browser after the first run, so this message
    // is only really true the first time. Say so rather than implying every
    // run pays the download.
    report?.(`Loading the model (first run only, about 40 MB)…`);

    return (await pipeline('background-removal', MODEL_ID, {
      device,
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          report?.(`Loading the model… ${Math.round(p.progress)}%`);
        }
      },
    })) as unknown as Segmenter;
  })();

  try {
    return await segmenterPromise;
  } catch (err) {
    // Don't cache a failed load; a retry should be allowed to try again.
    segmenterPromise = null;
    throw err;
  }
}

/** Decode a File into a bitmap, capping the longest edge for inference. */
async function toBitmap(file: File): Promise<{ full: ImageBitmap; scaled: ImageBitmap }> {
  const full = await createImageBitmap(file);
  const longest = Math.max(full.width, full.height);
  if (longest <= MAX_INFERENCE_EDGE) return { full, scaled: full };

  const ratio = MAX_INFERENCE_EDGE / longest;
  const scaled = await createImageBitmap(file, {
    resizeWidth: Math.round(full.width * ratio),
    resizeHeight: Math.round(full.height * ratio),
    resizeQuality: 'high',
  });
  return { full, scaled };
}

/** transformers.js will not take an ImageBitmap directly, so hand it a
 * RawImage built from the scaled pixels. Going through the canvas here also
 * means the bytes never leave the tab, unlike passing it a URL to fetch. */
async function toRawImage(bitmap: ImageBitmap) {
  const { RawImage } = await import('@huggingface/transformers');
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new RawImage(new Uint8ClampedArray(data), width, height, 4);
}

export interface RemoveBackgroundResult {
  blob: Blob;
  /** Whether inference ran on the GPU, surfaced so the page can explain a slow run. */
  usedWebGPU: boolean;
}

/**
 * Returns a PNG of the original image with the background made transparent.
 * PNG specifically because it is the only widely-supported lossless format
 * with an alpha channel — a JPEG here would silently flatten transparency
 * back onto white, which is exactly what the user was trying to remove.
 */
export async function removeBackground(
  file: File,
  report?: ProgressReporter,
): Promise<RemoveBackgroundResult> {
  const usedWebGPU = hasWebGPU();

  const segmenter = await getSegmenter(report);
  report?.('Finding the subject…');

  const { full, scaled } = await toBitmap(file);

  try {
    const raw = await segmenter(await toRawImage(scaled));
    const cutout = Array.isArray(raw) ? raw[0] : raw;
    if (!cutout?.data || cutout.channels !== 4) {
      throw new Error('The model did not return a usable cutout for this image.');
    }

    report?.('Applying the cutout…');

    // Draw the original at full resolution, then multiply its alpha by the
    // mask scaled back up. Working at full size keeps the output sharp even
    // though the mask itself was computed at the capped size.
    const canvas = document.createElement('canvas');
    canvas.width = full.width;
    canvas.height = full.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.drawImage(full, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Lift the alpha channel out of the cutout into a greyscale canvas, so the
    // browser can do the upscaling back to full resolution. Letting the canvas
    // interpolate is both faster and smoother than scaling by hand per pixel.
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = cutout.width;
    maskCanvas.height = cutout.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error('Canvas 2D context unavailable.');
    const maskImage = maskCtx.createImageData(cutout.width, cutout.height);
    for (let px = 0; px < cutout.width * cutout.height; px++) {
      const alpha = cutout.data[px * 4 + 3];
      const o = px * 4;
      maskImage.data[o] = maskImage.data[o + 1] = maskImage.data[o + 2] = alpha;
      maskImage.data[o + 3] = 255;
    }
    maskCtx.putImageData(maskImage, 0, 0);

    const scaledMaskCanvas = document.createElement('canvas');
    scaledMaskCanvas.width = canvas.width;
    scaledMaskCanvas.height = canvas.height;
    const scaledMaskCtx = scaledMaskCanvas.getContext('2d');
    if (!scaledMaskCtx) throw new Error('Canvas 2D context unavailable.');
    scaledMaskCtx.imageSmoothingQuality = 'high';
    scaledMaskCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    const scaledMask = scaledMaskCtx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0, px = 0; i < image.data.length; i += 4, px++) {
      image.data[i + 3] = scaledMask.data[px * 4];
    }
    ctx.putImageData(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode the cutout as PNG.'))),
        'image/png',
      );
    });

    return { blob, usedWebGPU };
  } finally {
    // ImageBitmaps hold decoded pixel buffers; on a large photo that is tens
    // of MB per bitmap, so release them rather than waiting for GC.
    full.close();
    if (scaled !== full) scaled.close();
  }
}
