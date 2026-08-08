/** Shared client-side wiring for tool pages: drop zone, processing state,
 * result/download UI. Kept framework-free so it works inside a plain
 * <script type="module"> block on any Astro page. */

import { beginProcessingUi } from './ads/processingOverlay';
import { maybeGateDownload, cancelActiveDownloadGate } from './ads/downloadGate';
import { zipOutputs, type NamedBlob } from './zip';

export interface ToolElements {
  dropzone: HTMLElement;
  fileInput: HTMLInputElement;
  fileInfo: HTMLElement;
  status: HTMLElement;
  result: HTMLElement;
  downloadLink: HTMLAnchorElement;
  resetButton: HTMLButtonElement;
}

export function getToolElements(root: ParentNode = document): ToolElements {
  const req = <T extends HTMLElement>(id: string) => {
    const el = root.querySelector<T>(`#${id}`);
    if (!el) throw new Error(`Missing #${id} in tool page markup`);
    return el;
  };
  return {
    dropzone: req('dropzone'),
    fileInput: req('file-input'),
    fileInfo: req('file-info'),
    status: req('status'),
    result: req('result'),
    downloadLink: req('download-link'),
    resetButton: req('reset-button'),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Shows progress or an error. `isError` swaps the progress bar for red text,
 * so a failure never looks like work still in flight. ToolWidget renders the
 * text into [data-status-text]; older hand-rolled pages that use a bare
 * element still work via the textContent fallback. */
export function setStatus(els: ToolElements, message: string | null, isError = false) {
  const textEl = els.status.querySelector<HTMLElement>('[data-status-text]') ?? els.status;
  textEl.textContent = message ?? '';
  els.status.classList.toggle('hidden', !message);

  const bar = els.status.querySelector<HTMLElement>('[data-status-bar]');
  if (bar) bar.classList.toggle('hidden', isError);
  textEl.classList.toggle('text-red-600', isError);
  textEl.classList.toggle('dark:text-red-400', isError);
}

/** Tracks the object URL handed to the download link so it can be revoked when
 * the user processes another file, rather than leaking one blob per run. */
let activeObjectUrl: string | null = null;

export function showResult(els: ToolElements, blob: Blob, filename: string, note?: string) {
  if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
  activeObjectUrl = URL.createObjectURL(blob);

  els.downloadLink.href = activeObjectUrl;
  els.downloadLink.download = filename;
  const noteEl = els.result.querySelector('[data-result-note]');
  if (noteEl) noteEl.textContent = note ?? formatBytes(blob.size);
  els.result.classList.remove('hidden');
  // Re-trigger the entry animation on every run, not just the first.
  els.result.classList.remove('animate-pop-in');
  void els.result.offsetWidth;
  els.result.classList.add('animate-pop-in');
  els.dropzone.classList.add('hidden');

  // The file is already fully ready and the real download link above is
  // already populated. This only paints a temporary overlay on top asking
  // for a 10-second ad view before letting the user click it; it never
  // delays the file itself, and it does nothing at all if ad consent was
  // never granted.
  maybeGateDownload(els.result);
}

export function reset(els: ToolElements) {
  cancelActiveDownloadGate();
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
  els.result.classList.add('hidden');
  els.dropzone.classList.remove('hidden');
  els.fileInfo.textContent = '';
  els.fileInput.value = '';
  setStatus(els, null);
}

export type ProgressReporter = (message: string) => void;

export interface ToolOutput {
  blob: Blob;
  filename: string;
  note?: string;
}

interface WireOptionsBase {
  accept: string;
  multiple?: boolean;
  validate?: (files: File[]) => string | null;
}

interface WireOptionsAll extends WireOptionsBase {
  /** Handed every selected file at once, for tools whose whole point is
   * combining them (merge, images-to-pdf). Mutually exclusive with runEach. */
  run: (files: File[], reportProgress: ProgressReporter) => Promise<ToolOutput>;
  runEach?: never;
}

interface WireOptionsEach extends WireOptionsBase {
  run?: never;
  /** Handed one file at a time. wireTool runs these in sequence, reports
   * "file N of M", and zips the outputs when there is more than one, so an
   * individual tool never has to know about batching or zipping.
   *
   * Sequential on purpose: these operations are CPU- and memory-heavy (WASM
   * codecs, PDF documents, a segmentation model), and running them
   * concurrently on a phone is a reliable way to get the tab killed. */
  runEach: (file: File, reportProgress: ProgressReporter) => Promise<ToolOutput>;
  /** Names the archive when a batch produces more than one file. */
  batchZipName?: string;
}

type WireOptions = WireOptionsAll | WireOptionsEach;

/** Run a per-file operation across a whole selection and package the result.
 *
 * One failure does not lose the rest of the batch: a file that throws is
 * recorded and skipped, the run continues, and the note on the result says how
 * many were skipped. Losing nine good conversions because the tenth file was
 * corrupt is the worst possible outcome here. */
export async function runBatch(
  files: File[],
  opts: WireOptionsEach,
  report: ProgressReporter,
): Promise<ToolOutput> {
  const outputs: NamedBlob[] = [];
  const failed: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const prefix = files.length > 1 ? `File ${i + 1} of ${files.length}: ` : '';
    try {
      const out = await opts.runEach(file, (message) => report(`${prefix}${message}`));
      outputs.push({ blob: out.blob, filename: out.filename });
    } catch (err) {
      console.error(`Batch item failed: ${file.name}`, err);
      failed.push(file.name);
    }
  }

  if (outputs.length === 0) {
    throw new Error(
      files.length === 1
        ? 'that file could not be processed'
        : 'none of those files could be processed',
    );
  }

  const skipped = failed.length > 0 ? ` ${failed.length} file${failed.length > 1 ? 's' : ''} skipped.` : '';

  // A single output stays a single file. Wrapping one PNG in a zip just to be
  // consistent would make the common case worse.
  if (outputs.length === 1) {
    return { ...outputs[0], note: skipped.trim() || undefined };
  }

  report('Packaging your files…');
  const zipped = await zipOutputs(outputs, opts.batchZipName ?? 'kit-bin-files.zip');
  return { ...zipped, note: `${outputs.length} files.${skipped}` };
}

/** Wires drag/drop + click-to-browse + processing + result for a single tool.
 * Runs the actual conversion in `run`, which does the real work via the
 * lib/* modules — this function only owns the UI state machine. */
export function wireTool(els: ToolElements, opts: WireOptions) {
  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const invalid = opts.validate?.(files);
    if (invalid) {
      setStatus(els, invalid, true);
      return;
    }

    els.fileInfo.textContent = files.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ');
    setStatus(els, 'Processing…');

    // Real processing has already started by the time this exists; the
    // overlay is purely a status display and, after ~300ms, an optional ad.
    // It never gates or delays anything below it.
    const processingUi = beginProcessingUi();

    try {
      const report: ProgressReporter = (message) => {
        setStatus(els, message);
        processingUi.setStatusText(message);
      };

      const { blob, filename, note } = opts.runEach
        ? await runBatch(files, opts, report)
        : await opts.run(files, report);
      processingUi.finish();
      setStatus(els, null);
      showResult(els, blob, filename, note);
    } catch (err) {
      processingUi.finish();
      console.error(err);
      setStatus(
        els,
        `Something went wrong: ${err instanceof Error ? err.message : 'unknown error'}. Try a different file.`,
        true,
      );
    }
  };

  const setDragging = (on: boolean) => {
    els.dropzone.dataset.dragging = String(on);
  };

  els.dropzone.addEventListener('click', () => els.fileInput.click());
  // The dropzone is a role="button", so it must also respond to keyboard.
  els.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      els.fileInput.click();
    }
  });
  els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDragging(true);
  });
  els.dropzone.addEventListener('dragleave', () => setDragging(false));
  els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });
  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files) handleFiles(els.fileInput.files);
  });
  els.resetButton.addEventListener('click', () => reset(els));
}
