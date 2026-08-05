/** Lossless metadata removal for JPEG and PNG.
 *
 * Nothing here decodes or re-encodes pixels. For JPEG the file's marker
 * segments are walked and the metadata segments are dropped, then the remaining
 * bytes (including the entire entropy-coded scan) are copied through unchanged.
 * For PNG the chunk list is walked and the ancillary metadata chunks are
 * dropped; every retained chunk is copied byte for byte, CRC included.
 *
 * Result: identical pixels, identical quality, smaller file.
 */

export type MetadataFormat = 'jpeg' | 'png';

export interface MetadataItem {
  /** Short name of the segment or chunk, e.g. "EXIF (APP1)" or "tEXt". */
  label: string;
  /** Plain-language description of what it holds. */
  detail: string;
  /** Byte length of the segment or chunk as stored in the file. */
  bytes: number;
  /** True for location data, the one category with a direct privacy impact. */
  sensitive: boolean;
  /** True when this item is removed by default. */
  removed: boolean;
  /** True for the ICC colour profile, which is only removed when
   * `StripOptions.removeIccProfile` is set. */
  isIcc: boolean;
}

export interface ExifSummary {
  format: MetadataFormat;
  fileSize: number;
  items: MetadataItem[];
  hasGps: boolean;
  hasExif: boolean;
  hasIccProfile: boolean;
  hasThumbnail: boolean;
  /** Total bytes of the items that would be removed. */
  removableBytes: number;
  camera?: string;
  dateTaken?: string;
}

export interface StripOptions {
  /** Remove the embedded ICC colour profile too. Off by default, because
   * dropping it can visibly shift colours on wide-gamut images. */
  removeIccProfile?: boolean;
}

/* ------------------------------------------------------------------ *
 * Format sniffing
 * ------------------------------------------------------------------ */

function sniff(bytes: Uint8Array): MetadataFormat | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length > 8 && png.every((b, i) => bytes[i] === b)) return 'png';
  return null;
}

const UNSUPPORTED =
  'This tool only removes metadata from JPEG and PNG files, because those are the two formats it can rebuild without re-encoding the image.';

/* ------------------------------------------------------------------ *
 * TIFF / EXIF block reading (shared by JPEG APP1 and PNG eXIf)
 * ------------------------------------------------------------------ */

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATETIME_ORIGINAL = 0x9003;

interface TiffInfo {
  hasGps: boolean;
  hasThumbnail: boolean;
  make?: string;
  model?: string;
  dateTaken?: string;
}

/** Reads the IFD structure of a TIFF header at `base` far enough to know
 * whether a GPS IFD exists, plus a few descriptive tags. Deliberately
 * tolerant: a malformed block reports nothing rather than throwing. */
function readTiff(bytes: Uint8Array, base: number, length: number): TiffInfo {
  const info: TiffInfo = { hasGps: false, hasThumbnail: false };
  if (length < 8) return info;

  const view = new DataView(bytes.buffer, bytes.byteOffset + base, Math.min(length, bytes.length - base));
  const order = view.getUint16(0, false);
  let little: boolean;
  if (order === 0x4949) little = true;
  else if (order === 0x4d4d) little = false;
  else return info;
  if (view.getUint16(2, little) !== 42) return info;

  const readAscii = (offset: number, count: number): string | undefined => {
    if (offset < 0 || offset + count > view.byteLength) return undefined;
    let out = '';
    for (let i = 0; i < count; i++) {
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      out += String.fromCharCode(c);
    }
    const trimmed = out.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const walkIfd = (ifdOffset: number, depth: number): number => {
    if (ifdOffset <= 0 || ifdOffset + 2 > view.byteLength || depth > 2) return 0;
    const count = view.getUint16(ifdOffset, little);
    const entriesEnd = ifdOffset + 2 + count * 12;
    if (count > 512 || entriesEnd + 4 > view.byteLength) return 0;

    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entry, little);
      const type = view.getUint16(entry + 2, little);
      const valueCount = view.getUint32(entry + 4, little);
      const inlineSize = type === 2 || type === 1 || type === 7 ? valueCount : 0;
      const valueOffset = inlineSize > 0 && inlineSize <= 4 ? entry + 8 : view.getUint32(entry + 8, little);

      if (tag === TAG_GPS_IFD) info.hasGps = true;
      else if (tag === TAG_EXIF_IFD) walkIfd(view.getUint32(entry + 8, little), depth + 1);
      else if (tag === TAG_MAKE && type === 2) info.make = readAscii(valueOffset, valueCount);
      else if (tag === TAG_MODEL && type === 2) info.model = readAscii(valueOffset, valueCount);
      else if ((tag === TAG_DATETIME_ORIGINAL || tag === TAG_DATETIME) && type === 2) {
        info.dateTaken = info.dateTaken ?? readAscii(valueOffset, valueCount);
      }
    }
    return view.getUint32(entriesEnd, little);
  };

  const nextIfd = walkIfd(view.getUint32(4, little), 0);
  if (nextIfd > 0) info.hasThumbnail = true;
  return info;
}

/* ------------------------------------------------------------------ *
 * JPEG segment walking
 * ------------------------------------------------------------------ */

interface JpegSegment {
  /** Marker byte, or -1 for the entropy-coded scan data run. */
  marker: number;
  /** Offset of the 0xFF marker prefix (or of the scan data). */
  start: number;
  /** Offset one past the end of this segment. */
  end: number;
  /** Offset of the payload, i.e. past the 2-byte length field. */
  payloadStart: number;
}

const MARKER_SOI = 0xd8;
const MARKER_EOI = 0xd9;
const MARKER_SOS = 0xda;
const MARKER_COM = 0xfe;
const MARKER_APP0 = 0xe0;
const MARKER_APP1 = 0xe1;
const MARKER_APP2 = 0xe2;
const MARKER_APP13 = 0xed;
const MARKER_APP14 = 0xee;
const MARKER_APP15 = 0xef;

function payloadStartsWith(bytes: Uint8Array, segment: JpegSegment, ascii: string): boolean {
  if (segment.payloadStart + ascii.length > segment.end) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (bytes[segment.payloadStart + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

/** Walks the marker structure. Everything from the first SOS onward is
 * captured as one opaque run and never inspected or modified. */
function parseJpegSegments(bytes: Uint8Array): JpegSegment[] {
  if (!(bytes[0] === 0xff && bytes[1] === MARKER_SOI)) {
    throw new Error('This file does not start with a JPEG header. Check that it is really a JPG.');
  }
  const segments: JpegSegment[] = [];
  let pos = 2;

  while (pos + 1 < bytes.length) {
    if (bytes[pos] !== 0xff) {
      throw new Error('This JPEG has an unexpected byte where a marker was expected, so it was left untouched.');
    }
    // Skip 0xFF fill bytes, which are legal padding before a marker.
    let markerPos = pos;
    while (markerPos + 1 < bytes.length && bytes[markerPos + 1] === 0xff) markerPos++;
    const marker = bytes[markerPos + 1];

    // Standalone markers carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos = markerPos + 2;
      continue;
    }
    if (marker === MARKER_EOI) {
      segments.push({ marker, start: markerPos, end: markerPos + 2, payloadStart: markerPos + 2 });
      pos = markerPos + 2;
      break;
    }
    if (markerPos + 4 > bytes.length) break;

    const length = (bytes[markerPos + 2] << 8) | bytes[markerPos + 3];
    if (length < 2) throw new Error('This JPEG has a malformed segment length, so it was left untouched.');
    const end = Math.min(markerPos + 2 + length, bytes.length);
    segments.push({ marker, start: markerPos, end, payloadStart: markerPos + 4 });

    if (marker === MARKER_SOS) {
      // Entropy-coded data (and anything trailing it) is copied verbatim.
      if (end < bytes.length) {
        segments.push({ marker: -1, start: end, end: bytes.length, payloadStart: end });
      }
      return segments;
    }
    pos = end;
  }

  return segments;
}

/** True when this segment is metadata that should be dropped. */
function isJpegMetadata(bytes: Uint8Array, segment: JpegSegment, removeIcc: boolean): boolean {
  const { marker } = segment;
  if (marker === MARKER_COM) return true;
  if (marker < MARKER_APP0 || marker > MARKER_APP15) return false;
  // APP14 "Adobe" tells decoders how to interpret Adobe CMYK/YCCK colour data.
  // Removing it can change the decoded colours, so it stays.
  if (marker === MARKER_APP14 && payloadStartsWith(bytes, segment, 'Adobe')) return false;
  if (marker === MARKER_APP2 && payloadStartsWith(bytes, segment, 'ICC_PROFILE')) return removeIcc;
  return true;
}

function describeJpegSegment(bytes: Uint8Array, segment: JpegSegment): { label: string; detail: string } {
  const { marker } = segment;
  if (marker === MARKER_COM) return { label: 'COM comment', detail: 'A free-text comment left by whatever software wrote the file.' };
  if (marker === MARKER_APP0 && payloadStartsWith(bytes, segment, 'JFIF')) {
    return { label: 'JFIF (APP0)', detail: 'Stores the file\'s pixel density (DPI) value. No personal information.' };
  }
  if (marker === MARKER_APP1 && payloadStartsWith(bytes, segment, 'Exif')) {
    return { label: 'EXIF (APP1)', detail: 'Camera and capture data. This is the segment that can carry GPS coordinates.' };
  }
  if (marker === MARKER_APP1 && payloadStartsWith(bytes, segment, 'http://ns.adobe.com/xap')) {
    return { label: 'XMP (APP1)', detail: 'Adobe XMP data: editing history, keywords, copyright, sometimes a creator name.' };
  }
  if (marker === MARKER_APP2 && payloadStartsWith(bytes, segment, 'ICC_PROFILE')) {
    return { label: 'ICC profile (APP2)', detail: 'Colour profile. Kept by default, since removing it can shift colours.' };
  }
  if (marker === MARKER_APP13 && payloadStartsWith(bytes, segment, 'Photoshop')) {
    return { label: 'Photoshop/IPTC (APP13)', detail: 'IPTC fields such as caption, credit, and author.' };
  }
  if (marker === MARKER_APP14) return { label: 'Adobe (APP14)', detail: 'Adobe colour transform flag. Kept, because removing it can change decoded colours.' };
  return { label: `APP${marker - MARKER_APP0}`, detail: 'An application-specific metadata segment.' };
}

/* ------------------------------------------------------------------ *
 * PNG chunk walking
 * ------------------------------------------------------------------ */

interface PngChunk {
  type: string;
  start: number;
  end: number;
  dataStart: number;
  dataLength: number;
}

/** Ancillary chunks that only ever hold metadata. */
const PNG_METADATA_CHUNKS = ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'];

function parsePngChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;

  while (pos + 8 <= bytes.length) {
    const dataLength = view.getUint32(pos, false);
    const dataStart = pos + 8;
    const end = dataStart + dataLength + 4;
    if (end > bytes.length) break;
    let type = '';
    for (let i = 0; i < 4; i++) type += String.fromCharCode(bytes[pos + 4 + i]);
    chunks.push({ type, start: pos, end, dataStart, dataLength });
    pos = end;
    if (type === 'IEND') break;
  }

  if (!chunks.some((c) => c.type === 'IHDR')) {
    throw new Error('This PNG has no IHDR header chunk, so it was left untouched.');
  }
  return chunks;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 as specified by PNG: over the chunk type plus the chunk data. */
export function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunkCrcValid(bytes: Uint8Array, chunk: PngChunk): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stored = view.getUint32(chunk.dataStart + chunk.dataLength, false);
  // CRC covers the 4 type bytes and the data bytes.
  return crc32(bytes, chunk.start + 4, chunk.dataStart + chunk.dataLength) === stored;
}

function describePngChunk(type: string): { label: string; detail: string } {
  switch (type) {
    case 'tEXt':
      return { label: 'tEXt', detail: 'Plain-text metadata, for example software name, author, or description.' };
    case 'iTXt':
      return { label: 'iTXt', detail: 'International text metadata. This is where XMP data is usually stored in a PNG.' };
    case 'zTXt':
      return { label: 'zTXt', detail: 'Compressed text metadata.' };
    case 'eXIf':
      return { label: 'eXIf', detail: 'A full EXIF block inside a PNG. This is the chunk that can carry GPS coordinates.' };
    case 'tIME':
      return { label: 'tIME', detail: 'The time the image was last modified.' };
    case 'iCCP':
      return { label: 'iCCP', detail: 'Colour profile. Kept by default, since removing it can shift colours.' };
    default:
      return { label: type, detail: 'An ancillary chunk.' };
  }
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** Reports which metadata categories a JPEG or PNG actually contains.
 * Presence detection only, plus camera make/model and capture date when the
 * EXIF block stores them as plain ASCII. Individual tag values are not decoded. */
export async function readExifSummary(file: File): Promise<ExifSummary> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = sniff(bytes);
  if (!format) throw new Error(UNSUPPORTED);

  const items: MetadataItem[] = [];
  let hasGps = false;
  let hasExif = false;
  let hasIccProfile = false;
  let hasThumbnail = false;
  let camera: string | undefined;
  let dateTaken: string | undefined;

  if (format === 'jpeg') {
    for (const segment of parseJpegSegments(bytes)) {
      const { marker } = segment;
      if (marker !== MARKER_COM && (marker < MARKER_APP0 || marker > MARKER_APP15)) continue;

      const { label, detail } = describeJpegSegment(bytes, segment);
      const isExif = marker === MARKER_APP1 && payloadStartsWith(bytes, segment, 'Exif');
      const isIcc = marker === MARKER_APP2 && payloadStartsWith(bytes, segment, 'ICC_PROFILE');
      const isAdobe = marker === MARKER_APP14 && payloadStartsWith(bytes, segment, 'Adobe');

      let sensitive = false;
      if (isExif) {
        hasExif = true;
        // "Exif\0\0" is 6 bytes, then the TIFF header begins.
        const tiff = readTiff(bytes, segment.payloadStart + 6, segment.end - segment.payloadStart - 6);
        if (tiff.hasGps) hasGps = true;
        if (tiff.hasThumbnail) hasThumbnail = true;
        camera = camera ?? ([tiff.make, tiff.model].filter(Boolean).join(' ') || undefined);
        dateTaken = dateTaken ?? tiff.dateTaken;
        sensitive = tiff.hasGps;
      }
      if (isIcc) hasIccProfile = true;

      items.push({
        label,
        detail: sensitive ? `${detail} This file has a GPS block.` : detail,
        bytes: segment.end - segment.start,
        sensitive,
        removed: !isIcc && !isAdobe,
        isIcc,
      });
    }
  } else {
    for (const chunk of parsePngChunks(bytes)) {
      if (!PNG_METADATA_CHUNKS.includes(chunk.type) && chunk.type !== 'iCCP') continue;
      const { label, detail } = describePngChunk(chunk.type);
      let sensitive = false;
      if (chunk.type === 'eXIf') {
        hasExif = true;
        const tiff = readTiff(bytes, chunk.dataStart, chunk.dataLength);
        if (tiff.hasGps) hasGps = true;
        if (tiff.hasThumbnail) hasThumbnail = true;
        camera = camera ?? ([tiff.make, tiff.model].filter(Boolean).join(' ') || undefined);
        dateTaken = dateTaken ?? tiff.dateTaken;
        sensitive = tiff.hasGps;
      }
      if (chunk.type === 'iCCP') hasIccProfile = true;

      items.push({
        label,
        detail: sensitive ? `${detail} This file has a GPS block.` : detail,
        bytes: chunk.end - chunk.start,
        sensitive,
        removed: chunk.type !== 'iCCP',
        isIcc: chunk.type === 'iCCP',
      });
    }
  }

  const removableBytes = items.filter((i) => i.removed).reduce((sum, i) => sum + i.bytes, 0);
  return { format, fileSize: file.size, items, hasGps, hasExif, hasIccProfile, hasThumbnail, removableBytes, camera, dateTaken };
}

/** Rebuilds a JPEG without its APPn metadata segments or COM comments.
 * The APP14 "Adobe" segment is kept, and the ICC profile is kept unless
 * `removeIccProfile` is set. Image scan data is copied byte for byte. */
export async function stripJpegMetadata(file: File, opts: StripOptions = {}): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes) !== 'jpeg') throw new Error('This file is not a JPEG.');

  const segments = parseJpegSegments(bytes);
  const removeIcc = opts.removeIccProfile === true;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI

  for (const segment of segments) {
    if (segment.marker >= 0 && isJpegMetadata(bytes, segment, removeIcc)) continue;
    parts.push(bytes.subarray(segment.start, segment.end));
  }

  return new Blob(parts as BlobPart[], { type: 'image/jpeg' });
}

/** Rebuilds a PNG without its tEXt, iTXt, zTXt, eXIf, or tIME chunks.
 * IHDR, PLTE, IDAT, IEND and every other chunk are copied byte for byte,
 * so their stored CRCs stay valid by construction. */
export async function stripPngMetadata(file: File, opts: StripOptions = {}): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes) !== 'png') throw new Error('This file is not a PNG.');

  const chunks = parsePngChunks(bytes);
  const removeIcc = opts.removeIccProfile === true;
  const parts: Uint8Array[] = [bytes.subarray(0, 8)]; // PNG signature

  for (const chunk of chunks) {
    if (PNG_METADATA_CHUNKS.includes(chunk.type)) continue;
    if (chunk.type === 'iCCP' && removeIcc) continue;
    if (chunk.type === 'IHDR' && !pngChunkCrcValid(bytes, chunk)) {
      throw new Error('This PNG\'s header chunk fails its checksum, so it was left untouched.');
    }
    parts.push(bytes.subarray(chunk.start, chunk.end));
  }

  return new Blob(parts as BlobPart[], { type: 'image/png' });
}

/** Dispatches to the JPEG or PNG stripper. Throws for any other format
 * rather than falling back to a lossy re-encode. */
export async function stripMetadata(file: File, opts: StripOptions = {}): Promise<Blob> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const format = sniff(head);
  if (format === 'jpeg') return stripJpegMetadata(file, opts);
  if (format === 'png') return stripPngMetadata(file, opts);
  throw new Error(UNSUPPORTED);
}

/** "photo.jpg" becomes "photo-clean.jpg". */
export function cleanFilename(filename: string): string {
  return /\.[^./\\]+$/.test(filename) ? filename.replace(/(\.[^./\\]+)$/, '-clean$1') : `${filename}-clean`;
}
