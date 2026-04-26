/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    'lucide-react', 
    'sonner', 
    'framer-motion', 
    'clsx', 
    'tailwind-merge', 
    'recharts', 
    'date-fns', 
    'zustand', 
    'swr'
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  output: 'standalone',
};

export default nextConfig;
