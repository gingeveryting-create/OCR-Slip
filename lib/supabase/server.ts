import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import type { ProfileRow, UserRole } from "@/types/database";

function reportSupabaseError(
  operation: string,
  error: { message: string; code?: string; status?: number }
) {
  console.error(`[Supabase] ${operation} failed`, {
    code: error.code,
    status: error.status,
    message: error.message
  });
}

export async function createServerSupabase() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies; route handlers still can.
        }
      }
    }
  });
}

export function createAdminSupabase() {
  const env = getServerEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function getCurrentProfile() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    if (
      userError.name === "AuthSessionMissingError" ||
      userError.message.toLowerCase().includes("auth session missing")
    ) {
      return { user: null, profile: null, supabase };
    }
    reportSupabaseError("auth.getUser", userError);
    throw new ApiError(
      "ไม่สามารถเชื่อมต่อระบบบัญชีผู้ใช้ได้ กรุณาตรวจสอบ Supabase แล้วลองใหม่",
      503,
      "SUPABASE_AUTH_UNAVAILABLE"
    );
  }

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,department,role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    reportSupabaseError("profiles.select", profileError);
    throw new ApiError(
      `โหลดโปรไฟล์ผู้ใช้ไม่สำเร็จ (${profileError.code ?? "unknown"})`,
      503,
      "SUPABASE_PROFILE_QUERY_FAILED"
    );
  }

  return { user, profile, supabase };
}

export async function requireProfile(roles?: UserRole[]) {
  const result = await getCurrentProfile();
  if (!result.user || !result.profile) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (roles && !roles.includes(result.profile.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return result as typeof result & { profile: ProfileRow };
}

export async function requirePageProfile(roles?: UserRole[]) {
  const result = await getCurrentProfile();
  if (!result.user || !result.profile) redirect("/login");
  if (roles && !roles.includes(result.profile.role)) redirect("/");
  return result as typeof result & { profile: ProfileRow };
}
