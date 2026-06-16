import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClaimActions } from "@/components/claim-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClaimDetail } from "@/lib/claims";
import { getCurrentProfile } from "@/lib/supabase/server";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login");
  const { claim } = await getClaimDetail(id, profile);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">{claim.claim_no ?? "Draft Claim"}</h2>
          <p className="text-muted-foreground">{claim.merchant_name ?? "ยังไม่มีชื่อร้านค้า"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["EXTRACTED", "REJECTED"].includes(claim.status) ? (
            <Button asChild variant="outline"><Link href={`/claims/${claim.id}/review`}>แก้ไขและส่งใหม่</Link></Button>
          ) : null}
          <ClaimActions claimId={claim.id} canDelete={["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(claim.status)} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>สถานะ</CardTitle><CardDescription>Workflow ปัจจุบัน</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge>
            {claim.reject_reason ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{claim.reject_reason}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ยอดเงิน</CardTitle><CardDescription>จาก confirmed data</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatMoney(claim.total_amount, claim.currency)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ความมั่นใจ OCR</CardTitle><CardDescription>คะแนนภาพรวม</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{claim.confidence_score ?? "-"}%</p></CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>ข้อมูลที่ยืนยันแล้ว</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{JSON.stringify(claim.confirmed_json ?? claim.extracted_json, null, 2)}</pre>
        </CardContent>
      </Card>
    </AppShell>
  );
}
