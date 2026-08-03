/// <reference types="astro/client" />

declare module 'gifenc' {
  export function GIFEncoder(): {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: { palette?: number[][]; delay?: number }): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors: number, opts?: object): number[][];
  export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: number[][], format?: string): Uint8Array;
}

declare module 'libheif-js/wasm-bundle' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(imageData: ImageData, callback: (data: ImageData | null) => void): void;
  }
  interface HeifDecoder {
    decode(buffer: Uint8Array): HeifImage[];
  }
  const libheif: { HeifDecoder: new () => HeifDecoder };
  export default libheif;
}

declare module 'qpdf-wasm' {
  interface QpdfFS {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
  }
  interface QpdfModule {
    FS: QpdfFS;
    callMain(args: string[]): number;
  }
  export default function init(moduleArg?: Record<string, unknown>): Promise<QpdfModule>;
}
