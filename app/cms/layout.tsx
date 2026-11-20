import type { Metadata } from "next";
import { display, body, mono } from "@/lib/site-fonts";
import "../globals.css";
import LiquidGlassFx from "@/components/LiquidGlassFx";
import { CMS_THEME_SCRIPT } from "@/lib/cms-theme";

export const metadata: Metadata = {
  title: "Buraaq Times CMS",
  description: "Editorial platform for Buraaq Times.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

export default function CmsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Light by default; the top-bar toggle switches to dark (remembered per browser).
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CMS_THEME_SCRIPT }} />
      </head>
      <body className="cms-warm bg-[#e7dfd2] text-ink dark:bg-[#14110d] dark:text-white">
        <LiquidGlassFx />
        {children}
      </body>
    </html>
  );
}
