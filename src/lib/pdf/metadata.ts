/** Reads and clears the document information dictionary of a PDF.
 *
 * Scope note, deliberately narrow: this only touches document-level metadata
 * (the /Info dictionary fields a PDF reader shows under "Properties", plus the
 * XMP metadata stream when one is present). It does not read or alter page
 * content, so text, comments, annotations, layers, and attachments are left
 * exactly as they were. */
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  /** True when the file carries PDF encryption (a password or permissions handler). */
  encrypted: boolean;
  /** True when the file also carries an XMP metadata stream, a second copy of
   * much of the same information that some tools read in preference to /Info. */
  hasXmpMetadata: boolean;
}

export interface RemoveMetadataOptions {
  /** Written to the Title field instead of clearing it. */
  replacementTitle?: string;
  /** Written to the Author field instead of clearing it. */
  replacementAuthor?: string;
  /** Removes the CreationDate and ModDate entries instead of leaving them. */
  clearDates?: boolean;
}

/** pdf-lib returns '' for a field that is present but empty. Treat that as
 * absent rather than reporting a blank value, and never substitute a guess. */
function orUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Loads a document for inspection or editing.
 *
 * `updateMetadata: false` matters here: by default pdf-lib rewrites ModDate and
 * stamps its own Producer on save, which would put new metadata into a file
 * we were asked to strip metadata from. */
async function load(file: File): Promise<PDFDocument> {
  const bytes = await file.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
}

function infoDict(doc: PDFDocument): PDFDict | undefined {
  return doc.context.lookupMaybe(doc.context.trailerInfo.Info, PDFDict);
}

/** Reads the document information fields present in a PDF. Fields the file does
 * not contain come back as undefined. */
export async function readPdfMetadata(file: File): Promise<PdfMetadata> {
  const doc = await load(file);

  let creationDate: Date | undefined;
  let modificationDate: Date | undefined;
  // A malformed date string in the file makes pdf-lib's date parser throw.
  // A bad date is not a reason to fail the whole read.
  try {
    creationDate = doc.getCreationDate();
  } catch {
    creationDate = undefined;
  }
  try {
    modificationDate = doc.getModificationDate();
  } catch {
    modificationDate = undefined;
  }

  return {
    title: orUndefined(doc.getTitle()),
    author: orUndefined(doc.getAuthor()),
    subject: orUndefined(doc.getSubject()),
    keywords: orUndefined(doc.getKeywords()),
    creator: orUndefined(doc.getCreator()),
    producer: orUndefined(doc.getProducer()),
    creationDate,
    modificationDate,
    pageCount: doc.getPageCount(),
    encrypted: doc.isEncrypted,
    hasXmpMetadata: doc.catalog.has(PDFName.of('Metadata')),
  };
}

/** Clears the document information fields and the XMP metadata stream, and
 * returns the rewritten PDF. Page content is not touched. */
export async function removePdfMetadata(file: File, opts: RemoveMetadataOptions = {}): Promise<Blob> {
  const doc = await load(file);

  if (doc.isEncrypted) {
    throw new Error(
      'This PDF is password-protected, so its metadata cannot be rewritten. Remove the password first, then run this tool.',
    );
  }

  doc.setTitle(opts.replacementTitle ?? '');
  doc.setAuthor(opts.replacementAuthor ?? '');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setCreator('');
  doc.setProducer('');

  if (opts.clearDates) {
    // There is no setter that removes a date, and writing an arbitrary date
    // would be inventing a value, so the entries are deleted outright.
    const info = infoDict(doc);
    info?.delete(PDFName.of('CreationDate'));
    info?.delete(PDFName.of('ModDate'));
  }

  // Some producers write a second copy of the metadata as an XMP stream on the
  // catalog. Clearing /Info alone would leave that copy readable.
  doc.catalog.delete(PDFName.of('Metadata'));

  const bytes = await doc.save();
  return new Blob([bytes] as BlobPart[], { type: 'application/pdf' });
}
