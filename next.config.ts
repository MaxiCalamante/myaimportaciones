import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    qualities: [75, 90, 95],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "atacadousa.com.py",
      },
      {
        protocol: "https",
        hostname: "www.atacadousa.com.py",
      },
      {
        protocol: "https",
        hostname: "www.totalherramientasoficial.com.py",
      },
      {
        protocol: "https",
        hostname: "totalherramientasoficial.com.py",
      },
    ],
  },
};

export default nextConfig;
