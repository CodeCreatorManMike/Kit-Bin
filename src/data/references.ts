/** Authoritative external sources cited by guides.
 *
 * Every URL here was verified to return HTTP 200 when added. Keep it that way:
 * a dead reference is worse than no reference. Prefer browser vendor docs,
 * format specifications, and standards bodies over blog posts. */

export interface Reference {
  title: string;
  url: string;
  publisher: string;
}

export const references = {
  mdnImageTypes: {
    title: 'Image file type and format guide',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types',
    publisher: 'MDN Web Docs',
  },
  mdnContainers: {
    title: 'Media container formats',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers',
    publisher: 'MDN Web Docs',
  },
  mdnVideoCodecs: {
    title: 'Web video codec guide',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs',
    publisher: 'MDN Web Docs',
  },
  mdnAudioCodecs: {
    title: 'Web audio codec guide',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs',
    publisher: 'MDN Web Docs',
  },
  mdnWasm: {
    title: 'WebAssembly',
    url: 'https://developer.mozilla.org/en-US/docs/WebAssembly',
    publisher: 'MDN Web Docs',
  },
  mdnFileApi: {
    title: 'File API',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/File_API',
    publisher: 'MDN Web Docs',
  },
  mdnCanvas: {
    title: 'Canvas API',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',
    publisher: 'MDN Web Docs',
  },
  mdnWorkers: {
    title: 'Web Workers API',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API',
    publisher: 'MDN Web Docs',
  },
  mdnMimeTypes: {
    title: 'MIME types (IANA media types)',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types',
    publisher: 'MDN Web Docs',
  },
  chromeNetworkPanel: {
    title: 'Inspect network activity in DevTools',
    url: 'https://developer.chrome.com/docs/devtools/network',
    publisher: 'Chrome for Developers',
  },
  rfc4180: {
    title: 'RFC 4180: Common Format and MIME Type for CSV Files',
    url: 'https://www.rfc-editor.org/rfc/rfc4180',
    publisher: 'IETF',
  },
  pngSpec: {
    title: 'Portable Network Graphics (PNG) Specification',
    url: 'https://www.w3.org/TR/png/',
    publisher: 'W3C',
  },
  webp: {
    title: 'WebP: an image format for the web',
    url: 'https://developers.google.com/speed/webp',
    publisher: 'Google Developers',
  },
  heif: {
    title: 'High Efficiency Image File Format (HEIF/HEIC)',
    url: 'https://en.wikipedia.org/wiki/High_Efficiency_Image_File_Format',
    publisher: 'Wikipedia',
  },
  pdfSpec: {
    title: 'PDF 32000-1:2008 specification',
    url: 'https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf',
    publisher: 'Adobe / ISO',
  },
  deflateSpec: {
    title: 'RFC 1951: DEFLATE Compressed Data Format Specification',
    url: 'https://www.rfc-editor.org/rfc/rfc1951',
    publisher: 'IETF',
  },
} as const satisfies Record<string, Reference>;

export type ReferenceKey = keyof typeof references;
