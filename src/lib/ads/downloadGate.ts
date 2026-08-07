/** Mandatory pre-download ad gate.
 *
 * Explicit product decision, requested directly by the site owner: unlike
 * the processing-state overlay (which is purely opportunistic and never
 * delays the actual file becoming ready), this DOES delay when the user is
 * allowed to click the download button, by a fixed 15 seconds, with a
 * visible countdown and a plain-language reason why.
 *
 * The ad shown here is a real HilltopAds VAST video ad, played directly (see
 * `hilltopVast.ts` for why — Google's IMA SDK rejects this network's VAST
 * output) — this is a deliberate, separate choice from the Adsterra static
 * banners used everywhere else on the site (homepage/hub/tool-page banners,
 * the processing-state overlay). Do not reuse `attachAdSlot`/Adsterra here,
 * and do not reuse `playVastAd` anywhere else — the two ad systems are
 * intentionally kept apart.
 *
 * What it does NOT do: delay the file itself. `run()` in ui.ts has already
 * completed and the blob/filename/note are already set on the download link
 * via `showResult()` by the time this is called. This only paints a
 * temporary overlay on top of the already-populated result panel and
 * removes it after the countdown, or immediately if the user has not
 * granted ad consent, because declining ads must never cost someone their
 * download.
 *
 * The 15-second wait is a fixed wall-clock timer, independent of the video
 * ad's own length or whether it finishes, errors, or has no fill — the ad
 * plays alongside the countdown, but the countdown alone decides when the
 * download unlocks, so a slow/broken/absent ad response never traps a user
 * behind their own finished file. */

import { playVastAd, type VastPlaybackHandle } from './hilltopVast';
import { getAdConsent } from './consent';

const COUNTDOWN_SECONDS = 15;

let activeIntervalId: number | null = null;
let activeAdHandle: VastPlaybackHandle | null = null;
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
  // Not `inset-0`: that clamps the overlay to resultEl's own natural height
  // (the small "Done" card underneath), clipping anything taller — this
  // content (heading + video + progress bar) reliably exceeds that height,
  // especially on mobile. Positioning from the top with an intrinsic height
  // instead means the overlay is exactly as tall as it needs to be, and
  // z-10 still keeps it covering the shorter content (and the download
  // button) beneath it the whole time it's showing.
  overlay.className =
    'absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-3 rounded-2xl bg-surface dark:bg-slate-900 p-5 sm:p-6 text-center';
  overlay.innerHTML = `
    <p class="font-semibold text-ink dark:text-slate-100">Your file is ready</p>
    <p class="max-w-xs text-sm text-muted dark:text-slate-500">
      Kit-Bin is free to use. Watching this short ad is how we keep it that way.
    </p>
    <div class="mx-auto w-full max-w-[400px]">
      <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted/70 dark:text-slate-500">Advertisement</p>
      <div data-video-ad-frame class="relative mx-auto aspect-video w-full overflow-hidden rounded-xl border border-border-soft/70 dark:border-slate-800/70 bg-black"></div>
    </div>
    <div class="mt-1 w-full max-w-[400px]">
      <div class="h-1.5 overflow-hidden rounded-full bg-app-bg dark:bg-slate-800">
        <div data-gate-bar class="h-full rounded-full bg-gradient-to-r from-primary to-violet-500${reduceMotion ? '' : ' transition-[width] duration-1000 ease-linear'}" style="width:0%"></div>
      </div>
      <p data-gate-text class="mt-2 text-sm text-muted dark:text-slate-400" role="status" aria-live="polite">Your download unlocks in ${COUNTDOWN_SECONDS}s…</p>
    </div>
  `;
  resultEl.insertBefore(overlay, resultEl.firstChild);
  activeOverlay = overlay;

  const videoFrame = overlay.querySelector<HTMLElement>('[data-video-ad-frame]');
  if (videoFrame) {
    playVastAd(videoFrame, {
      onProgress: () => {
        // The 15s countdown below is the sole unlock authority — this
        // callback exists for a future "hide the frame once the ad itself
        // finishes" enhancement, not to change the wait length.
      },
      onDone: () => {
        // Ad finished, errored, or had no fill — leave the frame as-is
        // (IMA shows its own end/error state); the countdown below is what
        // actually unlocks the download regardless.
      },
    })
      .then((handle) => {
        activeAdHandle = handle;
      })
      .catch(() => {
        // SDK failed to load entirely (network/blocked) — the countdown
        // still runs and the download still unlocks on schedule.
      });
  }

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
