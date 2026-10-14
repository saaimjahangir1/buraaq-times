import localFont from "next/font/local";

// The site's three fonts, bundled with the code (lib/fonts) instead of being
// downloaded from Google Fonts during every build. Builds no longer fail when
// Google Fonts is slow, unreachable, or answers the server unexpectedly — the
// error "An error occurred in `next/font` … Cannot read properties of null
// (reading '1')". Same fonts, same Latin character set, served from our own
// domain exactly as before. (Licences: lib/fonts/OFL-*.txt.)

/** Plus Jakarta Sans — headlines. Variable font, weights 500–800. */
export const display = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-display",
  weight: "500 800",
  display: "swap",
});

/** Inter — body text. Variable font, weights 400–800. */
export const body = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-body",
  weight: "400 800",
  display: "swap",
});

/** IBM Plex Mono — labels and small caps. Regular and Medium. */
export const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: false,
});
