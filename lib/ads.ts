// Google AdSense configuration. Everything is driven by environment variables,
// so ads stay completely off (no script, no ads.txt, no empty boxes) until the
// publisher ID is set — and only where it is set.
//
// NEXT_PUBLIC_ vars are baked in at build time: after changing them on Vercel,
// redeploy. Set them on Vercel only; leave them unset on the VPS so ads never
// load on the bare IP address, which isn't an approved AdSense site.
//
//   NEXT_PUBLIC_ADSENSE_CLIENT          ca-pub-1234567890123456  (required)
//   NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE  ad unit ID for the unit inside articles (optional)
//   NEXT_PUBLIC_ADSENSE_SLOT_END_ARTICLE ad unit ID for the unit after articles (optional)

const raw = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").trim();

/** "ca-pub-…" or "" when ads are off (or the value is malformed). */
export const ADSENSE_CLIENT = /^ca-pub-\d{10,20}$/.test(raw) ? raw : "";

/** "pub-…" — the form ads.txt uses. */
export const ADSENSE_PUBLISHER_ID = ADSENSE_CLIENT ? ADSENSE_CLIENT.replace(/^ca-/, "") : "";

const slot = (v: string | undefined) => (v && /^\d{6,20}$/.test(v.trim()) ? v.trim() : "");

export const AD_SLOTS = {
  inArticle: slot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE),
  endArticle: slot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_END_ARTICLE),
};

/** Google's fixed certification-authority ID for ads.txt. */
export const GOOGLE_ADS_TXT_CERT_ID = "f08c47fec0942fa0";
