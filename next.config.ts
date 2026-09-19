import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
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
