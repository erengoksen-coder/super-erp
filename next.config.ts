import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  // Turbopack için boş config (uyarıyı bastırmak için)
  turbopack: {},
  // Development'ta hydration hatalarını loglamayı azalt
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // KESİN ÇÖZÜM: Request body size limit'ini artır (Excel dosyaları için)
  // App Router'da API routes için body size limit'i
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Excel dosyaları için 50MB limit
    },
  },
  // Body size API route'larda experimental.serverActions.bodySizeLimit ile ayarli
};

export default nextConfig;
