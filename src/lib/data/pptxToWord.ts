import { unzipSync } from 'fflate';
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel } from 'docx';

export interface PptxToWordResult {
  blob: Blob;
  filename: string;
  slideCount: number;
}

const parser = new DOMParser();

function parseXml(bytes: Uint8Array): Document {
  const text = new TextDecoder('utf-8').decode(bytes);
  return parser.parseFromString(text, 'application/xml') as unknown as Document;
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
        // Targets are relative to ppt/ (e.g. "slides/slide3.xml").
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
 * a plain text box) is read as regular paragraph text, not a heading. */
function isTitleShape(shape: Element): boolean {
  const ph = shape.getElementsByTagName('p:ph')[0];
  const type = ph?.getAttribute('type');
  return type === 'title' || type === 'ctrTitle';
}

function extractShapeParagraphs(shape: Element): string[] {
  const paragraphs: string[] = [];
  for (const p of Array.from(shape.getElementsByTagName('a:p'))) {
    const text = Array.from(p.getElementsByTagName('a:t'))
      .map((t) => t.textContent ?? '')
      .join('');
    if (text.trim()) paragraphs.push(text.trim());
  }
  return paragraphs;
}

/** Reads every text-bearing shape on a slide, in document order, tagging
 * title-placeholder text so it renders as a heading. Speaker notes are
 * intentionally not included — this converts what the slide visibly shows,
 * matching the same "readable text, not a full document clone" scope as
 * `pdfToWord`. */
function extractSlideParagraphs(slideXml: Uint8Array): { text: string; isTitle: boolean }[] {
  const doc = parseXml(slideXml);
  const shapes = Array.from(doc.getElementsByTagName('p:sp'));
  const out: { text: string; isTitle: boolean }[] = [];

  for (const shape of shapes) {
    const isTitle = isTitleShape(shape);
    for (const text of extractShapeParagraphs(shape)) {
      out.push({ text, isTitle });
    }
  }
  return out;
}

/** Converts a .pptx's visible slide text into an editable .docx: one
 * "Slide N" heading per slide, the slide's own title (if any) as a
 * sub-heading, and every other text line as a plain paragraph. This is a
 * text-reconstruction tool, not a layout or design clone — no images,
 * shape positioning, tables, or speaker notes are carried over, the same
 * honest scope as `pdfToWord` for PDF-to-Word. */
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
    const slideBytes = entries[slidePaths[i]];
    if (!slideBytes) continue;

    paragraphs.push(
      new Paragraph({
        text: `Slide ${i + 1}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: i > 0,
      }),
    );

    for (const line of extractSlideParagraphs(slideBytes)) {
      if (!line.text) continue;
      paragraphs.push(
        new Paragraph({
          text: line.text,
          heading: line.isTitle ? HeadingLevel.HEADING_2 : undefined,
        }),
      );
    }
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
