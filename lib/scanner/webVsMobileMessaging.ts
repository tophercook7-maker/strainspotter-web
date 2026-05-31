/**
 * Honest web vs mobile scanner positioning: web works; mobile capture is usually easier
 * for sharp close-ups, angles, and consistent quality—especially for look-alikes.
 *
 * Actionable CTAs use `getMobileAppHref()` / `MobileAppCtaLink`: defaults to `/mobile`;
 * set `NEXT_PUBLIC_MOBILE_APP_URL` for a real App Store / Play / marketing URL.
 */

/** Shown near the web upload / pre-scan controls. */
export const WEB_VS_MOBILE_PRESCAN_CALLOUT =
  "Web scanning works. The StrainSpotter mobile app usually gives the most reliable IDs—live capture makes sharp close-ups and multiple angles easier, with more consistent image quality (especially for similar-looking strains).";

/** Extra bullet inside the pre-scan “Stronger IDs” checklist. */
export const WEB_VS_MOBILE_PRESCAN_BULLET =
  "The mobile app is built around live camera capture, which is often the easiest way to get sharp close-ups and consistent lighting. Web uploads still work—sharp, well-lit photos matter most.";

/** Shown with weak / close-cluster / ambiguous scan summaries. */
export const WEB_VS_MOBILE_HARD_MATCH_CALLOUT =
  "For tough look-alikes, the mobile app often helps—it's built around steadier close-up capture than typical desktop uploads, so detail comes through more consistently.";

/** Appended to the “needs better images” guidance block. */
export const WEB_VS_MOBILE_NEEDS_BETTER_IMAGES_SUFFIX =
  " If you can use the StrainSpotter mobile app, live capture is usually the quickest path to sharper framing.";

/** Appended to the “unresolved / best-effort” guidance block. */
export const WEB_VS_MOBILE_UNRESOLVED_SUFFIX =
  " If you have the StrainSpotter mobile app, try a fresh live capture—it's usually easier to get the sharp close-ups this kind of match needs.";

/** Short line for paywall / promo surfaces (no download CTA). */
export const WEB_VS_MOBILE_PAYWALL_FOOTNOTE =
  "Web scans work well; the mobile app is usually best for the hardest IDs thanks to live capture and easier close-ups.";

/** One line under the PWA install hint (install is real; no store URL). */
export const WEB_VS_MOBILE_PWA_INSTALL_LINE =
  "On a phone, the installed app also makes live capture and close-up framing easier than most desktop uploads.";
