/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS headers are handled dynamically in middleware.ts
  async rewrites() {
    return [
      {
        source: '/api/v1/api/v1/:path*',
        destination: '/api/v1/:path*',
      },
      {
        source: '/quotation',
        destination: '/api/v1/procurement/quotations',
      },
      {
        source: '/quotations',
        destination: '/api/v1/procurement/quotations',
      },
      {
        source: '/quotations/:path*',
        destination: '/api/v1/procurement/quotations/:path*',
      },
      {
        source: '/purchases/quotations',
        destination: '/api/v1/procurement/quotations',
      },
      {
        source: '/purchases/quotations/:path*',
        destination: '/api/v1/procurement/quotations/:path*',
      },
      {
        source: '/api/quotations',
        destination: '/api/v1/procurement/quotations',
      },
      {
        source: '/api/quotations/:path*',
        destination: '/api/v1/procurement/quotations/:path*',
      },
      {
        source: '/api/v1/quotations',
        destination: '/api/v1/procurement/quotations',
      },
      {
        source: '/api/v1/quotations/:path*',
        destination: '/api/v1/procurement/quotations/:path*',
      },
      {
        source: '/api/procurement/:path*',
        destination: '/api/v1/procurement/:path*',
      },
      {
        source: '/procurement/:path*',
        destination: '/api/v1/procurement/:path*',
      },
      {
        source: '/api/purchases/:path*',
        destination: '/api/v1/purchases/:path*',
      },
      {
        source: '/api/purchases',
        destination: '/api/v1/purchases',
      },
      {
        source: '/purchases/:path*',
        destination: '/api/v1/purchases/:path*',
      },
    ];
  },
};

export default nextConfig;
