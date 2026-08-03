/** Shared client-side wiring for tool pages: drop zone, processing state,
 * result/download UI. Kept framework-free so it works inside a plain
 * <script type="module"> block on any Astro page. */

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

export function setStatus(els: ToolElements, message: string | null) {
  els.status.textContent = message ?? '';
  els.status.classList.toggle('hidden', !message);
}

export function showResult(els: ToolElements, blob: Blob, filename: string, note?: string) {
  const url = URL.createObjectURL(blob);
  els.downloadLink.href = url;
  els.downloadLink.download = filename;
  const noteEl = els.result.querySelector('[data-result-note]');
  if (noteEl) noteEl.textContent = note ?? formatBytes(blob.size);
  els.result.classList.remove('hidden');
  els.dropzone.classList.add('hidden');
}

export function reset(els: ToolElements) {
  els.result.classList.add('hidden');
  els.dropzone.classList.remove('hidden');
  els.fileInfo.textContent = '';
  els.fileInput.value = '';
  setStatus(els, null);
}

export type ProgressReporter = (message: string) => void;

interface WireOptions {
  accept: string;
  multiple?: boolean;
  validate?: (files: File[]) => string | null;
  run: (
    files: File[],
    reportProgress: ProgressReporter,
  ) => Promise<{ blob: Blob; filename: string; note?: string }>;
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
      setStatus(els, invalid);
      return;
    }

    els.fileInfo.textContent = files.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ');
    setStatus(els, 'Processing…');

    try {
      const { blob, filename, note } = await opts.run(files, (message) => setStatus(els, message));
      setStatus(els, null);
      showResult(els, blob, filename, note);
    } catch (err) {
      console.error(err);
      setStatus(els, `Something went wrong: ${err instanceof Error ? err.message : 'unknown error'}. Try a different file.`);
    }
  };

  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropzone.classList.add('border-blue-500');
  });
  els.dropzone.addEventListener('dragleave', () => {
    els.dropzone.classList.remove('border-blue-500');
  });
  els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('border-blue-500');
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });
  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files) handleFiles(els.fileInput.files);
  });
  els.resetButton.addEventListener('click', () => reset(els));
}
