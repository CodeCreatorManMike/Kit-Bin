/** Read text aloud and hand back an MP3, entirely on the user's device.
 *
 * Runs the Kokoro-82M TTS model through `kokoro-js` (Apache-2.0; the model
 * weights `onnx-community/Kokoro-82M-v1.0-ONNX` are separately Apache-2.0 —
 * both checked in docs/LICENSING.md). `generate()` hands back a `RawAudio`
 * of 32-bit float PCM at a fixed 24 kHz — confirmed by reading kokoro-js's
 * own `generate_from_ids` (`new RawAudio(waveform.data, 24_000)`), not
 * assumed. `RawAudio#toBlob()` encodes that into a WAV Blob using
 * transformers.js's own `encodeWAV`. From there this reuses the exact same
 * PCM-to-MP3 path `/audio/wav-to-mp3` already uses (`convertAudio` in
 * `./convert.ts`, backed by Mediabunny) rather than adding a second MP3
 * encoder dependency.
 *
 * Everything stays local: kokoro-js fetches model weights + the chosen
 * voice's style vectors from the Hugging Face CDN once (cached by the
 * browser after), but the text you type is only ever passed to the model
 * running in this tab — it is never sent anywhere.
 */
import type { ProgressReporter } from '../ui';
import { convertAudio } from './convert';

/** Model repo. Changing this is a licensing decision, not just a quality one. */
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

/** Sample rate kokoro-js always generates at (see module doc above). */
const SAMPLE_RATE = 24_000;

/** Hard cap on input length, enforced here and stated in the tool's copy.
 * This exists to keep synthesis time and memory bounded on an average
 * device — it is not a usage/billing limit, since there is no server
 * metering anything. */
export const MAX_CHARACTERS = 3000;

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
}

/** True when the browser exposes WebGPU. Falls back to WASM otherwise,
 * which works everywhere but is noticeably slower. */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

type KokoroTTSInstance = {
  voices: Record<string, { name: string; language: string; gender: string }>;
  generate: (text: string, opts: { voice: string }) => Promise<{ toBlob: () => Blob }>;
};

let ttsPromise: Promise<KokoroTTSInstance> | null = null;

async function getTTS(report?: ProgressReporter): Promise<KokoroTTSInstance> {
  if (ttsPromise) return ttsPromise;

  ttsPromise = (async () => {
    const { KokoroTTS } = await import('kokoro-js');
    const device = hasWebGPU() ? 'webgpu' : 'wasm';

    // Weights are cached by the browser after the first run, so this
    // message is only really true the first time. Say so rather than
    // implying every run pays the download.
    report?.('Loading the voice model (first run only, about 80 MB)…');

    return (await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: device === 'webgpu' ? 'fp32' : 'q8',
      device,
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          report?.(`Loading the voice model… ${Math.round(p.progress)}%`);
        }
      },
    })) as unknown as KokoroTTSInstance;
  })();

  try {
    return await ttsPromise;
  } catch (err) {
    // Don't cache a failed load; a retry should be allowed to try again.
    ttsPromise = null;
    throw err;
  }
}

/** Lists the available voices, lazily loading the model if needed. Cheap to
 * call repeatedly once loaded — `voices` is a plain object on the instance. */
export async function listVoices(report?: ProgressReporter): Promise<Voice[]> {
  const tts = await getTTS(report);
  return Object.entries(tts.voices).map(([id, v]) => ({
    id,
    name: v.name,
    language: v.language,
    gender: v.gender,
  }));
}

export interface SynthesizeOptions {
  voice?: string;
}

/**
 * Synthesizes `text` as speech and returns an MP3 Blob.
 * Throws if `text` is empty or exceeds `MAX_CHARACTERS`.
 */
export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {},
  report?: ProgressReporter,
): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter some text to read aloud.');
  if (trimmed.length > MAX_CHARACTERS) {
    throw new Error(`That's ${trimmed.length} characters. This tool reads up to ${MAX_CHARACTERS} at a time.`);
  }

  const tts = await getTTS(report);
  report?.('Reading the text…');

  const audio = await tts.generate(trimmed, { voice: options.voice ?? 'af_heart' });
  const wavBlob = audio.toBlob();

  report?.('Encoding MP3…');
  const wavFile = new File([wavBlob], 'speech.wav', { type: 'audio/wav' });
  return convertAudio(wavFile, 'mp3');
}

/** Exposed for tests/sanity checks that want to confirm the sample rate
 * kokoro-js actually produces, without re-deriving it by hand elsewhere. */
export const KOKORO_SAMPLE_RATE = SAMPLE_RATE;
