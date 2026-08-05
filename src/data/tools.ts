export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: 'pdf' | 'image' | 'audio' | 'video' | 'data';
  /** Extra search terms for the client-side tool search. These deliberately do
   * NOT get their own URLs; one strong page plus natural synonyms beats a set of
   * near-duplicate keyword pages. See docs/SEO.md. */
  aliases?: string[];
}

export const tools: Tool[] = [
  { slug: '/pdf/merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', category: 'pdf',
    aliases: ['combine pdf', 'join pdf', 'pdf combiner', 'put pdf files together', 'concatenate pdf'] },
  { slug: '/pdf/split', name: 'Split PDF', description: 'Split a PDF into individual pages.', category: 'pdf',
    aliases: ['separate pdf', 'pdf splitter', 'extract pages', 'page range', 'break up pdf', 'divide pdf'] },
  { slug: '/pdf/compress', name: 'Compress PDF', description: "Shrink a PDF's file size.", category: 'pdf',
    aliases: ['shrink pdf', 'reduce pdf size', 'make pdf smaller', 'pdf too big for email', 'optimise pdf', 'optimize pdf'] },
  { slug: '/pdf/rotate', name: 'Rotate PDF', description: 'Rotate every page in a PDF.', category: 'pdf',
    aliases: ['turn pdf', 'sideways pdf', 'fix pdf orientation', 'landscape pdf'] },
  { slug: '/pdf/to-images', name: 'PDF to PNG', description: 'Convert PDF pages to PNG images.', category: 'pdf',
    aliases: ['pdf to image', 'pdf to jpg', 'pdf to picture', 'export pdf pages as images', 'screenshot pdf'] },
  { slug: '/pdf/watermark', name: 'Watermark PDF', description: 'Stamp a text watermark on every page.', category: 'pdf',
    aliases: ['stamp pdf', 'add draft to pdf', 'confidential pdf', 'label pdf pages'] },
  { slug: '/pdf/reorder-pages', name: 'Reorder PDF Pages', description: 'Change the order of pages in a PDF.', category: 'pdf',
    aliases: ['rearrange pdf', 'move pdf pages', 'organise pdf pages', 'organize pdf pages', 'sort pdf pages', 'page order'] },

  { slug: '/image/heic-to-jpg', name: 'HEIC to JPG', description: 'Convert iPhone photos to JPG.', category: 'image',
    aliases: ['iphone photo', 'heif', 'heic converter', 'apple photo to jpg', 'open iphone photo on windows', 'heic to jpeg'] },
  { slug: '/image/compress', name: 'Compress Image', description: "Shrink an image's file size.", category: 'image',
    aliases: ['shrink image', 'reduce photo size', 'make image smaller', 'optimise image', 'optimize image', 'compress photo', 'compress jpg', 'compress png'] },
  { slug: '/image/resize', name: 'Resize Image', description: 'Resize an image to a target width.', category: 'image',
    aliases: ['scale image', 'change image dimensions', 'image size in pixels', 'shrink photo dimensions', 'resize photo'] },
  { slug: '/image/webp-to-png', name: 'WebP to PNG', description: 'Convert WebP images to PNG.', category: 'image',
    aliases: ['webp converter', 'open webp', 'webp to image', 'convert webp'] },
  { slug: '/image/png-to-webp', name: 'PNG to WebP', description: 'Convert PNG images to WebP.', category: 'image',
    aliases: ['make webp', 'png to webp converter', 'web image format', 'smaller web images'] },
  { slug: '/image/svg-to-png', name: 'SVG to PNG', description: 'Rasterize an SVG to PNG.', category: 'image',
    aliases: ['vector to raster', 'svg converter', 'export svg as image', 'rasterise svg', 'rasterize svg'] },
  { slug: '/image/crop', name: 'Crop Image', description: 'Crop an image to a custom selection.', category: 'image',
    aliases: ['cut image', 'trim photo', 'crop photo', 'cut out part of a picture'] },

  { slug: '/audio/mp3-to-wav', name: 'MP3 to WAV', description: 'Convert MP3 audio to WAV.', category: 'audio',
    aliases: ['mp3 converter', 'uncompressed audio', 'pcm audio', 'wav converter'] },
  { slug: '/audio/wav-to-mp3', name: 'WAV to MP3', description: 'Convert WAV audio to MP3.', category: 'audio',
    aliases: ['shrink audio', 'compress audio', 'make audio smaller', 'reduce audio file size'] },
  { slug: '/audio/trim', name: 'Trim Audio', description: 'Cut audio to a start and end time.', category: 'audio',
    aliases: ['cut audio', 'crop audio', 'clip audio', 'audio start and end', 'shorten audio', 'cut mp3'] },
  { slug: '/audio/merge', name: 'Merge Audio', description: 'Combine multiple audio files into one.', category: 'audio',
    aliases: ['combine audio', 'join audio', 'concatenate audio', 'put audio files together', 'join mp3'] },
  { slug: '/audio/volume-normalize', name: 'Normalize Audio', description: "Even out an audio file's volume.", category: 'audio',
    aliases: ['normalise audio', 'audio too quiet', 'make audio louder', 'increase volume', 'boost volume', 'peak volume'] },

  { slug: '/video/mp4-to-webm', name: 'MP4 to WebM', description: 'Convert MP4 video to WebM.', category: 'video',
    aliases: ['video converter', 'webm converter', 'convert video format', 'vp9'] },
  { slug: '/video/compress', name: 'Compress Video', description: "Shrink a video's file size.", category: 'video',
    aliases: ['shrink video', 'reduce video size', 'make video smaller', 'video too big to send', 'video too big for email'] },
  { slug: '/video/trim', name: 'Trim Video', description: 'Cut video to a start and end time.', category: 'video',
    aliases: ['cut video', 'clip video', 'shorten video', 'video start and end', 'crop video length'] },
  { slug: '/video/mute', name: 'Mute Video', description: 'Remove the audio track from a video.', category: 'video',
    aliases: ['remove audio from video', 'silence video', 'delete sound', 'strip audio track'] },
  { slug: '/video/extract-audio', name: 'Extract Audio from Video', description: 'Pull the audio track out of a video.', category: 'video',
    aliases: ['video to audio', 'rip audio', 'get sound from video', 'separate audio from video', 'video to mp3'] },
  { slug: '/video/gif-from-video', name: 'Video to GIF', description: 'Turn a video clip into a GIF.', category: 'video',
    aliases: ['make a gif', 'gif maker', 'animated gif from video', 'mp4 to gif', 'convert clip to gif'] },

  { slug: '/csv/to-json', name: 'CSV to JSON', description: 'Convert a CSV file to JSON.', category: 'data',
    aliases: ['spreadsheet to json', 'csv converter', 'table to json', 'csv parser'] },
  { slug: '/json/to-csv', name: 'JSON to CSV', description: 'Convert a JSON file to CSV.', category: 'data',
    aliases: ['json converter', 'json to spreadsheet', 'json to table', 'flatten json'] },
  { slug: '/csv/to-excel', name: 'CSV to Excel', description: 'Convert a CSV file to .xlsx.', category: 'data',
    aliases: ['csv to xlsx', 'csv to spreadsheet', 'open csv in excel', 'excel converter'] },
  { slug: '/data/csv-cleaner', name: 'CSV Cleaner', description: 'Trim, dedupe, and clean CSV data.', category: 'data',
    aliases: ['fix csv', 'repair csv', 'clean up spreadsheet', 'remove duplicate rows', 'dedupe csv', 'tidy csv'] },
];

export const categories = [
  { slug: 'pdf', name: 'PDF Tools' },
  { slug: 'image', name: 'Image Tools' },
  { slug: 'audio', name: 'Audio Tools' },
  { slug: 'video', name: 'Video Tools' },
  { slug: 'data', name: 'Data Tools' },
] as const;
