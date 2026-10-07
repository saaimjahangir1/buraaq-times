/** @type {import('next').NextConfig} */
const nextConfig = {
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
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
