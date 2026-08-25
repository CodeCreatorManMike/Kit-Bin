/** Advertising-consent state, independent of the Google-Funding-Choices CMP
 * wired through ADSENSE_CMP_CONFIGURED (that gate only applies once AdSense
 * itself goes live). The HilltopAds banner ships today, so it needs its own first-party
 * consent flag, following the same localStorage-flag pattern as `kitbin:theme`.
 *
 * Storage: 'kitbin:ad-consent' = 'granted' | 'denied'. Absent means "not yet
 * asked" and must be treated as no-consent (no ad request of any kind). */

export type AdConsent = 'granted' | 'denied' | null;

const STORAGE_KEY = 'kitbin:ad-consent';
export const AD_CONSENT_CHANGED_EVENT = 'kitbin:ad-consent-changed';

export function getAdConsent(): AdConsent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setAdConsent(value: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode, disabled storage). Consent then only
    // holds for this page view; every fresh load is treated as unanswered,
    // which is the safe direction to fail in.
  }
  window.dispatchEvent(new CustomEvent<AdConsent>(AD_CONSENT_CHANGED_EVENT, { detail: value }));
}

/** Clears the stored choice so the banner reappears. Used by "manage consent". */
export function resetAdConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same fallback as above.
  }
  window.dispatchEvent(new CustomEvent<AdConsent>(AD_CONSENT_CHANGED_EVENT, { detail: null }));
}

export function onAdConsentChange(cb: (consent: AdConsent) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<AdConsent>).detail);
  window.addEventListener(AD_CONSENT_CHANGED_EVENT, handler);
  return () => window.removeEventListener(AD_CONSENT_CHANGED_EVENT, handler);
}
