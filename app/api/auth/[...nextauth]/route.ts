// ประตูเข้าสู่ระบบของ Auth.js — route เดียวที่ไม่เริ่มด้วย guard ของ lib/auth.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
