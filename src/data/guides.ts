export interface Guide {
  slug: string;
  title: string;
  cardTitle: string;
  description: string;
}

export const guides: Guide[] = [
  {
    slug: '/guides/how-kit-bin-works',
    title: 'How Kit-Bin Works',
    cardTitle: 'How Kit-Bin Works',
    description: 'What actually happens when you use a tool here, and why your file never leaves your device.',
  },
  {
    slug: '/guides/heic-explained',
    title: "Why Won't My iPhone Photos Open on Windows?",
    cardTitle: "Why Your iPhone Photos Won't Open on Windows",
    description: "HEIC, explained properly — why Apple uses it, why Windows doesn't, and when to convert.",
  },
  {
    slug: '/guides/why-pdfs-get-large',
    title: 'Why Is My PDF So Big?',
    cardTitle: 'Why Your PDF Is So Big (and What Compression Actually Does)',
    description: 'The real reasons PDFs balloon in size, and what a compressor is actually changing.',
  },
  {
    slug: '/guides/webp-vs-png-jpg',
    title: 'WebP vs PNG vs JPG: What the Difference Actually Costs You',
    cardTitle: 'WebP vs PNG vs JPG: What the Difference Actually Costs You',
    description: 'A real technical comparison, not a listicle — when each format genuinely wins.',
  },
  {
    slug: '/guides/why-audio-sounds-quiet',
    title: 'Why Does My Audio Sound Quiet No Matter How High You Turn It Up?',
    cardTitle: 'Why Some Videos Sound Quiet No Matter How High You Turn the Volume',
    description: 'The difference between peak volume and perceived loudness, and why turning it up doesn’t fix it.',
  },
  {
    slug: '/guides/mp4-vs-webm',
    title: 'MP4 vs WebM: Which One Should You Actually Use?',
    cardTitle: 'MP4 vs WebM: Which One Should You Actually Use',
    description: 'Two containers, different codecs inside, and a real answer for which one you need.',
  },
  {
    slug: '/guides/why-csv-imports-fail',
    title: 'Why CSV Imports Fail: Delimiters, Quotes, Encoding and Broken Rows',
    cardTitle: 'Why CSV Imports Fail',
    description: 'The specific, diagnosable reasons a CSV rejects on import — and which ones a cleaner tool can and can\'t fix.',
  },
  {
    slug: '/guides/compression-vs-resizing',
    title: 'Image Compression vs Resizing: Which One Makes a File Smaller?',
    cardTitle: 'Compression vs Resizing',
    description: 'Two different operations that both shrink a file, and why picking the wrong one wastes the other\'s benefit.',
  },
];
