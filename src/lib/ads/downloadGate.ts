/** Mandatory pre-download ad gate.
 *
 * Explicit product decision, requested directly by the site owner: unlike
 * the processing-state overlay (which is purely opportunistic and never
 * delays the actual file becoming ready), this DOES delay when the user is
 * allowed to click the download button, by a fixed 10 seconds, with a
 * visible gradient countdown ring and a plain-language reason why.
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
 * The 10-second wait is a fixed wall-clock timer, independent of the video
 * ad's own length or whether it finishes, errors, or has no fill — the ad
 * plays alongside the countdown, but the countdown alone decides when the
 * download unlocks, so a slow/broken/absent ad response never traps a user
 * behind their own finished file. */

import { playVastAd, type VastPlaybackHandle } from './hilltopVast';
import { getAdConsent } from './consent';

const COUNTDOWN_SECONDS = 10;
// SVG circle circumference for r=26 (2 * PI * 26), used to animate the
// gradient countdown ring via stroke-dashoffset.
const RING_CIRCUMFERENCE = 2 * Math.PI * 26;

let activeIntervalId: number | null = null;
let activeAdHandle: VastPlaybackHandle | null = null;
let activeOverlay: HTMLElement | null = null;
let activeResultElement: HTMLElement | null = null;

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
  if (activeResultElement) activeResultElement.style.minHeight = '';
  activeResultElement = null;
  activeOverlay?.remove();
  activeOverlay = null;
}

/** Paints a 10-second countdown overlay on top of `resultEl` (the tool's
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
    <div class="relative mx-auto w-full max-w-[min(94vw,640px)]">
      <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted/70 dark:text-slate-500">Advertisement</p>
      <div data-video-ad-frame class="relative mx-auto flex h-[min(65vh,560px)] min-h-[420px] sm:min-h-[500px] w-full items-center justify-center overflow-hidden rounded-xl border border-border-soft/70 dark:border-slate-800/70 bg-black"></div>
      <div class="pointer-events-none absolute right-3 top-9 z-20 drop-shadow-lg">
        <svg width="60" height="60" viewBox="0 0 60 60" role="status" aria-live="polite" aria-label="Download unlocks in ${COUNTDOWN_SECONDS} seconds">
          <defs>
            <linearGradient id="gate-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--color-primary, #6366f1)" />
              <stop offset="100%" stop-color="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx="30" cy="30" r="26" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.25)" stroke-width="3" />
          <circle
            data-ring-progress
            cx="30" cy="30" r="26"
            fill="none"
            stroke="url(#gate-ring-gradient)"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-dasharray="${RING_CIRCUMFERENCE}"
            stroke-dashoffset="0"
            transform="rotate(-90 30 30)"
            ${reduceMotion ? '' : 'style="transition: stroke-dashoffset 1s linear;"'}
          />
          <text data-ring-text x="30" y="35" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">${COUNTDOWN_SECONDS}</text>
        </svg>
      </div>
    </div>
    <p data-gate-text class="text-sm text-muted dark:text-slate-400" role="status" aria-live="polite">Your download unlocks in ${COUNTDOWN_SECONDS}s…</p>
  `;
  resultEl.insertBefore(overlay, resultEl.firstChild);
  activeOverlay = overlay;
  activeResultElement = resultEl;
  resultEl.style.minHeight = `${Math.ceil(overlay.getBoundingClientRect().height)}px`;

  const videoFrame = overlay.querySelector<HTMLElement>('[data-video-ad-frame]');
  if (videoFrame) {
    playVastAd(videoFrame, {
      onProgress: () => {
        // The 10s countdown ring is the sole unlock authority — this
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

  const ringProgress = overlay.querySelector<SVGCircleElement>('[data-ring-progress]');
  const ringText = overlay.querySelector<SVGTextElement>('[data-ring-text]');
  const text = overlay.querySelector<HTMLElement>('[data-gate-text]');

  let remaining = COUNTDOWN_SECONDS;
  activeIntervalId = window.setInterval(() => {
    remaining -= 1;
    const elapsedFraction = (COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS;
    if (ringProgress) ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * elapsedFraction);
    if (ringText) ringText.textContent = String(Math.max(remaining, 0));

    if (remaining > 0) {
      if (text) text.textContent = `Your download unlocks in ${remaining}s…`;
      return;
    }

    if (activeIntervalId !== null) window.clearInterval(activeIntervalId);
    activeIntervalId = null;
    activeAdHandle?.destroy();
    activeAdHandle = null;
    resultEl.style.minHeight = '';
    activeResultElement = null;
    overlay.remove();
    if (activeOverlay === overlay) activeOverlay = null;
  }, 1000);
}
