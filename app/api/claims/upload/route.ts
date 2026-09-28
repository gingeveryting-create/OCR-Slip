import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { sha256 } from "@/lib/file-hash";
import { writeAuditLog } from "@/lib/audit";
import { validateUploadedFile } from "@/lib/file-validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { allowedMimeTypes, maxUploadBytes } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    await enforceRateLimit({ request, scope: "claim-upload", subject: profile.id, limit: 30, windowSeconds: 3600 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!allowedMimeTypes.includes(file.type as any)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > maxUploadBytes) {
      return NextResponse.json({ error: "File is larger than 10MB" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const env = getServerEnv();
    const admin = createAdminSupabase();
    const bytes = await file.arrayBuffer();
    const validatedFile = validateUploadedFile(file, bytes);
    const fileHash = await sha256(bytes);
    const { data: claim, error: claimError } = await admin
      .from("expense_claims")
      .insert({ employee_id: profile.id, status: "DRAFT", currency: "THB" })
      .select("*")
      .single();
    if (claimError) throw claimError;

    const path = `${profile.id}/${claim.id}/${Date.now()}.${validatedFile.extension}`;
    try {
      const { error: uploadError } = await admin.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, bytes, {
        contentType: validatedFile.actualMime,
        upsert: false
      });
      if (uploadError) throw uploadError;

      const { data: attachment, error: attachmentError } = await admin
        .from("expense_attachments")
        .insert({
          claim_id: claim.id,
          file_name: validatedFile.safeFileName,
          file_path: path,
          file_type: validatedFile.extension,
          file_size: file.size,
          mime_type: validatedFile.actualMime,
          file_hash: fileHash,
          storage_bucket: env.SUPABASE_STORAGE_BUCKET
        })
        .select("*")
        .single();
      if (attachmentError) throw attachmentError;

      await writeAuditLog({
        claimId: claim.id,
        action: "CLAIM_UPLOADED",
        performedBy: profile.id,
        newValue: { fileName: validatedFile.safeFileName, fileHash }
      });

      return NextResponse.json({ claim, attachment });
    } catch (error) {
      await admin.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
      await admin.from("expense_claims").delete().eq("id", claim.id);
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
