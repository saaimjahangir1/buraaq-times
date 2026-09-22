import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeatherProgressWidget from "@/components/FeatherProgressWidget";
import { getPublishedPosts } from "@/lib/public-data";
import AmbientSceneLoader from "@/components/AmbientSceneLoader";
import SmoothScroll from "@/components/SmoothScroll";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

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
          <AmbientSceneLoader />
          <FeatherProgressWidget trendingPosts={trending} />
          <Navbar />
          <main className="pt-32">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
