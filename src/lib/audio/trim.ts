import { Input, Output, Conversion, BlobSource, BufferTarget, ALL_FORMATS, WavOutputFormat } from 'mediabunny';

export async function trimAudio(file: File, startSeconds: number, endSeconds: number): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new WavOutputFormat(), target: new BufferTarget() });

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: startSeconds, end: endSeconds },
  });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: 'audio/wav' });
}
