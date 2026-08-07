/** Mandatory pre-download ad gate.
 *
 * Explicit product decision, requested directly by the site owner: unlike
 * the processing-state overlay (which is purely opportunistic and never
 * delays the actual file becoming ready), this DOES delay when the user is
 * allowed to click the download button, by a fixed 15 seconds, with a
 * visible countdown and a plain-language reason why.
 *
 * What it does NOT do: delay the file itself. `run()` in ui.ts has already
 * completed and the blob/filename/note are already set on the download link
 * via `showResult()` by the time this is called. This only paints a
 * temporary overlay on top of the already-populated result panel and
 * removes it after the countdown, or immediately if the user has not
 * granted ad consent, because declining ads must never cost someone their
 * download. */

import { attachAdSlot, type AdSlotHandle } from './adsterra';
import { getAdConsent } from './consent';

const COUNTDOWN_SECONDS = 15;

let activeIntervalId: number | null = null;
let activeAdHandle: AdSlotHandle | null = null;
let activeOverlay: HTMLElement | null = null;

/** Cancels any in-progress gate immediately: clears the timer, tears down its
 * ad slot, and removes the overlay. Safe to call when no gate is active.
 * Called by ui.ts's `reset()` so starting a new file doesn't leave a stray
 * countdown running against a hidden panel. */
export function cancelActiveDownloadGate(): void {
  if (activeIntervalId !== null) {
    window.clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
  activeAdHandle?.destroy();
  activeAdHandle = null;
  activeOverlay?.remove();
  activeOverlay = null;
}

/** Paints a 15-second countdown overlay on top of `resultEl` (the tool's
 * already-visible, already-populated result panel) and removes it when the
 * countdown ends. No-ops entirely if ad consent has not been granted. */
export function maybeGateDownload(resultEl: HTMLElement): void {
  cancelActiveDownloadGate();

  if (getAdConsent() !== 'granted') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resultEl.classList.add('relative');

  const overlay = document.createElement('div');
  overlay.className =
    'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface dark:bg-slate-900 p-6 text-center';
  overlay.innerHTML = `
    <p class="font-semibold text-ink dark:text-slate-100">Your file is ready</p>
    <p class="max-w-xs text-xs text-muted dark:text-slate-500">
      Kit-Bin is free to use. Watching this short ad is how we keep it that way.
    </p>
    <div class="ad-slot mx-auto max-w-[300px] text-center" data-ad-placement="download-gate" role="complementary" aria-label="Advertisement" hidden>
      <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted/70 dark:text-slate-500">Advertisement</p>
      <div data-ad-frame class="mx-auto flex min-h-[50px] sm:min-h-[250px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-xl border border-border-soft/70 dark:border-slate-800/70 bg-app-bg/40 dark:bg-slate-900/30"></div>
      <p class="mt-1.5 text-[11px] text-muted/70 dark:text-slate-500">Ads help keep Kit-Bin free.</p>
    </div>
    <div class="mt-1 w-full max-w-[300px]">
      <div class="h-1.5 overflow-hidden rounded-full bg-app-bg dark:bg-slate-800">
        <div data-gate-bar class="h-full rounded-full bg-gradient-to-r from-primary to-violet-500${reduceMotion ? '' : ' transition-[width] duration-1000 ease-linear'}" style="width:0%"></div>
      </div>
      <p data-gate-text class="mt-2 text-sm text-muted dark:text-slate-400" role="status" aria-live="polite">Your download unlocks in ${COUNTDOWN_SECONDS}s…</p>
    </div>
  `;
  resultEl.insertBefore(overlay, resultEl.firstChild);
  activeOverlay = overlay;

  const adSlot = overlay.querySelector<HTMLElement>('[data-ad-placement="download-gate"]');
  activeAdHandle = adSlot ? attachAdSlot(adSlot, 'download-gate', { lazy: false }) : null;

  const bar = overlay.querySelector<HTMLElement>('[data-gate-bar]');
  const text = overlay.querySelector<HTMLElement>('[data-gate-text]');

  let remaining = COUNTDOWN_SECONDS;
  activeIntervalId = window.setInterval(() => {
    remaining -= 1;
    const percentDone = Math.round(((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * 100);
    if (bar) bar.style.width = `${percentDone}%`;

    if (remaining > 0) {
      if (text) text.textContent = `Your download unlocks in ${remaining}s…`;
      return;
    }

    if (activeIntervalId !== null) window.clearInterval(activeIntervalId);
    activeIntervalId = null;
    activeAdHandle?.destroy();
    activeAdHandle = null;
    overlay.remove();
    if (activeOverlay === overlay) activeOverlay = null;
  }, 1000);
}
