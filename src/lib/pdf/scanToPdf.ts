/** Turns a photo of a paper document into a clean, deskewed, single-page PDF —
 * a free/offline "document scanner" like the ones built into phone camera apps.
 *
 * Pipeline (the classic OpenCV "scanner" approach, re-implemented against this
 * package's actual JS/WASM API rather than copied from any one write-up of it):
 *   1. Decode the photo onto a canvas and load it into an OpenCV `Mat`.
 *   2. Grayscale -> blur -> Canny edge detection -> find contours -> pick the
 *      largest 4-point contour, which is (usually) the page's outline against
 *      whatever background it was photographed on.
 *   3. If a confident 4-point contour was found, warp it flat with a
 *      perspective transform so the page fills the frame, corner to corner.
 *   4. If not, fall back to the original photo untouched — a slightly-off
 *      scan beats a failed one, and this tool never throws just because
 *      auto-crop couldn't find a confident outline.
 *   5. Boost contrast (grayscale + CLAHE, not full binarization — see note
 *      below) so the result reads like a real scan rather than a photo.
 *   6. Encode as PNG and embed it as a single PDF page via pdf-lib, the same
 *      way `imagesToPdf.ts` does.
 *
 * `@techstark/opencv-js` (Apache-2.0) is a large WASM build of OpenCV, so it's
 * loaded lazily here — only when this function is actually called — never as
 * a static/eager import that would land in every page's shared chunk.
 */
import { PDFDocument } from 'pdf-lib';
import type { ProgressReporter } from '../ui';

// Minimal structural type for the parts of the OpenCV.js API this file uses.
// The upstream package ships full types, but importing them at the type level
// would force TypeScript to resolve the (huge) real module graph even though
// the actual value is loaded dynamically at runtime; this keeps the two
// decoupled while still catching typos in the calls below.
interface CvMat {
  rows: number;
  cols: number;
  data32S: Int32Array;
  delete(): void;
  clone(): CvMat;
}
interface CvMatVectorLike {
  size(): number;
  get(i: number): CvMat;
  delete(): void;
}
interface Cv {
  Mat: new (...args: unknown[]) => CvMat;
  MatVector: new () => CvMatVectorLike;
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  matFromImageData(imageData: ImageData): CvMat;
  matFromArray(rows: number, cols: number, type: number, data: number[]): CvMat;
  imshow(canvas: HTMLCanvasElement, mat: CvMat): void;
  cvtColor(src: CvMat, dst: CvMat, code: number): void;
  GaussianBlur(src: CvMat, dst: CvMat, ksize: unknown, sigmaX: number): void;
  Canny(image: CvMat, edges: CvMat, t1: number, t2: number): void;
  dilate(src: CvMat, dst: CvMat, kernel: CvMat): void;
  getStructuringElement(shape: number, ksize: unknown): CvMat;
  findContours(image: CvMat, contours: CvMatVectorLike, hierarchy: CvMat, mode: number, method: number): void;
  arcLength(curve: CvMat, closed: boolean): number;
  approxPolyDP(curve: CvMat, approxCurve: CvMat, epsilon: number, closed: boolean): void;
  contourArea(contour: CvMat, oriented?: boolean): number;
  isContourConvex(contour: CvMat): boolean;
  getPerspectiveTransform(src: CvMat, dst: CvMat): CvMat;
  warpPerspective(src: CvMat, dst: CvMat, M: CvMat, dsize: unknown): void;
  CLAHE: new (clipLimit?: number, tileGridSize?: unknown) => {
    apply(src: CvMat, dst: CvMat): void;
    delete(): void;
  };
  COLOR_RGBA2GRAY: number;
  COLOR_GRAY2RGBA: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
  MORPH_RECT: number;
  CV_32FC2: number;
}

let cvPromise: Promise<Cv> | null = null;

/** Loads the OpenCV.js WASM module exactly once per page and caches it, since
 * initialising the runtime is the expensive part (multi-MB WASM binary). */
async function getCv(): Promise<Cv> {
  if (cvPromise) return cvPromise;

  cvPromise = (async () => {
    // Dynamic import keeps this multi-MB WASM payload out of every page's
    // shared bundle — it only loads when scanToPdf() actually runs.
    const cvModule = (await import('@techstark/opencv-js')).default as unknown;

    // Per the package's own README: the default export is sometimes already
    // a ready `cv` object, sometimes a Promise that resolves to one, and
    // sometimes a Module stub that needs `onRuntimeInitialized` to fire.
    // Handle all three rather than assuming one shape.
    if (cvModule instanceof Promise) {
      return (await cvModule) as Cv;
    }
    const maybeReady = cvModule as { Mat?: unknown; onRuntimeInitialized?: () => void };
    if (maybeReady.Mat) {
      return cvModule as Cv;
    }
    await new Promise<void>((resolve) => {
      maybeReady.onRuntimeInitialized = () => resolve();
    });
    return cvModule as Cv;
  })();

  try {
    return await cvPromise;
  } catch (err) {
    // Don't cache a failed load; a retry (e.g. after a flaky network) should
    // get a fresh attempt rather than replaying the same rejected promise.
    cvPromise = null;
    throw err;
  }
}

interface Point {
  x: number;
  y: number;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Puts four unordered corner points into a consistent
 * top-left, top-right, bottom-right, bottom-left order, using the classic
 * sum/difference trick: top-left has the smallest x+y, bottom-right the
 * largest; top-right has the smallest x-y, bottom-left the largest. */
function orderCorners(points: Point[]): [Point, Point, Point, Point] {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  // Sorted by (y - x): top-right has the smallest value (small y, large x),
  // bottom-left has the largest (large y, small x). Using (x - y) here would
  // swap top-right and bottom-left, which mirrors the warped output.
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x));
  const tl = bySum[0];
  const br = bySum[bySum.length - 1];
  const tr = byDiff[0];
  const bl = byDiff[byDiff.length - 1];
  return [tl, tr, br, bl];
}

/** Reads a 4-point `approxPolyDP` result Mat (CV_32SC2, 4 rows x 1 col x 2
 * channels) into plain {x,y} points. */
function matToPoints(mat: CvMat): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < mat.rows; i++) {
    points.push({ x: mat.data32S[i * 2], y: mat.data32S[i * 2 + 1] });
  }
  return points;
}

/** Scans `edges` for the largest, reasonably-convex 4-point contour that
 * covers a meaningful fraction of the frame — a stand-in for "this is
 * probably the document's outline, not background clutter." Returns null
 * when nothing confident enough is found, so the caller can fall back. */
function findDocumentCorners(cv: Cv, edges: CvMat, imageArea: number): Point[] | null {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  // A real page should fill a large share of the frame — a small 4-point
  // shape found in edge noise (a logo, a button on a form) isn't the
  // document. This threshold is deliberately generous rather than exact.
  const minArea = imageArea * 0.2;

  let best: Point[] | null = null;
  let bestArea = 0;

  try {
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area < minArea || area <= bestArea) {
        contour.delete();
        continue;
      }

      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        best = matToPoints(approx);
        bestArea = area;
      }

      approx.delete();
      contour.delete();
    }
  } finally {
    hierarchy.delete();
    contours.delete();
  }

  return best;
}

export interface ScanToPdfResult {
  blob: Blob;
  /** False whenever auto-crop couldn't find a confident 4-point outline and
   * the tool fell back to the full, unwarped photo — the page uses this to
   * tell the user honestly what happened. */
  cornersDetected: boolean;
}

/** Decodes a File into a same-size canvas, the format `cv.matFromImageData`
 * (via a 2D context's ImageData) needs. */
async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode the scan as PNG.'))),
      'image/png',
    );
  });
}

/**
 * Converts a photo of a paper document into a single-page PDF: auto-detects
 * the page's four corners and flattens it with a perspective warp when it
 * can, then boosts contrast so the result reads like a scan.
 *
 * Deliberately never throws just because corner detection failed — a
 * slightly-off, unwarped scan is a far better outcome than an error, so the
 * fallback path always still produces a usable PDF. `cornersDetected` tells
 * the caller which path actually ran.
 */
export async function scanToPdf(file: File, report?: ProgressReporter): Promise<ScanToPdfResult> {
  report?.('Loading the scanner (first run only, a few MB)…');
  const cv = await getCv();

  report?.('Reading the photo…');
  const canvas = await fileToCanvas(file);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const dilated = new cv.Mat();
  let kernel: CvMat | null = null;
  let warped: CvMat | null = null;
  let corners: Point[] | null = null;

  try {
    report?.('Finding the document edges…');
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 60, 180);
    // Closes small gaps in the edge map (creases, low-contrast edges against
    // a similarly-lit background) so findContours sees one closed outline
    // instead of several broken segments.
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(edges, dilated, kernel);

    corners = findDocumentCorners(cv, dilated, canvas.width * canvas.height);

    if (corners) {
      report?.('Straightening the page…');
      const [tl, tr, br, bl] = orderCorners(corners);

      const widthTop = dist(tl, tr);
      const widthBottom = dist(bl, br);
      const heightLeft = dist(tl, bl);
      const heightRight = dist(tr, br);
      const outWidth = Math.max(1, Math.round(Math.max(widthTop, widthBottom)));
      const outHeight = Math.max(1, Math.round(Math.max(heightLeft, heightRight)));

      const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
      ]);
      const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, outWidth - 1, 0, outWidth - 1, outHeight - 1, 0, outHeight - 1,
      ]);
      const M = cv.getPerspectiveTransform(srcPoints, dstPoints);

      warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(outWidth, outHeight));

      srcPoints.delete();
      dstPoints.delete();
      M.delete();
    } else {
      // No confident 4-point outline — use the full photo rather than fail.
      warped = src.clone();
    }

    report?.('Enhancing contrast…');
    const warpedGray = new cv.Mat();
    const enhanced = new cv.Mat();
    const enhancedRgba = new cv.Mat();
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    try {
      cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);
      // CLAHE (contrast-limited adaptive histogram equalization) boosts local
      // contrast the way a scanner does, without the full black/white
      // binarization a plain `adaptiveThreshold` would give — that matters
      // here because this tool also has to handle non-text photos
      // (whiteboards, receipts with colour, book pages), where flattening
      // everything to pure black and white loses real information.
      clahe.apply(warpedGray, enhanced);
      cv.cvtColor(enhanced, enhancedRgba, cv.COLOR_GRAY2RGBA);
      cv.imshow(canvas, enhancedRgba);
    } finally {
      warpedGray.delete();
      enhanced.delete();
      enhancedRgba.delete();
      clahe.delete();
    }

    // canvas now holds the enhanced result at the warped (or original)
    // dimensions — imshow resizes the canvas element to match the Mat.
    report?.('Building the PDF…');
    const png = await canvasToPng(canvas);

    const doc = await PDFDocument.create();
    const image = await doc.embedPng(await png.arrayBuffer());
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

    report?.('Writing PDF…');
    const bytes = await doc.save();
    return {
      blob: new Blob([bytes] as BlobPart[], { type: 'application/pdf' }),
      cornersDetected: corners !== null,
    };
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    dilated.delete();
    kernel?.delete();
    warped?.delete();
  }
}
