import { NextResponse } from "next/server";
import { apiError, mapClaimPatch, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getServerEnv } from "@/lib/env";
import { canAccessClaim } from "@/lib/claims";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { claimIdSchema, claimPatchSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const id = claimIdSchema.parse((await params).id);
    const { profile } = await requireProfile();
    const admin = createAdminSupabase();
    const { data: claim, error } = await admin
      .from("expense_claims")
      .select("*, expense_attachments(*), audit_logs(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!canAccessClaim(profile, claim)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return ok({ claim });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const id = claimIdSchema.parse((await params).id);
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    const body = claimPatchSchema.parse(await request.json());
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin.from("expense_claims").select("*").eq("id", id).single();
    if (currentError) throw currentError;
    if (profile.role === "EMPLOYEE" && current.employee_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (profile.role === "EMPLOYEE" && !["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(current.status)) {
      return NextResponse.json({ error: "Claim can no longer be edited" }, { status: 409 });
    }

    const patch = mapClaimPatch(body as Record<string, unknown>);
    let updateQuery = admin.from("expense_claims").update(patch).eq("id", id);
    if (profile.role === "EMPLOYEE") {
      updateQuery = updateQuery.eq("employee_id", profile.id).in("status", ["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"]);
    }
    const { data, error } = await updateQuery.select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "รายการถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรชหน้า" }, { status: 409 });
    await writeAuditLog({
      claimId: id,
      action: "EMPLOYEE_CORRECTED",
      oldValue: current.confirmed_json,
      newValue: body,
      performedBy: profile.id
    });
    return ok({ claim: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const id = claimIdSchema.parse((await params).id);
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    const admin = createAdminSupabase();
    const { data: current, error: currentError } = await admin
      .from("expense_claims")
      .select("*, expense_attachments(*)")
      .eq("id", id)
      .single();
    if (currentError) throw currentError;

    if (profile.role === "EMPLOYEE" && current.employee_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (profile.role === "EMPLOYEE" && !["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(current.status)) {
      return NextResponse.json({ error: "Only draft, failed, extracted, or rejected claims can be deleted" }, { status: 409 });
    }

    let deleteQuery = admin.from("expense_claims").delete().eq("id", id);
    if (profile.role === "EMPLOYEE") {
      deleteQuery = deleteQuery.eq("employee_id", profile.id).in("status", ["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"]);
    }
    const { data: deleted, error: deleteError } = await deleteQuery.select("id").maybeSingle();
    if (deleteError) throw deleteError;
    if (!deleted) return NextResponse.json({ error: "รายการถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรชหน้า" }, { status: 409 });

    const env = getServerEnv();
    const paths = (current.expense_attachments ?? [])
      .map((attachment: any) => attachment.file_path)
      .filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await admin.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(paths);
      if (storageError) console.error("Deleted claim but receipt cleanup failed", { claimId: id, code: storageError.name });
    }

    await writeAuditLog({
      claimId: null,
      action: "CLAIM_DELETED",
      oldValue: { status: current.status, claimNo: current.claim_no },
      performedBy: profile.id,
      remark: `Deleted claim ${id}`
    });

    return ok({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
