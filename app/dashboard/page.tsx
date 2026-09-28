import Link from "next/link";
import { AlertCircle, Camera, CheckCircle2, Clock3, Hourglass, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitMonth } from "@/components/auto-submit-month";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabase, requirePageProfile } from "@/lib/supabase/server";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";
import type { ClaimStatus } from "@/types/database";

type DashboardClaim = {
  id: string;
  claim_no: string | null;
  merchant_name: string | null;
  total_amount: number | null;
  currency: string;
  status: ClaimStatus;
  reject_reason: string | null;
  created_at: string;
  receipt_date: string | null;
};

function currentBangkokMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit"
  }).format(new Date());
}

function shortThaiDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function thaiMonth(value: string) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(
    new Date(`${value}-01T00:00:00+07:00`)
  );
}

function claimMonth(claim: DashboardClaim) {
  return (claim.receipt_date ?? claim.created_at).slice(0, 7);
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { profile } = await requirePageProfile(["EMPLOYEE", "ADMIN"]);
  const params = await searchParams;
  const selectedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "")
    ? params.month!
    : currentBangkokMonth();
  const supabase = await createServerSupabase();
  const { data: claims } = await supabase
    .from("expense_claims")
    .select("id,claim_no,merchant_name,total_amount,currency,status,reject_reason,created_at,receipt_date")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const claimRows = (claims ?? []) as DashboardClaim[];
  const monthRows = claimRows.filter((claim) => claimMonth(claim) === selectedMonth);
  const pendingRows = monthRows.filter((claim) => ["SUBMITTED", "FINANCE_REVIEW"].includes(claim.status));
  const approvedRows = monthRows.filter((claim) => ["APPROVED", "PAID"].includes(claim.status));
  const rejectedRows = monthRows.filter((claim) => claim.status === "REJECTED");
  const pendingTotal = pendingRows.reduce((sum, claim) => sum + Number(claim.total_amount ?? 0), 0);
  const approvedTotal = approvedRows.reduce((sum, claim) => sum + Number(claim.total_amount ?? 0), 0);
  const rejectedTotal = rejectedRows.reduce((sum, claim) => sum + Number(claim.total_amount ?? 0), 0);
  const latestRows = monthRows.slice(0, 5);

  return (
    <AppShell variant="employee">
      <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
        <section className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-slate-950">
              สวัสดีคุณ{profile.full_name ?? profile.email}
            </h2>
            <p className="mt-1 text-sm text-slate-600">Smart Expense Slip Reader</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-sky-800 ring-1 ring-sky-200">
            {(profile.full_name ?? profile.email ?? "U").slice(0, 1).toUpperCase()}
          </div>
        </section>

        <form className="mb-5" method="get">
          <AutoSubmitMonth defaultValue={selectedMonth} />
        </form>

        <p className="mb-3 text-sm font-medium text-slate-600">สรุปประจำเดือน {thaiMonth(selectedMonth)}</p>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard icon={<Hourglass className="h-5 w-5" />} label="รอตรวจสอบ" total={pendingTotal} count={pendingRows.length} tone="blue" />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="อนุมัติแล้ว" total={approvedTotal} count={approvedRows.length} tone="green" />
          <SummaryCard icon={<AlertCircle className="h-5 w-5" />} label="ถูกปฏิเสธ" total={rejectedTotal} count={rejectedRows.length} tone="red" />
        </section>

        <Link
          href="/claims/new"
          className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-950 px-6 py-7 text-center text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-900"
        >
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-700 text-white">
            <Camera className="h-8 w-8" />
          </span>
          <span className="text-2xl font-bold">สแกนใบเสร็จ</span>
          <span className="mt-1 text-sm text-slate-200">สร้างรายการเบิกใหม่</span>
        </Link>

        {rejectedRows.length ? (
          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-950">รายการถูกปฏิเสธ</h3>
              <Link href={`/claims?month=${selectedMonth}&status=REJECTED`} className="text-sm font-medium text-red-700">ดูทั้งหมด</Link>
            </div>
            <Card className="overflow-hidden rounded-xl border-red-200 shadow-sm">
              <div className="divide-y divide-red-100">
                {rejectedRows.slice(0, 3).map((claim) => (
                  <Link
                    href={`/claims/${claim.id}`}
                    key={claim.id}
                    className="grid grid-cols-[1fr_auto] gap-4 bg-red-50/40 p-4 transition hover:bg-red-50 sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{claim.merchant_name ?? claim.claim_no ?? "รายการเบิก"}</div>
                      <p className="mt-1 text-sm text-red-700">สาเหตุ: {claim.reject_reason ?? "ไม่ระบุเหตุผล"}</p>
                    </div>
                    <div className="whitespace-nowrap text-right font-mono text-sm font-semibold text-slate-950">
                      {formatMoney(claim.total_amount, claim.currency)}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        ) : null}

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-950">รายการล่าสุด</h3>
            <Link href={`/claims?month=${selectedMonth}`} className="text-sm font-medium text-blue-700">ดูทั้งหมด</Link>
          </div>

          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
            {latestRows.length ? (
              <div className="divide-y divide-slate-200">
                {latestRows.map((claim) => (
                  <Link href={`/claims/${claim.id}`} key={claim.id} className="grid grid-cols-[1fr_auto] gap-4 p-4 transition hover:bg-slate-50 sm:p-5">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{claim.merchant_name ?? claim.claim_no ?? "รายการเบิก"}</div>
                      <div className="mt-1 text-sm text-slate-600">{shortThaiDate(claim.receipt_date ?? claim.created_at)}</div>
                      <Badge className="mt-3" tone={claimStatusTone(claim.status)}>
                        {["SUBMITTED", "FINANCE_REVIEW"].includes(claim.status) ? <Clock3 className="mr-1 h-3 w-3" /> : null}
                        {claimStatusLabel(claim.status)}
                      </Badge>
                      {claim.status === "REJECTED" && claim.reject_reason ? <p className="mt-2 line-clamp-2 text-xs text-red-700">สาเหตุ: {claim.reject_reason}</p> : null}
                    </div>
                    <div className="whitespace-nowrap pt-0.5 text-right font-mono text-sm font-semibold text-slate-950">
                      {formatMoney(claim.total_amount, claim.currency)}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <ReceiptText className="h-10 w-10 text-slate-400" />
                <h4 className="mt-4 font-semibold text-slate-950">ไม่มีรายการในเดือนนี้</h4>
                <p className="mt-1 text-sm text-slate-600">เลือกเดือนอื่น หรือเริ่มสร้างรายการเบิกใหม่</p>
              </div>
            )}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon, label, total, count, tone }: {
  icon: React.ReactNode;
  label: string;
  total: number;
  count: number;
  tone: "blue" | "green" | "red";
}) {
  const colors = { blue: "text-blue-700", green: "text-emerald-700", red: "text-red-700" };
  return (
    <Card className="rounded-xl border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <div className={`mb-4 flex items-center gap-3 text-sm ${colors[tone]}`}>{icon}<span className="leading-snug">{label}</span></div>
        <div className="text-xl font-bold text-slate-950 sm:text-2xl">{formatMoney(total, "THB")}</div>
        <div className={`mt-2 text-sm font-medium ${colors[tone]}`}>{count} รายการ</div>
      </CardContent>
    </Card>
  );
}
