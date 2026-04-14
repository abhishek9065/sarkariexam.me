import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  output: 'standalone',
  async redirects() {
    return [];
  },
};

export default nextConfig;
