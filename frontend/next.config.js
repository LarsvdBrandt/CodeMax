/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for Monaco Editor workers
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://backend:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
