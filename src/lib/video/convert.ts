import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  ALL_FORMATS,
  WebMOutputFormat,
  Mp4OutputFormat,
  Quality,
} from 'mediabunny';

export async function convertContainer(file: File, target: 'webm' | 'mp4'): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({
    format: target === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat(),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({ input, output });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: target === 'webm' ? 'video/webm' : 'video/mp4' });
}

export async function compressVideo(file: File): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

  const conversion = await Conversion.init({
    input,
    output,
    video: { quality: new Quality('low') },
    audio: { quality: new Quality('medium') },
  });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: 'video/mp4' });
}

export async function trimVideo(file: File, startSeconds: number, endSeconds: number): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: startSeconds, end: endSeconds },
  });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: 'video/mp4' });
}

export async function muteVideo(file: File): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

  const conversion = await Conversion.init({ input, output, audio: { discard: true } });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: 'video/mp4' });
}

export async function extractAudio(file: File): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });

  const conversion = await Conversion.init({ input, output, video: { discard: true } });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: 'audio/webm' });
}
