import { decodeCappedFrames, encodeFrames } from './frameOps';
import type { ProgressReporter } from '../ui';

const MAX_DURATION_SECONDS = 10;

export interface ReverseVideoResult {
  blob: Blob;
  truncated: boolean;
}

export async function reverseVideo(file: File, report?: ProgressReporter): Promise<ReverseVideoResult> {
  report?.('Reading video frames…');
  const { frames, truncated } = await decodeCappedFrames(file, MAX_DURATION_SECONDS);
  report?.('Re-encoding in reverse…');
  const blob = await encodeFrames([...frames].reverse());
  return { blob, truncated };
}

export { MAX_DURATION_SECONDS };
