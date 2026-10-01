import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unauthorized()/forbidden() ใน lib/auth.ts ต้องใช้ — experimental ใน Next 16
  // (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md)
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
