/** @type {import('next').NextConfig} */

// Debug environment variables during build
console.log('🔍 Environment Variables Debug:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Set fallback values for missing environment variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

const nextConfig = {
  images: {
    domains: [
      ...(apiUrl && apiUrl.includes('://') 
        ? [new URL(apiUrl).hostname] 
        : ['localhost'])
    ],
    remotePatterns: [
      {
        protocol: apiUrl.startsWith('https') ? 'https' : 'http',
        hostname: apiUrl.includes('://') ? new URL(apiUrl).hostname : 'localhost',
        port: apiUrl.includes('://') ? new URL(apiUrl).port || (apiUrl.startsWith('https') ? '443' : '8000') : '8000',
        pathname: '/api/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_WS_URL: wsUrl,
  },
};

module.exports = nextConfig;
