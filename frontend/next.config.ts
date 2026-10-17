import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'lucide-react', '@xyflow/react'],
  },
};

export default nextConfig;
