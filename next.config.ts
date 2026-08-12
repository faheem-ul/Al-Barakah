import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "**",
      },
    ],
  },
  // Dev Tunnel / reverse proxies send x-forwarded-host that can differ from Origin
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "tjz15zfl-3000.asse.devtunnels.ms",
        "*.asse.devtunnels.ms",
      ],
    },
  },
};

export default nextConfig;
