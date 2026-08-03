import { Input, BlobSource, ALL_FORMATS, CanvasSink } from 'mediabunny';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// Caps kept deliberately small — GIF is an inherently inefficient format,
// and uncapped duration/resolution/fps here produces enormous files fast.
const MAX_DURATION_SECONDS = 8;
const MAX_WIDTH = 480;
const FPS = 10;

export async function gifFromVideo(file: File): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('No video track found in this file.');

  const duration = Math.min(await input.computeDuration(), MAX_DURATION_SECONDS);
  const frameCount = Math.max(1, Math.round(duration * FPS));
  const timestamps = Array.from({ length: frameCount }, (_, i) => (i / FPS));

  const sink = new CanvasSink(track, { width: MAX_WIDTH });
  const gif = GIFEncoder();
  const delayMs = Math.round(1000 / FPS);

  for await (const wrapped of sink.canvasesAtTimestamps(timestamps)) {
    if (!wrapped) continue;
    const { canvas } = wrapped;
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: delayMs });
  }

  gif.finish();
  return new Blob([gif.bytes()] as BlobPart[], { type: 'image/gif' });
}
