import { audioBufferToWav, decodeAudioFile } from './wav';

// Assumes all inputs share a sample rate (the common case — same source device/export
// settings). Mismatched sample rates play back at the wrong pitch/speed for those clips;
// resampling isn't implemented since AudioContext.decodeAudioData already resamples to
// the context's own default rate on most engines, but that's not guaranteed cross-browser.
export async function mergeAudio(files: File[]): Promise<Blob> {
  const buffers = await Promise.all(files.map(decodeAudioFile));

  const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const sampleRate = buffers[0].sampleRate;
  const totalFrames = buffers.reduce((sum, b) => sum + b.length, 0);

  const ctx = new OfflineAudioContext(numChannels, totalFrames, sampleRate);
  const merged = ctx.createBuffer(numChannels, totalFrames, sampleRate);

  let offset = 0;
  for (const buffer of buffers) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sourceChannel = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
      merged.getChannelData(ch).set(sourceChannel, offset);
    }
    offset += buffer.length;
  }

  return audioBufferToWav(merged);
}
