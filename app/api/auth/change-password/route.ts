import { createClient } from "@supabase/supabase-js";
import { ApiError, apiError, ok } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = passwordChangeSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    await enforceRateLimit({ request, scope: "change-password-ip", limit: 10, windowSeconds: 3600 });
    await enforceRateLimit({ request, scope: "change-password-account", subject: email, limit: 5, windowSeconds: 3600 });

    const env = getServerEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    });

    const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: body.currentPassword
    });
    if (signInError || !signedIn.user || !signedIn.session) {
      throw new ApiError("อีเมลหรือรหัสผ่านเดิมไม่ถูกต้อง", 401, "INVALID_CURRENT_CREDENTIALS");
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: body.newPassword });
    if (updateError) {
      if (/same|different|password/i.test(updateError.message)) {
        throw new ApiError("รหัสผ่านใหม่ไม่ผ่านเงื่อนไข หรือเคยถูกใช้งานแล้ว", 400, "PASSWORD_REJECTED");
      }
      throw updateError;
    }

    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) {
      console.error("Password changed but global sign-out failed", {
        userId: signedIn.user.id,
        message: signOutError.message
      });
    }

    return ok({ changed: true });
  } catch (error) {
    return apiError(error);
  }
}
