/** Shared Adsterra loading logic, used by both the static page-level
 * `<AdsterraBanner>` component and the dynamically-created processing-state
 * ad slot in `ui.ts`. One code path so "pick a size once, never duplicate,
 * respect consent, clean up on teardown" only has to be gotten right once.
 *
 * The actual Adsterra script/keys never run in the main document: each size
 * is an isolated static HTML document under /adsterra/, loaded through a
 * sandboxed iframe with a fixed, non-negotiable width/height. Nothing about
 * the file being processed (name, bytes, blob URL, settings) is ever
 * reachable from here, because this module never touches File/Blob objects
 * at all, only DOM containers and a placement label string. */

import { getAdConsent, onAdConsentChange } from './consent';

const DESKTOP_BREAKPOINT = 768;

interface AdSize {
  width: number;
  height: number;
  src: string;
}

const DESKTOP: AdSize = { width: 728, height: 90, src: '/adsterra/728x90.html' };
const MOBILE: AdSize = { width: 320, height: 50, src: '/adsterra/320x50.html' };

function pickSize(): AdSize {
  // Decided once per mount, from the viewport at that moment. Per spec this
  // is intentionally NOT re-evaluated on resize/rotation until the next
  // navigation or the next processing operation creates a fresh slot.
  return window.innerWidth >= DESKTOP_BREAKPOINT ? DESKTOP : MOBILE;
}

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
    const size = pickSize();
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
    // No allow-same-origin: the ad document cannot read this page, cannot
    // reach localStorage/cookies on kit-bin.com, and cannot walk window.parent.
    el.setAttribute(
      'sandbox',
      'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
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
export function attachAdSlot(root: HTMLElement, placement: string, opts: { lazy?: boolean } = {}): AdSlotHandle {
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
