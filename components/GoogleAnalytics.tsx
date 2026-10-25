import Script from "next/script";

// Google Analytics 4. Loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID (G-XXXXXXX)
// is set, and only on the public site — the CMS and the proofreading desk use
// their own layouts, so staff activity isn't counted. Page changes inside the
// site are tracked by GA4's "enhanced measurement" (on by default).
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export default function GoogleAnalytics() {
  if (!GA_ID || !/^G-[A-Z0-9]+$/i.test(GA_ID)) return null;
  return (
    <>
      <Script id="ga4-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
