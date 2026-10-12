import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unauthorized()/forbidden() ใน lib/auth.ts ต้องใช้ — experimental ใน Next 16
  // (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md)
  experimental: {
    authInterrupts: true,
  },
  // OWASP A05 — HSTS ตั้งที่ reverse proxy ที่ถือ TLS
  // ponytail: ยังไม่มี CSP คุมสคริปต์ (ต้องใช้ nonce กับสคริปต์ธีมและสคริปต์ของ Next) — มีแค่ส่วนที่ไม่กระทบสคริปต์
  // ไม่ใส่ form-action: Chrome บังคับกับ redirect หลังส่งฟอร์มด้วย ปุ่มเข้าสู่ระบบ Google จะพัง
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
