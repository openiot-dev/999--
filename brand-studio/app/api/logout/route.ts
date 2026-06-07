import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

// 로그아웃은 상태 변경이므로 POST 만 허용(프리페치·CSRF 로그아웃 방지).
export async function POST(req: Request): Promise<Response> {
  // 303 → 브라우저가 GET 으로 /login 이동 (POST 메서드 유지 방지)
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
