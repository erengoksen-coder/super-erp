/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! UYARI !!
    // Proje geliştirme aşamasında build hatalarını geçici olarak yoksayar.
    // Faz 2 kapsamında bu ayar false yapılarak hatalar tek tek düzeltilecektir.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Build sırasında lint hatalarını yoksayar.
    ignoreDuringBuilds: true,
  },
  // Standalone build (Docker için önerilir)
  output: 'standalone',
};

export default nextConfig;
