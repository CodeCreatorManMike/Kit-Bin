# Google AdSense setup

The site contains a guarded AdSense integration. It is intentionally disabled until the account-specific values below are supplied. This prevents placeholder ad markup or third-party advertising requests from shipping before the account, consent message, privacy policy, and `ads.txt` are ready.

The repository already contains the verified publisher ID `ca-pub-5446651960329896` and its matching authorized-seller line in `public/ads.txt`. The integration remains disabled because the numeric ad slot ID and published CMP script URL are not present yet.

## Account values

Edit `src/data/site-config.ts` only after the AdSense account is approved or Google has supplied the required values:

- `ADSENSE_ENABLED`: set to `true`.
- `ADSENSE_PUBLISHER_ID`: the ad-code form, `ca-pub-1234567890123456`.
- `ADSENSE_PUB_ID`: the `ads.txt` form, `pub-1234567890123456`.
- `ADSENSE_AD_SLOT`: the numeric slot ID for the shared display unit, for example `1234567890`.
- `ADSENSE_CMP_SCRIPT_URL`: paste the exact Google Privacy & messaging CMP script URL generated for this site.

The build validates the prefixes and numeric formats. Until every value is valid, no AdSense loader, ad unit, or consent script is emitted.

Run `npm run adsense:check` before enabling or deploying the integration. It exits successfully while the integration is disabled, and validates every account-specific value plus the `ads.txt` declaration once enabled.

## AdSense dashboard checklist

1. Add and verify `kit-bin.com` in AdSense.
2. Create the European regulations message for EEA, UK, and Swiss visitors in Privacy & messaging.
3. Create the US state privacy message for applicable US visitors.
4. Use Google's CMP or another Google-certified CMP integrated with the IAB TCF when serving personalised ads in the EEA, UK, or Switzerland.
5. Publish the messages and copy the exact CMP script URL into `ADSENSE_CMP_SCRIPT_URL`.
6. Create the shared responsive display ad unit and copy its numeric slot ID into `ADSENSE_AD_SLOT`.
7. Confirm `public/ads.txt` contains the exact authorized-seller line from the AdSense dashboard. Use the `pub-` ID there, not the `ca-pub-` prefix.
8. Set `ADSENSE_ENABLED` to `true` and deploy.
9. Test `?fc=alwaysshow&fctype=gdpr` and `?fc=alwaysshow&fctype=ccpa` in a clean browser after the messages are published.
10. Verify the footer's “Privacy and cookie settings” control reopens consent choices.

## Placement and review checklist

- Ads appear only in the existing reserved `AdUnit` locations below the tool interface.
- No ad is styled as a download button, processing control, or navigation element.
- No interstitial, pop-under, forced redirect, or deceptive ad placement is added.
- The privacy policy changes to the live advertising branch automatically when configuration is valid. Review it against the actual AdSense and CMP settings before deployment.
- The `ads.txt` URL must return `200` and contain the exact authorized seller declaration.
- Keep `robots.txt`, sitemap, About, Contact, Privacy, Terms, and the editorial guides accessible to crawlers.

## Source documentation

- [Find your publisher ID](https://support.google.com/adsense/answer/105516)
- [Ads.txt requirements](https://support.google.com/adsense/answer/9785052)
- [CMP requirements for publishers](https://support.google.com/adsense/answer/13554116)
- [Google CMP and Privacy & messaging](https://support.google.com/adsense/answer/16918505)
- [Consent revocation](https://support.google.com/adsense/answer/10959060)
