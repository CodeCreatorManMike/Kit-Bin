/** Site-level FAQ, rendered on the homepage and emitted as FAQPage JSON-LD.
 *
 * These target real questions people type before trusting a file tool
 * ("does it upload my files", "is it free", "is there a size limit"), rather
 * than keyword filler. Answers must stay accurate to how the site actually
 * works, because the same array feeds both the visible copy and the schema. */

export interface Faq {
  q: string;
  a: string;
}

export const siteFaqs: Faq[] = [
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. Every tool on Kit-Bin processes files inside your browser using WebAssembly and standard browser APIs. Your file is read into your browser\'s memory, the work happens on your own device, and the result is saved straight back to it. You can confirm this yourself by opening your browser\'s developer tools, switching to the Network tab, and processing a file: no request carrying your file will appear.',
  },
  {
    q: 'Is Kit-Bin free, and do I need an account?',
    a: 'Every tool is free and there is no account, no sign-up, and no email required. Nothing is behind a paywall or a trial, and there is no watermark added to your output.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'There is no artificial upload limit, because nothing is uploaded. The real limit is your device: your browser has to hold the file in memory while it works. Large videos are the most demanding case and will hit that ceiling sooner on a phone than on a desktop. If a large file fails, try it on a computer.',
  },
  {
    q: 'Can I use Kit-Bin for confidential documents?',
    a: 'That is what the local-processing design is for. Contracts, statements, medical letters, and scanned records never leave your device, so there is no server copy to be retained, breached, or subpoenaed. If your organisation has its own rules about which tools you may use, check those as well.',
  },
  {
    q: 'Does Kit-Bin work offline?',
    a: 'You need a connection to load a tool page for the first time, because the code and the WebAssembly modules have to be downloaded. Once a page is loaded, the actual processing needs no connection, since it all runs locally.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Current versions of Chrome, Edge, Firefox, and Safari, on both desktop and mobile. Everything is built on standard browser APIs rather than anything browser-specific. A small number of tools depend on codecs your browser must be able to decode, and those tools say so on their own pages.',
  },
  {
    q: 'Does converting a file reduce its quality?',
    a: 'It depends on the operation, and each tool page states which applies to it. Operations like merging, splitting, and reordering PDFs copy content without re-encoding it, so nothing is lost. Compression and format conversion are lossy by design and do discard some data. Metadata removal on JPEG and PNG is byte-level, so the image itself is untouched.',
  },
  {
    q: 'Does Kit-Bin keep a copy of my file or its metadata?',
    a: 'No. There is no database of user files, no upload directory, and no logging of file names or contents. The tools that read metadata, such as the EXIF and PDF property inspectors, display it to you in your own browser and send it nowhere.',
  },
  {
    q: 'How does Kit-Bin make money if everything is free?',
    a: 'It does not yet. There are no ads running and no subscription. Advertising may be added later to cover hosting costs, and if that happens the privacy policy will be updated before any advertising or tracking technology is switched on. There is also a voluntary donation link in the footer.',
  },
];
