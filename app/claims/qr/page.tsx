import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { AppShell } from "@/components/app-shell";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerEnv } from "@/lib/env";
import { createServerSupabase, requirePageProfile } from "@/lib/supabase/server";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<{ ids?: string }>;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

function parseClaimIds(value?: string) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => uuidPattern.test(id))
    )
  ).slice(0, 50);
}

export default async function BatchClaimQrPage({ searchParams }: PageProps) {
  const { profile } = await requirePageProfile(["EMPLOYEE", "ADMIN"]);
  const params = (await searchParams) ?? {};
  const ids = parseClaimIds(params.ids);
  if (ids.length === 0) redirect("/claims");

  const supabase = await createServerSupabase();
  let query = supabase
    .from("expense_claims")
    .select("id,claim_no,merchant_name,receipt_date,total_amount,currency,status")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (profile.role === "EMPLOYEE") query = query.eq("employee_id", profile.id);

  const { data: claims, error } = await query;
  if (error) throw error;
  if (!claims?.length) redirect("/claims");

  const selectedIds = claims.map((claim) => claim.id);
  const env = getServerEnv();
  const financeUrl = `${env.NEXT_PUBLIC_APP_URL}/finance/claims?ids=${encodeURIComponent(selectedIds.join(","))}`;
  const dataUrl = await QRCode.toDataURL(financeUrl, { margin: 1, width: 420 });
  const totalAmount = claims.reduce((sum, claim) => sum + Number(claim.total_amount ?? 0), 0);
  const currency = claims[0]?.currency ?? "THB";
  const generatedAt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date());

  return (
    <AppShell variant="employee">
      <div className="no-print mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">QR Code รวมหลายรายการเบิก</h2>
          <p className="text-muted-foreground">ส่ง QR นี้ให้ Finance เพื่อเปิดรายการเบิกชุดที่เลือกไว้ หรือพิมพ์แนบประกอบการเบิก</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <Button asChild variant="outline"><Link href="/claims">กลับไปรายการเบิก</Link></Button>
        </div>
      </div>

      <section className="print-sheet space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ใบประกอบ QR รายการเบิก</CardTitle>
            <CardDescription>เอกสารนี้ประกอบด้วย QR สำหรับ Finance และรายการเบิกที่อยู่ใน QR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="space-y-3">
                <img src={dataUrl} alt="QR สำหรับเปิดรายการเบิก" width={320} height={320} className="rounded-md border bg-white p-3" />
                <p className="break-all text-xs text-muted-foreground">{financeUrl}</p>
              </div>
              <div className="grid content-start gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">จำนวนรายการ</p>
                  <p className="text-2xl font-bold">{claims.length}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">ยอดเบิกรวม</p>
                  <p className="text-2xl font-bold">{formatMoney(totalAmount, currency)}</p>
                </div>
                <div className="rounded-md border p-4 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">สร้างเมื่อ</p>
                  <p className="font-medium">{generatedAt}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายการเบิกใน QR</CardTitle>
            <CardDescription>ใช้ตรวจสอบก่อนส่งให้ Finance หรือแนบเอกสารประกอบ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>เลขที่เบิก</th>
                    <th>วันที่</th>
                    <th>ร้านค้า</th>
                    <th>สถานะ</th>
                    <th className="text-right">ยอดเบิก</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, index) => (
                    <tr key={claim.id}>
                      <td>{index + 1}</td>
                      <td>{claim.claim_no ?? claim.id}</td>
                      <td>{claim.receipt_date ?? "-"}</td>
                      <td>{claim.merchant_name ?? "-"}</td>
                      <td><Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge></td>
                      <td className="text-right">{formatMoney(claim.total_amount, claim.currency ?? "THB")}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={5} className="text-right">ยอดเบิกรวม</td>
                    <td className="text-right">{formatMoney(totalAmount, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
