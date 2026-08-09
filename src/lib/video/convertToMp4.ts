import { Input, Output, Conversion, BlobSource, BufferTarget, ALL_FORMATS, Mp4OutputFormat } from 'mediabunny';
import type { ProgressReporter } from '../ui';

/** Converts any container Mediabunny can read (MOV, WebM, MKV, AVI, and MP4
 * itself) into MP4. Re-muxes when the existing codecs are already
 * MP4-compatible (fast — no decode/re-encode) and falls back to a full
 * transcode when they aren't; `Conversion` decides which per track, we don't
 * have to. Re-running an MP4 through this is allowed on purpose: some people
 * just want a clean re-mux (fixed moov atom, stripped odd metadata, etc.). */
export async function convertToMp4(file: File, report?: ProgressReporter): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

  // Mediabunny can't identify every container it's handed (truncated files,
  // formats it doesn't support, or a file that isn't actually video at all).
  // Surface that as one clear message rather than letting a lower-level
  // parser error bubble up.
  const readable = await input.canRead();
  if (!readable) {
    throw new Error("This file's format couldn't be read. Make sure it's a video file and isn't corrupted.");
  }

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

  report?.('Reading video…');
  const conversion = await Conversion.init({ input, output });

  if (!conversion.isValid) {
    throw new Error('This video has no tracks that can be converted to MP4.');
  }

  conversion.onProgress = (progress) => {
    report?.(`Converting… ${Math.round(progress * 100)}%`);
  };

  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output.');
  return new Blob([buffer], { type: 'video/mp4' });
}
