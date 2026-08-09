/** Extract selectable text from a photo or screenshot, entirely on the user's device.
 *
 * Runs the Tesseract OCR engine through `tesseract.js` (Apache-2.0, verified in
 * node_modules/tesseract.js/LICENSE.md and docs/LICENSING.md). The image itself never
 * leaves this tab — it is handed to a local Web Worker as a File/Blob. The one thing that
 * *does* come from a CDN is the OCR language data (`eng.traineddata`, a few MB), fetched
 * once and cached by the browser like removeBackground.ts's segmentation model. That
 * distinction — image stays local, language data downloads once — needs to stay clear in
 * the page copy, not blurred into "nothing is downloaded."
 */
import type { ProgressReporter } from '../ui';

/** v1 ships English only (see docs/TOOL_SPECS.md / task scope). Kept as a parameter with a
 * default rather than hardcoded inline so a language picker can be added later without
 * reshaping this function's signature. */
const DEFAULT_LANG = 'eng';

/** Narrow surface of the tesseract.js worker this module actually uses, so callers don't
 * need the full `Tesseract.Worker` type from the package. */
interface OcrWorker {
  recognize(image: File): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<unknown>;
}

/** The worker downloads and initializes the language's traineddata, which is the
 * expensive part, so it's built once per page and reused for every subsequent image —
 * same lazy-singleton-promise shape as removeBackground.ts's `segmenterPromise`. */
let workerPromise: Promise<OcrWorker> | null = null;
let workerLang = DEFAULT_LANG;

async function getWorker(lang: string, report?: ProgressReporter): Promise<OcrWorker> {
  // A cached worker only serves its own language; if a future language picker asks for a
  // different one, drop the cached worker rather than silently OCR-ing in the wrong language.
  if (workerPromise && workerLang !== lang) {
    const stale = workerPromise;
    workerPromise = null;
    await stale.then((w) => w.terminate()).catch(() => {});
  }

  if (workerPromise) return workerPromise;
  workerLang = lang;

  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js');

    // Language data is cached by the browser (IndexedDB) after the first run, so this
    // message is only really true the first time — say so rather than implying every run
    // pays the download, matching removeBackground.ts's phrasing for the same situation.
    report?.('Loading OCR engine (first run only)…');

    const worker = await createWorker(lang, undefined, {
      logger: (m: { status?: string; progress?: number }) => {
        if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
          report?.(`Recognizing text… ${Math.round(m.progress * 100)}%`);
        } else if (m?.status && typeof m.progress === 'number') {
          report?.(`Loading OCR engine (first run only)… ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return worker as unknown as OcrWorker;
  })();

  try {
    return await workerPromise;
  } catch (err) {
    // Don't cache a failed load; a retry should be allowed to try again.
    workerPromise = null;
    throw err;
  }
}

export interface OcrResult {
  text: string;
  /** Tesseract's overall page confidence, 0-100. */
  confidence: number;
}

/**
 * Reads any text visible in a photo or screenshot and returns it as plain text.
 *
 * `lang` is not exposed on the tool page yet (English only for v1 — see
 * docs/TOOL_SPECS.md), but is threaded through here so adding a language picker later is
 * an additive change, not a rewrite.
 */
export async function extractTextFromImage(
  file: File,
  report?: ProgressReporter,
  lang: string = DEFAULT_LANG,
): Promise<OcrResult> {
  const worker = await getWorker(lang, report);
  report?.('Recognizing text… 0%');

  const {
    data: { text, confidence },
  } = await worker.recognize(file);

  return { text: text.trim(), confidence };
}
