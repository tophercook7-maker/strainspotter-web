/**
 * Single destination for “mobile app” CTAs across the web UI.
 *
 * - Set `NEXT_PUBLIC_MOBILE_APP_URL` to a real App Store / Play / marketing URL when live.
 * - Otherwise CTAs point at the internal `/mobile` hub (honest placeholder + install guidance).
 */
export const MOBILE_APP_INTERNAL_PATH = "/mobile";

export function getMobileAppHref(): string {
  const v =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim()
      : undefined;
  if (v) return v;
  return MOBILE_APP_INTERNAL_PATH;
}

/** Short link label used next to web-vs-mobile messaging (arrow added in `MobileAppCtaLink`). */
export const MOBILE_APP_CTA_LABEL = "StrainSpotter on your phone";
