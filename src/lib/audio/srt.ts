/** Converts transcript segments into a valid SRT subtitle file.
 *
 * SRT is a plain, well-documented text format: sequential 1-based entry numbers,
 * a `HH:MM:SS,mmm --> HH:MM:SS,mmm` timestamp line, the caption text, and a blank
 * line between entries. No library needed — it's simple enough to be worth
 * implementing directly rather than pulling in a dependency for it. */
import type { TranscriptSegment } from './transcribe';

function formatTimestamp(totalSeconds: number): string {
  const ms = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/** Builds an SRT document from transcript segments. Each segment's end is nudged
 * forward a hair past its start if a decoded chunk ever comes back with a
 * zero-length or inverted range, since a `00:00:01,000 --> 00:00:01,000` line is
 * technically invalid in some SRT parsers. */
export function segmentsToSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((segment, index) => {
      const start = formatTimestamp(segment.start);
      const end = formatTimestamp(Math.max(segment.end, segment.start + 0.001));
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
}
