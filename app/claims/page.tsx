import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClaimActions } from "@/components/claim-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerSupabase, requireProfile } from "@/lib/supabase/server";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";

export default async function ClaimsPage() {
  const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
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
          <h2 className="text-2xl font-bold">เคลมของฉัน</h2>
          <p className="text-muted-foreground">ดูสถานะและเปิด QR Code สำหรับรายการเบิกจ่าย</p>
        </div>
        <Button asChild><Link href="/claims/new">สร้างเคลม</Link></Button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Claim No.</th>
              <th>ร้านค้า</th>
              <th>วันที่</th>
              <th>ยอดเงิน</th>
              <th>Confidence</th>
              <th>เหตุผล</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(claims ?? []).map((claim: any) => (
              <tr key={claim.id}>
                <td>{claim.claim_no ?? "-"}</td>
                <td>{claim.merchant_name ?? "-"}</td>
                <td>{claim.receipt_date ?? "-"}</td>
                <td>{formatMoney(claim.total_amount, claim.currency)}</td>
                <td>{claim.confidence_score ?? "-"}</td>
                <td className="max-w-sm text-sm text-red-700">{claim.status === "REJECTED" ? claim.reject_reason ?? "-" : "-"}</td>
                <td><Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge></td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={`/claims/${claim.id}`}>Open</Link></Button>
                    <ClaimActions claimId={claim.id} canDelete={["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(claim.status)} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
