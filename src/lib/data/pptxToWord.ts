import { unzipSync } from 'fflate';
import { Document as DocxDocument, Packer, Paragraph, TextRun, ImageRun } from 'docx';

export interface PptxToWordResult {
  blob: Blob;
  filename: string;
  slideCount: number;
}

const xmlParser = new DOMParser();

/** Resolves a relative path (as found in an OOXML .rels file, e.g.
 * "../media/image1.png") against a base directory inside the zip, without
 * relying on the URL API's handling of a made-up scheme. */
function resolveZipPath(baseDir: string, relativeTarget: string): string {
  const baseParts = baseDir.split('/').filter(Boolean);
  const targetParts = relativeTarget.split('/').filter(Boolean);
  const stack = [...baseParts];
  for (const part of targetParts) {
    if (part === '..') stack.pop();
    else if (part !== '.') stack.push(part);
  }
  return stack.join('/');
}

function parseXml(bytes: Uint8Array): Document {
  const text = new TextDecoder('utf-8').decode(bytes);
  return xmlParser.parseFromString(text, 'application/xml') as unknown as Document;
}

/** Generic OOXML .rels reader: maps relationship IDs to resolved zip paths,
 * relative to the given part's own directory (rels targets are always
 * relative to the directory of the part they belong to, not to the rels
 * file itself). */
function loadRels(entries: Record<string, Uint8Array>, partPath: string): Map<string, { target: string; type: string }> {
  const dir = partPath.split('/').slice(0, -1).join('/');
  const name = partPath.split('/').pop();
  const relsPath = `${dir}/_rels/${name}.rels`;
  const relsBytes = entries[relsPath];
  const map = new Map<string, { target: string; type: string }>();
  if (!relsBytes) return map;

  try {
    const relDoc = parseXml(relsBytes);
    for (const rel of Array.from(relDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      const type = rel.getAttribute('Type') ?? '';
      if (id && target) map.set(id, { target: resolveZipPath(dir, target), type });
    }
  } catch {
    // No usable rels for this part.
  }
  return map;
}

/** PPTX slide order is not reliable from filenames alone — a presentation
 * whose slides were reordered after creation still has files named
 * slide1.xml, slide2.xml, ... in creation order, not display order. The
 * actual order lives in ppt/presentation.xml's <p:sldIdLst>, resolved
 * through ppt/_rels/presentation.xml.rels' relationship IDs to the real
 * slide file paths. Falls back to a numeric filename sort only if that
 * relationship data is missing or unparseable. */
function resolveSlideOrder(entries: Record<string, Uint8Array>): string[] {
  const numericFallback = () =>
    Object.keys(entries)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        return na - nb;
      });

  const presentationXml = entries['ppt/presentation.xml'];
  if (!presentationXml) return numericFallback();

  try {
    const relMap = loadRels(entries, 'ppt/presentation.xml');
    const presDoc = parseXml(presentationXml);
    const order: string[] = [];
    for (const sldId of Array.from(presDoc.getElementsByTagName('p:sldId'))) {
      const rId = sldId.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
        || sldId.getAttribute('r:id');
      const target = rId ? relMap.get(rId)?.target : undefined;
      if (target && entries[target]) order.push(target);
    }
    return order.length > 0 ? order : numericFallback();
  } catch {
    return numericFallback();
  }
}

/** Presentation-wide slide size in EMU, from <p:sldSz>. Falls back to the
 * standard 10x7.5in (4:3) size if missing, which is what PowerPoint itself
 * defaults to for a presentation with no explicit size set. */
function getSlideSizeEmu(entries: Record<string, Uint8Array>): { cx: number; cy: number } {
  const presentationXml = entries['ppt/presentation.xml'];
  if (presentationXml) {
    try {
      const doc = parseXml(presentationXml);
      const sz = doc.getElementsByTagName('p:sldSz')[0];
      const cx = Number(sz?.getAttribute('cx'));
      const cy = Number(sz?.getAttribute('cy'));
      if (cx > 0 && cy > 0) return { cx, cy };
    } catch {
      // Fall through to the default below.
    }
  }
  return { cx: 9144000, cy: 6858000 };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function readXfrm(spPr: Element | undefined): Rect | null {
  const xfrm = spPr?.getElementsByTagName('a:xfrm')[0];
  const off = xfrm?.getElementsByTagName('a:off')[0];
  const ext = xfrm?.getElementsByTagName('a:ext')[0];
  if (!off || !ext) return null;
  return {
    x: Number(off.getAttribute('x') ?? 0),
    y: Number(off.getAttribute('y') ?? 0),
    w: Number(ext.getAttribute('cx') ?? 0),
    h: Number(ext.getAttribute('cy') ?? 0),
  };
}

interface PlaceholderInfo {
  type: string | null;
  idx: string | null;
}

function readPlaceholderInfo(shape: Element): PlaceholderInfo | null {
  const ph = shape.getElementsByTagName('p:ph')[0];
  if (!ph) return null;
  return { type: ph.getAttribute('type'), idx: ph.getAttribute('idx') };
}

/** Scans a layout (or master) document's shapes for their own xfrm, keyed by
 * placeholder type and index — this is how a slide shape that omits its own
 * position (extremely common: PowerPoint only writes an explicit xfrm when a
 * placeholder has been moved/resized from its layout default) gets a real
 * position instead of collapsing to (0,0). */
function collectLayoutPlaceholderRects(layoutDoc: Document): { byType: Map<string, Rect>; byIdx: Map<string, Rect> } {
  const byType = new Map<string, Rect>();
  const byIdx = new Map<string, Rect>();
  const spTree = layoutDoc.getElementsByTagName('p:spTree')[0];
  if (!spTree) return { byType, byIdx };

  for (const shape of Array.from(spTree.getElementsByTagName('p:sp'))) {
    const ph = readPlaceholderInfo(shape);
    const rect = readXfrm(shape.getElementsByTagName('p:spPr')[0]);
    if (!ph || !rect) continue;
    if (ph.type && !byType.has(ph.type)) byType.set(ph.type, rect);
    if (ph.idx && !byIdx.has(ph.idx)) byIdx.set(ph.idx, rect);
  }
  return { byType, byIdx };
}

/** Resolves a shape's real position: its own xfrm if present, otherwise the
 * matching placeholder position from the slide's layout (matched by type,
 * then by index), otherwise null (caller decides a fallback). */
function resolveShapeRect(
  shape: Element,
  layoutRects: { byType: Map<string, Rect>; byIdx: Map<string, Rect> },
): Rect | null {
  const own = readXfrm(shape.getElementsByTagName('p:spPr')[0]);
  if (own) return own;

  const ph = readPlaceholderInfo(shape);
  if (!ph) return null;
  // "ctrTitle" (centered title, used on title-slide layouts) and "title"
  // don't always share one layout entry, so title-ish types fall back to
  // whichever title placeholder the layout actually defines.
  const typeCandidates = ph.type === 'ctrTitle' ? ['ctrTitle', 'title'] : ph.type ? [ph.type] : [];
  for (const t of typeCandidates) {
    const rect = layoutRects.byType.get(t);
    if (rect) return rect;
  }
  if (ph.idx) {
    const rect = layoutRects.byIdx.get(ph.idx);
    if (rect) return rect;
  }
  return null;
}

interface RunStyle {
  bold: boolean;
  italics: boolean;
  underline: boolean;
  sizePt?: number;
  color?: string;
}

function readRunStyle(run: Element): RunStyle {
  const rPr = run.getElementsByTagName('a:rPr')[0];
  const style: RunStyle = { bold: false, italics: false, underline: false };
  if (!rPr) return style;

  style.bold = rPr.getAttribute('b') === '1';
  style.italics = rPr.getAttribute('i') === '1';
  const u = rPr.getAttribute('u');
  style.underline = !!u && u !== 'none';

  const sz = rPr.getAttribute('sz'); // hundredths of a point, e.g. "3200" = 32pt
  if (sz) style.sizePt = Number(sz) / 100;

  // Only explicit RGB fills are read — theme/scheme colors (<a:schemeClr>)
  // would need the slide master's theme resolved to know what they actually
  // render as; those runs fall back to the default text color instead of
  // guessing wrong.
  const srgb = rPr.getElementsByTagName('a:srgbClr')[0];
  if (srgb) style.color = srgb.getAttribute('val') ?? undefined;

  return style;
}

interface RunText {
  text: string;
  style: RunStyle;
}

interface ExtractedParagraph {
  runs: RunText[];
  level: number;
  bulleted: boolean;
}

function extractShapeParagraphs(shape: Element): ExtractedParagraph[] {
  const out: ExtractedParagraph[] = [];
  for (const p of Array.from(shape.getElementsByTagName('a:p'))) {
    const runs = Array.from(p.getElementsByTagName('a:r'))
      .map((r) => ({ text: r.getElementsByTagName('a:t')[0]?.textContent ?? '', style: readRunStyle(r) }))
      .filter((r) => r.text.length > 0);
    if (runs.length === 0) continue;

    const pPr = p.getElementsByTagName('a:pPr')[0];
    const level = pPr ? Number(pPr.getAttribute('lvl') ?? 0) : 0;
    const hasExplicitNoBullet = !!pPr?.getElementsByTagName('a:buNone')[0];
    const hasBulletMarker = !!pPr?.getElementsByTagName('a:buChar')[0] || !!pPr?.getElementsByTagName('a:buAutoNum')[0];

    out.push({ runs, level, bulleted: hasBulletMarker && !hasExplicitNoBullet });
  }
  return out;
}

/** EMU (English Metric Units, the unit PPTX stores all dimensions in) to
 * pixels at 96dpi, the same conversion Office itself uses on screen.
 * Rendering happens at RENDER_SCALE× that for a sharp result once the image
 * is placed back down at a normal on-page size in the Word document. */
const EMU_PER_PX = 9525;
const RENDER_SCALE = 2;
const DEFAULT_TITLE_PT = 32;
const DEFAULT_BODY_PT = 18;
const SHAPE_INSET_PX = 8 * RENDER_SCALE; // ~0.083in each side, PowerPoint's own default text-box inset

function emuToPx(emu: number): number {
  return (emu / EMU_PER_PX) * RENDER_SCALE;
}

async function decodeImage(bytes: Uint8Array): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(new Blob([bytes as BlobPart]));
  } catch {
    // Vector/unsupported formats (WMF, EMF, TIFF) can't be decoded by the
    // browser — skip rather than fail the whole slide over one picture.
    return null;
  }
}

/** Greedy word-wrap against the shape's own width, so multi-line body text
 * doesn't overflow its box or overlap whatever comes after it. */
function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

/** Renders one slide to a canvas: the slide's own background if it declares
 * a plain solid fill (otherwise white), then every shape in document order
 * — a solid fill behind text shapes that have one, wrapped/styled text
 * matching each run's real bold/italic/underline/size/color, and embedded
 * pictures at their real position and size. Placeholder shapes that omit
 * their own position (the common case) inherit it from the slide's layout,
 * the same way PowerPoint itself resolves it.
 *
 * This deliberately renders a picture of the slide rather than reconstructing
 * editable shapes in the output document — matching how commercial
 * PPTX-to-Word converters (CloudConvert, FreeConvert) actually preserve
 * appearance: there is no formatting to lose when the output *is* a picture
 * of the original. The tradeoff, same as PDF to PowerPoint, is that the
 * result isn't editable text — see the tool page for the honest framing. */
async function renderSlideToPng(
  entries: Record<string, Uint8Array>,
  slidePath: string,
  slideSizeEmu: { cx: number; cy: number },
): Promise<Uint8Array> {
  const slideBytes = entries[slidePath];
  const slideDoc = parseXml(slideBytes);
  const slideRels = loadRels(entries, slidePath);

  const layoutRel = Array.from(slideRels.values()).find((r) => r.type.endsWith('/slideLayout'));
  let layoutRects: { byType: Map<string, Rect>; byIdx: Map<string, Rect> } = { byType: new Map(), byIdx: new Map() };
  if (layoutRel && entries[layoutRel.target]) {
    try {
      layoutRects = collectLayoutPlaceholderRects(parseXml(entries[layoutRel.target]));
    } catch {
      // No usable layout — shapes without their own position fall back to a
      // simple stacked layout further down.
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(emuToPx(slideSizeEmu.cx));
  canvas.height = Math.round(emuToPx(slideSizeEmu.cy));
  const ctx = canvas.getContext('2d')!;

  // Slide background: only a plain solid fill is read (matching the same
  // "explicit RGB only, no theme resolution" scope as run colors below).
  const bgFill = slideDoc.getElementsByTagName('p:bg')[0]?.getElementsByTagName('a:srgbClr')[0];
  ctx.fillStyle = bgFill ? `#${bgFill.getAttribute('val')}` : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const spTree = slideDoc.getElementsByTagName('p:spTree')[0];
  let stackedFallbackY = SHAPE_INSET_PX;

  for (const node of spTree ? Array.from(spTree.children) : []) {
    if (node.tagName === 'p:sp') {
      const ph = readPlaceholderInfo(node);
      const rect = resolveShapeRect(node, layoutRects);
      const px = rect
        ? { x: emuToPx(rect.x), y: emuToPx(rect.y), w: emuToPx(rect.w), h: emuToPx(rect.h) }
        : { x: SHAPE_INSET_PX, y: stackedFallbackY, w: canvas.width - SHAPE_INSET_PX * 2, h: 200 * RENDER_SCALE };

      const shapeFill = node.getElementsByTagName('p:spPr')[0]?.getElementsByTagName('a:solidFill')[0]?.getElementsByTagName('a:srgbClr')[0];
      if (shapeFill) {
        ctx.fillStyle = `#${shapeFill.getAttribute('val')}`;
        ctx.fillRect(px.x, px.y, px.w, px.h);
      }

      const isTitle = ph?.type === 'title' || ph?.type === 'ctrTitle';
      let cursorY = px.y + SHAPE_INSET_PX;
      const maxWidth = Math.max(px.w - SHAPE_INSET_PX * 2, 10);

      for (const para of extractShapeParagraphs(node)) {
        const bulletPrefix = para.bulleted ? '•  ' : '';
        const indentPx = para.level * 20 * RENDER_SCALE;
        for (const run of para.runs) {
          const sizePt = run.style.sizePt ?? (isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT);
          const fontPx = sizePt * (96 / 72) * RENDER_SCALE;
          const weight = run.style.bold ? 'bold' : 'normal';
          const style = run.style.italics ? 'italic' : 'normal';
          ctx.font = `${style} ${weight} ${fontPx}px Arial, sans-serif`;
          ctx.fillStyle = run.style.color ? `#${run.style.color}` : '#000000';

          const lines = wrapLine(ctx, `${bulletPrefix}${run.text}`, maxWidth - indentPx);
          for (const line of lines) {
            cursorY += fontPx * 1.2;
            if (run.style.underline) {
              const width = ctx.measureText(line).width;
              ctx.fillRect(px.x + SHAPE_INSET_PX + indentPx, cursorY + 2, width, Math.max(1, fontPx * 0.05));
            }
            ctx.fillText(line, px.x + SHAPE_INSET_PX + indentPx, cursorY);
          }
        }
      }

      if (!rect) stackedFallbackY = cursorY + SHAPE_INSET_PX;
    } else if (node.tagName === 'p:pic') {
      const blip = node.getElementsByTagName('a:blip')[0];
      const rId = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
        || blip?.getAttribute('r:embed');
      const mediaPath = rId ? slideRels.get(rId)?.target : undefined;
      const bytes = mediaPath ? entries[mediaPath] : undefined;
      const rect = readXfrm(node.getElementsByTagName('p:spPr')[0]);
      if (!bytes || !rect) continue;

      const bitmap = await decodeImage(bytes);
      if (!bitmap) continue;
      ctx.drawImage(bitmap, emuToPx(rect.x), emuToPx(rect.y), emuToPx(rect.w), emuToPx(rect.h));
      bitmap.close();
    }
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Slide render failed.'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/** Converts a .pptx into a .docx that looks the same as the presentation:
 * each slide is rendered to a picture (real shape positions resolved
 * through the slide's own layout, real text styling, real backgrounds and
 * embedded images) and placed full-size on its own page. This is not an
 * editable reconstruction — it trades editability for actually looking
 * right, the same tradeoff PDF to PowerPoint makes and the same one
 * commercial converters (CloudConvert, FreeConvert) make for this exact
 * conversion. For editable text instead, there is no in-between: PowerPoint's
 * freely-positioned overlapping shapes don't have a lossless editable
 * equivalent in a word-processing document. */
export async function pptxToWord(file: File, onProgress?: (message: string) => void): Promise<PptxToWordResult> {
  onProgress?.('Reading presentation…');
  const bytes = new Uint8Array(await file.arrayBuffer());

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error('This file could not be read as a .pptx archive. It may be corrupted or an older .ppt file.');
  }

  const slidePaths = resolveSlideOrder(entries);
  if (slidePaths.length === 0) {
    throw new Error('No slides were found in this file. It may not be a valid .pptx presentation.');
  }
  const slideSizeEmu = getSlideSizeEmu(entries);
  const aspect = slideSizeEmu.cy / slideSizeEmu.cx;

  // Displayed at a fixed, readable width on the page regardless of the
  // render resolution above — the render resolution only controls sharpness.
  const DISPLAY_WIDTH_PX = 620;
  const displayHeight = Math.round(DISPLAY_WIDTH_PX * aspect);

  const paragraphs: Paragraph[] = [];
  for (let i = 0; i < slidePaths.length; i += 1) {
    onProgress?.(`Rendering slide ${i + 1} of ${slidePaths.length}…`);
    const pngBytes = await renderSlideToPng(entries, slidePaths[i], slideSizeEmu);

    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `Slide ${i + 1}`, size: 18, color: '888888' })],
        pageBreakBefore: i > 0,
      }),
    );
    paragraphs.push(
      new Paragraph({
        children: [new ImageRun({ type: 'png', data: pngBytes, transformation: { width: DISPLAY_WIDTH_PX, height: displayHeight } })],
      }),
    );
  }

  onProgress?.('Building Word document…');
  const doc = new DocxDocument({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);

  return {
    blob,
    filename: file.name.replace(/\.pptx$/i, '.docx'),
    slideCount: slidePaths.length,
  };
}
