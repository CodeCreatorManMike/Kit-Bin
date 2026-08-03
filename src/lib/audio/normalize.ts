import { audioBufferToWav, decodeAudioFile } from './wav';

export async function normalizeVolume(file: File, targetPeak = 0.95): Promise<Blob> {
  const buffer = await decodeAudioFile(file);

  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  if (peak === 0) return audioBufferToWav(buffer);

  const gain = targetPeak / peak;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      data[i] *= gain;
    }
  }

  return audioBufferToWav(buffer);
}
