import { toolIcons, categoryColors, type IconPrimitive } from '../data/toolIcons';

function primitiveToSvg(p: IconPrimitive): string {
  if (p.t === 'fill') return `<path d="${p.d}" fill="currentColor" stroke="none" opacity="0.16" />`;
  if (p.t === 'rect') return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx ?? 0}" />`;
  if (p.t === 'line') return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" />`;
  if (p.t === 'circle') return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" />`;
  if (p.t === 'polyline') return `<polyline points="${p.points}" />`;
  return `<path d="${p.d}" />`;
}

/** Same rendering as ToolIcon.astro, for use in plain client-side scripts
 * (e.g. the sidebar's dynamically-built Favorites list) that can't render
 * an Astro component directly. Keep the two in sync. */
export function toolIconHtml(slug: string, category: string): string {
  const primitives = toolIcons[slug] ?? [];
  const c = categoryColors[category] ?? categoryColors.pdf;
  // Duotone underlay first so the line work sits on top of it.
  const ordered = [...primitives.filter((p) => p.t === 'fill'), ...primitives.filter((p) => p.t !== 'fill')];
  const inner = ordered.map(primitiveToSvg).join('');
  return `<span class="inline-flex items-center justify-center rounded-lg h-8 w-8 shrink-0 ${c.tile} ${c.text} ring-1 ring-inset ${c.ring}"><svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg></span>`;
}
