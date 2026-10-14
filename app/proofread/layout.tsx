import type { Metadata } from "next";
import { display, body, mono } from "@/lib/site-fonts";
import "../globals.css";
import LiquidGlassFx from "@/components/LiquidGlassFx";

// Its own root layout (like /cms): none of the public site's navbar, footer or
// 3D scene — and nothing on the public site links here.
export const metadata: Metadata = {
  title: "Proofreading desk | Buraaq Times",
  description: "Proofreading desk for Buraaq Times.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

export default function ProofreadRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink dark:bg-void dark:text-white">
        <LiquidGlassFx />
        {children}
      </body>
    </html>
  );
}
