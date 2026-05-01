import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  output: 'standalone',
  async redirects() {
    return [];
  },
};

export default nextConfig;
