import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { uniqueName, zipOutputs, batchZipName } from './zip';

describe('uniqueName', () => {
  it('keeps a name unchanged the first time it is seen', () => {
    const taken = new Set<string>();
    expect(uniqueName(taken, 'photo.png')).toBe('photo.png');
  });

  it('suffixes a repeated name with an incrementing counter', () => {
    const taken = new Set<string>();
    uniqueName(taken, 'photo.png');
    expect(uniqueName(taken, 'photo.png')).toBe('photo (2).png');
    expect(uniqueName(taken, 'photo.png')).toBe('photo (3).png');
  });

  it('inserts the counter before the extension, not after it', () => {
    const taken = new Set<string>();
    uniqueName(taken, 'report.final.pdf');
    // The whole thing after the *last* dot is the extension — "final" stays
    // part of the stem, "(2)" goes right before ".pdf".
    expect(uniqueName(taken, 'report.final.pdf')).toBe('report.final (2).pdf');
  });

  it('handles a name with no extension at all', () => {
    const taken = new Set<string>();
    uniqueName(taken, 'README');
    expect(uniqueName(taken, 'README')).toBe('README (2)');
  });

  it('skips past a counter value that is already taken', () => {
    const taken = new Set<string>();
    uniqueName(taken, 'a.txt'); // a.txt
    taken.add('a (2).txt'); // pre-occupied, e.g. by an unrelated real input file
    expect(uniqueName(taken, 'a.txt')).toBe('a (3).txt');
  });
});

describe('zipOutputs', () => {
  it('packages every input under its own name, byte-for-byte', async () => {
    const a = new Blob(['hello'], { type: 'text/plain' });
    const b = new Blob(['world!!'], { type: 'text/plain' });
    const { blob, filename } = await zipOutputs(
      [
        { blob: a, filename: 'a.txt' },
        { blob: b, filename: 'b.txt' },
      ],
      'kit-bin-test.zip',
    );

    expect(filename).toBe('kit-bin-test.zip');
    expect(blob.type).toBe('application/zip');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(bytes);
    expect(Object.keys(entries).sort()).toEqual(['a.txt', 'b.txt']);
    expect(new TextDecoder().decode(entries['a.txt'])).toBe('hello');
    expect(new TextDecoder().decode(entries['b.txt'])).toBe('world!!');
  });

  it('renames colliding filenames instead of silently dropping one', async () => {
    const a = new Blob(['first'], { type: 'text/plain' });
    const b = new Blob(['second'], { type: 'text/plain' });
    const { blob } = await zipOutputs(
      [
        { blob: a, filename: 'out.txt' },
        { blob: b, filename: 'out.txt' },
      ],
      'batch.zip',
    );
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(entries).sort()).toEqual(['out (2).txt', 'out.txt']);
    // Both files' actual content survived — this is the failure mode the
    // whole function exists to prevent: fflate's zipSync silently keeps only
    // the last entry when two keys collide, which would quietly lose "first".
    expect(new TextDecoder().decode(entries['out.txt'])).toBe('first');
    expect(new TextDecoder().decode(entries['out (2).txt'])).toBe('second');
  });

  it('stores entries uncompressed (level 0)', async () => {
    // Outputs are already-compressed formats (PNG/JPG/PDF/...); re-deflating
    // them wastes time for near-zero size benefit. Verify the setting that
    // enforces this is actually wired through to fflate, not just commented.
    const blob = new Blob([new Uint8Array(1000).fill(65)], { type: 'application/octet-stream' }); // 1000 'A's — trivially compressible if deflate ran
    const { blob: zipBlob } = await zipOutputs([{ blob, filename: 'a.bin' }], 'z.zip');
    // A deflated all-'A' stream compresses to a handful of bytes; a stored
    // one stays close to the original 1000 bytes plus zip overhead.
    expect(zipBlob.size).toBeGreaterThan(1000);
  });
});

describe('batchZipName', () => {
  it('derives a filename from the last path segment of the tool slug', () => {
    expect(batchZipName('/image/compress')).toBe('kit-bin-compress.zip');
    expect(batchZipName('/pdf/watermark')).toBe('kit-bin-watermark.zip');
  });

  it('falls back to a generic name for a slug with no segments', () => {
    expect(batchZipName('/')).toBe('kit-bin-files.zip');
  });
});
