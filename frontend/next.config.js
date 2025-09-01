/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   appDir: true,
  // },
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').startsWith('https') ? 'https' : 'http',
        hostname: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').includes('://') ? new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').hostname : 'localhost',
        port: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').includes('://') ? new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').port || ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').startsWith('https') ? '443' : '8000') : '8000',
        pathname: '/api/**',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  },
};

module.exports = nextConfig;
