import { createAdminSupabase } from "@/lib/supabase/server";

type DuplicateInput = {
  claimId: string;
  employeeId: string;
  fileHash?: string | null;
  receiptNo?: string | null;
  taxInvoiceNo?: string | null;
  transactionId?: string | null;
  referenceNo?: string | null;
  merchantName?: string | null;
  receiptDate?: string | null;
  totalAmount?: number | null;
};

export async function detectDuplicates(input: DuplicateInput) {
  const supabase = createAdminSupabase();
  const warnings: Array<{ rule: string; claimId: string; claimNo: string | null }> = [];

  async function addMatches(rule: string, query: any) {
    const { data } = await query
      .select("id,claim_no")
      .neq("id", input.claimId)
      .limit(5);
    (data ?? []).forEach((row: any) => warnings.push({ rule, claimId: row.id, claimNo: row.claim_no }));
  }

  if (input.fileHash) {
    const { data } = await supabase
      .from("expense_attachments")
      .select("claim_id, expense_claims!inner(id,claim_no)")
      .eq("file_hash", input.fileHash)
      .neq("claim_id", input.claimId)
      .limit(5);
    (data ?? []).forEach((row: any) =>
      warnings.push({ rule: "file_hash", claimId: row.claim_id, claimNo: row.expense_claims?.claim_no ?? null })
    );
  }

  if (input.receiptNo) await addMatches("receipt_no", supabase.from("expense_claims").eq("receipt_no", input.receiptNo));
  if (input.taxInvoiceNo) await addMatches("tax_invoice_no", supabase.from("expense_claims").eq("tax_invoice_no", input.taxInvoiceNo));
  if (input.transactionId) await addMatches("transaction_id", supabase.from("expense_claims").eq("transaction_id", input.transactionId));
  if (input.referenceNo) await addMatches("reference_no", supabase.from("expense_claims").eq("reference_no", input.referenceNo));

  if (input.merchantName && input.receiptDate && input.totalAmount != null) {
    await addMatches(
      "merchant_date_amount",
      supabase
        .from("expense_claims")
        .eq("merchant_name", input.merchantName)
        .eq("receipt_date", input.receiptDate)
        .eq("total_amount", input.totalAmount)
    );
  }

  if (input.employeeId && input.receiptDate && input.totalAmount != null) {
    await addMatches(
      "employee_date_amount",
      supabase
        .from("expense_claims")
        .eq("employee_id", input.employeeId)
        .eq("receipt_date", input.receiptDate)
        .eq("total_amount", input.totalAmount)
    );
  }

  return {
    score: Math.min(100, warnings.length * 20),
    warnings
  };
}
