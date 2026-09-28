import "server-only";

import { ApiError } from "@/lib/api";
import { createAdminSupabase } from "@/lib/supabase/server";

type RateLimitInput = {
  request: Request;
  scope: string;
  limit: number;
  windowSeconds: number;
  subject?: string;
};

const developmentCounters = new Map<string, { count: number; expiresAt: number }>();

function clientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function enforceDevelopmentFallback(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const existing = developmentCounters.get(key);
  const counter = !existing || existing.expiresAt <= now
    ? { count: 1, expiresAt: now + windowSeconds * 1000 }
    : { ...existing, count: existing.count + 1 };
  developmentCounters.set(key, counter);
  return counter.count <= limit;
}

export async function enforceRateLimit(input: RateLimitInput) {
  const subject = input.subject ?? clientAddress(input.request);
  const key = await digest(`${input.scope}:${subject}`);
  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds
  });

  let allowed = data === true;
  if (error) {
    if (process.env.NODE_ENV !== "production" && error.code === "PGRST202") {
      console.warn("Rate-limit migration is not applied; using development-only memory fallback.");
      allowed = enforceDevelopmentFallback(key, input.limit, input.windowSeconds);
    } else {
      console.error("Rate-limit check failed", { code: error.code, message: error.message });
      throw new ApiError("ระบบจำกัดการใช้งานไม่พร้อม กรุณาลองใหม่ภายหลัง", 503, "RATE_LIMIT_UNAVAILABLE");
    }
  }

  if (!allowed) {
    throw new ApiError("ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", 429, "RATE_LIMITED");
  }
}
