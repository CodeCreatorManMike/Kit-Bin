export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: 'pdf' | 'image' | 'audio';
}

export const tools: Tool[] = [
  { slug: '/pdf/merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', category: 'pdf' },
  { slug: '/pdf/split', name: 'Split PDF', description: 'Split a PDF into individual pages.', category: 'pdf' },
  { slug: '/pdf/compress', name: 'Compress PDF', description: "Shrink a PDF's file size.", category: 'pdf' },
  { slug: '/image/heic-to-jpg', name: 'HEIC to JPG', description: 'Convert iPhone photos to JPG.', category: 'image' },
  { slug: '/image/compress', name: 'Compress Image', description: "Shrink an image's file size.", category: 'image' },
  { slug: '/image/resize', name: 'Resize Image', description: 'Resize an image to a target width.', category: 'image' },
  { slug: '/audio/mp3-to-wav', name: 'MP3 to WAV', description: 'Convert MP3 audio to WAV.', category: 'audio' },
];

export const categories = [
  { slug: 'pdf', name: 'PDF Tools' },
  { slug: 'image', name: 'Image Tools' },
  { slug: 'audio', name: 'Audio Tools' },
] as const;
