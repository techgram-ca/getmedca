import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@getmed/ui", "@getmed/core", "@getmed/db"],
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
      ],
    },
  ],
};

export default nextConfig;
