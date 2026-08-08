/** Real VAST video ad for the pre-download gate ONLY.
 *
 * Every other ad placement on the site (homepage/hub/tool-page banners,
 * the processing-state overlay) stays exactly as it was — a static Adsterra
 * banner loaded via `src/lib/ads/adsterra.ts`. This module is unrelated to
 * that one and is only ever used from `downloadGate.ts`.
 *
 * The tag is a HilltopAds VAST zone (#7298041, "file ad", plain VAST — not
 * the Google Ad Manager/IMA variant). This does NOT use Google's IMA SDK:
 * IMA validates VAST responses far more strictly than this network's output
 * satisfies (confirmed directly — IMA rejects this exact, genuinely valid
 * tag with "AdError 1009: The response does not contain any valid ads.",
 * even though the XML is well-formed, has a real <MediaFiles> block, and
 * every media URL and tracking pixel resolves correctly over HTTPS). IMA is
 * tuned for Google Ad Manager's own output; plenty of smaller VAST networks
 * don't satisfy its stricter-than-spec checks. Instead this parses the VAST
 * XML directly and plays the best MediaFile in a plain <video> element,
 * firing the standard Impression/tracking pixels itself so HilltopAds still
 * gets paid correctly. */

const VAST_TAG_URL =
  'https://unfolded-uncle.com/dwm.FHzTdLGpNnvGZ/GUUP/geImi9zufZmUpl/k/PDTOcqyCO/TYgswrNqDWE/tvNiz/Ir5eOCDMA/0eN_Qo';

export interface VastPlaybackHandle {
  destroy(): void;
}

export interface VastPlaybackOptions {
  /** Called repeatedly with seconds of actual ad playback elapsed so far. */
  onProgress(secondsWatched: number): void;
  /** Called once, whether the ad completes normally, errors, or has no
   * playable media — the caller treats all three the same way (nothing
   * left to show). */
  onDone(): void;
}

interface ParsedAd {
  mediaUrl: string;
  impressions: string[];
  tracking: Partial<Record<'start' | 'firstQuartile' | 'midpoint' | 'thirdQuartile' | 'complete', string[]>>;
}

function pickMediaFile(doc: Document): string | null {
  const probe = document.createElement('video');
  const files = Array.from(doc.querySelectorAll('MediaFile'));
  // Prefer whatever the browser reports strongest support for; MP4/H.264 is
  // the closest thing to universally supported, so it naturally sorts first.
  const byPreference = [...files].sort((a, b) => {
    const rank = (type: string | null) => {
      if (!type) return 0;
      const support = probe.canPlayType(type);
      if (support === 'probably') return 2;
      if (support === 'maybe') return 1;
      return 0;
    };
    return rank(b.getAttribute('type')) - rank(a.getAttribute('type'));
  });
  const best = byPreference.find((f) => (f.getAttribute('type') ?? '').startsWith('video/') && f.textContent?.trim());
  return best?.textContent?.trim() ?? null;
}

function textOfAll(doc: Document, selector: string): string[] {
  return Array.from(doc.querySelectorAll(selector))
    .map((el) => el.textContent?.trim())
    .filter((v): v is string => !!v);
}

async function fetchAndParseAd(): Promise<ParsedAd | null> {
  const res = await fetch(VAST_TAG_URL);
  if (!res.ok) return null;
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return null;

  const mediaUrl = pickMediaFile(doc);
  if (!mediaUrl) return null;

  const tracking: ParsedAd['tracking'] = {};
  for (const el of Array.from(doc.querySelectorAll('Tracking'))) {
    const event = el.getAttribute('event');
    const url = el.textContent?.trim();
    if (!event || !url) continue;
    const key = event as keyof ParsedAd['tracking'];
    (tracking[key] ??= []).push(url);
  }

  return {
    mediaUrl,
    impressions: textOfAll(doc, 'Impression'),
    tracking,
  };
}

/** Fire-and-forget tracking beacon — ad tracking pixels are one-way, no
 * response handling needed, and a failed beacon must never affect playback. */
function fireBeacons(urls: string[] | undefined): void {
  for (const url of urls ?? []) {
    fetch(url, { mode: 'no-cors', keepalive: true }).catch(() => {});
  }
}

/** Mounts a real video ad inside `container` (must already have a concrete
 * pixel width/height, e.g. via CSS) and starts it muted — browsers block
 * unmuted autoplay outside a direct user gesture. */
export async function playVastAd(
  container: HTMLElement,
  opts: VastPlaybackOptions,
): Promise<VastPlaybackHandle> {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    opts.onDone();
  };

  const ad = await fetchAndParseAd().catch(() => null);
  if (!ad) {
    finish();
    return { destroy() {} };
  }

  const video = document.createElement('video');
  video.src = ad.mediaUrl;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('disableRemotePlayback', 'true');
  video.disablePictureInPicture = true;
  video.autoplay = true;
  video.controls = false;
  // Height-priority sizing: the frame (downloadGate.ts) is a deliberately
  // tall box (60-65vh) so the ad reads as a real, substantial placement
  // rather than a thin strip — fill that height and let width scale
  // proportionally, capped so a portrait/square creative never overflows
  // the frame's width. A landscape creative in a tall box naturally
  // letterboxes left/right (pillarboxed) instead of top/bottom, which is
  // the correct tradeoff here since the box's height is the fixed,
  // intentional dimension, not the video's own aspect ratio.
  video.style.cssText =
    'display:block;height:100%;width:auto;max-width:100%;max-height:100%;object-fit:contain;background:#000;';

  const firedQuartiles = new Set<string>();
  let impressionFired = false;

  video.addEventListener('playing', () => {
    if (impressionFired) return;
    impressionFired = true;
    fireBeacons(ad.impressions);
    fireBeacons(ad.tracking.start);
  });

  video.addEventListener('timeupdate', () => {
    if (!video.duration || Number.isNaN(video.duration)) return;
    opts.onProgress(video.currentTime);
    const pct = video.currentTime / video.duration;
    const mark = (name: keyof ParsedAd['tracking'], threshold: number) => {
      if (pct >= threshold && !firedQuartiles.has(name)) {
        firedQuartiles.add(name);
        fireBeacons(ad.tracking[name]);
      }
    };
    mark('firstQuartile', 0.25);
    mark('midpoint', 0.5);
    mark('thirdQuartile', 0.75);
  });

  video.addEventListener('ended', () => {
    fireBeacons(ad.tracking.complete);
    finish();
  });
  video.addEventListener('error', finish);

  container.innerHTML = '';
  container.appendChild(video);

  // Muted autoplay works on most desktop browsers but mobile Safari/Chrome
  // frequently reject it anyway (stricter gesture requirements, especially
  // right after an async chain rather than directly inside a click handler,
  // which is exactly how this gets triggered — after processing finishes).
  // Rather than treat that rejection as failure, fall back to a visible tap
  // target: calling play() from inside its own click handler is a genuine
  // user gesture and reliably succeeds everywhere.
  let playButton: HTMLButtonElement | null = null;
  const removePlayButton = () => {
    playButton?.remove();
    playButton = null;
  };

  const showPlayButtonFallback = () => {
    if (playButton || done) return;
    playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.setAttribute('aria-label', 'Play advertisement');
    playButton.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;';
    playButton.innerHTML =
      '<span style="display:grid;place-items:center;width:56px;height:56px;border-radius:9999px;background:rgba(255,255,255,0.92);"><svg viewBox="0 0 24 24" width="24" height="24" fill="#111"><path d="M8 5v14l11-7z"/></svg></span>';
    playButton.addEventListener('click', () => {
      video.play().then(removePlayButton).catch(() => {});
    });
    container.appendChild(playButton);
  };

  video.play().catch(showPlayButtonFallback);
  video.addEventListener('playing', removePlayButton);

  return {
    destroy() {
      removePlayButton();
      video.pause();
      video.removeAttribute('src');
      video.load();
    },
  };
}
