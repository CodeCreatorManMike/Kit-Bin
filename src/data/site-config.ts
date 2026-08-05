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

export const CONTACT_EMAIL = 'info@kit-bin.com';
