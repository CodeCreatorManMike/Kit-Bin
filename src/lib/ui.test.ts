import { describe, it, expect, vi } from 'vitest';
import { unzipSync } from 'fflate';
import { runBatch, type ProgressReporter } from './ui';

function file(name: string): File {
  return new File(['x'], name, { type: 'text/plain' });
}

function blobOutput(text: string, filename: string) {
  return { blob: new Blob([text], { type: 'text/plain' }), filename };
}

const noopReport: ProgressReporter = () => {};

describe('runBatch', () => {
  it('returns a single output un-zipped, not wrapped in an archive', async () => {
    const runEach = vi.fn(async (f: File) => blobOutput('content', f.name.replace('.in', '.out')));
    const result = await runBatch([file('a.in')], { accept: '*', runEach }, noopReport);

    expect(result.filename).toBe('a.out');
    expect(await result.blob.text()).toBe('content');
    expect(result.note).toBeUndefined();
  });

  it('zips multiple successful outputs and reports the count', async () => {
    const runEach = vi.fn(async (f: File) => blobOutput(f.name, f.name.replace('.in', '.out')));
    const result = await runBatch(
      [file('a.in'), file('b.in')],
      { accept: '*', runEach, batchZipName: 'batch.zip' },
      noopReport,
    );

    expect(result.filename).toBe('batch.zip');
    expect(result.note).toBe('2 files.');
    const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(Object.keys(entries).sort()).toEqual(['a.out', 'b.out']);
  });

  it('processes files strictly in order, one at a time, never concurrently', async () => {
    // Sequential processing is a deliberate constraint (heavy WASM work on a
    // phone, per the comment in ui.ts) — verify it actually holds, not just
    // that the final output looks right regardless of ordering.
    const order: string[] = [];
    const runEach = vi.fn(async (f: File) => {
      order.push(`start:${f.name}`);
      await new Promise((r) => setTimeout(r, f.name === 'slow.in' ? 20 : 0));
      order.push(`end:${f.name}`);
      return blobOutput('x', f.name);
    });
    await runBatch([file('slow.in'), file('fast.in')], { accept: '*', runEach }, noopReport);
    expect(order).toEqual(['start:slow.in', 'end:slow.in', 'start:fast.in', 'end:fast.in']);
  });

  it('skips a failing file and still zips the rest', async () => {
    const runEach = vi.fn(async (f: File) => {
      if (f.name === 'bad.in') throw new Error('corrupt');
      return blobOutput('ok', f.name.replace('.in', '.out'));
    });
    const result = await runBatch(
      [file('good1.in'), file('bad.in'), file('good2.in')],
      { accept: '*', runEach, batchZipName: 'batch.zip' },
      noopReport,
    );
    expect(result.note).toBe('2 files. 1 file skipped.');
    const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(Object.keys(entries).sort()).toEqual(['good1.out', 'good2.out']);
  });

  it('a single input that fails throws, with singular wording', async () => {
    const runEach = vi.fn(async () => { throw new Error('nope'); });
    await expect(runBatch([file('a.in')], { accept: '*', runEach }, noopReport))
      .rejects.toThrow('that file could not be processed');
  });

  it('an all-failed multi-file batch throws, with plural wording', async () => {
    const runEach = vi.fn(async () => { throw new Error('nope'); });
    await expect(runBatch([file('a.in'), file('b.in')], { accept: '*', runEach }, noopReport))
      .rejects.toThrow('none of those files could be processed');
  });

  it('a single surviving file out of a batch still gets a "skipped" note, not a zip', async () => {
    // The one-output-stays-unzipped rule and the failure-skipping rule
    // interact here: 2 in, 1 fails, 1 succeeds — the survivor should come
    // back as a plain file (not a 1-entry zip) with a note about the skip.
    const runEach = vi.fn(async (f: File) => {
      if (f.name === 'bad.in') throw new Error('corrupt');
      return blobOutput('ok', 'survivor.out');
    });
    const result = await runBatch([file('bad.in'), file('good.in')], { accept: '*', runEach }, noopReport);
    expect(result.filename).toBe('survivor.out');
    expect(result.note).toBe('1 file skipped.');
  });

  it('prefixes progress messages with "File N of M" only when batching', async () => {
    const seen: string[] = [];
    const runEach = vi.fn(async (f: File, report: ProgressReporter) => {
      report('working');
      return blobOutput('x', f.name);
    });
    const report: ProgressReporter = (m) => seen.push(m);

    await runBatch([file('solo.in')], { accept: '*', runEach }, report);
    expect(seen).toEqual(['working']); // no "File 1 of 1" clutter for a single file

    seen.length = 0;
    await runBatch([file('a.in'), file('b.in')], { accept: '*', runEach }, report);
    expect(seen).toEqual(['File 1 of 2: working', 'File 2 of 2: working', 'Packaging your files…']);
  });
});
