import type { Metadata } from "next";
import { display, body, mono } from "@/lib/site-fonts";
import "../globals.css";
import LiquidGlassFx from "@/components/LiquidGlassFx";

export const metadata: Metadata = {
  title: "Buraaq Times CMS",
  description: "Editorial platform for Buraaq Times.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

export default function CmsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink dark:bg-void dark:text-white">
        <LiquidGlassFx />
        {children}
      </body>
    </html>
  );
}
