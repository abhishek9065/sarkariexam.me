import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/admin',
  poweredByHeader: false,
};

export default nextConfig;
