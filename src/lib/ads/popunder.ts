/** Post-download popunder. HilltopAds zone #7350753, "Direct URL" invocation
 * type — this network's popunder tags are a plain URL meant to be opened via
 * `window.open()` from directly inside a real user gesture, not a script tag.
 *
 * Explicit product decision, requested directly by the site owner: this only
 * ever fires from the real download link's own click handler, which is the
 * one gesture guaranteed to happen only once the user already has their
 * finished file in hand. It never fires during upload, processing, or the
 * pre-download ad gate (`downloadGate.ts`) — those are untouched. Like every
 * other ad on the site, it never fires at all without ad consent.
 *
 * Capped to once per page load: a popunder is a one-shot "open a background
 * tab" action, and re-opening one on every subsequent download click on the
 * same page (e.g. a user who converts several files in a row without
 * reloading) would be a materially worse experience for no extra revenue a
 * single open doesn't already capture. */

import { getAdConsent } from './consent';

const POPUNDER_URL =
  'https://affectionatestorage.com/b.3yVn0oPt3_pDvGbkm_VGJhZcD/0p3kMwzrU/wKNXzaUszPL/TMc_zCNpTHAX3iNRTCcq';

let firedThisPageLoad = false;

/** Call from directly inside the download link's own click handler — that's
 * what makes `window.open` count as a user-gesture-triggered open rather
 * than a blocked popup. No-ops if ad consent hasn't been granted, or if it
 * has already fired once this page load. */
export function maybeTriggerPostDownloadPopunder(): void {
  if (firedThisPageLoad) return;
  if (getAdConsent() !== 'granted') return;
  firedThisPageLoad = true;
  window.open(POPUNDER_URL, '_blank', 'noopener');
}
