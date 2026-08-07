import { optimize } from 'svgo/browser';

/** Optimizes SVG markup locally. SVGO does not upload or fetch the input file. */
export async function optimizeSvg(file: File): Promise<Blob> {
  const source = await file.text();
  const result = optimize(source, {
    multipass: true,
    js2svg: { pretty: false },
  });

  return new Blob([result.data], { type: 'image/svg+xml;charset=utf-8' });
}
