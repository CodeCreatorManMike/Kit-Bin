import { unzipSync } from 'fflate';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  type ParagraphChild,
} from 'docx';

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
  const relsXml = entries['ppt/_rels/presentation.xml.rels'];
  if (!presentationXml || !relsXml) return numericFallback();

  try {
    const relDoc = parseXml(relsXml);
    const idToTarget = new Map<string, string>();
    for (const rel of Array.from(relDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target && target.includes('slide')) {
        idToTarget.set(id, `ppt/${target.replace(/^\.?\//, '')}`);
      }
    }

    const presDoc = parseXml(presentationXml);
    const order: string[] = [];
    for (const sldId of Array.from(presDoc.getElementsByTagName('p:sldId'))) {
      const rId = sldId.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
        || sldId.getAttribute('r:id');
      const target = rId ? idToTarget.get(rId) : undefined;
      if (target && entries[target]) order.push(target);
    }
    return order.length > 0 ? order : numericFallback();
  } catch {
    return numericFallback();
  }
}

/** A shape is the title placeholder if its non-visual properties declare
 * `<p:ph type="title"/>` or `type="ctrTitle"` — the two placeholder types
 * PowerPoint uses for a slide's main heading. Anything else (subtitle, body,
 * a plain text box) is read as regular paragraph text. */
function isTitleShape(shape: Element): boolean {
  const ph = shape.getElementsByTagName('p:ph')[0];
  const type = ph?.getAttribute('type');
  return type === 'title' || type === 'ctrTitle';
}

/** Maps this one slide's own relationship IDs (image embeds, mainly) to the
 * actual file paths inside the package — separate from the presentation-level
 * rels used for slide ordering, since each slide has its own `_rels` file. */
function loadSlideRels(entries: Record<string, Uint8Array>, slidePath: string): Map<string, string> {
  const slideName = slidePath.split('/').pop()!;
  const relsPath = `ppt/slides/_rels/${slideName}.rels`;
  const relsBytes = entries[relsPath];
  const map = new Map<string, string>();
  if (!relsBytes) return map;

  try {
    const relDoc = parseXml(relsBytes);
    for (const rel of Array.from(relDoc.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (!id || !target) continue;
      // Targets are relative to ppt/slides/ (e.g. "../media/image1.png").
      map.set(id, resolveZipPath('ppt/slides', target));
    }
  } catch {
    // No usable rels for this slide — images just won't resolve, text still will.
  }
  return map;
}

const IMAGE_EXT_TO_TYPE: Record<string, 'jpg' | 'png' | 'gif' | 'bmp'> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  bmp: 'bmp',
};

/** EMU (English Metric Units, the unit PPTX stores all dimensions in) to
 * pixels at 96dpi, the same conversion Office itself uses on screen. */
const EMU_PER_PX = 9525;
const MAX_IMAGE_WIDTH_PX = 500;

function readImageRun(shape: Element, entries: Record<string, Uint8Array>, slideRels: Map<string, string>): ImageRun | null {
  const blip = shape.getElementsByTagName('a:blip')[0];
  const rId = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
    || blip?.getAttribute('r:embed');
  if (!rId) return null;

  const mediaPath = slideRels.get(rId);
  if (!mediaPath) return null;
  const bytes = entries[mediaPath];
  if (!bytes) return null;

  const ext = mediaPath.split('.').pop()?.toLowerCase() ?? '';
  const type = IMAGE_EXT_TO_TYPE[ext];
  // Unsupported/vector formats (WMF, EMF, TIFF) can't be embedded as a raster
  // ImageRun and browsers can't decode them either — skip rather than fail
  // the whole conversion over one picture.
  if (!type) return null;

  const ext_ = shape.getElementsByTagName('a:ext')[0];
  const cx = Number(ext_?.getAttribute('cx') ?? 0);
  const cy = Number(ext_?.getAttribute('cy') ?? 0);
  const rawWidth = cx > 0 ? cx / EMU_PER_PX : 300;
  const rawHeight = cy > 0 ? cy / EMU_PER_PX : 200;
  const scale = rawWidth > MAX_IMAGE_WIDTH_PX ? MAX_IMAGE_WIDTH_PX / rawWidth : 1;

  return new ImageRun({
    type,
    data: bytes,
    transformation: { width: Math.round(rawWidth * scale), height: Math.round(rawHeight * scale) },
  });
}

interface RunStyle {
  bold: boolean;
  italics: boolean;
  underline: boolean;
  /** Half-points, matching Word's own `w:sz` convention (a plain integer, not
   * a "Npt" string) — real Word/LibreOffice/Google Docs files always write
   * this as a number, so that's what gets generated here too rather than
   * relying on docx's schema-valid-but-unconventional string-measure path. */
  size?: number;
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
  if (sz) style.size = Math.round(Number(sz) / 50); // -> half-points (32pt = 64)

  // Only explicit RGB fills are read — theme/scheme colors (<a:schemeClr>)
  // would need the slide master's theme resolved to know what they actually
  // render as, which is out of scope here; those runs just keep no color
  // rather than guessing wrong.
  const srgb = rPr.getElementsByTagName('a:srgbClr')[0];
  if (srgb) style.color = srgb.getAttribute('val') ?? undefined;

  return style;
}

interface ExtractedParagraph {
  runs: { text: string; style: RunStyle }[];
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

function runsToChildren(runs: { text: string; style: RunStyle }[]): ParagraphChild[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.style.bold || undefined,
        italics: r.style.italics || undefined,
        underline: r.style.underline ? {} : undefined,
        size: r.style.size,
        color: r.style.color,
      }),
  );
}

/** Converts a .pptx's slides into an editable .docx, preserving what
 * genuinely translates to a Word document: bold/italic/underline/font
 * size/color per run, bullet and indent levels, embedded images (raster
 * formats only), and a heading for each slide's title placeholder. What it
 * does NOT do is reproduce exact shape positions, slide backgrounds, or
 * theme-based colors/fonts — a Word document has no equivalent to
 * absolutely-positioned overlapping shapes, so this lays content out in
 * slide reading order rather than attempting a pixel copy. */
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

  const paragraphs: Paragraph[] = [];
  for (let i = 0; i < slidePaths.length; i += 1) {
    onProgress?.(`Reading slide ${i + 1} of ${slidePaths.length}…`);
    const slidePath = slidePaths[i];
    const slideBytes = entries[slidePath];
    if (!slideBytes) continue;

    paragraphs.push(
      new Paragraph({
        text: `Slide ${i + 1}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: i > 0,
      }),
    );

    const slideDoc = parseXml(slideBytes);
    const slideRels = loadSlideRels(entries, slidePath);
    const spTree = slideDoc.getElementsByTagName('p:spTree')[0];
    if (!spTree) continue;

    for (const node of Array.from(spTree.children)) {
      if (node.tagName === 'p:sp') {
        const isTitle = isTitleShape(node);
        for (const para of extractShapeParagraphs(node)) {
          if (isTitle) {
            paragraphs.push(new Paragraph({ children: runsToChildren(para.runs), heading: HeadingLevel.HEADING_2 }));
          } else if (para.bulleted) {
            paragraphs.push(new Paragraph({ children: runsToChildren(para.runs), bullet: { level: para.level } }));
          } else if (para.level > 0) {
            paragraphs.push(new Paragraph({ children: runsToChildren(para.runs), indent: { left: para.level * 360 } }));
          } else {
            paragraphs.push(new Paragraph({ children: runsToChildren(para.runs) }));
          }
        }
      } else if (node.tagName === 'p:pic') {
        const image = readImageRun(node, entries, slideRels);
        if (image) paragraphs.push(new Paragraph({ children: [image] }));
      }
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
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
