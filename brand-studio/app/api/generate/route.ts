import Anthropic from "@anthropic-ai/sdk";
import { GenerateInput } from "@/lib/formats";
import { buildSystem, buildUserMessage } from "@/lib/prompts";
import { getPlaybook, getCompanyKb } from "@/lib/kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** 같은 출처(브라우저 폼)에서 온 요청인지 가벼운 확인. APP_ALLOWED_ORIGINS 로 추가 허용. */
function originOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // 비브라우저(curl/서버)·동일출처 네비게이션은 허용
  const allow = (process.env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const host = new URL(origin).host;
    if (host === new URL(req.url).host) return true;
    return allow.some((a) => a === origin || a === host);
  } catch {
    return false;
  }
}

/** 인스턴스 메모리 기반 간이 레이트리밋(IP당 windowMs 안에 max건). 서버리스에서는 인스턴스별. */
const RL_MAX = Number(process.env.APP_RATE_LIMIT) || 20;
const RL_WINDOW_MS = 60_000;
const rlMap = new Map<string, { count: number; reset: number }>();
function rateLimited(req: Request): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const e = rlMap.get(ip);
  if (!e || now > e.reset) {
    rlMap.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > RL_MAX;
}

export async function POST(req: Request): Promise<Response> {
  if (!originOk(req)) return jsonError("허용되지 않은 출처입니다.", 403);
  if (rateLimited(req)) return jsonError("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400);
  }

  const parsed = GenerateInput.safeParse(raw);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", 400);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError("ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 넣어주세요.", 500);
  }

  const input = parsed.data;
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const effort = (process.env.ANTHROPIC_EFFORT || "medium") as "low" | "medium" | "high" | "max";
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS) || 32000;

  const system = buildSystem(getPlaybook(), getCompanyKb());
  const userText = buildUserMessage(input);

  const encoder = new TextEncoder();
  let ms: ReturnType<typeof client.messages.stream> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* controller already closed (client aborted) */
        }
      };
      try {
        ms = client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            thinking: { type: "adaptive" },
            output_config: { effort },
            system,
            messages: [{ role: "user", content: userText }],
          },
          { signal: req.signal },
        );
        for await (const event of ms) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            safeEnqueue(event.delta.text);
          }
        }
        // 길이 제한으로 잘렸는지 확인
        try {
          const final = await ms.finalMessage();
          if (final.stop_reason === "max_tokens") {
            safeEnqueue("\n\n> ⚠️ 길이 제한(max_tokens)으로 결과가 잘렸을 수 있습니다. 형식을 나눠 다시 생성해 보세요.");
          }
        } catch {
          /* 중단/네트워크 — 무시 */
        }
      } catch (err) {
        // 원본 에러 메시지는 노출하지 않고 서버 로그에만 남김
        console.error("[generate] stream error:", err);
        safeEnqueue("\n\n> ⚠️ 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      // 클라이언트 연결 종료/중지 → 상위 Anthropic 스트림 중단(토큰 낭비 방지)
      ms?.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
