import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireProfile();
    const admin = createAdminSupabase();
    const { data: claim, error } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (error) throw error;
    if (profile.role === "EMPLOYEE" && claim.employee_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const env = getServerEnv();
    const url = `${env.NEXT_PUBLIC_APP_URL}/claims/${id}/qr`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 360 });
    return NextResponse.json({ url, dataUrl });
  } catch (error) {
    return apiError(error);
  }
}
