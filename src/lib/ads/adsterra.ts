/** Shared Adsterra loading logic, used by the static page-level
 * `<AdsterraBanner>` component, the processing-state ad slot, and the
 * post-processing download-gate ad slot. One code path so "pick a size,
 * never duplicate, respect consent, clean up on teardown" only has to be
 * gotten right once.
 *
 * The actual Adsterra script/keys never run in the main document: each size
 * is an isolated static HTML document under /adsterra/, loaded through an
 * iframe with a fixed, non-negotiable width/height. Nothing about the file
 * being processed (name, bytes, blob URL, settings) is ever reachable from
 * here, because this module never touches File/Blob objects at all, only DOM
 * containers and a placement label string.
 *
 * Sandbox note: earlier this shipped WITHOUT `allow-same-origin`, which is
 * the more isolated choice, but it silently broke Adsterra's own creative
 * injection (their invoke.js builds a nested iframe and that nested frame
 * does not reliably inherit sandbox exceptions without it). Confirmed via a
 * direct A/B test: the frame document renders a real ad when loaded as a
 * top-level page, but rendered blank when embedded with the stricter
 * sandbox. `allow-same-origin` is now included so the ad actually renders.
 * Since the framed document is served from this same origin, that trades
 * away the "opaque origin" isolation (the ad script could, in principle,
 * reach `window.parent` and read this site's localStorage/DOM) in exchange
 * for working ads. This is the standard, unavoidable tradeoff for embedding
 * any same-origin-hosted third-party ad script; genuine isolation would
 * require serving these frame documents from a separate subdomain, which is
 * a real option if this needs revisiting later. localStorage on this site
 * never holds file data (only theme, favorites, and the ad-consent flag), so
 * the realistic exposure is limited to those, not to anything a user
 * processes here. */

import { getAdConsent, onAdConsentChange } from './consent';

const DESKTOP_BREAKPOINT = 768;

export interface AdSize {
  width: number;
  height: number;
  src: string;
}

/** Every unit Adsterra has issued a key for. Keys themselves live only in
 * the four static files under public/adsterra/ (never in JS), matching the
 * exact snippets Adsterra generated. This map only needs to agree with them
 * on width/height/filename. */
export const AD_SIZES = {
  /** Top-of-page desktop leaderboard. Homepage and category hub pages only. */
  leaderboard: { width: 728, height: 90, src: '/adsterra/728x90.html' } satisfies AdSize,
  /** Every mobile viewport, regardless of placement. */
  mobileBanner: { width: 320, height: 50, src: '/adsterra/320x50.html' } satisfies AdSize,
  /** Default/fallback: highest fill rate, fits any placement that isn't a
   * top-of-page leaderboard or a real page sidebar. */
  rectangle: { width: 300, height: 250, src: '/adsterra/300x250.html' } satisfies AdSize,
  /** Desktop sidebar only. Kit-Bin's layout doesn't currently have a real
   * page sidebar slot (every ad placement here is an inline content banner),
   * so this is wired and ready but has no live placement yet. Do not force
   * a sidebar into the layout just to use this size. */
  skyscraper: { width: 160, height: 600, src: '/adsterra/160x600.html' } satisfies AdSize,
} as const;

/** 'leaderboard' for the homepage/hub top-of-page slot, 'sidebar' for a real
 * page sidebar (none exist yet), 'auto' (default) for everywhere else. */
export type AdVariant = 'leaderboard' | 'sidebar' | 'auto';

function pickSize(variant: AdVariant): AdSize {
  // Decided once per mount, from the viewport at that moment. Per spec this
  // is intentionally NOT re-evaluated on resize/rotation until the next
  // navigation or the next processing/download-gate operation creates a
  // fresh slot.
  if (window.innerWidth < DESKTOP_BREAKPOINT) return AD_SIZES.mobileBanner;
  if (variant === 'leaderboard') return AD_SIZES.leaderboard;
  if (variant === 'sidebar') return AD_SIZES.skyscraper;
  return AD_SIZES.rectangle;
}

export interface AdSlotHandle {
  destroy(): void;
}

const liveSlots = new Set<() => void>();

/** Mounts (or, if consent is absent, deliberately does not mount) an ad into
 * `frameHost`. `frameHost` should be an otherwise-empty container; this
 * function only ever adds/removes a single iframe inside it, it never reads
 * or writes anything else in the page. */
function mountInto(frameHost: HTMLElement, placement: string, variant: AdVariant, lazy: boolean): () => void {
  let iframe: HTMLIFrameElement | null = null;
  let observer: IntersectionObserver | null = null;
  let cancelled = false;

  const create = () => {
    if (cancelled || iframe) return;
    const size = pickSize(variant);
    const el = document.createElement('iframe');
    el.src = size.src;
    el.width = String(size.width);
    el.height = String(size.height);
    el.title = `Advertisement (${placement})`;
    el.loading = lazy ? 'lazy' : 'eager';
    el.setAttribute('scrolling', 'no');
    el.style.border = '0';
    el.style.display = 'block';
    el.style.maxWidth = '100%';
    el.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
    );
    frameHost.appendChild(el);
    iframe = el;
  };

  if (lazy && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          create();
          observer?.disconnect();
          observer = null;
        }
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(frameHost);
  } else {
    create();
  }

  return () => {
    cancelled = true;
    observer?.disconnect();
    observer = null;
    iframe?.remove();
    iframe = null;
  };
}

/** Attaches an ad slot to a page element that already has the label/wrapper
 * markup and a `[data-ad-frame]` child. No-ops (and stays no-op) until
 * consent is granted; unmounts immediately if consent is denied/withdrawn.
 * Safe to call once per slot; calling it twice on the same element is a bug
 * in the caller, not something this function tries to guard against, since
 * every current call site only ever calls it once. */
export function attachAdSlot(
  root: HTMLElement,
  placement: string,
  opts: { lazy?: boolean; variant?: AdVariant } = {},
): AdSlotHandle {
  const lazy = opts.lazy ?? true;
  const variant = opts.variant ?? 'auto';
  const frameHost = root.querySelector<HTMLElement>('[data-ad-frame]');
  if (!frameHost) {
    return { destroy() {} };
  }

  let teardownFrame: (() => void) | null = null;

  const show = () => {
    if (teardownFrame) return; // already mounted
    root.hidden = false;
    teardownFrame = mountInto(frameHost, placement, variant, lazy);
  };

  const hide = () => {
    teardownFrame?.();
    teardownFrame = null;
    root.hidden = true;
  };

  if (getAdConsent() === 'granted') show();
  else hide();

  const unsubscribe = onAdConsentChange((consent) => {
    if (consent === 'granted') show();
    else hide();
  });

  const destroy = () => {
    hide();
    unsubscribe();
    liveSlots.delete(destroy);
  };
  liveSlots.add(destroy);

  return { destroy };
}

/** Tears down every ad slot currently mounted anywhere on the page. Called
 * when consent is withdrawn via the settings control, on top of each slot's
 * own consent-change listener, so withdrawal is immediate even for slots that
 * (for whatever reason) missed the event. */
export function destroyAllAdSlots(): void {
  for (const destroy of Array.from(liveSlots)) destroy();
}
