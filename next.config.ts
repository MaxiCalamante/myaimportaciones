import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src https://www.mercadopago.com.ar; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      ],
    }];
  },
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
