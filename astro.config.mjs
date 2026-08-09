// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://kit-bin.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // `phonemizer` (kokoro-js's dependency for /audio/text-to-speech) bundles
    // an emscripten espeak-ng module. Vite's default esbuild dep pre-bundling
    // mangles its internal Promise wiring so `list_voices()`/`phonemize()`
    // silently resolve with no data — the unbundled module works fine.
    optimizeDeps: {
      exclude: ['phonemizer', 'kokoro-js']
    }
  }
});