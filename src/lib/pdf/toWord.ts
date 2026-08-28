import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfTextItem {
  str: string;
  hasEOL?: boolean;
  height: number;
}

interface ExtractedLine {
  text: string;
  height: number;
  firstOnPage: boolean;
}

export interface PdfToWordResult {
  blob: Blob;
  filename: string;
  pageCount: number;
}

/** Same line-grouping approach as `pdfToText` (pdf.js's own `hasEOL` flag marks
 * real line breaks; everything else is a word-wrap join within one visual
 * line) — one output line per visual PDF line, not a paragraph-reflow
 * heuristic. This keeps behavior predictable and matches what the existing
 * PDF to Text tool already does, rather than guessing at paragraph
 * boundaries a different way between the two tools. */
async function extractLines(document: pdfjs.PDFDocumentProxy, onProgress?: (message: string) => void): Promise<ExtractedLine[]> {
  const lines: ExtractedLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress?.(`Reading page ${pageNumber} of ${document.numPages}…`);
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();

    let current = '';
    let currentMaxHeight = 0;
    let firstLineOfPage = true;

    for (const item of content.items) {
      const textItem = item as PdfTextItem;
      current += textItem.str;
      if (textItem.height) currentMaxHeight = Math.max(currentMaxHeight, textItem.height);

      if (textItem.hasEOL) {
        lines.push({ text: current.trimEnd(), height: currentMaxHeight, firstOnPage: firstLineOfPage });
        firstLineOfPage = false;
        current = '';
        currentMaxHeight = 0;
      } else {
        current += ' ';
      }
    }
    if (current.trim()) {
      lines.push({ text: current.trimEnd(), height: currentMaxHeight, firstOnPage: firstLineOfPage });
    }
  }

  return lines;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Extracts the text layer already in a PDF (like `pdfToText`) and rebuilds it
 * as an editable .docx: one Word paragraph per PDF line, a page break where
 * the PDF had one, and a larger/bold heading style applied to short lines
 * whose font size is well above the document's typical line height. This is
 * NOT a layout-fidelity conversion — no tables, images, columns, or exact
 * fonts/positions are reconstructed, only readable, editable text with basic
 * heading structure. It intentionally does not perform OCR. */
export async function pdfToWord(file: File, onProgress?: (message: string) => void): Promise<PdfToWordResult> {
  const bytes = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: bytes, standardFontDataUrl: '/standard_fonts/' }).promise;

  try {
    const lines = await extractLines(document, onProgress);
    onProgress?.('Building Word document…');

    const bodyHeights = lines.filter((l) => l.text.trim().length > 0).map((l) => l.height);
    const typicalHeight = median(bodyHeights);
    // A line counts as a heading only if it's both noticeably larger than the
    // page's typical text (not just a slightly-bigger word) and short enough
    // to plausibly be a heading rather than a wrapped sentence.
    const isHeading = (line: ExtractedLine) =>
      typicalHeight > 0 && line.height > typicalHeight * 1.3 && line.text.length > 0 && line.text.length < 90;

    const paragraphs: Paragraph[] = [];
    for (const line of lines) {
      if (!line.text.trim()) continue;
      paragraphs.push(
        new Paragraph({
          text: line.text,
          heading: isHeading(line) ? HeadingLevel.HEADING_2 : undefined,
          pageBreakBefore: line.firstOnPage && paragraphs.length > 0,
        }),
      );
    }

    if (paragraphs.length === 0) {
      paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);

    return {
      blob,
      filename: file.name.replace(/\.pdf$/i, '.docx'),
      pageCount: document.numPages,
    };
  } finally {
    document.cleanup();
  }
}
