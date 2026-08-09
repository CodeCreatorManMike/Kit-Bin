// Only this file imports from the encryption fork — every other PDF tool on
// the site stays on plain `pdf-lib`, per the per-tool code-splitting
// convention (see docs/TOOL_SPECS.md). `pdf-lib-plus-encrypt` is a drop-in
// `pdf-lib` fork with `.encrypt()` added; verified MIT, already in
// docs/LICENSING.md.
import { PDFDocument, PDFHeader, EncryptedPDFError } from 'pdf-lib-plus-encrypt';

/** Adds a password to a PDF so it requires that password to open.
 *
 * The `userPassword` is the "open password" — the one a viewer is prompted
 * for before the document renders at all. `pdf-lib-plus-encrypt`'s
 * `SecurityOption` also has an `ownerPassword`, which is a separate
 * "permissions password" that only gates printing/editing/copying while
 * still letting the file open with no password at all. That is not what
 * this tool does, and it's an easy distinction to get backwards. We only
 * ever set `userPassword`; leaving `ownerPassword` unset makes the library
 * fall back to the same value internally, so the one password the user
 * chose is both the open password and the full-access password — there is
 * no second, weaker password anyone could use to bypass it.
 *
 * `PDFDocument.encrypt()` always encrypts using whatever PDF version is
 * already on the loaded document's header, ignoring any `pdfVersion` passed
 * into `SecurityOption` (see node_modules/pdf-lib-plus-encrypt's
 * `PDFDocument.encrypt()` — it overwrites `options.pdfVersion` from
 * `this.context.header.getVersion()` unconditionally). Left alone, that
 * means encryption strength would depend on whatever version the *source*
 * PDF happened to declare: 40-bit RC4 for pre-1.4 files, 128-bit RC4 for
 * 1.4/1.5, 128-bit AES for 1.6/1.7 (verified empirically for this project —
 * see the tool's FAQ). We bump the header to 1.7 before encrypting so every
 * file gets the same, stronger 128-bit AES (AESV2) result regardless of
 * what the source file declared.
 */
export async function protectPdf(file: File, password: string): Promise<Blob> {
  if (!password) {
    throw new Error('Enter a password.');
  }

  const bytes = await file.arrayBuffer();

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
  } catch (err) {
    if (err instanceof EncryptedPDFError) {
      throw new Error(
        'This PDF already has a password. Remove the existing password before adding a new one.',
      );
    }
    throw err;
  }

  doc.context.header = PDFHeader.forVersion(1, 7);
  await doc.encrypt({ userPassword: password });

  const out = await doc.save();
  return new Blob([out] as BlobPart[], { type: 'application/pdf' });
}
