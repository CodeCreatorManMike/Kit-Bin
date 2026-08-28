import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { zipSync } from 'fflate';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfToPowerpointResult {
  blob: Blob;
  filename: string;
  pageCount: number;
}

/** PDF points to EMU (the unit every dimension in a .pptx package is stored
 * in): 1 point = 1/72 inch, 1 inch = 914400 EMU, so 1 point = 12700 EMU. */
const EMU_PER_POINT = 12700;

const enc = (s: string) => new TextEncoder().encode(s);

/** Renders one PDF page to a PNG at 2x scale — the same rendering approach
 * and resolution already used by `/pdf/to-images`, so this tool's output
 * quality matches what that one already produces. This is a literal picture
 * of the page, not a text/shape reconstruction, which is what actually makes
 * "looks exactly like the PDF" achievable: there is no layout-fidelity
 * question to solve when the slide *is* a picture of the page. */
async function renderPageToPng(page: pdfjs.PDFPageProxy): Promise<{ bytes: Uint8Array; widthPt: number; heightPt: number }> {
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Page render failed.'))), 'image/png'),
  );
  return { bytes: new Uint8Array(await blob.arrayBuffer()), widthPt: baseViewport.width, heightPt: baseViewport.height };
}

const CONTENT_TYPES = (slideCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
${Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const CORE_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Presentation</dc:title>
</cp:coreProperties>`;

const APP_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Kit-Bin</Application>
</Properties>`;

const presentationXml = (slideCount: number, cx: number, cy: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>
${Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('\n')}
</p:sldIdLst>
<p:sldSz cx="${cx}" cy="${cy}"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const presentationRels = (slideCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('\n')}
</Relationships>`;

const SLIDE_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

const SLIDE_MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const SLIDE_LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const slideXml = (x: number, y: number, w: number, h: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:pic>
<p:nvPicPr><p:cNvPr id="2" name="Page"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
</p:pic>
</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

const slideRels = (imageName: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageName}"/>
</Relationships>`;

/** Converts every page of a PDF into one full-slide picture per slide — a
 * literal image of the page, not a text/shape reconstruction, so "looks
 * exactly like the PDF" is true by construction rather than something to
 * approximate. The presentation's slide size matches the PDF's own first
 * page dimensions; any page with a different aspect ratio is scaled to fit
 * within that size and centered, rather than stretched out of proportion.
 * The resulting slides are pictures, not editable text — for an editable
 * document instead, use PDF to Word. */
export async function pdfToPowerpoint(file: File, onProgress?: (message: string) => void): Promise<PdfToPowerpointResult> {
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: bytes, standardFontDataUrl: '/standard_fonts/' }).promise;

  try {
    const pages: { bytes: Uint8Array; widthPt: number; heightPt: number }[] = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      onProgress?.(`Rendering page ${i} of ${doc.numPages}…`);
      const page = await doc.getPage(i);
      pages.push(await renderPageToPng(page));
    }

    onProgress?.('Building PowerPoint file…');
    const slideCx = Math.round(pages[0].widthPt * EMU_PER_POINT);
    const slideCy = Math.round(pages[0].heightPt * EMU_PER_POINT);

    const parts: Record<string, Uint8Array> = {
      '[Content_Types].xml': enc(CONTENT_TYPES(pages.length)),
      '_rels/.rels': enc(ROOT_RELS),
      'docProps/core.xml': enc(CORE_PROPS),
      'docProps/app.xml': enc(APP_PROPS),
      'ppt/presentation.xml': enc(presentationXml(pages.length, slideCx, slideCy)),
      'ppt/_rels/presentation.xml.rels': enc(presentationRels(pages.length)),
      'ppt/slideMasters/slideMaster1.xml': enc(SLIDE_MASTER),
      'ppt/slideMasters/_rels/slideMaster1.xml.rels': enc(SLIDE_MASTER_RELS),
      'ppt/slideLayouts/slideLayout1.xml': enc(SLIDE_LAYOUT),
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': enc(SLIDE_LAYOUT_RELS),
    };

    pages.forEach((p, i) => {
      const pageCx = Math.round(p.widthPt * EMU_PER_POINT);
      const pageCy = Math.round(p.heightPt * EMU_PER_POINT);
      // Contain-fit: a page whose aspect matches the presentation's slide
      // size fills it exactly; a differently-sized page (a mixed-size PDF)
      // scales down to fit within it, centered, rather than being stretched
      // out of its own proportions.
      const scale = Math.min(slideCx / pageCx, slideCy / pageCy);
      const w = Math.round(pageCx * scale);
      const h = Math.round(pageCy * scale);
      const x = Math.round((slideCx - w) / 2);
      const y = Math.round((slideCy - h) / 2);

      const imageName = `image${i + 1}.png`;
      parts[`ppt/slides/slide${i + 1}.xml`] = enc(slideXml(x, y, w, h));
      parts[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = enc(slideRels(imageName));
      parts[`ppt/media/${imageName}`] = p.bytes;
    });

    const zipped = zipSync(parts, { level: 6 });
    return {
      blob: new Blob([zipped] as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
      filename: file.name.replace(/\.pdf$/i, '.pptx'),
      pageCount: pages.length,
    };
  } finally {
    doc.cleanup();
  }
}
