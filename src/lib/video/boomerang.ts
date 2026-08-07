import { decodeCappedFrames, encodeFrames } from './frameOps';
import type { ProgressReporter } from '../ui';

// Lower than reverse's cap: boomerang plays the clip forward then backward,
// so the encoded output is roughly double this many frames already.
const MAX_DURATION_SECONDS = 5;

export interface BoomerangVideoResult {
  blob: Blob;
  truncated: boolean;
}

export async function boomerangVideo(file: File, report?: ProgressReporter): Promise<BoomerangVideoResult> {
  report?.('Reading video frames…');
  const { frames, truncated } = await decodeCappedFrames(file, MAX_DURATION_SECONDS);
  report?.('Building the forward-and-back loop…');
  // Drop the reversed half's first frame — it's identical to the forward
  // half's last frame, and keeping both would show as a one-frame stutter
  // at the turnaround.
  const reversed = [...frames].reverse().slice(1);
  const blob = await encodeFrames([...frames, ...reversed]);
  return { blob, truncated };
}

export { MAX_DURATION_SECONDS };
