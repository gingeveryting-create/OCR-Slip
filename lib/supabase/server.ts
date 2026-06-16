import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { ProfileRow, UserRole } from "@/types/database";

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
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,department,role")
    .eq("id", user.id)
    .single<ProfileRow>();

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
