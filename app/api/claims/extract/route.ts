import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";
import { detectDuplicates } from "@/lib/duplicate";
import { createOcrProvider } from "@/lib/ocr";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { claimIdSchema } from "@/lib/validation";

const allowedProviders = new Set(["openai", "tesseract"]);
const extractableStatuses = ["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"];

function requestedProvider(value: unknown) {
  if (typeof value !== "string") return undefined;
  return allowedProviders.has(value) ? (value as "openai" | "tesseract") : undefined;
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
    const body = await request.json();
    const claimIdResult = claimIdSchema.safeParse(body.claimId);
    const providerOverride = requestedProvider(body.provider);
    if (!claimIdResult.success) return NextResponse.json({ error: "claimId is invalid" }, { status: 400 });
    const claimId = claimIdResult.data;

    const admin = createAdminSupabase();
    const { data: claim, error: claimError } = await admin
      .from("expense_claims")
      .select("*")
      .eq("id", claimId)
      .single();
    if (claimError) throw claimError;
    if (profile.role === "EMPLOYEE" && claim.employee_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!extractableStatuses.includes(claim.status)) {
      return NextResponse.json({ error: "สถานะปัจจุบันไม่อนุญาตให้ประมวลผล OCR ซ้ำ" }, { status: 409 });
    }

    const env = getServerEnv();
    const providerName = providerOverride ?? env.OCR_PROVIDER;
    await enforceRateLimit({ request, scope: "ocr-all", subject: profile.id, limit: 30, windowSeconds: 3600 });
    await enforceRateLimit({
      request,
      scope: `ocr-${providerName}`,
      subject: profile.id,
      limit: providerName === "openai" ? 10 : 30,
      windowSeconds: 3600
    });

    const { data: processingClaim, error: processingError } = await admin
      .from("expense_claims")
      .update({ status: "OCR_PROCESSING" })
      .eq("id", claimId)
      .in("status", extractableStatuses)
      .select("id")
      .maybeSingle();
    if (processingError) throw processingError;
    if (!processingClaim) {
      return NextResponse.json({ error: "รายการถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรชหน้า" }, { status: 409 });
    }
    await writeAuditLog({
      claimId,
      action: "OCR_PROCESSING",
      oldValue: { status: claim.status },
      newValue: { status: "OCR_PROCESSING" },
      performedBy: profile.id
    });

    const { data: attachment, error: attachmentError } = await admin
      .from("expense_attachments")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (attachmentError) throw attachmentError;

    const { data: signed, error: signError } = await admin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(attachment.file_path, 60 * 10);
    if (signError) throw signError;

    try {
      const provider = createOcrProvider(providerOverride);
      const result = await provider.extract(signed.signedUrl, attachment.mime_type);
      const fields = result.fields;
      const duplicate = await detectDuplicates({
        claimId,
        employeeId: claim.employee_id,
        fileHash: attachment.file_hash,
        receiptNo: fields.receiptNo.value,
        taxInvoiceNo: fields.taxInvoiceNo.value,
        transactionId: fields.transactionId.value,
        referenceNo: fields.referenceNo.value,
        merchantName: fields.merchantName.value,
        receiptDate: fields.receiptDate.value,
        totalAmount: fields.totalAmount.value
      });

      const patch = {
        document_type: result.documentType,
        merchant_name: fields.merchantName.value,
        receipt_no: fields.receiptNo.value,
        tax_invoice_no: fields.taxInvoiceNo.value,
        receipt_date: fields.receiptDate.value,
        receipt_time: fields.receiptTime.value,
        total_amount: fields.totalAmount.value,
        amount_before_vat: fields.amountBeforeVat.value,
        vat_amount: fields.vatAmount.value,
        tax_id: fields.taxId.value,
        branch_no: fields.branchNo.value,
        address: fields.address.value,
        payment_method: fields.paymentMethod.value,
        bank_name: fields.bankName.value,
        sender_name: fields.senderName.value,
        sender_account: fields.senderAccount.value,
        receiver_name: fields.receiverName.value,
        receiver_account: fields.receiverAccount.value,
        transaction_id: fields.transactionId.value,
        reference_no: fields.referenceNo.value,
        qr_data: fields.qrData.value,
        currency: fields.currency.value ?? "THB",
        status: "EXTRACTED",
        confidence_score: result.documentTypeConfidence * 100,
        duplicate_score: duplicate.score,
        duplicate_warning: duplicate,
        extracted_json: result,
        confirmed_json: Object.fromEntries(Object.entries(fields).map(([key, field]: any) => [key, field.value]))
      };

      const { data: updated, error: updateError } = await admin
        .from("expense_claims")
        .update(patch)
        .eq("id", claimId)
        .select("*")
        .single();
      if (updateError) throw updateError;

      await admin.from("ocr_results").insert({
        claim_id: claimId,
        provider: providerName,
        status: "SUCCEEDED",
        document_type: result.documentType,
        confidence_score: result.documentTypeConfidence * 100,
        raw_text: result.rawText,
        extracted_json: result
      });
      await writeAuditLog({ claimId, action: "OCR_EXTRACTED", performedBy: profile.id, newValue: patch });
      return NextResponse.json({ claim: updated, extraction: result });
    } catch (error) {
      await admin.from("expense_claims").update({ status: "OCR_FAILED" }).eq("id", claimId).eq("status", "OCR_PROCESSING");
      await admin.from("ocr_results").insert({
        claim_id: claimId,
        provider: providerOverride ?? env.OCR_PROVIDER,
        status: "FAILED",
        error_message: error instanceof Error ? error.message : "Extraction failed"
      });
      await writeAuditLog({
        claimId,
        action: "OCR_FAILED",
        oldValue: { status: "OCR_PROCESSING" },
        newValue: { status: "OCR_FAILED" },
        performedBy: profile.id,
        remark: error instanceof Error ? error.message : "Extraction failed"
      });
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
