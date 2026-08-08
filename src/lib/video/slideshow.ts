import { Output, BufferTarget, Mp4OutputFormat, CanvasSource, AudioBufferSource, Quality } from 'mediabunny';

// Unlike reverse/boomerang, a slideshow doesn't need every frame decoded into
// memory at once — each image gets exactly one encoded sample, held on
// screen for its full duration (verified this works correctly: a single
// add(timestamp, duration) call displays for that whole span, no need to
// redraw at a fixed frame rate). So the real constraint here is output
// length, not per-frame memory, and the caps reflect that.
export const MAX_IMAGES = 40;
export const MIN_SECONDS_PER_IMAGE = 1;
export const MAX_SECONDS_PER_IMAGE = 10;
const MAX_TOTAL_SECONDS = 180;

// Fixed 16:9 canvas; every image is fit inside it (never cropped or
// stretched) so a mix of portrait and landscape photos doesn't distort —
// unused space is filled with black letterboxing, the same trade every
// slideshow/video tool with mixed-aspect input makes.
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export interface SlideshowOptions {
  images: File[];
  secondsPerImage: number;
  audio?: File;
}

export interface SlideshowResult {
  blob: Blob;
  truncatedImages: boolean;
}

function drawContain(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const scale = Math.min(CANVAS_WIDTH / bitmap.width, CANVAS_HEIGHT / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const x = (CANVAS_WIDTH - w) / 2;
  const y = (CANVAS_HEIGHT - h) / 2;
  ctx.drawImage(bitmap, x, y, w, h);
}

/** Loops (or trims) a decoded AudioBuffer to exactly `targetSeconds`, so
 * background music keeps playing until the slideshow ends rather than
 * cutting out partway through, and doesn't run past the last image either. */
function fitAudioToDuration(buffer: AudioBuffer, targetSeconds: number, audioCtx: BaseAudioContext): AudioBuffer {
  const targetLength = Math.round(targetSeconds * buffer.sampleRate);
  const out = audioCtx.createBuffer(buffer.numberOfChannels, targetLength, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const src = buffer.getChannelData(channel);
    const dst = out.getChannelData(channel);
    for (let i = 0; i < targetLength; i++) {
      dst[i] = src[i % src.length];
    }
  }
  return out;
}

export async function createSlideshow(opts: SlideshowOptions, report?: (message: string) => void): Promise<SlideshowResult> {
  const secondsPerImage = Math.min(MAX_SECONDS_PER_IMAGE, Math.max(MIN_SECONDS_PER_IMAGE, opts.secondsPerImage));
  const maxImagesForDuration = Math.max(1, Math.floor(MAX_TOTAL_SECONDS / secondsPerImage));
  const imageCap = Math.min(MAX_IMAGES, maxImagesForDuration);
  const images = opts.images.slice(0, imageCap);
  const truncatedImages = opts.images.length > images.length;

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const videoSource = new CanvasSource(canvas, { codec: 'avc', bitrate: new Quality('medium') });
  output.addVideoTrack(videoSource);

  const totalDuration = images.length * secondsPerImage;
  let audioSource: InstanceType<typeof AudioBufferSource> | undefined;
  let audioCtx: AudioContext | undefined;
  let fittedAudioBuffer: AudioBuffer | undefined;

  if (opts.audio) {
    report?.('Decoding audio…');
    audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(await opts.audio.arrayBuffer());
    fittedAudioBuffer = fitAudioToDuration(decoded, totalDuration, audioCtx);
    audioSource = new AudioBufferSource({ codec: 'aac', bitrate: new Quality('medium') });
    output.addAudioTrack(audioSource);
  }

  await output.start();

  let t = 0;
  for (let i = 0; i < images.length; i++) {
    report?.(`Rendering image ${i + 1} of ${images.length}…`);
    const bitmap = await createImageBitmap(images[i]);
    drawContain(ctx, bitmap);
    bitmap.close();
    await videoSource.add(t, secondsPerImage);
    t += secondsPerImage;
  }

  if (audioSource && fittedAudioBuffer) {
    report?.('Adding audio track…');
    await audioSource.add(fittedAudioBuffer);
  }

  report?.('Finalizing video…');
  await output.finalize();
  audioCtx?.close();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Encoding produced no output.');
  return { blob: new Blob([buffer], { type: 'video/mp4' }), truncatedImages };
}
