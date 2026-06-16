import { AppShell } from "@/components/app-shell";
import { FinanceActions } from "@/components/finance-actions";
import { FinanceReviewData } from "@/components/finance-review-data";
import { ReceiptViewer } from "@/components/receipt-viewer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClaimDetail } from "@/lib/claims";
import { requireProfile } from "@/lib/supabase/server";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

function changedFields(extracted: any, confirmed: any) {
  const changed: string[] = [];
  Object.keys(confirmed ?? {}).forEach((key) => {
    const original = extracted?.fields?.[key]?.value;
    if (String(original ?? "") !== String(confirmed?.[key] ?? "")) changed.push(key);
  });
  return changed;
}

export default async function FinanceClaimDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { profile } = await requireProfile(["FINANCE", "ADMIN"]);
  const { claim, signedUrl } = await getClaimDetail(id, profile);
  const changed = changedFields(claim.extracted_json, claim.confirmed_json);

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{claim.claim_no}</h2>
        <p className="text-muted-foreground">
          {claim.profiles?.full_name ?? claim.profiles?.email} · {formatMoney(claim.total_amount, claim.currency)}
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Original receipt</CardTitle>
            <CardDescription>ซูม หมุน และดาวน์โหลดตามสิทธิ์ finance/admin</CardDescription>
          </CardHeader>
          <CardContent>
            <ReceiptViewer signedUrl={signedUrl} mimeType={claim.expense_attachments?.[0]?.mime_type} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review data</CardTitle>
              <CardDescription>เปรียบเทียบ OCR, confirmed data และ duplicate warning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge>
                <Badge tone={claim.duplicate_score ? "amber" : "green"}>Duplicate {claim.duplicate_score ?? 0}%</Badge>
                <Badge>OCR {claim.confidence_score ?? "-"}%</Badge>
              </div>
              {changed.length ? (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Employee changed: {changed.join(", ")}</div>
              ) : null}
              <FinanceReviewData claim={claim} changed={changed} />
              <FinanceActions claimId={claim.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(claim.audit_logs ?? []).map((log: any) => (
                  <div className="rounded-md border p-3 text-sm" key={log.id}>
                    <div className="font-medium">{log.action}</div>
                    <div className="text-muted-foreground">{new Date(log.performed_at).toLocaleString("th-TH")}</div>
                    {log.remark ? <div>{log.remark}</div> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
