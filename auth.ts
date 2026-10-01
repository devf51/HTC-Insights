import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import type { User as DbUser } from "@/app/generated/prisma/client";
import { canSignIn, initialAccess } from "@/lib/auth-rules";
import { db } from "@/lib/db";
import type { Role } from "@/lib/nav";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; isSuperAdmin: boolean; isBanned: boolean } & DefaultSession["user"];
  }
}

const adapter = PrismaAdapter(db);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...adapter,
    // บทบาทตัดสินครั้งเดียวตอนสร้างบัญชี เขียนพร้อมแถว User ในคำสั่งเดียว
    // เข้าสู่ระบบครั้งต่อไปไม่แตะบทบาท — ไม่ทับสิ่งที่ผู้ดูแลเปลี่ยนไว้
    createUser: (user) =>
      db.user.create({
        data: {
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          ...initialAccess(user.email, process.env.ALLOWED_STUDENT_DOMAIN, process.env.SUPER_ADMIN_EMAIL),
        },
      }),
  },
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // บัญชีเดิม: user คือแถวในฐานข้อมูล (มี isBanned) · บัญชีใหม่: user มาจาก Google (ไม่มี isBanned)
    signIn({ user, profile }) {
      return canSignIn({ emailVerified: profile?.email_verified, isBanned: (user as Partial<DbUser>).isBanned });
    },
    // session แบบฐานข้อมูล: user คือแถว User ที่ adapter ดึงมาพร้อม session อยู่แล้ว ไม่ query เพิ่ม
    session({ session, user }) {
      const u = user as unknown as DbUser;
      return {
        ...session,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          role: u.role,
          isSuperAdmin: u.isSuperAdmin,
          isBanned: u.isBanned,
        },
      };
    },
  },
});
