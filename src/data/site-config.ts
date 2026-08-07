export const SITE_URL = 'https://kit-bin.com';
export const PUBLISHER_NAME = 'Kit-Bin';

export const KOFI_URL = 'https://ko-fi.com/michaeljones22017';

/**
 * AdSense remains disabled until the account-specific slot and consent values are supplied.
 * Publisher ID in ad code uses the ca-pub- prefix. The ads.txt file uses the
 * matching pub- identifier without ca-.
 */
export const ADSENSE_ENABLED = false;
export const ADSENSE_PUBLISHER_ID = 'ca-pub-5446651960329896';
export const ADSENSE_PUB_ID = 'pub-5446651960329896';
export const ADSENSE_AD_SLOT = 'REPLACE_WITH_AD_SLOT_ID';

/** Paste the exact Google CMP script URL generated in AdSense Privacy & messaging. */
export const ADSENSE_CMP_SCRIPT_URL = 'REPLACE_WITH_GOOGLE_CMP_SCRIPT_URL';

export const ADSENSE_PUBLISHER_CONFIGURED =
  ADSENSE_ENABLED &&
  /^ca-pub-\d{16}$/.test(ADSENSE_PUBLISHER_ID) &&
  /^pub-\d{16}$/.test(ADSENSE_PUB_ID);

export const ADSENSE_CONFIGURED =
  ADSENSE_PUBLISHER_CONFIGURED && /^\d+$/.test(ADSENSE_AD_SLOT);

export const ADSENSE_CMP_CONFIGURED =
  ADSENSE_CONFIGURED && ADSENSE_CMP_SCRIPT_URL.startsWith('https://');

/**
 * Cloudflare Web Analytics. Cookieless and privacy-preserving, so it does not
 * need consent the way the ad scripts do. The beacon is only emitted once a
 * real token is pasted here; until then the component renders nothing.
 * Token comes from the Cloudflare dashboard (Web Analytics > your site).
 */
export const CF_ANALYTICS_TOKEN = 'REPLACE_WITH_CF_WEB_ANALYTICS_TOKEN';

export const CF_ANALYTICS_CONFIGURED = /^[a-f0-9]{32}$/.test(CF_ANALYTICS_TOKEN);

export const CONTACT_EMAIL = 'info@kit-bin.com';
