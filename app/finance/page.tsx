import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function FinancePage() {
  const { supabase } = await requireProfile(["FINANCE", "ADMIN"]);
  const { data: claims } = await supabase
    .from("expense_claims")
    .select("id,claim_no,merchant_name,total_amount,currency,status,duplicate_score,profiles(full_name,email)")
    .in("status", ["SUBMITTED", "FINANCE_REVIEW"])
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Finance Review Dashboard</h2>
          <p className="text-muted-foreground">ตรวจเอกสารต้นฉบับเทียบกับข้อมูล OCR และข้อมูลที่พนักงานยืนยัน</p>
        </div>
        <Button asChild variant="outline"><a href="/api/finance/claims/export">Export Excel</a></Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>รายการรอตรวจ</CardTitle>
          <CardDescription>แสดง claim ที่ submitted หรืออยู่ระหว่าง finance review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Claim</th><th>Employee</th><th>Merchant</th><th>Total</th><th>Duplicate</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {(claims ?? []).map((claim: any) => (
                  <tr key={claim.id}>
                    <td>{claim.claim_no}</td>
                    <td>{claim.profiles?.full_name ?? claim.profiles?.email}</td>
                    <td>{claim.merchant_name ?? "-"}</td>
                    <td>{formatMoney(claim.total_amount, claim.currency)}</td>
                    <td>{claim.duplicate_score ? <Badge tone="amber">{claim.duplicate_score}%</Badge> : "-"}</td>
                    <td><Badge>{claim.status}</Badge></td>
                    <td><Link className="text-primary" href={`/finance/claims/${claim.id}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
