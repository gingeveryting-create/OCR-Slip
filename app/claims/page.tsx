import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitMonth } from "@/components/auto-submit-month";
import { ClaimBatchQrTable } from "@/components/claim-batch-qr-table";
import { Button } from "@/components/ui/button";
import { createServerSupabase, requirePageProfile } from "@/lib/supabase/server";
import { claimStatusLabel } from "@/lib/status-labels";
import type { ClaimStatus } from "@/types/database";

const statusOptions: ClaimStatus[] = [
  "DRAFT",
  "OCR_PROCESSING",
  "OCR_FAILED",
  "EXTRACTED",
  "SUBMITTED",
  "FINANCE_REVIEW",
  "APPROVED",
  "REJECTED",
  "PAID",
  "CANCELLED"
];

type ClaimListRow = {
  id: string;
  claim_no: string | null;
  merchant_name: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string;
  status: ClaimStatus;
  reject_reason: string | null;
  confidence_score: number | null;
  created_at: string;
};

export default async function ClaimsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
  const { profile } = await requirePageProfile(["EMPLOYEE", "ADMIN"]);
  const params = await searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : "";
  const status = statusOptions.includes(params.status as ClaimStatus) ? (params.status as ClaimStatus) : "";
  const supabase = await createServerSupabase();
  const { data: claims } = await supabase
    .from("expense_claims")
    .select("id,claim_no,merchant_name,receipt_date,total_amount,currency,status,reject_reason,confidence_score,created_at")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const filteredClaims = ((claims ?? []) as ClaimListRow[]).filter((claim) => {
    const matchesMonth = !month || (claim.receipt_date ?? claim.created_at).slice(0, 7) === month;
    const matchesStatus = !status || claim.status === status;
    return matchesMonth && matchesStatus;
  });

  return (
    <AppShell variant="employee">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">รายการเบิกของฉัน</h2>
          <p className="text-muted-foreground">ค้นหาตามเดือนและสถานะ หรือเลือกหลายรายการเพื่อสร้าง QR รวม</p>
        </div>
        <Button asChild><Link href="/claims/new">สร้างรายการเบิก</Link></Button>
      </div>

      <form className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]" method="get">
        <AutoSubmitMonth defaultValue={month} />
        <label className="text-sm font-medium text-slate-700">
          สถานะ
          <select
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            defaultValue={status}
            name="status"
          >
            <option value="">ทุกสถานะ</option>
            {statusOptions.map((value) => <option key={value} value={value}>{claimStatusLabel(value)}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">ค้นหา</Button>
          <Button asChild type="button" variant="outline"><Link href="/claims">ล้าง</Link></Button>
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-600">พบ {filteredClaims.length} รายการ</p>
      <ClaimBatchQrTable claims={filteredClaims} />
    </AppShell>
  );
}
