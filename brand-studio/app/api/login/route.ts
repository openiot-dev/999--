import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSession, constantTimeEqual, getSecret } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 간이 무차별 대입 완화 (IP당 윈도우 내 실패 횟수 제한)
const MAX_FAILS = 8;
const WINDOW_MS = 5 * 60_000;
const fails = new Map<string, { n: number; reset: number }>();

// 주의: X-Forwarded-For 첫 홉은 클라이언트가 위조할 수 있습니다. 신뢰 가능한 리버스 프록시
// (XFF 를 덮어쓰는) 뒤에 두고 운영하세요. 위조로 IP별 버킷을 우회할 수 있으므로, 아래 실패
// 지연(고정 딜레이)을 IP 제한과 함께 두어 무차별 대입 속도를 낮춥니다.
function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) {
    return NextResponse.json({ error: "서버에 APP_PASSWORD 가 설정되지 않았습니다." }, { status: 500 });
  }

  const ip = clientIp(req);
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && now < rec.reset && rec.n >= MAX_FAILS) {
    return NextResponse.json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요." }, { status: 429 });
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    /* ignore */
  }

  if (!password || !constantTimeEqual(password, expected)) {
    const next = rec && now < rec.reset ? { n: rec.n + 1, reset: rec.reset } : { n: 1, reset: now + WINDOW_MS };
    fails.set(ip, next);
    // 고정 지연: IP 위조로 카운터를 우회해도 시도 속도를 낮춘다.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  fails.delete(ip);
  const token = await createSession(getSecret());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
