/** The "processing securely" panel that may show one Adsterra banner while a
 * real operation is in flight. This is NOT a gate: `run()` is already
 * executing before this module is even asked to show anything, and closing
 * or never-showing this UI never changes when the result becomes available.
 *
 * One singleton overlay element, created lazily and reused across every tool
 * page that calls `runWithProcessingUI`, so there is never more than one
 * mounted at a time and never more than one Adsterra impression per
 * operation. */

import { attachAdSlot, type AdSlotHandle } from './adsterra';

let overlayEl: HTMLElement | null = null;
let statusTextEl: HTMLElement | null = null;
let adHandle: AdSlotHandle | null = null;
let currentOperationId = 0;

function buildOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'kb-processing-overlay';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'kb-processing-title');
  // Mobile: a bottom-docked inline-feeling panel, no backdrop, doesn't cover
  // the screen. Desktop (sm+): a real centred dialog with a backdrop, capped
  // at 800px per spec, never full-viewport.
  el.className =
    'fixed inset-x-0 bottom-0 sm:inset-0 z-[60] flex items-end sm:items-center justify-center ' +
    'sm:bg-ink/30 sm:dark:bg-black/50 sm:backdrop-blur-[2px]';
  el.hidden = true;

  el.innerHTML = `
    <div class="relative w-full sm:max-w-[800px] sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-border-soft dark:border-slate-800 bg-surface dark:bg-slate-900 p-5 sm:p-8 shadow-[0_-8px_30px_rgba(16,24,47,0.12)] sm:shadow-[0_20px_60px_rgba(16,24,47,0.25)]">
      <button
        type="button"
        data-close
        aria-label="Close (processing continues in the background)"
        class="absolute right-3 top-3 sm:right-4 sm:top-4 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-app-bg dark:text-slate-500 dark:hover:bg-slate-800 transition-colors"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>

      <div class="flex items-center gap-3 pr-8">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6l7-3z"/></svg>
        </span>
        <div>
          <p id="kb-processing-title" class="font-semibold text-ink dark:text-slate-100">Processing securely on your device</p>
          <p class="text-xs text-muted dark:text-slate-500">Your file never leaves this browser.</p>
        </div>
      </div>

      <div class="mt-4">
        <div class="h-1.5 overflow-hidden rounded-full bg-app-bg dark:bg-slate-800">
          <div class="h-full w-full animate-shimmer rounded-full"></div>
        </div>
        <p data-kb-status class="mt-2 text-sm text-muted dark:text-slate-400" role="status" aria-live="polite">Working…</p>
      </div>

      <p class="mt-4 text-xs text-muted dark:text-slate-500">Processing will continue in the background if you close this.</p>

      <div data-kb-ad-wrap class="mt-4" hidden>
        <p class="mb-2 text-xs text-muted dark:text-slate-500">Kit-Bin is free to use. This advertisement helps keep the tools available.</p>
        <div class="ad-slot mx-auto max-w-[300px] text-center" data-ad-placement="processing" role="complementary" aria-label="Advertisement" hidden>
          <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted/70 dark:text-slate-500">Advertisement</p>
          <div data-ad-frame class="mx-auto flex min-h-[50px] sm:min-h-[250px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-xl border border-border-soft/70 dark:border-slate-800/70 bg-app-bg/40 dark:bg-slate-900/30"></div>
          <p class="mt-1.5 text-[11px] text-muted/70 dark:text-slate-500">Ads help keep Kit-Bin free.</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(el);

  const closeBtn = el.querySelector<HTMLButtonElement>('[data-close]');
  closeBtn?.addEventListener('click', () => hideOverlay());
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideOverlay();
  });

  return el;
}

function hideOverlay() {
  if (!overlayEl) return;
  overlayEl.hidden = true;
  adHandle?.destroy();
  adHandle = null;
}

function ensureOverlay(): HTMLElement {
  if (!overlayEl) {
    overlayEl = buildOverlay();
    statusTextEl = overlayEl.querySelector('[data-kb-status]');
  }
  return overlayEl;
}

export interface ProcessingUiHandle {
  setStatusText(text: string): void;
  /** Called once, on success or failure, to tear the overlay down. */
  finish(): void;
}

/** Wraps a single tool operation. Shows nothing for the first 250-350ms so a
 * fast operation never flashes a dialog; if the delay elapses before the
 * caller calls `finish()`, mounts the overlay (and, if ad consent is
 * granted, exactly one Adsterra banner) until `finish()` is called. */
export function beginProcessingUi(): ProcessingUiHandle {
  const operationId = ++currentOperationId;
  let shown = false;
  let latestStatus = 'Working…';

  const showTimer = window.setTimeout(() => {
    if (operationId !== currentOperationId) return; // superseded by a newer op
    const el = ensureOverlay();
    shown = true;
    el.hidden = false;
    if (statusTextEl) statusTextEl.textContent = latestStatus;

    const adWrap = el.querySelector<HTMLElement>('[data-kb-ad-wrap]');
    const adSlot = el.querySelector<HTMLElement>('[data-ad-placement="processing"]');
    if (adWrap && adSlot) {
      adHandle = attachAdSlot(adSlot, 'processing', { lazy: false });
      // attachAdSlot itself toggles `hidden` on adSlot based on consent; only
      // show the "why there's an ad" line to match, so consent-declined
      // visitors never see a dangling explanation with nothing under it.
      const sync = () => {
        adWrap.hidden = adSlot.hidden;
      };
      sync();
      const mo = new MutationObserver(sync);
      mo.observe(adSlot, { attributes: true, attributeFilter: ['hidden'] });
    }
  }, 300);

  return {
    setStatusText(text: string) {
      latestStatus = text;
      if (shown && statusTextEl) statusTextEl.textContent = text;
    },
    finish() {
      window.clearTimeout(showTimer);
      if (operationId === currentOperationId) hideOverlay();
    },
  };
}
