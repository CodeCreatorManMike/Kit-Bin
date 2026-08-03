export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: 'pdf' | 'image' | 'audio' | 'video' | 'data';
  icon: string;
}

export const tools: Tool[] = [
  { slug: '/pdf/merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', category: 'pdf', icon: '/icons/pdf/merge-pdf.png' },
  { slug: '/pdf/split', name: 'Split PDF', description: 'Split a PDF into individual pages.', category: 'pdf', icon: '/icons/pdf/split-pdf.png' },
  { slug: '/pdf/compress', name: 'Compress PDF', description: "Shrink a PDF's file size.", category: 'pdf', icon: '/icons/pdf/compress-pdf.png' },
  { slug: '/pdf/rotate', name: 'Rotate PDF', description: 'Rotate every page in a PDF.', category: 'pdf', icon: '/icons/pdf/rotate-pdf.png' },
  { slug: '/pdf/to-images', name: 'PDF to Images', description: 'Convert PDF pages to PNG images.', category: 'pdf', icon: '/icons/pdf/pdf-to-image.png' },
  { slug: '/pdf/watermark', name: 'Watermark PDF', description: 'Stamp a text watermark on every page.', category: 'pdf', icon: '/icons/pdf/watermark-pdf.png' },
  { slug: '/pdf/reorder-pages', name: 'Reorder PDF Pages', description: 'Change the order of pages in a PDF.', category: 'pdf', icon: '/icons/pdf/reorder-pages.png' },

  { slug: '/image/heic-to-jpg', name: 'HEIC to JPG', description: 'Convert iPhone photos to JPG.', category: 'image', icon: '/icons/image/heic-to-jpg.png' },
  { slug: '/image/compress', name: 'Compress Image', description: "Shrink an image's file size.", category: 'image', icon: '/icons/image/compress-image.png' },
  { slug: '/image/resize', name: 'Resize Image', description: 'Resize an image to a target width.', category: 'image', icon: '/icons/image/resize-image.png' },
  { slug: '/image/webp-to-png', name: 'WebP to PNG', description: 'Convert WebP images to PNG.', category: 'image', icon: '/icons/image/webp-to-png.png' },
  { slug: '/image/png-to-webp', name: 'PNG to WebP', description: 'Convert PNG images to WebP.', category: 'image', icon: '/icons/image/png-to-webp.png' },
  { slug: '/image/svg-to-png', name: 'SVG to PNG', description: 'Rasterize an SVG to PNG.', category: 'image', icon: '/icons/image/svg-to-png.png' },
  { slug: '/image/crop', name: 'Crop Image', description: 'Crop an image to a custom selection.', category: 'image', icon: '/icons/image/crop-image.png' },

  { slug: '/audio/mp3-to-wav', name: 'MP3 to WAV', description: 'Convert MP3 audio to WAV.', category: 'audio', icon: '/icons/audio/mp3-to-wav.png' },
  { slug: '/audio/wav-to-mp3', name: 'WAV to MP3', description: 'Convert WAV audio to MP3.', category: 'audio', icon: '/icons/audio/wav-to-mp3.png' },
  { slug: '/audio/trim', name: 'Trim Audio', description: 'Cut audio to a start and end time.', category: 'audio', icon: '/icons/audio/trim-audio.png' },
  { slug: '/audio/merge', name: 'Merge Audio', description: 'Combine multiple audio files into one.', category: 'audio', icon: '/icons/audio/merge-audio.png' },
  { slug: '/audio/volume-normalize', name: 'Normalize Volume', description: "Even out an audio file's volume.", category: 'audio', icon: '/icons/audio/normalize-volume.png' },

  { slug: '/video/mp4-to-webm', name: 'MP4 to WebM', description: 'Convert MP4 video to WebM.', category: 'video', icon: '/icons/video/mp4-to-webm.png' },
  { slug: '/video/compress', name: 'Compress Video', description: "Shrink a video's file size.", category: 'video', icon: '/icons/video/compress-video.png' },
  { slug: '/video/trim', name: 'Trim Video', description: 'Cut video to a start and end time.', category: 'video', icon: '/icons/video/trim-video.png' },
  { slug: '/video/mute', name: 'Mute Video', description: 'Remove the audio track from a video.', category: 'video', icon: '/icons/video/mute-video.png' },
  { slug: '/video/extract-audio', name: 'Extract Audio', description: 'Pull the audio track out of a video.', category: 'video', icon: '/icons/video/extract-audio.png' },
  { slug: '/video/gif-from-video', name: 'Video to GIF', description: 'Turn a video clip into a GIF.', category: 'video', icon: '/icons/video/video-to-gif.png' },

  { slug: '/csv/to-json', name: 'CSV to JSON', description: 'Convert a CSV file to JSON.', category: 'data', icon: '/icons/data/csv-to-json.png' },
  { slug: '/json/to-csv', name: 'JSON to CSV', description: 'Convert a JSON file to CSV.', category: 'data', icon: '/icons/data/json-to-csv.png' },
  { slug: '/csv/to-excel', name: 'CSV to Excel', description: 'Convert a CSV file to .xlsx.', category: 'data', icon: '/icons/data/csv-to-excel.png' },
  { slug: '/data/csv-cleaner', name: 'CSV Cleaner', description: 'Trim, dedupe, and clean CSV data.', category: 'data', icon: '/icons/data/csv-cleaner.png' },
];

export const categories = [
  { slug: 'pdf', name: 'PDF Tools' },
  { slug: 'image', name: 'Image Tools' },
  { slug: 'audio', name: 'Audio Tools' },
  { slug: 'video', name: 'Video Tools' },
  { slug: 'data', name: 'Data Tools' },
] as const;
