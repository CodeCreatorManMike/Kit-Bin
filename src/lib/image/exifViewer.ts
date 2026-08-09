/** Reads and structures the EXIF/GPS metadata embedded in a photo, for display only.
 *
 * This is a read-only viewer — it never modifies or re-encodes the file. The sibling
 * tool `/image/remove-metadata` is the one that strips this data; this one exists to
 * show the user what's actually in there first.
 *
 * exifr's defaults already do the useful normalization for us: `mergeOutput: true`
 * (the default) flattens IFD0/EXIF/GPS tags into one object and computes plain decimal
 * `latitude`/`longitude` from the GPS DMS tags, `translateValues`/`reviveValues`
 * (also defaults) turn numeric enums into readable strings and dates into `Date`
 * instances. We pass them explicitly below anyway so this keeps working if exifr's
 * defaults ever change upstream. */
import exifr from 'exifr';

export interface ExifGps {
  latitude: number;
  longitude: number;
  /** Ready-to-click link — the user decides whether to open it, this tool never does. */
  mapUrl: string;
  altitude?: number;
}

export interface ExifCamera {
  make?: string;
  model?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
}

export interface ExifTimestamps {
  dateTaken?: string;
  dateModified?: string;
}

export interface ExifDimensions {
  width?: number;
  height?: number;
  orientation?: string;
}

export interface ExifResult {
  /** False when exifr found nothing at all worth showing — the "no hidden metadata" state. */
  hasData: boolean;
  gps?: ExifGps;
  camera?: ExifCamera;
  timestamps?: ExifTimestamps;
  dimensions?: ExifDimensions;
  software?: string;
  /** Everything else exifr returned that isn't surfaced in a named field above,
   * so nothing is silently discarded even though we don't have a dedicated slot for it. */
  other: Record<string, string>;
}

// Tags already accounted for by a named field, or too heavy/binary to show as raw text.
const HANDLED_KEYS = new Set([
  'Make', 'Model', 'LensModel', 'LensMake', 'FNumber', 'ApertureValue', 'ExposureTime',
  'ShutterSpeedValue', 'ISO', 'ISOSpeedRatings', 'FocalLength', 'FocalLengthIn35mmFormat',
  'DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTime',
  'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight', 'PixelXDimension',
  'PixelYDimension', 'Orientation', 'Software',
  'latitude', 'longitude', 'GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef',
  'GPSAltitude', 'GPSAltitudeRef', 'GPSVersionID', 'GPSTimeStamp', 'GPSDateStamp',
  'thumbnail', 'Thumbnail', 'ThumbnailLength', 'ThumbnailOffset', 'MakerNote', 'UserComment',
]);

function orientationLabel(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  const labels: Record<number, string> = {
    1: 'Normal', 2: 'Flipped horizontally', 3: 'Rotated 180°',
    4: 'Flipped vertically', 5: 'Rotated 90° CW, flipped', 6: 'Rotated 90° CW',
    7: 'Rotated 90° CCW, flipped', 8: 'Rotated 90° CCW',
  };
  return labels[value as number] ?? String(value);
}

function toDisplayString(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.map(toDisplayString).join(', ');
  if (typeof value === 'object' && value !== null) {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

export async function readMetadata(file: File): Promise<ExifResult> {
  let raw: Record<string, unknown> | null | undefined;
  try {
    raw = await exifr.parse(file, {
      gps: true,
      tiff: true,
      exif: true,
      xmp: true,
      icc: false,
      iptc: true,
      translateValues: true,
      reviveValues: true,
      mergeOutput: true,
      sanitize: true,
    });
  } catch {
    raw = null;
  }

  if (!raw || Object.keys(raw).length === 0) {
    return { hasData: false, other: {} };
  }

  const result: ExifResult = { hasData: false, other: {} };

  // --- GPS ---
  const lat = raw.latitude as number | undefined;
  const lon = raw.longitude as number | undefined;
  if (typeof lat === 'number' && typeof lon === 'number' && !Number.isNaN(lat) && !Number.isNaN(lon)) {
    result.gps = {
      latitude: lat,
      longitude: lon,
      mapUrl: `https://www.google.com/maps?q=${lat},${lon}`,
      altitude: typeof raw.GPSAltitude === 'number' ? raw.GPSAltitude : undefined,
    };
  }

  // --- Camera ---
  const camera: ExifCamera = {};
  if (raw.Make) camera.make = toDisplayString(raw.Make);
  if (raw.Model) camera.model = toDisplayString(raw.Model);
  if (raw.LensModel) camera.lens = toDisplayString(raw.LensModel);
  if (typeof raw.FNumber === 'number') camera.aperture = `f/${raw.FNumber}`;
  if (typeof raw.ExposureTime === 'number') {
    camera.shutterSpeed = raw.ExposureTime >= 1
      ? `${raw.ExposureTime}s`
      : `1/${Math.round(1 / raw.ExposureTime)}s`;
  }
  const iso = raw.ISO ?? raw.ISOSpeedRatings;
  if (iso != null) camera.iso = `ISO ${toDisplayString(iso)}`;
  if (typeof raw.FocalLength === 'number') camera.focalLength = `${raw.FocalLength}mm`;
  if (Object.keys(camera).length) result.camera = camera;

  // --- Timestamps ---
  const timestamps: ExifTimestamps = {};
  const taken = raw.DateTimeOriginal ?? raw.CreateDate;
  if (taken) timestamps.dateTaken = toDisplayString(taken);
  if (raw.ModifyDate) timestamps.dateModified = toDisplayString(raw.ModifyDate);
  if (Object.keys(timestamps).length) result.timestamps = timestamps;

  // --- Dimensions / orientation ---
  const dimensions: ExifDimensions = {};
  const width = raw.ExifImageWidth ?? raw.ImageWidth ?? raw.PixelXDimension;
  const height = raw.ExifImageHeight ?? raw.ImageHeight ?? raw.PixelYDimension;
  if (typeof width === 'number') dimensions.width = width;
  if (typeof height === 'number') dimensions.height = height;
  const orientation = orientationLabel(raw.Orientation);
  if (orientation) dimensions.orientation = orientation;
  if (Object.keys(dimensions).length) result.dimensions = dimensions;

  // --- Software ---
  if (raw.Software) result.software = toDisplayString(raw.Software);

  // --- Everything else, as a generic key/value catch-all ---
  const other: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (HANDLED_KEYS.has(key)) continue;
    if (value == null) continue;
    // Skip anything that's clearly binary/oversized (embedded thumbnails, maker notes as buffers).
    if (value instanceof Uint8Array || (typeof value === 'object' && 'byteLength' in (value as object))) continue;
    const display = toDisplayString(value);
    if (!display || display.length > 500) continue;
    other[key] = display;
  }
  result.other = other;

  result.hasData = Boolean(
    result.gps || result.camera || result.timestamps || result.dimensions ||
    result.software || Object.keys(result.other).length > 0
  );

  return result;
}
