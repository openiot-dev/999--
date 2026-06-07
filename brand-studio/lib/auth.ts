// 공유 비밀번호 기반 간이 세션. Edge(미들웨어)·Node 양쪽에서 동작하도록 Web Crypto 사용.

export const SESSION_COOKIE = "bs_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7일

const enc = new TextEncoder();

// TS의 Uint8Array<ArrayBufferLike> ↔ BufferSource 변종 충돌 회피용 코어션.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    bs(enc.encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** HMAC 서명 세션 토큰 생성: base64url(payload).base64url(sig) */
export async function createSession(secret: string, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = bytesToB64url(enc.encode(JSON.stringify({ exp })));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, bs(enc.encode(payload)));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

/** 서명·만료 검증. */
export async function verifySession(token: string | undefined | null, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let ok = false;
  try {
    const key = await hmacKey(secret);
    ok = await crypto.subtle.verify("HMAC", key, bs(b64urlToBytes(sig)), bs(enc.encode(payload)));
  } catch {
    return false;
  }
  if (!ok) return false;
  try {
    const obj = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as { exp?: number };
    return typeof obj.exp === "number" && obj.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** 길이에 무관하게 상수 시간 비교(타이밍 공격 완화). */
export function constantTimeEqual(a: string, b: string): boolean {
  const ea = enc.encode(a);
  const eb = enc.encode(b);
  let diff = ea.length ^ eb.length;
  const len = Math.max(ea.length, eb.length);
  for (let i = 0; i < len; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

let _warned = false;
/** 세션 서명 비밀키. APP_SESSION_SECRET 우선, 없으면 APP_PASSWORD 로 파생(엔트로피 낮음 → 경고). */
export function getSecret(): string {
  const s = process.env.APP_SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.APP_PASSWORD && !_warned) {
    _warned = true;
    console.warn(
      "[auth] APP_SESSION_SECRET 미설정 — APP_PASSWORD 로 세션을 서명합니다(엔트로피 낮음). " +
        "`openssl rand -hex 32` 값을 APP_SESSION_SECRET 에 설정하세요.",
    );
  }
  return process.env.APP_PASSWORD || "";
}

/** 인증 활성화 여부 (APP_PASSWORD 설정 시 게이트 작동). */
export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}
