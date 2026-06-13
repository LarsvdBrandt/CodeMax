/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep heavy server-only packages out of the Edge/client bundle.
    // (renamed to serverExternalPackages in Next.js 14.3+; use experimental here for 14.2.x)
    serverComponentsExternalPackages: ["pg", "pg-native", "resend", "@react-email/render"],
  },
  webpack: (config) => {
    // pg tries to load pg-native; silence the warning since we don't use it.
    config.resolve.alias = {
      ...config.resolve.alias,
      "pg-native": false,
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
