/** Shared static-banner loading logic, used by the page-level `<AdBanner>`
 * component and the processing-state ad slot. One code path so "pick a
 * size, never duplicate, respect consent, clean up on teardown" only has to
 * be gotten right once.
 *
 * Ad network: HilltopAds banner zone #7350761. The actual script never runs
 * in the main document: it is an isolated static HTML document under
 * /banner-ad/, loaded through an iframe with a fixed, non-negotiable
 * width/height. Nothing about the file being processed (name, bytes, blob
 * URL, settings) is ever reachable from here, because this module never
 * touches File/Blob objects at all, only DOM containers and a placement
 * label string.
 *
 * Only one creative size was issued for this zone (300x250), so unlike the
 * old multi-size setup every placement — including the old leaderboard/
 * skyscraper/mobile-banner slots — now renders this same 300x250 unit,
 * centered in its container. It reads fine at every one of the old
 * placements and on both desktop and mobile viewports.
 *
 * Sandbox note: `allow-same-origin` is included so the ad's own script can
 * build its creative markup inside the framed document. Since the framed
 * document is served from this same origin, that trades away the "opaque
 * origin" isolation (the ad script could, in principle, reach
 * `window.parent` and read this site's localStorage/DOM) in exchange for
 * working ads. This is the standard, unavoidable tradeoff for embedding any
 * same-origin-hosted third-party ad script; genuine isolation would require
 * serving these frame documents from a separate subdomain, which is a real
 * option if this needs revisiting later. localStorage on this site never
 * holds file data (only theme, favorites, and the ad-consent flag), so the
 * realistic exposure is limited to those, not to anything a user processes
 * here. */

import { getAdConsent, onAdConsentChange } from './consent';

export interface AdSize {
  width: number;
  height: number;
  src: string;
}

/** The single creative size issued for this HilltopAds banner zone. The key
 * itself lives only in the static file under public/banner-ad/ (never in
 * JS), matching the exact snippet HilltopAds generated. This only needs to
 * agree with it on width/height/filename. */
export const BANNER_SIZE: AdSize = { width: 300, height: 250, src: '/banner-ad/300x250.html' };

/** Kept for call-site compatibility with the old multi-size setup; every
 * variant now resolves to the same banner creative (see file header). */
export type AdVariant = 'leaderboard' | 'sidebar' | 'auto';

export interface AdSlotHandle {
  destroy(): void;
}

const liveSlots = new Set<() => void>();

/** Mounts (or, if consent is absent, deliberately does not mount) an ad into
 * `frameHost`. `frameHost` should be an otherwise-empty container; this
 * function only ever adds/removes a single iframe inside it, it never reads
 * or writes anything else in the page. */
function mountInto(frameHost: HTMLElement, placement: string, lazy: boolean): () => void {
  let iframe: HTMLIFrameElement | null = null;
  let observer: IntersectionObserver | null = null;
  let cancelled = false;

  const create = () => {
    if (cancelled || iframe) return;
    const el = document.createElement('iframe');
    el.src = BANNER_SIZE.src;
    el.width = String(BANNER_SIZE.width);
    el.height = String(BANNER_SIZE.height);
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
  const frameHost = root.querySelector<HTMLElement>('[data-ad-frame]');
  if (!frameHost) {
    return { destroy() {} };
  }

  let teardownFrame: (() => void) | null = null;

  const show = () => {
    if (teardownFrame) return; // already mounted
    root.hidden = false;
    teardownFrame = mountInto(frameHost, placement, lazy);
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
