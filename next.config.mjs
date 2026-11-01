/** @type {import('next').NextConfig} */

// Security headers on every page and API response.
const securityHeaders = [
  // Only this site may show its pages in a frame (stops click-jacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Limits what the browser may do, without touching scripts, styles or images
  // (Google Analytics, AdSense and the site's own scripts keep working).
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  // Browsers must not guess a file's type (an uploaded "image" can't run as a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites only see the domain a visitor came from, not the full address.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site never needs the camera, microphone, location or payment APIs.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // HTTPS only, for a year (browsers ignore this over plain HTTP).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig = {
  // No "X-Powered-By: Next.js" header (don't advertise the framework/version).
  poweredByHeader: false,
  // Never publish browser source maps (they'd expose the original source code).
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Signed-in API answers must never be stored by browsers or proxies.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["satori"],
    // Vercel only copies the files it can see the code using into each
    // serverless function. These three are opened at runtime by name, so they
    // must be listed — otherwise "Generate branded images" fails with a 500 on
    // Vercel while still working on the VPS.
    //  - hb.wasm: satori's text-shaping engine (harfbuzzjs) loads it from disk
    //  - the font and logo: read from /public by lib/image-processing.ts
    outputFileTracingIncludes: {
      "/api/cms/branded-image": [
        "./node_modules/harfbuzzjs/hb.wasm",
        "./public/fonts/PlusJakartaSans-ExtraBold.ttf",
        "./public/brand-mark.png",
      ],
    },
  },
  images: {
    // Next.js's built-in image optimizer (/_next/image) is switched off: Next 14
    // has critical security holes in it (remote code execution and denial of
    // service) that are only fixed in Next 16. Images are still shown normally —
    // uploads are already resized/cropped by the site itself when uploaded.
    // Turn this back on after the Next.js 16 upgrade.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
