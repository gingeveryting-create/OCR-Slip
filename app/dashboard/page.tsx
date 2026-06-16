import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabase, requireProfile } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
  const supabase = await createServerSupabase();
  const { data: claims } = await supabase
    .from("expense_claims")
    .select("id,claim_no,merchant_name,total_amount,currency,status,created_at")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">แดชบอร์ดพนักงาน</h2>
          <p className="text-muted-foreground">อัปโหลดสลิป ให้ระบบอ่านข้อมูล และติดตามสถานะการเบิกจ่าย</p>
        </div>
        <Button asChild>
          <Link href="/claims/new">อัปโหลดใบเสร็จ</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>เคลมล่าสุด</CardTitle>
          <CardDescription>รายการที่คุณสร้างหรือส่งเข้าตรวจแล้ว</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>เลขที่เคลม</th>
                  <th>ร้านค้า</th>
                  <th>ยอดเงิน</th>
                  <th>สถานะ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(claims ?? []).map((claim: any) => (
                  <tr key={claim.id}>
                    <td>{claim.claim_no ?? "-"}</td>
                    <td>{claim.merchant_name ?? "-"}</td>
                    <td>{formatMoney(claim.total_amount, claim.currency)}</td>
                    <td><Badge>{claim.status}</Badge></td>
                    <td><Link className="text-primary" href={`/claims/${claim.id}`}>ดูรายละเอียด</Link></td>
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
