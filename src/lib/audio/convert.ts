import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  ALL_FORMATS,
  WavOutputFormat,
  Mp3OutputFormat,
  canEncodeAudio,
} from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

export type AudioTargetFormat = 'wav' | 'mp3';

let mp3EncoderRegistered = false;

async function ensureMp3Encoder() {
  if (mp3EncoderRegistered || (await canEncodeAudio('mp3'))) return;
  registerMp3Encoder();
  mp3EncoderRegistered = true;
}

export async function convertAudio(file: File, target: AudioTargetFormat): Promise<Blob> {
  if (target === 'mp3') await ensureMp3Encoder();
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({
    format: target === 'wav' ? new WavOutputFormat() : new Mp3OutputFormat(),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({ input, output });
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Conversion produced no output');
  return new Blob([buffer], { type: target === 'wav' ? 'audio/wav' : 'audio/mpeg' });
}
