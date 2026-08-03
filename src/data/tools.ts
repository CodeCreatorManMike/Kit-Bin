export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: 'pdf' | 'image' | 'audio' | 'video' | 'data';
}

export const tools: Tool[] = [
  { slug: '/pdf/merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', category: 'pdf' },
  { slug: '/pdf/split', name: 'Split PDF', description: 'Split a PDF into individual pages.', category: 'pdf' },
  { slug: '/pdf/compress', name: 'Compress PDF', description: "Shrink a PDF's file size.", category: 'pdf' },
  { slug: '/pdf/rotate', name: 'Rotate PDF', description: 'Rotate every page in a PDF.', category: 'pdf' },
  { slug: '/pdf/to-images', name: 'PDF to Images', description: 'Convert PDF pages to PNG images.', category: 'pdf' },
  { slug: '/pdf/watermark', name: 'Watermark PDF', description: 'Stamp a text watermark on every page.', category: 'pdf' },
  { slug: '/pdf/reorder-pages', name: 'Reorder PDF Pages', description: 'Change the order of pages in a PDF.', category: 'pdf' },

  { slug: '/image/heic-to-jpg', name: 'HEIC to JPG', description: 'Convert iPhone photos to JPG.', category: 'image' },
  { slug: '/image/compress', name: 'Compress Image', description: "Shrink an image's file size.", category: 'image' },
  { slug: '/image/resize', name: 'Resize Image', description: 'Resize an image to a target width.', category: 'image' },
  { slug: '/image/webp-to-png', name: 'WebP to PNG', description: 'Convert WebP images to PNG.', category: 'image' },
  { slug: '/image/png-to-webp', name: 'PNG to WebP', description: 'Convert PNG images to WebP.', category: 'image' },
  { slug: '/image/svg-to-png', name: 'SVG to PNG', description: 'Rasterize an SVG to PNG.', category: 'image' },
  { slug: '/image/crop', name: 'Crop Image', description: 'Crop an image to a custom selection.', category: 'image' },

  { slug: '/audio/mp3-to-wav', name: 'MP3 to WAV', description: 'Convert MP3 audio to WAV.', category: 'audio' },
  { slug: '/audio/wav-to-mp3', name: 'WAV to MP3', description: 'Convert WAV audio to MP3.', category: 'audio' },
  { slug: '/audio/trim', name: 'Trim Audio', description: 'Cut audio to a start and end time.', category: 'audio' },
  { slug: '/audio/merge', name: 'Merge Audio', description: 'Combine multiple audio files into one.', category: 'audio' },
  { slug: '/audio/volume-normalize', name: 'Normalize Volume', description: "Even out an audio file's volume.", category: 'audio' },

  { slug: '/video/mp4-to-webm', name: 'MP4 to WebM', description: 'Convert MP4 video to WebM.', category: 'video' },
  { slug: '/video/compress', name: 'Compress Video', description: "Shrink a video's file size.", category: 'video' },
  { slug: '/video/trim', name: 'Trim Video', description: 'Cut video to a start and end time.', category: 'video' },
  { slug: '/video/mute', name: 'Mute Video', description: 'Remove the audio track from a video.', category: 'video' },
  { slug: '/video/extract-audio', name: 'Extract Audio', description: 'Pull the audio track out of a video.', category: 'video' },
  { slug: '/video/gif-from-video', name: 'Video to GIF', description: 'Turn a video clip into a GIF.', category: 'video' },

  { slug: '/csv/to-json', name: 'CSV to JSON', description: 'Convert a CSV file to JSON.', category: 'data' },
  { slug: '/json/to-csv', name: 'JSON to CSV', description: 'Convert a JSON file to CSV.', category: 'data' },
  { slug: '/csv/to-excel', name: 'CSV to Excel', description: 'Convert a CSV file to .xlsx.', category: 'data' },
  { slug: '/data/csv-cleaner', name: 'CSV Cleaner', description: 'Trim, dedupe, and clean CSV data.', category: 'data' },
];

export const categories = [
  { slug: 'pdf', name: 'PDF Tools' },
  { slug: 'image', name: 'Image Tools' },
  { slug: 'audio', name: 'Audio Tools' },
  { slug: 'video', name: 'Video Tools' },
  { slug: 'data', name: 'Data Tools' },
] as const;
