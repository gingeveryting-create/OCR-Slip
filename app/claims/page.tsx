import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClaimBatchQrTable } from "@/components/claim-batch-qr-table";
import { Button } from "@/components/ui/button";
import { createServerSupabase, requirePageProfile } from "@/lib/supabase/server";

export default async function ClaimsPage() {
  const { profile } = await requirePageProfile(["EMPLOYEE", "ADMIN"]);
  const supabase = await createServerSupabase();
  const { data: claims } = await supabase
    .from("expense_claims")
    .select("id,claim_no,merchant_name,receipt_date,total_amount,currency,status,reject_reason,confidence_score")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">รายการเบิกของฉัน</h2>
          <p className="text-muted-foreground">ดูสถานะ เปิด QR รายการเดียว หรือเลือกหลายรายการเพื่อสร้าง QR รวม</p>
        </div>
        <Button asChild><Link href="/claims/new">สร้างรายการเบิก</Link></Button>
      </div>
      <ClaimBatchQrTable claims={claims ?? []} />
    </AppShell>
  );
}
