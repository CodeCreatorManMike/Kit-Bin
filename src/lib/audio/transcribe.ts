/** Transcribe spoken audio into text and timed segments, entirely on-device.
 *
 * Runs OpenAI's Whisper (the `base` checkpoint) through transformers.js's
 * `automatic-speech-recognition` pipeline. `onnx-community/whisper-base` inherits
 * Whisper's original MIT license (verified in docs/LICENSING.md) — the ONNX
 * conversion adds no restriction on top of the weights. Mirrors the structure of
 * `../image/removeBackground.ts`: a lazy module-level singleton pipeline, WebGPU
 * detection with a WASM fallback, and an honest first-run-download disclosure.
 *
 * Everything here stays local: transformers.js fetches the model weights from the
 * Hugging Face CDN once (the browser then caches them), but the audio itself is
 * only ever decoded PCM samples in this tab — it is never sent anywhere.
 *
 * v1 scope is audio files only. Feeding a video file's container through
 * `AudioContext.decodeAudioData` is not reliable enough across browsers (Safari in
 * particular) to promise on a tool page, so this module — and the page built on top
 * of it — only accept `audio/*`. See `/video/extract-audio` for pulling a track out
 * of a video first.
 */
import type { ProgressReporter } from '../ui';
import { decodeAudioFile } from './wav';

/** Model repo. Changing this is a licensing decision, not just a quality one — see
 * docs/LICENSING.md before touching it. */
const MODEL_ID = 'onnx-community/whisper-base';

/** Whisper's encoder was trained on 16kHz mono audio; feeding it anything else
 * produces garbage output silently rather than an error, so every input is
 * resampled to this rate before inference regardless of its source format. */
const TARGET_SAMPLE_RATE = 16000;

/** Whisper's encoder window is a fixed 30 seconds. Longer input is handled by
 * the pipeline's own chunking (`chunk_length_s`/`stride_length_s`), which is why
 * these are passed explicitly rather than relying on defaults (chunking defaults
 * to *off*, which would silently truncate anything past 30s otherwise). */
const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

type WhisperChunk = { timestamp: [number, number | null]; text: string };
type WhisperOutput = { text: string; chunks?: WhisperChunk[] };
type Transcriber = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<WhisperOutput>;

/** The pipeline is expensive to construct and the weights are ~150MB, so it is
 * built once per page and reused for every subsequent file. */
let transcriberPromise: Promise<Transcriber> | null = null;

/** True when the browser exposes WebGPU. Inference falls back to WASM otherwise,
 * which works everywhere but is noticeably slower — worth surfacing in copy since
 * a CPU-only transcription can take longer than the audio itself. */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

async function getTranscriber(report?: ProgressReporter): Promise<Transcriber> {
  if (transcriberPromise) return transcriberPromise;

  transcriberPromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const device = hasWebGPU() ? 'webgpu' : 'wasm';

    // Weights are cached by the browser after the first run, so this message is
    // only really true the first time. Say so rather than implying every run
    // pays the download. ~150MB is an approximate figure for whisper-base's ONNX
    // weights (quantization variant dependent) — deliberately rounded rather than
    // stated with false precision.
    report?.('Loading the speech model (first run only, around 150MB)…');

    return (await pipeline('automatic-speech-recognition', MODEL_ID, {
      device,
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          report?.(`Loading the speech model… ${Math.round(p.progress)}%`);
        }
      },
    })) as unknown as Transcriber;
  })();

  try {
    return await transcriberPromise;
  } catch (err) {
    // Don't cache a failed load; a retry should be allowed to try again.
    transcriberPromise = null;
    throw err;
  }
}

/** Resample decoded audio to 16kHz mono via an OfflineAudioContext — the standard
 * browser-native technique, and the same approach already used for duration-fitting
 * in `../video/slideshow.ts`. Connecting a source with more channels than the
 * destination triggers the Web Audio spec's built-in "speakers" downmix (stereo's
 * L/R are averaged into the single output channel), and rendering at a different
 * sample rate than the source resamples automatically — so this one render call
 * does both conversions Whisper needs at once. */
async function toWhisperInput(buffer: AudioBuffer): Promise<Float32Array> {
  if (buffer.sampleRate === TARGET_SAMPLE_RATE && buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0).slice();
  }

  const targetLength = Math.max(1, Math.ceil(buffer.duration * TARGET_SAMPLE_RATE));
  const offlineCtx = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0).slice();
}

/**
 * Transcribes an audio file into plain text plus timed segments suitable for SRT
 * export. Throws if the file cannot be decoded as audio (e.g. a video file — see
 * the module doc comment on why video is out of scope for v1).
 */
export async function transcribeMedia(
  file: File,
  report?: ProgressReporter,
): Promise<TranscriptionResult> {
  const transcriber = await getTranscriber(report);

  report?.('Decoding audio…');
  const decoded = await decodeAudioFile(file);

  report?.('Preparing audio for the model…');
  const samples = await toWhisperInput(decoded);

  // Whisper's own pipeline does not expose per-chunk progress during inference —
  // only the model-load progress above is granular. The status text still updates
  // so the tab never reads as frozen, per docs/PAGE_LAYOUT.md; the page pairs this
  // with an indeterminate progress bar rather than a fake percentage.
  report?.('Transcribing… this can take a while, especially without WebGPU.');
  const output = await transcriber(samples, {
    return_timestamps: true,
    chunk_length_s: CHUNK_LENGTH_S,
    stride_length_s: STRIDE_LENGTH_S,
  });

  const chunks: WhisperChunk[] =
    output.chunks && output.chunks.length > 0
      ? output.chunks
      : [{ timestamp: [0, decoded.duration], text: output.text }];

  const segments: TranscriptSegment[] = chunks
    .map((chunk) => ({
      start: chunk.timestamp[0] ?? 0,
      // A final chunk can come back with a null end timestamp if generation hit
      // its token limit before the model emitted a closing timestamp token; fall
      // back to the audio's real duration rather than leaving it undefined.
      end: chunk.timestamp[1] ?? decoded.duration,
      text: chunk.text.trim(),
    }))
    .filter((segment) => segment.text.length > 0);

  return { text: output.text.trim(), segments };
}
