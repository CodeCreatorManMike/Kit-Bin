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

  // Decode every frame first so one shared palette can be quantized across
  // the whole clip. Quantizing per-frame (the previous approach) picks a
  // different 256-color palette for each frame, which shows up as visible
  // color flicker between frames in the output GIF.
  const frames: { data: Uint8ClampedArray; width: number; height: number }[] = [];
  for await (const wrapped of sink.canvasesAtTimestamps(timestamps)) {
    if (!wrapped) continue;
    const { canvas } = wrapped;
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    frames.push({ data, width, height });
  }
  if (frames.length === 0) throw new Error('Could not read any frames from this video.');

  const sampleStride = Math.max(1, Math.floor(frames.length / 20));
  const sampled = frames.filter((_, i) => i % sampleStride === 0);
  const combined = new Uint8ClampedArray(sampled.reduce((n, f) => n + f.data.length, 0));
  let offset = 0;
  for (const f of sampled) {
    combined.set(f.data, offset);
    offset += f.data.length;
  }
  const palette = quantize(combined, 256);

  for (const { data, width, height } of frames) {
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: delayMs });
  }

  gif.finish();
  return new Blob([gif.bytes()] as BlobPart[], { type: 'image/gif' });
}
