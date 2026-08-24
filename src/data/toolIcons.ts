/** Hand-drawn line-icon primitives per tool, rendered by ToolIcon.astro.
 * 24x24 viewBox, 1.75 stroke, currentColor — deliberately simple geometric
 * shapes instead of AI-stock-art style raster icons. */

export type IconPrimitive =
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'path'; d: string }
  | { t: 'polyline'; points: string }
  /** Duotone underlay: filled, no stroke, drawn *behind* the line work at low
   * opacity. This is what stops the set reading as generic hairline clip-art. */
  | { t: 'fill'; d: string };

export interface CategoryColor {
  /** Flat tint, kept for small/inline contexts. */
  bg: string;
  text: string;
  dot: string;
  /** Saturated gradient, for solid-fill treatments (hero chips, headers). */
  gradient: string;
  /** Soft gradient tile used behind tool icons. */
  tile: string;
  /** Inset hairline that gives the tile a lit top edge. */
  ring: string;
  /** Coloured ambient shadow so tiles sit on the card instead of floating flat. */
  glow: string;
}

export const categoryColors: Record<string, CategoryColor> = {
  pdf: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-400',
    gradient: 'bg-gradient-to-br from-red-400 to-orange-400',
    tile: 'bg-gradient-to-br from-red-100 via-red-50 to-orange-50 dark:from-red-500/25 dark:via-red-500/10 dark:to-orange-500/10',
    ring: 'ring-red-500/15 dark:ring-red-400/25',
    glow: 'group-hover:shadow-red-500/25',
  },
  image: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-400',
    gradient: 'bg-gradient-to-br from-emerald-400 to-teal-400',
    tile: 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50 dark:from-emerald-500/25 dark:via-emerald-500/10 dark:to-teal-500/10',
    ring: 'ring-emerald-500/15 dark:ring-emerald-400/25',
    glow: 'group-hover:shadow-emerald-500/25',
  },
  audio: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-400',
    gradient: 'bg-gradient-to-br from-amber-400 to-orange-400',
    tile: 'bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 dark:from-amber-500/25 dark:via-amber-500/10 dark:to-orange-500/10',
    ring: 'ring-amber-500/15 dark:ring-amber-400/25',
    glow: 'group-hover:shadow-amber-500/25',
  },
  video: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-400',
    gradient: 'bg-gradient-to-br from-violet-400 to-fuchsia-400',
    tile: 'bg-gradient-to-br from-violet-100 via-violet-50 to-fuchsia-50 dark:from-violet-500/25 dark:via-violet-500/10 dark:to-fuchsia-500/10',
    ring: 'ring-violet-500/15 dark:ring-violet-400/25',
    glow: 'group-hover:shadow-violet-500/25',
  },
  data: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-400',
    gradient: 'bg-gradient-to-br from-cyan-400 to-blue-400',
    tile: 'bg-gradient-to-br from-cyan-100 via-cyan-50 to-blue-50 dark:from-cyan-500/25 dark:via-cyan-500/10 dark:to-blue-500/10',
    ring: 'ring-cyan-500/15 dark:ring-cyan-400/25',
    glow: 'group-hover:shadow-cyan-500/25',
  },
  dev: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-400',
    gradient: 'bg-gradient-to-br from-sky-400 to-indigo-400',
    tile: 'bg-gradient-to-br from-sky-100 via-sky-50 to-indigo-50 dark:from-sky-500/25 dark:via-sky-500/10 dark:to-indigo-500/10',
    ring: 'ring-sky-500/15 dark:ring-sky-400/25',
    glow: 'group-hover:shadow-sky-500/25',
  },
  guides: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    dot: 'bg-indigo-400',
    gradient: 'bg-gradient-to-br from-indigo-400 to-violet-400',
    tile: 'bg-gradient-to-br from-indigo-100 via-indigo-50 to-violet-50 dark:from-indigo-500/25 dark:via-indigo-500/10 dark:to-violet-500/10',
    ring: 'ring-indigo-500/15 dark:ring-indigo-400/25',
    glow: 'group-hover:shadow-indigo-500/25',
  },
};

/** Single-path category glyphs, used by the sidebar nav and category hub page headers. */
export const categoryIconPaths: Record<string, string> = {
  pdf: 'M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5',
  image: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8 11a2 2 0 100-4 2 2 0 000 4zM3 16l5-5 4 4 3-3 6 6',
  audio: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
  video: 'M4 6a1 1 0 011-1h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6zM16 10l5-3v10l-5-3',
  data: 'M4 5h16v4H4V5zM4 11h7v8H4v-8zM13 11h7v8h-7v-8z',
  dev: 'M8 4H5a1 1 0 0 0-1 1v3m12-4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3m12 4h3a1 1 0 0 0 1-1v-3M9 9l-3 3 3 3m6-6 3 3-3 3',
  guides: 'M4 5c2-1 6-1 8 0v14c-2-1-6-1-8 0V5zM20 5c-2-1-6-1-8 0v14c2-1 6-1 8 0V5z',
};

/** Shared document silhouette (duotone body + outline + folded corner). */
const page: IconPrimitive[] = [
  { t: 'fill', d: 'M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
  { t: 'path', d: 'M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
  { t: 'path', d: 'M14 3v4h4' },
];

export const toolIcons: Record<string, IconPrimitive[]> = {
  // PDF
  // Silhouettes below are deliberately different from one another: within a
  // category every icon shares one colour, so shape is the only thing telling
  // them apart at 20px. Put the distinguishing idea in the outline, not in a
  // small detail stuck on a shared document body.

  /** Two sheets collapsing into one. */
  '/pdf/merge': [
    { t: 'fill', d: 'M2 3.5h7v7H2zM2 13.5h7v7H2z' },
    { t: 'rect', x: 2, y: 3.5, w: 7, h: 7, rx: 1.5 },
    { t: 'rect', x: 2, y: 13.5, w: 7, h: 7, rx: 1.5 },
    { t: 'path', d: 'M10.5 12h4.5' },
    { t: 'path', d: 'M13 9.5 15.5 12 13 14.5' },
    { t: 'rect', x: 16.5, y: 8, w: 5.5, h: 8, rx: 1.5 },
  ],
  /** One sheet fanning out into two: the mirror of merge. */
  '/pdf/split': [
    { t: 'fill', d: 'M2 8h5.5v8H2z' },
    { t: 'rect', x: 2, y: 8, w: 5.5, h: 8, rx: 1.5 },
    { t: 'path', d: 'M9 12h4.5' },
    { t: 'path', d: 'M11.5 9.5 14 12l-2.5 2.5' },
    { t: 'rect', x: 15, y: 3.5, w: 7, h: 7, rx: 1.5 },
    { t: 'rect', x: 15, y: 13.5, w: 7, h: 7, rx: 1.5 },
  ],
  /** Squeezed from top and bottom. */
  '/pdf/compress': [
    { t: 'path', d: 'M12 2v3.4' },
    { t: 'path', d: 'M9.6 3.8 12 6.2l2.4-2.4' },
    { t: 'fill', d: 'M4 8.5h16v7H4z' },
    { t: 'rect', x: 4, y: 8.5, w: 16, h: 7, rx: 1.5 },
    { t: 'path', d: 'M12 22v-3.4' },
    { t: 'path', d: 'M9.6 20.2 12 17.8l2.4 2.4' },
  ],
  /** Big orbit ring so rotation reads before the page does. */
  '/pdf/rotate': [
    { t: 'fill', d: 'M9 9h6v6H9z' },
    { t: 'rect', x: 9, y: 9, w: 6, h: 6, rx: 1.2 },
    { t: 'path', d: 'M20.5 12a8.5 8.5 0 1 1-2.6-6.1' },
    { t: 'path', d: 'M20.8 2.6v4.2h-4.2' },
  ],
  /** Page on the left, photo on the right. */
  '/pdf/to-images': [
    { t: 'fill', d: 'M2 4h7.5v12H2z' },
    { t: 'rect', x: 2, y: 4, w: 7.5, h: 12, rx: 1.4 },
    { t: 'path', d: 'M11 11h3' },
    { t: 'path', d: 'M12.5 9 14.5 11l-2 2' },
    { t: 'rect', x: 15.5, y: 6.5, w: 7, h: 7.5, rx: 1.4 },
    { t: 'circle', cx: 17.9, cy: 9.4, r: 0.9 },
    { t: 'path', d: 'M15.5 13.2l2.2-2.1 1.6 1.4 1.4-1.2 1.8 1.6' },
  ],
  /** Diagonal stamp band across the page. */
  '/pdf/watermark': [
    ...page,
    { t: 'path', d: 'M7 16.5 14.5 8.5' },
    { t: 'path', d: 'M10 19 17.5 11' },
  ],
  /** A single page lifted clear of the stack. */
  '/pdf/extract-pages': [
    { t: 'fill', d: 'M3 3h8l3.5 3.5V16H3z' },
    { t: 'path', d: 'M3 3h8l3.5 3.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M11 3v3.5h3.5' },
    { t: 'path', d: 'M15.5 12.5h5.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2' },
  ],
  /** Hash mark: the page-number idea, big enough to read. */
  '/pdf/page-numbers': [
    ...page,
    { t: 'path', d: 'M8.8 16.5h6.4' },
    { t: 'path', d: 'M8.8 20h6.4' },
    { t: 'path', d: 'M11.3 14.8v6.8' },
    { t: 'path', d: 'M14 14.8v6.8' },
  ],
  /** Two sheets trading places. */
  '/pdf/reorder-pages': [
    { t: 'fill', d: 'M2.5 3.5h7.5v10.5H2.5z' },
    { t: 'rect', x: 2.5, y: 3.5, w: 7.5, h: 10.5, rx: 1.4 },
    { t: 'rect', x: 14, y: 10, w: 7.5, h: 10.5, rx: 1.4 },
    { t: 'path', d: 'M12.2 6.5h5.6' },
    { t: 'path', d: 'M15.6 4.3 17.8 6.5l-2.2 2.2' },
    { t: 'path', d: 'M11.8 17.5H6.2' },
    { t: 'path', d: 'M8.4 15.3 6.2 17.5l2.2 2.2' },
  ],
  '/pdf/delete-pages': [
    ...page,
    { t: 'path', d: 'M8.5 15.5h7' },
    { t: 'path', d: 'M8.5 19h7' },
    { t: 'circle', cx: 18.5, cy: 18.5, r: 3.5 },
    { t: 'path', d: 'M17 18.5h3' },
  ],
  '/pdf/to-text': [
    ...page,
    { t: 'path', d: 'M8 10h8' },
    { t: 'path', d: 'M8 13.5h5.5' },
    { t: 'path', d: 'M8 17h8' },
  ],

  // Image
  '/image/heic-to-jpg': [
    { t: 'fill', d: 'M3 5h14a0 0 0 0 1 0 0v14a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 3, y: 5, w: 14, h: 14, rx: 1.5 },
    { t: 'circle', cx: 7.5, cy: 9.5, r: 1.3 },
    { t: 'path', d: 'M3 16l3.5-3.5a1 1 0 0 1 1.4 0L11 15.5' },
    { t: 'path', d: 'M17 8l3 3-3 3' },
    { t: 'path', d: 'M20 11h-4' },
  ],
  '/image/compress': [
    { t: 'fill', d: 'M3 4h16a0 0 0 0 1 0 0v13a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V4a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 3, y: 4, w: 16, h: 13, rx: 1.5 },
    { t: 'path', d: 'M8 20h8' },
    { t: 'path', d: 'M9 9l2 2 2-2' },
    { t: 'path', d: 'M11 7v4' },
  ],
  '/image/resize': [
    { t: 'fill', d: 'M3 3h18v18H3z' },
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2 },
    { t: 'path', d: 'M9 15l6-6' },
    { t: 'path', d: 'M9 11V9h2' },
    { t: 'path', d: 'M15 13v2h-2' },
  ],
  /** Photo tile on the left, flat tile on the right: reads left-to-right. */
  '/image/webp-to-png': [
    { t: 'fill', d: 'M2 6h8.5v9H2z' },
    { t: 'rect', x: 2, y: 6, w: 8.5, h: 9, rx: 1.4 },
    { t: 'circle', cx: 4.7, cy: 9, r: 0.85 },
    { t: 'path', d: 'M2 13.4l2.4-2.2 1.6 1.4 1.5-1.3 3 2.6' },
    { t: 'path', d: 'M12 10.5h2.8' },
    { t: 'path', d: 'M13.4 8.7l1.8 1.8-1.8 1.8' },
    { t: 'rect', x: 16.5, y: 6, w: 5.5, h: 9, rx: 1.4 },
  ],
  /** Exact mirror of the above, so the two are never mistaken for each other. */
  '/image/png-to-webp': [
    { t: 'fill', d: 'M2 6h5.5v9H2z' },
    { t: 'rect', x: 2, y: 6, w: 5.5, h: 9, rx: 1.4 },
    { t: 'path', d: 'M9 10.5h2.8' },
    { t: 'path', d: 'M10.4 8.7l1.8 1.8-1.8 1.8' },
    { t: 'rect', x: 13.5, y: 6, w: 8.5, h: 9, rx: 1.4 },
    { t: 'circle', cx: 16.2, cy: 9, r: 0.85 },
    { t: 'path', d: 'M13.5 13.4l2.4-2.2 1.6 1.4 1.5-1.3 3 2.6' },
  ],
  /** Small dense tile → large plain tile: AVIF's compactness unpacking to JPG. */
  '/image/avif-to-jpg': [
    { t: 'fill', d: 'M2 6h5.5v9H2z' },
    { t: 'rect', x: 2, y: 6, w: 5.5, h: 9, rx: 1.4 },
    { t: 'path', d: 'M3.3 9.2h2.9' },
    { t: 'path', d: 'M3.3 11.4h2.9' },
    { t: 'path', d: 'M9 10.5h2.8' },
    { t: 'path', d: 'M10.4 8.7l1.8 1.8-1.8 1.8' },
    { t: 'rect', x: 13.5, y: 6, w: 8.5, h: 9, rx: 1.4 },
    { t: 'circle', cx: 16.2, cy: 9, r: 0.85 },
    { t: 'path', d: 'M13.5 13.4l2.4-2.2 1.6 1.4 1.5-1.3 3 2.6' },
  ],
  /** Mirror of the above, so the pair can't be confused at card size. */
  '/image/jpg-to-avif': [
    { t: 'fill', d: 'M2 6h8.5v9H2z' },
    { t: 'rect', x: 2, y: 6, w: 8.5, h: 9, rx: 1.4 },
    { t: 'circle', cx: 4.7, cy: 9, r: 0.85 },
    { t: 'path', d: 'M2 13.4l2.4-2.2 1.6 1.4 1.5-1.3 3 2.6' },
    { t: 'path', d: 'M12 10.5h2.8' },
    { t: 'path', d: 'M13.4 8.7l1.8 1.8-1.8 1.8' },
    { t: 'rect', x: 16.5, y: 6, w: 5.5, h: 9, rx: 1.4 },
    { t: 'path', d: 'M17.8 9.2h2.9' },
    { t: 'path', d: 'M17.8 11.4h2.9' },
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
  '/image/optimize-svg': [
    { t: 'circle', cx: 6, cy: 7, r: 1.5 },
    { t: 'circle', cx: 17.5, cy: 6.5, r: 1.5 },
    { t: 'circle', cx: 10, cy: 18, r: 1.5 },
    { t: 'path', d: 'M7.3 7.1l8.7-.5' },
    { t: 'path', d: 'M6.9 8.3l2.3 8.2' },
    { t: 'path', d: 'M16.6 7.7l-5.4 9' },
    { t: 'path', d: 'M19.5 14v5.5' },
    { t: 'path', d: 'M17.2 16.3l2.3-2.3 2.3 2.3' },
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
    { t: 'fill', d: 'M2.5 5h12a0 0 0 0 1 0 0v10a0 0 0 0 1 0 0h-12a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 2.5, y: 5, w: 12, h: 10, rx: 1.3 },
    { t: 'path', d: 'M7.5 8.5l4 3-4 3z' },
    { t: 'path', d: 'M18 8l3 3-3 3' },
    { t: 'path', d: 'M21 11h-4' },
  ],
  '/video/compress': [
    { t: 'fill', d: 'M3 5h14a0 0 0 0 1 0 0v12a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
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
    { t: 'fill', d: 'M2.5 4h12a0 0 0 0 1 0 0v12a0 0 0 0 1 0 0h-12a0 0 0 0 1 0 0V4a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 2.5, y: 4, w: 12, h: 12, rx: 1.3 },
    { t: 'path', d: 'M6.5 7.5l4 2.5-4 2.5z' },
    { t: 'circle', cx: 18, cy: 17, r: 2 },
    { t: 'path', d: 'M20 17V8l1.5-.5' },
  ],
  '/video/gif-from-video': [
    { t: 'fill', d: 'M3 5h13a0 0 0 0 1 0 0v11a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 3, y: 5, w: 13, h: 11, rx: 1.3 },
    { t: 'path', d: 'M7.5 8.5l4 3-4 3z' },
    { t: 'path', d: 'M19 9a3 3 0 1 0 0 5' },
    { t: 'path', d: 'M19 11.3h2' },
  ],
  /** A left-pointing play triangle inside the frame, plus a loop arrow
   * running backward around it — reads as "playback going the wrong way". */
  '/video/reverse': [
    { t: 'fill', d: 'M3 5h18a0 0 0 0 1 0 0v14a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 1.6 },
    { t: 'path', d: 'M14.5 9l-4 3 4 3z' },
    { t: 'path', d: 'M18 8.5a4.2 4.2 0 1 0 0 7' },
    { t: 'path', d: 'M18.6 6.8l-.6 1.7-1.7-.4' },
  ],
  /** Two mirrored play triangles, arrows pointing at each other — reads as
   * "plays out, then plays back". */
  '/video/boomerang': [
    { t: 'fill', d: 'M2.5 6h19a0 0 0 0 1 0 0v12a0 0 0 0 1 0 0h-19a0 0 0 0 1 0 0V6a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 2.5, y: 6, w: 19, h: 12, rx: 1.6 },
    { t: 'path', d: 'M9 9.5l4 2.5-4 2.5z' },
    { t: 'path', d: 'M15 9.5l-4 2.5 4 2.5z' },
    { t: 'path', d: 'M6 8.5l-1.6 1' },
    { t: 'path', d: 'M18 15.5l1.6-1' },
  ],
  /** A stack of overlapping photo frames with a small musical note —
   * reads as "photos combined with music" rather than a single image. */
  '/video/slideshow': [
    { t: 'fill', d: 'M5 6h13v13H5z' },
    { t: 'rect', x: 2, y: 3, w: 12, h: 12, rx: 1.3 },
    { t: 'rect', x: 5, y: 6, w: 13, h: 13, rx: 1.3 },
    { t: 'circle', cx: 9, cy: 11, r: 1.4 },
    { t: 'path', d: 'M6 16.5l2.5-2.7 2 1.8 3-3.4 3.5 4.3' },
    { t: 'path', d: 'M19.5 3.5v6.3' },
    { t: 'circle', cx: 18.7, cy: 10.3, r: 1.3 },
  ],

  // Data
  '/csv/to-json': [
    { t: 'fill', d: 'M2.5 5h8a0 0 0 0 1 0 0v13a0 0 0 0 1 0 0h-8a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 2.5, y: 5, w: 8, h: 13, rx: 1 },
    { t: 'path', d: 'M6.5 8.5h4' },
    { t: 'path', d: 'M6.5 12h4' },
    { t: 'path', d: 'M6.5 15.5h2.5' },
    { t: 'path', d: 'M16.5 6c-1.5 0-2 .8-2 2v2.5c0 .8-.5 1.5-1.5 1.5.9 0 1.5.7 1.5 1.5V16c0 1.2.5 2 2 2' },
  ],
  '/json/to-csv': [
    { t: 'fill', d: 'M13.5 5h8a0 0 0 0 1 0 0v13a0 0 0 0 1 0 0h-8a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'path', d: 'M8.5 6c-1.5 0-2 .8-2 2v2.5c0 .8-.5 1.5-1.5 1.5.9 0 1.5.7 1.5 1.5V16c0 1.2.5 2 2 2' },
    { t: 'rect', x: 13.5, y: 5, w: 8, h: 13, rx: 1 },
    { t: 'path', d: 'M16 8.5h4' },
    { t: 'path', d: 'M16 12h4' },
    { t: 'path', d: 'M16 15.5h2.5' },
  ],
  '/csv/to-excel': [
    { t: 'fill', d: 'M4 3h9l4 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M4 3h9l4 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M13 3v4h4' },
    { t: 'path', d: 'M7.5 12l4.2 6' },
    { t: 'path', d: 'M11.7 12l-4.2 6' },
  ],
  '/data/csv-cleaner': [
    { t: 'fill', d: 'M3 5h14a0 0 0 0 1 0 0v10a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V5a0 0 0 0 1 0 0z' },
    { t: 'rect', x: 3, y: 5, w: 14, h: 10, rx: 1.3 },
    { t: 'path', d: 'M3 9h14' },
    { t: 'path', d: 'M8.5 5v10' },
    { t: 'path', d: 'M18 17.5l3 3' },
    { t: 'path', d: 'M20.5 17.5l-3 3' },
  ],

  /** Photos on the left feeding into a page: the mirror of PDF-to-images. */
  '/pdf/images-to-pdf': [
    { t: 'fill', d: 'M2 5h9v9H2z' },
    { t: 'rect', x: 2, y: 5, w: 9, h: 9, rx: 1.4 },
    { t: 'circle', cx: 4.9, cy: 8, r: 0.9 },
    { t: 'path', d: 'M2 12.2l2.6-2.3 1.7 1.5 1.6-1.4 3.1 2.7' },
    { t: 'path', d: 'M12.5 15h3' },
    { t: 'path', d: 'M14 13l2 2-2 2' },
    { t: 'rect', x: 16.5, y: 9, w: 5.5, h: 12, rx: 1.4 },
  ],
  /** Tag being struck through: metadata removed, not the page. */
  '/pdf/remove-metadata': [
    ...page,
    { t: 'path', d: 'M8.5 11h7' },
    { t: 'path', d: 'M8.5 14h4' },
    { t: 'path', d: 'M13.6 16.6l6 6' },
    { t: 'path', d: 'M19.6 16.6l-6 6' },
  ],
  '/image/compress-to-size': [
    { t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 1.5 },
    { t: 'path', d: 'M8 9.5h8M8 12.5h8' },
    { t: 'path', d: 'M9.5 15.5l2.5 2.5 2.5-2.5' },
  ],
  /** Subject kept solid, background dropped to a checkerboard: the transparency idea. */
  '/image/remove-background': [
    { t: 'path', d: 'M3 8.5V6a1.5 1.5 0 0 1 1.5-1.5H7' },
    { t: 'path', d: 'M17 4.5h2.5A1.5 1.5 0 0 1 21 6v2.5' },
    { t: 'path', d: 'M21 15.5V18a1.5 1.5 0 0 1-1.5 1.5H17' },
    { t: 'path', d: 'M7 19.5H4.5A1.5 1.5 0 0 1 3 18v-2.5' },
    { t: 'fill', d: 'M12 7.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2z' },
    { t: 'circle', cx: 12, cy: 9.8, r: 2.6 },
    { t: 'path', d: 'M7.4 17.6a4.8 4.8 0 0 1 9.2 0' },
  ],
  '/image/remove-metadata': [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 1.5 },
    { t: 'circle', cx: 8, cy: 10, r: 1.5 },
    { t: 'path', d: 'M3 16l4.5-4 3 3' },
    { t: 'path', d: 'M14.5 13.5l5 5M19.5 13.5l-5 5' },
  ],
  '/image/rotate': [
    { t: 'rect', x: 4, y: 8, w: 12, h: 12, rx: 1.3 },
    { t: 'path', d: 'M14 5.5A6 6 0 0 1 20 11' },
    { t: 'path', d: 'M17 3l3 2.5-3 2.5' },
  ],
  /** A photo frame with an eyedropper touching it, three swatches below —
   * reads as "pulling colors out of a picture". */
  '/image/color-palette': [
    { t: 'fill', d: 'M3 4h13v13H3z' },
    { t: 'rect', x: 3, y: 4, w: 13, h: 13, rx: 1.3 },
    { t: 'circle', cx: 8, cy: 9, r: 1.6 },
    { t: 'path', d: 'M3 15l4-4 3 2.5 4.5-5' },
    { t: 'circle', cx: 5.5, cy: 20, r: 1.6 },
    { t: 'circle', cx: 10, cy: 20, r: 1.6 },
    { t: 'circle', cx: 14.5, cy: 20, r: 1.6 },
    { t: 'path', d: 'M19.5 4.5l1.6 1.6-6 6-2-2z' },
  ],
  '/data/excel-to-csv': [
    { t: 'rect', x: 3, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'path', d: 'M3 9h8M7 4v16' },
    { t: 'path', d: 'M14 12h7' },
    { t: 'path', d: 'M18.5 9.5L21 12l-2.5 2.5' },
  ],
  '/data/excel-to-json': [
    { t: 'rect', x: 2.5, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'path', d: 'M2.5 9h8M6.5 4v16' },
    { t: 'path', d: 'M14.5 7.5c2 0 2 1.8 2 4.5s0 4.5-2 4.5' },
    { t: 'path', d: 'M21 7.5c-2 0-2 1.8-2 4.5s0 4.5 2 4.5' },
  ],
  '/data/json-formatter': [
    { t: 'path', d: 'M8.5 4.5c-2.5 0-2.5 2.8-2.5 7.5s0 7.5 2.5 7.5' },
    { t: 'path', d: 'M15.5 4.5c2.5 0 2.5 2.8 2.5 7.5s0 7.5-2.5 7.5' },
    { t: 'path', d: 'M10 12l1.6 1.6L15 10' },
  ],
  '/data/csv-merge': [
    { t: 'rect', x: 2.5, y: 3.5, w: 7, h: 7, rx: 1 },
    { t: 'rect', x: 2.5, y: 13.5, w: 7, h: 7, rx: 1 },
    { t: 'rect', x: 14.5, y: 8.5, w: 7, h: 7, rx: 1 },
    { t: 'path', d: 'M9.5 7h2.5v5h2.5M9.5 17h2.5v-5' },
  ],

  // Developer
  '/dev/json-schema-validator': [
    { t: 'path', d: 'M8.5 4.5c-2.5 0-2.5 2.8-2.5 7.5s0 7.5 2.5 7.5' },
    { t: 'path', d: 'M15.5 4.5c2.5 0 2.5 2.8 2.5 7.5s0 7.5-2.5 7.5' },
    { t: 'path', d: 'M10 12l1.6 1.6L15 10' },
  ],
  '/dev/json-diff': [
    { t: 'rect', x: 3, y: 5, w: 7, h: 14, rx: 1.2 },
    { t: 'rect', x: 14, y: 5, w: 7, h: 14, rx: 1.2 },
    { t: 'path', d: 'M11 9h2M11 15h2' },
  ],
  '/dev/sha256': [
    { t: 'fill', d: 'M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' },
    { t: 'path', d: 'M14 3v4h4M8 11h8M8 15h6' },
  ],
  '/dev/base64': [
    { t: 'path', d: 'M8.5 4.5c-2.5 0-2.5 2.8-2.5 7.5s0 7.5 2.5 7.5' },
    { t: 'path', d: 'M15.5 4.5c2.5 0 2.5 2.8 2.5 7.5s0 7.5-2.5 7.5' },
    { t: 'path', d: 'M10.5 9h3M10.5 15h3M12 7v10' },
  ],
  /** Three finder-pattern corner squares, matching a real QR code's most
   * recognizable feature, plus a scatter of module dots. */
  '/dev/qr-code-generator': [
    { t: 'fill', d: 'M3 3h18v18H3z' },
    { t: 'rect', x: 3, y: 3, w: 6, h: 6, rx: 1 },
    { t: 'rect', x: 5, y: 5, w: 2, h: 2 },
    { t: 'rect', x: 15, y: 3, w: 6, h: 6, rx: 1 },
    { t: 'rect', x: 17, y: 5, w: 2, h: 2 },
    { t: 'rect', x: 3, y: 15, w: 6, h: 6, rx: 1 },
    { t: 'rect', x: 5, y: 17, w: 2, h: 2 },
    { t: 'rect', x: 15, y: 15, w: 2, h: 2 },
    { t: 'rect', x: 18, y: 15, w: 2, h: 2 },
    { t: 'rect', x: 15, y: 18, w: 2, h: 2 },
    { t: 'rect', x: 18, y: 18, w: 2, h: 2 },
  ],
  /** Same QR corner-square motif as the generator, with a magnifier glass
   * over it — reads as "reading a QR code" rather than "making one". */
  '/dev/qr-code-scanner': [
    { t: 'fill', d: 'M3 3h13v13H3z' },
    { t: 'rect', x: 3, y: 3, w: 5, h: 5, rx: 1 },
    { t: 'rect', x: 4.7, y: 4.7, w: 1.6, h: 1.6 },
    { t: 'rect', x: 11, y: 3, w: 5, h: 5, rx: 1 },
    { t: 'rect', x: 3, y: 11, w: 5, h: 5, rx: 1 },
    { t: 'circle', cx: 17, cy: 17, r: 3.4 },
    { t: 'path', d: 'M19.4 19.4L22 22' },
  ],
  /** A key shape — the plainest, least-decorative read for "password". */
  '/dev/password-generator': [
    { t: 'fill', d: 'M9 3a5 5 0 1 0 3.2 8.8L14 13.6V16h2.5V18.5H19V21h2v-4l-8.8-8.8A5 5 0 0 0 9 3z' },
    { t: 'circle', cx: 8.7, cy: 8.7, r: 4.4 },
    { t: 'circle', cx: 8.7, cy: 8.7, r: 1.4 },
    { t: 'path', d: 'M11.9 11.9L21 21M17 17v4M14.5 19.5H19' },
  ],
  '/dev/password-entropy-checker': [
    { t: 'rect', x: 2.5, y: 4, w: 19, h: 5, rx: 1.2 },
    { t: 'rect', x: 2.5, y: 11, w: 12, h: 5, rx: 1.2 },
    { t: 'rect', x: 2.5, y: 18, w: 6, h: 3, rx: 1 },
  ],
  /** A tag/label shape (the classic "unique ID sticker") with a short
   * scribble standing in for an opaque generated string. */
  '/dev/uuid-generator': [
    { t: 'fill', d: 'M3 11.5V5a2 2 0 0 1 2-2h6.5L21 12.5 12.5 21 3 11.5z' },
    { t: 'path', d: 'M3 11.5V5a2 2 0 0 1 2-2h6.5L21 12.5 12.5 21 3 11.5z' },
    { t: 'circle', cx: 8, cy: 8, r: 1.6 },
    { t: 'path', d: 'M10.5 14l1.6 1.6 3-3' },
  ],

  // Guides
  '/guides/how-kit-bin-works': [
    { t: 'path', d: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z' },
    { t: 'path', d: 'M9.3 12l1.9 1.9 3.5-3.8' },
  ],
  '/guides/heic-explained': [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 1.5 },
    { t: 'circle', cx: 8, cy: 10, r: 1.6 },
    { t: 'path', d: 'M3 16l5-5 4 4 3-3 6 6' },
  ],
  '/guides/why-pdfs-get-large': [
    ...page,
    { t: 'path', d: 'M12 15V9' },
    { t: 'path', d: 'M9.5 11.5L12 9l2.5 2.5' },
  ],
  '/guides/webp-vs-png-jpg': [
    { t: 'rect', x: 3, y: 6, w: 11, h: 11, rx: 1.5 },
    { t: 'rect', x: 10, y: 3, w: 11, h: 11, rx: 1.5 },
  ],
  '/guides/why-audio-sounds-quiet': [
    { t: 'path', d: 'M4 10v4h4l5 4V6l-5 4H4z' },
    { t: 'path', d: 'M16 9.5a4 4 0 0 1 0 5' },
  ],
  '/guides/mp4-vs-webm': [
    { t: 'rect', x: 2.5, y: 6, w: 10, h: 8, rx: 1.2 },
    { t: 'path', d: 'M6 8.5l3 2-3 2z' },
    { t: 'rect', x: 11.5, y: 10, w: 10, h: 8, rx: 1.2 },
    { t: 'path', d: 'M15 12.5l3 2-3 2z' },
  ],
  '/guides/why-csv-imports-fail': [
    { t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 1.5 },
    { t: 'path', d: 'M3 9h18M9 9v11M15 9v11' },
    { t: 'path', d: 'M17 15l2 2 2-2' },
  ],
  '/guides/compression-vs-resizing': [
    { t: 'rect', x: 3, y: 3, w: 8, h: 8, rx: 1 },
    { t: 'rect', x: 13, y: 13, w: 8, h: 8, rx: 1 },
    { t: 'path', d: 'M11 11l-3 3m14-3l-3 3' },
  ],
  '/guides/merge-pdf-privately': [
    ...page,
    { t: 'path', d: 'M9 12l2 2 4-4' },
    { t: 'path', d: 'M6 4v-1a2 2 0 0 1 2-2' },
  ],
  '/guides/split-vs-extract-pdf': [
    { t: 'rect', x: 3, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'rect', x: 13, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'path', d: 'M11 8v8' },
  ],
  '/guides/why-pdf-compression-barely-works': [
    ...page,
    { t: 'path', d: 'M9 15h6M9 12h6M9 9h3' },
  ],
  '/guides/heic-vs-jpg': [
    { t: 'rect', x: 3, y: 6, w: 8, h: 12, rx: 1.2 },
    { t: 'rect', x: 13, y: 6, w: 8, h: 12, rx: 1.2 },
    { t: 'path', d: 'M11 12h2' },
  ],
  '/guides/webp-to-png-file-size': [
    { t: 'rect', x: 3, y: 6, w: 9, h: 9, rx: 1.2 },
    { t: 'rect', x: 12, y: 9, w: 9, h: 9, rx: 1.2 },
    { t: 'path', d: 'M15 4v3M13.5 5.5h3' },
  ],
  '/guides/resize-without-distorting': [
    { t: 'rect', x: 4, y: 4, w: 16, h: 16, rx: 1.5 },
    { t: 'rect', x: 8, y: 8, w: 8, h: 8, rx: 1 },
    { t: 'path', d: 'M4 4l4 4m12-4l-4 4m0 12l4-4m-16 4l4-4' },
  ],
  '/guides/how-video-compression-works': [
    { t: 'rect', x: 2.5, y: 6, w: 15, h: 12, rx: 1.5 },
    { t: 'path', d: 'M9 10l3.5 2-3.5 2z' },
  ],
  '/guides/csv-vs-json': [
    { t: 'rect', x: 2.5, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'path', d: 'M4.5 8h4M4.5 12h4M4.5 16h4' },
    { t: 'path', d: 'M14 4l2.5 2-2.5 2M18 12l2.5 2-2.5 2M14 20l2.5-2-2.5-2' },
  ],
  '/video/convert-to-mp4': [
    { t: 'rect', x: 2.5, y: 6, w: 15, h: 12, rx: 1.5 },
    { t: 'path', d: 'M8 10.5l3.5 2-3.5 2z' },
    { t: 'path', d: 'M18 9a4 4 0 0 1 3 3.8V15' },
    { t: 'path', d: 'M19.5 7.5L21 9l-1.5 1.5' },
  ],
  '/image/to-text': [
    { t: 'path', d: 'M4 6l4-2 4 2 4-2 4 2v12l-4 2-4-2-4 2-4-2z' },
    { t: 'path', d: 'M8 13h8M8 16h5' },
  ],
  '/pdf/scan-to-pdf': [
    { t: 'rect', x: 2.5, y: 6, w: 11, h: 9, rx: 1.5 },
    { t: 'circle', cx: 8, cy: 10.5, r: 2 },
    { t: 'path', d: 'M15 4l6 2v14l-6-2z' },
  ],
  '/audio/transcribe': [
    { t: 'path', d: 'M4 12v-2M7.5 15v-8M11 17v-12M14.5 15v-8M18 12v-2' },
    { t: 'path', d: 'M14 5h6M14 8h4' },
  ],
  '/audio/text-to-speech': [
    { t: 'path', d: 'M4 6h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z' },
    { t: 'path', d: 'M14 9.5a2.2 2.2 0 0 1 0 3M16.5 8a4.5 4.5 0 0 1 0 6' },
  ],
  '/pdf/sign': [
    ...page,
    { t: 'path', d: 'M6 16c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0 2 1.5 3 0' },
  ],
  '/pdf/protect': [
    ...page,
    { t: 'rect', x: 8, y: 13, w: 8, h: 6, rx: 1 },
    { t: 'path', d: 'M9.5 13v-2a2.5 2.5 0 0 1 5 0v2' },
  ],
  '/dev/favicon-generator': [
    { t: 'rect', x: 3, y: 3, w: 14, h: 14, rx: 2 },
    { t: 'rect', x: 13, y: 13, w: 8, h: 8, rx: 1.5 },
  ],
  '/dev/zip-files': [
    { t: 'path', d: 'M4 8l2-4h12l2 4z' },
    { t: 'rect', x: 4, y: 8, w: 16, h: 11, rx: 1.2 },
    { t: 'path', d: 'M12 8v11M10.5 9.5h3M10.5 12.5h3M10.5 15.5h3' },
  ],
  '/dev/unzip-files': [
    { t: 'path', d: 'M4 8l2-4h12l2 4z' },
    { t: 'rect', x: 4, y: 8, w: 16, h: 11, rx: 1.2 },
    { t: 'path', d: 'M12 20v-7M9.5 15.5l2.5-2.5 2.5 2.5' },
  ],
  '/image/exif-viewer': [
    { t: 'path', d: 'M4 6l4-2 4 2 4-2 4 2v12l-4 2-4-2-4 2-4-2z' },
    { t: 'circle', cx: 10, cy: 10, r: 1.6 },
    { t: 'path', d: 'M17 14a3 3 0 0 0-3 3c0 2 3 4.5 3 4.5s3-2.5 3-4.5a3 3 0 0 0-3-3z' },
  ],
  '/guides/how-background-removal-works': [
    { t: 'path', d: 'M4 6l4-2 4 2 4-2 4 2v12l-4 2-4-2-4 2-4-2z' },
    { t: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  '/guides/white-halo-around-cutout': [
    { t: 'circle', cx: 12, cy: 12, r: 5 },
    { t: 'circle', cx: 12, cy: 12, r: 8 },
  ],
  '/guides/what-transparent-png-means': [
    { t: 'rect', x: 3, y: 3, w: 8, h: 8 },
    { t: 'rect', x: 13, y: 13, w: 8, h: 8 },
    { t: 'rect', x: 3, y: 13, w: 8, h: 8 },
    { t: 'rect', x: 13, y: 3, w: 8, h: 8 },
  ],
  '/guides/avif-explained': [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 1.5 },
    { t: 'path', d: 'M7 15l3-5 3 3 2-2 3 4' },
  ],
  '/guides/avif-wont-open': [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 1.5 },
    { t: 'path', d: 'M9 9l6 6M15 9l-6 6' },
  ],
  '/guides/how-qr-codes-work': [
    { t: 'rect', x: 3, y: 3, w: 6, h: 6 },
    { t: 'rect', x: 15, y: 3, w: 6, h: 6 },
    { t: 'rect', x: 3, y: 15, w: 6, h: 6 },
    { t: 'rect', x: 14, y: 14, w: 3, h: 3 },
    { t: 'rect', x: 18, y: 18, w: 3, h: 3 },
  ],
  '/guides/why-qr-code-wont-scan': [
    { t: 'rect', x: 3, y: 3, w: 6, h: 6 },
    { t: 'rect', x: 15, y: 3, w: 6, h: 6 },
    { t: 'rect', x: 3, y: 15, w: 6, h: 6 },
    { t: 'path', d: 'M14 14l7 7' },
  ],
  '/guides/static-vs-dynamic-qr-codes': [
    { t: 'rect', x: 3, y: 3, w: 8, h: 8, rx: 1 },
    { t: 'path', d: 'M15 5h6M18 2v6' },
    { t: 'path', d: 'M3 17h8m-8-4h5' },
  ],
  '/guides/qr-code-payload-types': [
    { t: 'rect', x: 3, y: 3, w: 7, h: 7 },
    { t: 'path', d: 'M13 5h8M13 9h5' },
    { t: 'path', d: 'M13 15h8M13 19h8M3 15h7v6h-7z' },
  ],
  '/guides/password-entropy-explained': [
    { t: 'rect', x: 5, y: 11, w: 14, h: 9, rx: 1.5 },
    { t: 'path', d: 'M8 11V7a4 4 0 0 1 8 0v4' },
    { t: 'path', d: 'M12 15v2' },
  ],
  '/guides/password-generator-randomness': [
    { t: 'rect', x: 5, y: 11, w: 14, h: 9, rx: 1.5 },
    { t: 'path', d: 'M8 11V7a4 4 0 0 1 8 0v4' },
    { t: 'path', d: 'M9 4l1 1-1 1M15 20l-1-1 1-1' },
  ],
  '/guides/passphrase-vs-random-password': [
    { t: 'rect', x: 2.5, y: 6, w: 8, h: 12, rx: 1.2 },
    { t: 'path', d: 'M4.5 10h4M4.5 14h4' },
    { t: 'rect', x: 13, y: 6, w: 8, h: 12, rx: 1.2 },
    { t: 'circle', cx: 17, cy: 12, r: 2 },
  ],
  '/guides/what-is-a-uuid': [
    { t: 'rect', x: 2.5, y: 9, w: 4, h: 6, rx: 1 },
    { t: 'rect', x: 7.5, y: 9, w: 3, h: 6, rx: 1 },
    { t: 'rect', x: 11.5, y: 9, w: 3, h: 6, rx: 1 },
    { t: 'rect', x: 15.5, y: 9, w: 3, h: 6, rx: 1 },
    { t: 'rect', x: 19.5, y: 9, w: 2, h: 6, rx: 1 },
  ],
  '/guides/uuid-v1-vs-v4-vs-v7': [
    { t: 'circle', cx: 7, cy: 12, r: 4 },
    { t: 'circle', cx: 17, cy: 12, r: 4 },
    { t: 'path', d: 'M11 12h2' },
  ],
  '/guides/how-to-shoot-a-boomerang-video': [
    { t: 'path', d: 'M5 12a7 7 0 1 1 7 7' },
    { t: 'path', d: 'M9 16l3 3-3 3' },
  ],
  '/guides/reverse-video-audio-and-file-size': [
    { t: 'rect', x: 2.5, y: 6, w: 19, h: 12, rx: 1.5 },
    { t: 'path', d: 'M14 9.5l-3.5 2.5 3.5 2.5z' },
    { t: 'path', d: 'M6 12h2' },
  ],
  '/guides/photo-slideshow-video-specs': [
    { t: 'rect', x: 2.5, y: 5, w: 12, h: 9, rx: 1.2 },
    { t: 'circle', cx: 6, cy: 8, r: 1.2 },
    { t: 'path', d: 'M3.5 13l3-3 2.5 2.5 2-2 2.5 2.5' },
    { t: 'path', d: 'M17 9.5l3.5 2.5-3.5 2.5z' },
  ],
  '/guides/why-gif-is-bigger-than-video': [
    { t: 'rect', x: 2.5, y: 7, w: 9, h: 10, rx: 1.2 },
    { t: 'rect', x: 13.5, y: 7, w: 8, h: 10, rx: 1.2 },
    { t: 'path', d: 'M17 12.5l3 2-3 2z' },
  ],
  '/guides/hex-rgb-hsl-same-color': [
    { t: 'circle', cx: 9, cy: 9, r: 6 },
    { t: 'circle', cx: 15, cy: 9, r: 6 },
    { t: 'circle', cx: 12, cy: 15, r: 6 },
  ],
  '/guides/how-color-palette-extraction-works': [
    { t: 'rect', x: 3, y: 3, w: 18, h: 12, rx: 1.5 },
    { t: 'circle', cx: 7, cy: 18, r: 2 },
    { t: 'circle', cx: 12, cy: 18, r: 2 },
    { t: 'circle', cx: 17, cy: 18, r: 2 },
  ],
  '/guides/why-cant-select-text-in-pdf': [
    ...page,
    { t: 'path', d: 'M8 10h8M8 13h5' },
    { t: 'path', d: 'M6 17l3 3 9-9' },
  ],
  '/guides/file-size-limits-email-and-upload': [
    { t: 'rect', x: 3, y: 6, w: 18, h: 13, rx: 1.5 },
    { t: 'path', d: 'M3 7l9 6 9-6' },
    { t: 'path', d: 'M12 3v6M9.5 6.5L12 9l2.5-2.5' },
  ],
  '/guides/exif-gps-photo-privacy': [
    { t: 'path', d: 'M4 6l4-2 4 2 4-2 4 2v12l-4 2-4-2-4 2-4-2z' },
    { t: 'path', d: 'M12 8v5l3 2' },
  ],
  '/guides/are-online-file-converters-safe': [
    { t: 'path', d: 'M12 3l7 3v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6l7-3z' },
    { t: 'path', d: 'M9.5 12l1.8 1.8L15 9.5' },
  ],
  '/guides/svg-vs-png-when-to-use-which': [
    { t: 'path', d: 'M3 8l9-5 9 5-9 5-9-5z' },
    { t: 'path', d: 'M3 8v8l9 5 9-5V8' },
  ],
  '/guides/dpi-ppi-print-size-explained': [
    { t: 'rect', x: 4, y: 3, w: 16, h: 12, rx: 1.2 },
    { t: 'path', d: 'M4 15h2v6h-2zM18 15h2v6h-2z' },
    { t: 'path', d: 'M8 21h8' },
  ],
  '/image/dpi-calculator': [
    { t: 'rect', x: 3, y: 3, w: 12, h: 9, rx: 1 },
    { t: 'path', d: 'M3 15h2v6h-2zM13 15h2v6h-2z' },
    { t: 'path', d: 'M7 21h6' },
    { t: 'path', d: 'M17 7h4M17 11h4M17 15h4' },
  ],
  '/guides/mp3-vs-wav-which-to-keep': [
    { t: 'path', d: 'M4 10v4h4l5 4V6l-5 4H4z' },
    { t: 'path', d: 'M16 10v4M18.5 8.5v7' },
  ],
  '/guides/what-is-lufs-loudness': [
    { t: 'path', d: 'M3 14v-4h3l4-4v12l-4-4z' },
    { t: 'path', d: 'M13 8v8M16 6v12M19 10v4' },
  ],
  '/guides/what-is-base64': [
    { t: 'rect', x: 2.5, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'path', d: 'M4.5 8h4M4.5 12h4M4.5 16h4' },
    { t: 'path', d: 'M14 12h7M17.5 8.5v7' },
  ],
  '/guides/what-sha256-hash-proves': [
    { t: 'rect', x: 5, y: 11, w: 14, h: 9, rx: 1.5 },
    { t: 'path', d: 'M8 11V7a4 4 0 0 1 8 0v4' },
    { t: 'path', d: 'M9.5 15.5l1.8 1.8L14.5 14' },
  ],
  '/guides/how-to-unzip-a-file-online': [
    { t: 'rect', x: 4, y: 4, w: 16, h: 16, rx: 1.5 },
    { t: 'path', d: 'M12 4v3M12 9v2M12 13v2M12 17v3' },
    { t: 'rect', x: 10.3, y: 10.3, w: 3.4, h: 3.4, rx: 0.6 },
  ],
  '/guides/excel-to-csv-vs-excel-to-json': [
    { t: 'rect', x: 2.5, y: 4, w: 8, h: 16, rx: 1.2 },
    { t: 'path', d: 'M4.5 8h4M4.5 12h4M4.5 16h4' },
    { t: 'path', d: 'M14 6h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2 2 2 0 0 0-2 2v1a2 2 0 0 1-2 2h-2' },
  ],
  '/guides/what-is-a-json-schema': [
    { t: 'path', d: 'M8 4H6a2 2 0 0 0-2 2v1a2 2 0 0 1-2 2 2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h2' },
    { t: 'path', d: 'M16 4h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2 2 2 0 0 0-2 2v1a2 2 0 0 1-2 2h-2' },
    { t: 'path', d: 'M9.5 13l1.8 1.8L15 10.8' },
  ],
  '/guides/rotate-vs-flip-vs-mirror': [
    { t: 'path', d: 'M4.5 12a7.5 7.5 0 1 1 2.5 5.6' },
    { t: 'path', d: 'M4.5 15v3h3' },
    { t: 'path', d: 'M15 6h6v12h-6zM3 6h6v12H3' },
  ],
  '/guides/csv-merge-stacking-vs-joining': [
    { t: 'rect', x: 3, y: 3, w: 8, h: 6, rx: 1 },
    { t: 'rect', x: 3, y: 11, w: 8, h: 6, rx: 1 },
    { t: 'path', d: 'M13 6h6M13 14h6M17 6v8' },
  ],
};
