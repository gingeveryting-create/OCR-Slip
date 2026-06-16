import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api";
import { createAdminSupabase } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validation";

function friendlySignupError(message: string) {
  if (/email.*invalid|invalid.*email/i.test(message)) {
    return "อีเมลไม่ถูกต้อง หรือโดเมนนี้ถูก Supabase ปฏิเสธ กรุณาใช้อีเมลจริง เช่น Gmail/องค์กร";
  }
  if (/already registered|already exists|user.*exists/i.test(message)) {
    return "อีเมลนี้ถูกสมัครไว้แล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น";
  }
  if (/password/i.test(message)) {
    return "รหัสผ่านไม่ผ่านเงื่อนไข กรุณาใช้อย่างน้อย 6 ตัวอักษร";
  }
  if (/rate limit/i.test(message)) {
    return "Supabase จำกัดจำนวนการสมัครชั่วคราว กรุณารอสักครู่แล้วลองใหม่";
  }
  return message;
}

export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data, error } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        department: body.department,
        role: "EMPLOYEE"
      }
    });

    if (error) {
      return NextResponse.json({ error: friendlySignupError(error.message) }, { status: error.status || 400 });
    }
    if (!data.user) {
      return NextResponse.json({ error: "สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 400 });
    }

    await admin.from("profiles").upsert({
      id: data.user.id,
      email: body.email,
      full_name: body.fullName,
      department: body.department || null,
      role: "EMPLOYEE"
    });

    return ok({
      user: { id: data.user.id, email: data.user.email },
      needsEmailConfirmation: false
    });
  } catch (error) {
    return apiError(error);
  }
}
