import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabase } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validation";

function friendlySignupError(message: string) {
  if (/email.*invalid|invalid.*email/i.test(message)) {
    return "อีเมลไม่ถูกต้อง หรือโดเมนนี้ถูก Supabase ปฏิเสธ กรุณาใช้อีเมลจริง เช่น Gmail/องค์กร";
  }
  if (/already registered|already exists|user.*exists/i.test(message)) {
    return "อีเมลนี้ถูกสมัครไว้แล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น";
  }
  if (/password/i.test(message)) {
    return "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข";
  }
  if (/rate limit/i.test(message)) {
    return "Supabase จำกัดจำนวนการสมัครชั่วคราว กรุณารอสักครู่แล้วลองใหม่";
  }
  return "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่";
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit({ request, scope: "public-signup", limit: 5, windowSeconds: 3600 });
    const body = signupSchema.parse(await request.json());
    const env = getServerEnv();
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/login`,
        data: {
          full_name: body.fullName,
          department: body.department
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: friendlySignupError(error.message) }, { status: error.status || 400 });
    }
    if (!data.user) {
      return NextResponse.json({ error: "สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 400 });
    }

    return ok({
      user: { id: data.user.id, email: data.user.email },
      needsEmailConfirmation: !data.session
    });
  } catch (error) {
    return apiError(error);
  }
}
