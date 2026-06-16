import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { sha256 } from "@/lib/file-hash";
import { writeAuditLog } from "@/lib/audit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { allowedMimeTypes, maxUploadBytes } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
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

    const env = getServerEnv();
    const admin = createAdminSupabase();
    const { data: claim, error: claimError } = await admin
      .from("expense_claims")
      .insert({ employee_id: profile.id, status: "DRAFT", currency: "THB" })
      .select("*")
      .single();
    if (claimError) throw claimError;

    const bytes = await file.arrayBuffer();
    const fileHash = await sha256(bytes);
    const extension = file.name.split(".").pop() || "bin";
    const path = `${profile.id}/${claim.id}/${Date.now()}.${extension}`;
    const { error: uploadError } = await admin.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;

    const { data: attachment, error: attachmentError } = await admin
      .from("expense_attachments")
      .insert({
        claim_id: claim.id,
        file_name: file.name,
        file_path: path,
        file_type: extension,
        file_size: file.size,
        mime_type: file.type,
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
      newValue: { fileName: file.name, fileHash }
    });

    return NextResponse.json({ claim, attachment });
  } catch (error) {
    return apiError(error);
  }
}
