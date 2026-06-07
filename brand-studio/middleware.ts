import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, getSecret } from "@/lib/auth";

// 로그인 없이 접근 가능한 경로
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/logout"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // APP_PASSWORD 미설정 처리: 개발(또는 ALLOW_NO_AUTH=1)에서는 게이트 비활성,
  // 프로덕션에서는 '실패 시 닫힘(fail-closed)' — 설정 누락으로 전체가 무방비 공개되는 것을 방지.
  if (!process.env.APP_PASSWORD) {
    const devOpen = process.env.NODE_ENV !== "production" || process.env.ALLOW_NO_AUTH === "1";
    if (devOpen) return NextResponse.next();
    const msg = "서버 인증이 구성되지 않았습니다(APP_PASSWORD 미설정).";
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: msg }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    return new NextResponse(msg, { status: 503 });
  }
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token, getSecret())) return NextResponse.next();

  // 미인증
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "인증이 필요합니다. 다시 로그인하세요." }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname && pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 자산 제외 전 경로 보호
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
