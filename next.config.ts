import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Transpile WebGL / 3-D packages ───────────────────────────────────────
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // ── Compress responses (gzip / br) ───────────────────────────────────────
  compress: true,

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 768, 1024, 1280, 1920],
    imageSizes:  [16, 32, 64, 96, 128, 192, 256],
    minimumCacheTTL: 31536000, // 1 year
  },

  // ── Reduce bundle size: only import what we use from large packages ────────
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "gsap",
      "lucide-react",
      "lenis",
      "@gsap/react",
    ],
  },

  // ── Security + caching headers ────────────────────────────────────────────
  async headers() {
    return [
      {
        // Immutable cache for hashed static assets
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Long cache for public favicon / icon files
        source: "/(favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|android-chrome-192x192.png|android-chrome-512x512.png|site.webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Fonts — immutable forever (hash in filename)
        source: "/public/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
