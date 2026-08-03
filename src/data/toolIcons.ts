/** Hand-drawn line-icon primitives per tool, rendered by ToolIcon.astro.
 * 24x24 viewBox, 1.75 stroke, currentColor — deliberately simple geometric
 * shapes instead of AI-stock-art style raster icons. */

export type IconPrimitive =
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'path'; d: string }
  | { t: 'polyline'; points: string };

export const categoryColors: Record<string, { bg: string; text: string }> = {
  pdf: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
  image: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  audio: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  video: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400' },
  data: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400' },
};

const page: IconPrimitive[] = [{ t: 'path', d: 'M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' }, { t: 'path', d: 'M14 3v4h4' }];

export const toolIcons: Record<string, IconPrimitive[]> = {
  // PDF
  '/pdf/merge': [
    { t: 'path', d: 'M4 5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M14 5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M9 12h6' },
    { t: 'path', d: 'M12.5 9.5 15 12l-2.5 2.5' },
  ],
  '/pdf/split': [
    ...page,
    { t: 'path', d: 'M5 12h5' },
    { t: 'path', d: 'M15 12h5' },
    { t: 'path', d: 'M8 9.5 5.5 12 8 14.5' },
    { t: 'path', d: 'M17 9.5 19.5 12 17 14.5' },
  ],
  '/pdf/compress': [
    ...page,
    { t: 'path', d: 'M9 11l3 3 3-3' },
    { t: 'path', d: 'M12 8v6' },
  ],
  '/pdf/rotate': [
    ...page,
    { t: 'path', d: 'M11 14a4 4 0 1 0 1.5-3.1' },
    { t: 'path', d: 'M12.5 9.5H10v-2.5' },
  ],
  '/pdf/to-images': [
    { t: 'path', d: 'M4 3h9l4 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M13 3v4h4' },
    { t: 'circle', cx: 8.5, cy: 13, r: 1.2 },
    { t: 'path', d: 'M5 19l3.5-3.5a1 1 0 0 1 1.4 0L12 17.5l2-2a1 1 0 0 1 1.4 0L19 19' },
  ],
  '/pdf/watermark': [
    ...page,
    { t: 'circle', cx: 12, cy: 13, r: 3.5 },
    { t: 'path', d: 'M10.5 13l1 1 2-2' },
  ],
  '/pdf/reorder-pages': [
    { t: 'rect', x: 4, y: 4, w: 9, h: 11, rx: 1 },
    { t: 'rect', x: 11, y: 9, w: 9, h: 11, rx: 1 },
    { t: 'path', d: 'M15.5 13v4' },
    { t: 'path', d: 'M13.8 14.7l1.7-1.7 1.7 1.7' },
  ],

  // Image
  '/image/heic-to-jpg': [
    { t: 'rect', x: 3, y: 5, w: 14, h: 14, rx: 1.5 },
    { t: 'circle', cx: 7.5, cy: 9.5, r: 1.3 },
    { t: 'path', d: 'M3 16l3.5-3.5a1 1 0 0 1 1.4 0L11 15.5' },
    { t: 'path', d: 'M17 8l3 3-3 3' },
    { t: 'path', d: 'M20 11h-4' },
  ],
  '/image/compress': [
    { t: 'rect', x: 3, y: 4, w: 16, h: 13, rx: 1.5 },
    { t: 'path', d: 'M8 20h8' },
    { t: 'path', d: 'M9 9l2 2 2-2' },
    { t: 'path', d: 'M11 7v4' },
  ],
  '/image/resize': [
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2 },
    { t: 'path', d: 'M9 15l6-6' },
    { t: 'path', d: 'M9 11V9h2' },
    { t: 'path', d: 'M15 13v2h-2' },
  ],
  '/image/webp-to-png': [
    { t: 'rect', x: 2.5, y: 5, w: 8, h: 8, rx: 1 },
    { t: 'rect', x: 13.5, y: 11, w: 8, h: 8, rx: 1 },
    { t: 'path', d: 'M11.5 9l2.5 2.5' },
    { t: 'path', d: 'M11.8 6.3l2.2 2.2-2.2 2.2' },
  ],
  '/image/png-to-webp': [
    { t: 'rect', x: 2.5, y: 5, w: 8, h: 8, rx: 1 },
    { t: 'rect', x: 13.5, y: 11, w: 8, h: 8, rx: 1 },
    { t: 'path', d: 'M9.5 12.5L12 15' },
    { t: 'path', d: 'M9.2 17.7l-2.2-2.2 2.2-2.2' },
  ],
  '/image/svg-to-png': [
    { t: 'circle', cx: 6, cy: 7, r: 1.6 },
    { t: 'circle', cx: 18, cy: 7, r: 1.6 },
    { t: 'circle', cx: 12, cy: 18, r: 1.6 },
    { t: 'path', d: 'M7.4 8.1L11 16.5' },
    { t: 'path', d: 'M16.6 8.1L13 16.5' },
    { t: 'path', d: 'M7.6 7h8.8' },
  ],
  '/image/crop': [
    { t: 'path', d: 'M6 2v13a2 2 0 0 0 2 2h13' },
    { t: 'path', d: 'M2 6h13a2 2 0 0 1 2 2v13' },
  ],

  // Audio
  '/audio/mp3-to-wav': [
    { t: 'path', d: 'M3 12h2l1.5-5 2 10 2-14 2 12 1.5-6h2' },
    { t: 'path', d: 'M17 8l3 3-3 3' },
    { t: 'path', d: 'M20 11h-4' },
  ],
  '/audio/wav-to-mp3': [
    { t: 'path', d: 'M3 12h1.5l1.7-4 1.8 8 1.8-11 1.7 10 1.3-5h1.2' },
    { t: 'path', d: 'M17 8l3 3-3 3' },
    { t: 'path', d: 'M20 11h-4' },
  ],
  '/audio/trim': [
    { t: 'path', d: 'M2 12h3l1.5-6 2 12 2-16 2 14 1.5-4h8' },
    { t: 'circle', cx: 5.5, cy: 18.5, r: 1.8 },
    { t: 'circle', cx: 18.5, cy: 18.5, r: 1.8 },
    { t: 'path', d: 'M7 17.2l4-4.2' },
    { t: 'path', d: 'M17 17.2l-4-4.2' },
  ],
  '/audio/merge': [
    { t: 'path', d: 'M2 9h2l1.2-3 1.6 6 1.2-8 1.6 8 1-3h1.4' },
    { t: 'path', d: 'M2 17h2l1.2-2 1.6 4 1.2-6 1.6 6 1-3h1.4' },
    { t: 'path', d: 'M15 9c3 0 3 8 6 8' },
    { t: 'path', d: 'M15 17c3 0 3-8 6-8' },
  ],
  '/audio/volume-normalize': [
    { t: 'rect', x: 4, y: 13, w: 2.5, h: 7, rx: 0.8 },
    { t: 'rect', x: 9, y: 9, w: 2.5, h: 11, rx: 0.8 },
    { t: 'rect', x: 14, y: 4, w: 2.5, h: 16, rx: 0.8 },
    { t: 'rect', x: 19, y: 9, w: 2.5, h: 11, rx: 0.8 },
    { t: 'path', d: 'M3 2h19' },
  ],

  // Video
  '/video/mp4-to-webm': [
    { t: 'rect', x: 2.5, y: 5, w: 12, h: 10, rx: 1.3 },
    { t: 'path', d: 'M7.5 8.5l4 3-4 3z' },
    { t: 'path', d: 'M18 8l3 3-3 3' },
    { t: 'path', d: 'M21 11h-4' },
  ],
  '/video/compress': [
    { t: 'rect', x: 3, y: 5, w: 14, h: 12, rx: 1.3 },
    { t: 'path', d: 'M7.5 8.5l4 3-4 3z' },
    { t: 'path', d: 'M20 8l-3 3 3 3' },
  ],
  '/video/trim': [
    { t: 'path', d: 'M3 6h13a2 2 0 0 1 2 2v9' },
    { t: 'path', d: 'M3 6v9a2 2 0 0 0 2 2h9' },
    { t: 'circle', cx: 6, cy: 18.5, r: 1.7 },
    { t: 'circle', cx: 18, cy: 6, r: 1.7 },
    { t: 'path', d: 'M7.2 17.2L16.8 7.8' },
  ],
  '/video/mute': [
    { t: 'path', d: 'M4 10v4h4l5 4V6l-5 4H4z' },
    { t: 'path', d: 'M16 9l5 6' },
    { t: 'path', d: 'M21 9l-5 6' },
  ],
  '/video/extract-audio': [
    { t: 'rect', x: 2.5, y: 4, w: 12, h: 12, rx: 1.3 },
    { t: 'path', d: 'M6.5 7.5l4 2.5-4 2.5z' },
    { t: 'circle', cx: 18, cy: 17, r: 2 },
    { t: 'path', d: 'M20 17V8l1.5-.5' },
  ],
  '/video/gif-from-video': [
    { t: 'rect', x: 3, y: 5, w: 13, h: 11, rx: 1.3 },
    { t: 'path', d: 'M7.5 8.5l4 3-4 3z' },
    { t: 'path', d: 'M19 9a3 3 0 1 0 0 5' },
    { t: 'path', d: 'M19 11.3h2' },
  ],

  // Data
  '/csv/to-json': [
    { t: 'rect', x: 2.5, y: 5, w: 8, h: 13, rx: 1 },
    { t: 'path', d: 'M6.5 8.5h4' },
    { t: 'path', d: 'M6.5 12h4' },
    { t: 'path', d: 'M6.5 15.5h2.5' },
    { t: 'path', d: 'M16.5 6c-1.5 0-2 .8-2 2v2.5c0 .8-.5 1.5-1.5 1.5.9 0 1.5.7 1.5 1.5V16c0 1.2.5 2 2 2' },
  ],
  '/json/to-csv': [
    { t: 'path', d: 'M8.5 6c-1.5 0-2 .8-2 2v2.5c0 .8-.5 1.5-1.5 1.5.9 0 1.5.7 1.5 1.5V16c0 1.2.5 2 2 2' },
    { t: 'rect', x: 13.5, y: 5, w: 8, h: 13, rx: 1 },
    { t: 'path', d: 'M16 8.5h4' },
    { t: 'path', d: 'M16 12h4' },
    { t: 'path', d: 'M16 15.5h2.5' },
  ],
  '/csv/to-excel': [
    { t: 'path', d: 'M4 3h9l4 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M13 3v4h4' },
    { t: 'path', d: 'M7.5 12l4.2 6' },
    { t: 'path', d: 'M11.7 12l-4.2 6' },
  ],
  '/data/csv-cleaner': [
    { t: 'rect', x: 3, y: 5, w: 14, h: 10, rx: 1.3 },
    { t: 'path', d: 'M3 9h14' },
    { t: 'path', d: 'M8.5 5v10' },
    { t: 'path', d: 'M18 17.5l3 3' },
    { t: 'path', d: 'M20.5 17.5l-3 3' },
  ],
};
