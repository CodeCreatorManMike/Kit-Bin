import { Input, BlobSource, ALL_FORMATS, CanvasSink, Output, BufferTarget, Mp4OutputFormat, CanvasSource, Quality } from 'mediabunny';

/** Shared by reverse.ts and boomerang.ts: both need "decode a capped, sampled
 * set of frames into memory, then re-encode them in some new order." Full
 * source-resolution + full-length decoding is not viable in a browser tab —
 * a 30s 1080p clip at native frame rate is multiple gigabytes of raw canvas
 * data. These caps were sized from a real throughput/memory measurement
 * (320x240 test clip: ~130 fps encode, ~300KB/frame), scaled up with margin
 * for portrait phone video, which is the dominant real-world case. */
export const MAX_WIDTH = 360;
export const SAMPLE_FPS = 20;
export const MAX_FRAMES = 200; // 10s at SAMPLE_FPS, independent of source fps

export interface DecodedFrame {
  canvas: HTMLCanvasElement;
  duration: number;
}

export interface DecodedClip {
  frames: DecodedFrame[];
  /** True if the source was longer than the cap and got truncated. */
  truncated: boolean;
}

/** Decodes up to `maxDurationSeconds` of a video, sampled at SAMPLE_FPS
 * regardless of the source's native frame rate — this bounds both memory
 * and output size predictably, rather than inheriting a source clip's own
 * (possibly very high) frame rate. */
export async function decodeCappedFrames(file: File, maxDurationSeconds: number): Promise<DecodedClip> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('No video track found in this file.');

  const sourceDuration = await input.computeDuration();
  const cappedDuration = Math.min(sourceDuration, maxDurationSeconds);
  const frameCount = Math.min(MAX_FRAMES, Math.max(1, Math.round(cappedDuration * SAMPLE_FPS)));
  const timestamps = Array.from({ length: frameCount }, (_, i) => i / SAMPLE_FPS);

  const sink = new CanvasSink(track, { width: MAX_WIDTH });
  const frameDuration = 1 / SAMPLE_FPS;
  const frames: DecodedFrame[] = [];

  for await (const wrapped of sink.canvasesAtTimestamps(timestamps)) {
    if (!wrapped) continue;
    // CanvasSink reuses/mutates its internal canvas between iterations, so
    // each frame has to be copied out before decoding the next one.
    const owned = document.createElement('canvas');
    owned.width = wrapped.canvas.width;
    owned.height = wrapped.canvas.height;
    owned.getContext('2d')!.drawImage(wrapped.canvas, 0, 0);
    frames.push({ canvas: owned, duration: frameDuration });
  }

  if (frames.length === 0) throw new Error('Could not read any frames from this video.');
  return { frames, truncated: sourceDuration > maxDurationSeconds };
}

/** Encodes a frame sequence to MP4 (H.264/AVC — matches every other video
 * tool's output format on this site). Audio is not carried over: reversed
 * playback needs the audio reversed and re-synced too, which is real added
 * complexity for a feature whose whole point is a short silent/looping clip
 * in the first place. The page copy says so; Extract Audio / Mute Video
 * cover the audio side for anyone who wants it separately. */
export async function encodeFrames(frames: DecodedFrame[]): Promise<Blob> {
  const first = frames[0];
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const workCanvas = document.createElement('canvas');
  workCanvas.width = first.canvas.width;
  workCanvas.height = first.canvas.height;
  const workCtx = workCanvas.getContext('2d')!;

  const source = new CanvasSource(workCanvas, { codec: 'avc', bitrate: new Quality('medium') });
  output.addVideoTrack(source);
  await output.start();

  let t = 0;
  for (const frame of frames) {
    workCtx.clearRect(0, 0, workCanvas.width, workCanvas.height);
    workCtx.drawImage(frame.canvas, 0, 0);
    await source.add(t, frame.duration);
    t += frame.duration;
  }
  await output.finalize();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Encoding produced no output.');
  return new Blob([buffer], { type: 'video/mp4' });
}
