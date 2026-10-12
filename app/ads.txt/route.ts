import { ADSENSE_PUBLISHER_ID, GOOGLE_ADS_TXT_CERT_ID } from "@/lib/ads";

// Serves https://<your-domain>/ads.txt, which tells advertisers which ad
// networks may sell ads on this site. AdSense limits ad serving if it's missing.
export const dynamic = "force-static";

export function GET() {
  if (!ADSENSE_PUBLISHER_ID) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(`google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, ${GOOGLE_ADS_TXT_CERT_ID}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
