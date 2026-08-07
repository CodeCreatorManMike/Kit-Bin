/** Real VAST video ad for the pre-download gate ONLY.
 *
 * Every other ad placement on the site (homepage/hub/tool-page banners,
 * the processing-state overlay) stays exactly as it was — a static Adsterra
 * banner loaded via `src/lib/ads/adsterra.ts`. This module is unrelated to
 * that one and is only ever used from `downloadGate.ts`.
 *
 * Uses Google's IMA SDK (official, Google-hosted, the standard way to play
 * any VAST-compliant tag regardless of who sold the ad) to render a real
 * video ad and report genuine playback progress, so the download gate can
 * be tied to actual watched time instead of a bare UI timer running next to
 * nothing. The tag itself is a HilltopAds VAST zone (#7298041, "file ad",
 * plain VAST — not the Google Ad Manager/IMA variant, which wraps for GAM's
 * own ad server that this site doesn't run).
 */

const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

const VAST_TAG_URL =
  'https://unfolded-uncle.com/dwm.FHzTdLGpNnvGZ/GUUP/geImi9zufZmUpl/k/PDTOcqyCO/TYgswrNqDWE/tvNiz/Ir5eOCDMA/0eN_Qo';

declare global {
  interface Window {
    google?: { ima?: any };
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadImaSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.ima) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Ad SDK failed to load.'));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

export interface VastPlaybackHandle {
  destroy(): void;
}

export interface VastPlaybackOptions {
  /** Called repeatedly with seconds of actual ad playback elapsed so far. */
  onProgress(secondsWatched: number): void;
  /** Called once, whether the ad completes normally, errors, or has no fill —
   * the caller treats all three the same way (nothing left to show). */
  onDone(): void;
}

/** Mounts a real VAST video ad inside `container` (must already have a
 * concrete pixel width/height, e.g. via CSS) and starts it muted — browsers
 * block unmuted autoplay outside a direct user gesture, and the IMA SDK
 * renders its own visible mute/unmute control over the video. */
export async function playVastAd(
  container: HTMLElement,
  opts: VastPlaybackOptions,
): Promise<VastPlaybackHandle> {
  await loadImaSdk();
  const ima = window.google!.ima;

  const adDisplayContainer = new ima.AdDisplayContainer(container);
  adDisplayContainer.initialize();

  const adsLoader = new ima.AdsLoader(adDisplayContainer);
  let adsManager: any = null;
  let progressTimer: number | null = null;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    if (progressTimer !== null) window.clearInterval(progressTimer);
    opts.onDone();
  };

  adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);

  adsLoader.addEventListener(
    ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
    (event: any) => {
      adsManager = event.getAdsManager({});
      adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, finish);
      adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);
      adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => {
        const startedAt = Date.now();
        progressTimer = window.setInterval(() => {
          opts.onProgress((Date.now() - startedAt) / 1000);
        }, 250);
      });

      try {
        adsManager.init(container.clientWidth, container.clientHeight, ima.ViewMode.NORMAL);
        adsManager.setVolume(0);
        adsManager.start();
      } catch {
        finish();
      }
    },
  );

  const adsRequest = new ima.AdsRequest();
  adsRequest.adTagUrl = VAST_TAG_URL;
  adsRequest.linearAdSlotWidth = container.clientWidth;
  adsRequest.linearAdSlotHeight = container.clientHeight;
  adsLoader.requestAds(adsRequest);

  return {
    destroy() {
      if (progressTimer !== null) window.clearInterval(progressTimer);
      try {
        adsManager?.destroy();
      } catch {
        // already torn down
      }
    },
  };
}
