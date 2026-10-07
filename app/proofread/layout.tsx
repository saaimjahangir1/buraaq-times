import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";

// Its own root layout (like /cms): none of the public site's navbar, footer or
// 3D scene — and nothing on the public site links here.
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

export const metadata: Metadata = {
  title: "Proofreading desk | Buraaq Times",
  description: "Proofreading desk for Buraaq Times.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

export default function ProofreadRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink dark:bg-void dark:text-white">{children}</body>
    </html>
  );
}
