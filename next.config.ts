import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {},
  reactStrictMode: false,
  // Turbopack için boş config (uyarıyı bastırmak için)
  turbopack: {},
  // Development'ta hydration hatalarını loglamayı azalt
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
