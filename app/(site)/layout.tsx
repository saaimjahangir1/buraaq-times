import type { Metadata } from "next";
import { display, body, mono } from "@/lib/site-fonts";
import "../globals.css";
import { ThemeProvider } from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeatherProgressWidget from "@/components/FeatherProgressWidget";
import { getPublishedPosts } from "@/lib/public-data";
import AmbientSceneLoader from "@/components/AmbientSceneLoader";
import SmoothScroll from "@/components/SmoothScroll";
import LiquidGlassFx from "@/components/LiquidGlassFx";
import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/ads";

import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Journalism, Reimagined`, template: `%s | ${SITE_NAME}` },
  description:
    "A premium digital publishing platform for News and Articles, built for an immersive, AI-assisted reading experience.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Journalism, Reimagined`,
    description:
      "A premium digital publishing platform for News and Articles, built for an immersive, AI-assisted reading experience.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Journalism, Reimagined`,
    description:
      "A premium digital publishing platform for News and Articles, built for an immersive, AI-assisted reading experience.",
  },
  icons: { icon: "/favicon.png" },
  // AdSense site-ownership check (the "meta tag" option in AdSense → Sites).
  ...(ADSENSE_CLIENT ? { other: { "google-adsense-account": ADSENSE_CLIENT } } : {}),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allPosts = await getPublishedPosts();
  const trending = allPosts.filter((p) => p.trending).slice(0, 5);
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <ThemeProvider>
          <SmoothScroll />
          <LiquidGlassFx />
          <AmbientSceneLoader />
          <FeatherProgressWidget trendingPosts={trending} />
          <Navbar />
          <main className="pt-32">{children}</main>
          <Footer />
        </ThemeProvider>
        {/* AdSense loads only on the public site (the CMS and proofreading desk have
            their own layouts) and only once NEXT_PUBLIC_ADSENSE_CLIENT is set.
            Auto ads and the consent message for EU/UK readers are controlled from
            the AdSense dashboard through this one script. */}
        {ADSENSE_CLIENT && (
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          />
        )}
      </body>
    </html>
  );
}
