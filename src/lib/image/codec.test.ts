import { describe, it, expect } from 'vitest';
import { sniffMime, renameToMime } from './codec';

function fileWithType(name: string, type: string): File {
  return new File(['x'], name, { type });
}

describe('sniffMime', () => {
  it('trusts file.type when the browser provided one', () => {
    expect(sniffMime(fileWithType('photo.png', 'image/png'))).toBe('image/png');
  });

  it('falls back to the extension for formats browsers report as empty (QOI)', () => {
    expect(sniffMime(fileWithType('a.qoi', ''))).toBe('image/qoi');
  });

  it('falls back to the extension for JXL (Safari/Firefox often report empty)', () => {
    expect(sniffMime(fileWithType('a.jxl', ''))).toBe('image/jxl');
  });

  it('falls back to the extension for AVIF too', () => {
    expect(sniffMime(fileWithType('a.avif', ''))).toBe('image/avif');
  });

  it('returns empty string for an unrecognized extension with no browser-provided type', () => {
    expect(sniffMime(fileWithType('a.bmp', ''))).toBe('');
  });

  it('is case-insensitive on the extension', () => {
    expect(sniffMime(fileWithType('A.QOI', ''))).toBe('image/qoi');
  });
});

describe('renameToMime', () => {
  it('rewrites the extension when it disagrees with the actual bytes', () => {
    // The real bug this guards: Compress Image had no PNG encoder path for
    // some inputs and silently returned JPEG bytes under the original name.
    expect(renameToMime('photo.gif', 'image/jpeg')).toBe('photo.jpg');
  });

  it('leaves the filename alone when the extension already matches', () => {
    expect(renameToMime('photo.png', 'image/png')).toBe('photo.png');
  });

  it('treats .jpg and .jpeg as both correct for image/jpeg (no needless rename)', () => {
    expect(renameToMime('photo.jpeg', 'image/jpeg')).toBe('photo.jpeg');
    expect(renameToMime('photo.jpg', 'image/jpeg')).toBe('photo.jpg');
  });

  it('is case-insensitive when checking the current extension', () => {
    expect(renameToMime('PHOTO.PNG', 'image/png')).toBe('PHOTO.PNG');
  });

  it('handles a filename with no extension', () => {
    expect(renameToMime('photo', 'image/webp')).toBe('photo.webp');
  });

  it('handles a filename with multiple dots, replacing only the last segment', () => {
    expect(renameToMime('my.photo.v2.bmp', 'image/avif')).toBe('my.photo.v2.avif');
  });

  it('returns the filename unchanged for a mime type with no known extension', () => {
    expect(renameToMime('photo.png', 'image/tiff')).toBe('photo.png');
  });
});
