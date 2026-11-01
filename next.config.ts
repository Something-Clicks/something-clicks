import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Portfolio photos (up to 4 MB) are uploaded through a server action; the default limit is 1 MB.
  experimental: { serverActions: { bodySizeLimit: "4.2mb" } },
  // Retired pages: the homepage now explains how it works, and claiming replaces applying.
  async redirects() {
    return [
      { source: "/how-it-works", destination: "/#how-it-works", permanent: true },
      { source: "/for-businesses", destination: "/", permanent: true },
      { source: "/join", destination: "/claim", permanent: true },
      { source: "/join/:path*", destination: "/claim", permanent: true },
      { source: "/remove", destination: "/remove-my-business", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
