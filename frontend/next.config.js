/** @type {import('next').NextConfig} */

// Debug environment variables during build
console.log('🔍 Environment Variables Debug:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const nextConfig = {
  images: {
    domains: [
      // Dynamic domain from environment variable
      ...(process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.includes('://') 
        ? [new URL(process.env.NEXT_PUBLIC_API_URL).hostname] 
        : [])
    ],
    remotePatterns: [
      {
        protocol: (process.env.NEXT_PUBLIC_API_URL).startsWith('https') ? 'https' : 'http',
        hostname: (process.env.NEXT_PUBLIC_API_URL).includes('://') ? new URL(process.env.NEXT_PUBLIC_API_URL).hostname : 'localhost',
        port: (process.env.NEXT_PUBLIC_API_URL).includes('://') ? new URL(process.env.NEXT_PUBLIC_API_URL).port || ((process.env.NEXT_PUBLIC_API_URL).startsWith('https') ? '443' : '8000') : '8000',
        pathname: '/api/**',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
};

module.exports = nextConfig;
