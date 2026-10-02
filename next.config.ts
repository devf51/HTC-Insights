import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unauthorized()/forbidden() ใน lib/auth.ts ต้องใช้ — experimental ใน Next 16
  // (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md)
  experimental: {
    authInterrupts: true,
  },
  // รูปรีวิวอยู่บน Cloudinary (lib/cloudinary.ts) — next/image ต้องรู้จักโดเมน
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
