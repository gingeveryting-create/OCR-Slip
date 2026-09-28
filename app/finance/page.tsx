import Link from "next/link";
import { AlertCircle, CalendarDays, Eye, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FinanceClaimFilters } from "@/components/finance-claim-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminSupabase, requirePageProfile } from "@/lib/supabase/server";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<{
    employee?: string;
    dateFrom?: string;
    dateTo?: string;
    ids?: string;
  }>;
};

type ClaimListRow = {
  id: string;
  claim_no: string | null;
  merchant_name: string | null;
  total_amount: number | null;
  currency: string | null;
  status: string | null;
  reject_reason: string | null;
  duplicate_score: number | null;
  receipt_date: string | null;
  created_at: string;
  employee_id: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    department?: string | null;
  } | null;
};

const claimSelect =
  "id,claim_no,merchant_name,total_amount,currency,status,reject_reason,duplicate_score,receipt_date,created_at,employee_id,profiles!expense_claims_employee_id_fkey(full_name,email,department)";

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

function financeListHref(filters: { employee?: string; dateFrom?: string; dateTo?: string; ids?: string }) {
  const params = new URLSearchParams();
  if (filters.employee) params.set("employee", filters.employee);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.ids) params.set("ids", filters.ids);
  const query = params.toString();
  return query ? `/finance/claims?${query}` : "/finance/claims";
}

function applyCommonFilters(query: any, employeeIds: string[] | null, dateFrom: string, dateTo: string, claimIds: string[]) {
  let nextQuery = query;
  if (claimIds.length) nextQuery = nextQuery.in("id", claimIds);
  if (employeeIds) {
    nextQuery = employeeIds.length
      ? nextQuery.in("employee_id", employeeIds)
      : nextQuery.eq("employee_id", "00000000-0000-0000-0000-000000000000");
  }
  if (dateFrom) nextQuery = nextQuery.gte("receipt_date", dateFrom);
  if (dateTo) nextQuery = nextQuery.lte("receipt_date", dateTo);
  return nextQuery;
}

function employeeName(claim: ClaimListRow) {
  return claim.profiles?.full_name ?? claim.profiles?.email ?? "ไม่ทราบพนักงาน";
}

function sumAmount(claims: ClaimListRow[]) {
  return claims.reduce((sum, claim) => sum + Number(claim.total_amount ?? 0), 0);
}

function employeeSummary(claims: ClaimListRow[]) {
  const rows = new Map<string, {
    employee: string;
    department: string;
    submitted: number;
    approved: number;
    paid: number;
    rejected: number;
    totalClaims: number;
    totalAmount: number;
    approvedAmount: number;
  }>();

  for (const claim of claims) {
    const key = claim.employee_id;
    const row = rows.get(key) ?? {
      employee: employeeName(claim),
      department: claim.profiles?.department ?? "-",
      submitted: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      totalClaims: 0,
      totalAmount: 0,
      approvedAmount: 0
    };
    const amount = Number(claim.total_amount ?? 0);
    row.totalClaims += 1;
    row.totalAmount += amount;
    if (claim.status === "SUBMITTED" || claim.status === "FINANCE_REVIEW") row.submitted += 1;
    if (claim.status === "APPROVED") {
      row.approved += 1;
      row.approvedAmount += amount;
    }
    if (claim.status === "PAID") row.paid += 1;
    if (claim.status === "REJECTED") row.rejected += 1;
    rows.set(key, row);
  }

  return Array.from(rows.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

export default async function FinancePage({ searchParams }: PageProps) {
  const { supabase } = await requirePageProfile(["FINANCE", "ADMIN"]);
  const filters = (await searchParams) ?? {};
  const employee = filters.employee?.trim() ?? "";
  const dateFrom = filters.dateFrom?.trim() ?? "";
  const dateTo = filters.dateTo?.trim() ?? "";
  const ids = filters.ids?.trim() ?? "";
  const claimIds = parseClaimIds(ids);

  let employeeIds: string[] | null = null;
  if (employee) {
    const admin = createAdminSupabase();
    const safeEmployee = employee.replaceAll(",", " ");
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.%${safeEmployee}%,email.ilike.%${safeEmployee}%`)
      .limit(50);
    employeeIds = (profiles ?? []).map((profile) => profile.id);
  }

  const pendingQuery = applyCommonFilters(
    supabase
      .from("expense_claims")
      .select(claimSelect)
      .in("status", ["SUBMITTED", "FINANCE_REVIEW"])
      .order("created_at", { ascending: false })
      .limit(100),
    employeeIds,
    dateFrom,
    dateTo,
    claimIds
  );

  const approvedQuery = applyCommonFilters(
    supabase
      .from("expense_claims")
      .select(claimSelect)
      .in("status", ["APPROVED", "PAID"])
      .order("approved_at", { ascending: false, nullsFirst: false })
      .limit(100),
    employeeIds,
    dateFrom,
    dateTo,
    claimIds
  );

  const rejectedQuery = applyCommonFilters(
    supabase
      .from("expense_claims")
      .select(claimSelect)
      .eq("status", "REJECTED")
      .order("updated_at", { ascending: false })
      .limit(100),
    employeeIds,
    dateFrom,
    dateTo,
    claimIds
  );

  const summaryQuery = applyCommonFilters(
    supabase
      .from("expense_claims")
      .select(claimSelect)
      .in("status", ["SUBMITTED", "FINANCE_REVIEW", "APPROVED", "REJECTED", "PAID"])
      .order("created_at", { ascending: false })
      .limit(500),
    employeeIds,
    dateFrom,
    dateTo,
    claimIds
  );

  const [{ data: pendingClaims }, { data: approvedClaims }, { data: rejectedClaims }, { data: summaryClaims }] = await Promise.all([
    pendingQuery,
    approvedQuery,
    rejectedQuery,
    summaryQuery
  ]);

  const pending = (pendingClaims ?? []) as ClaimListRow[];
  const approved = (approvedClaims ?? []) as ClaimListRow[];
  const rejected = (rejectedClaims ?? []) as ClaimListRow[];
  const summary = (summaryClaims ?? []) as ClaimListRow[];
  const perEmployee = employeeSummary(summary);
  const approvedAmount = sumAmount(approved);
  const pendingAmount = sumAmount(pending);
  const returnHref = financeListHref({ employee, dateFrom, dateTo, ids });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Finance Review Dashboard</h2>
          <p className="text-muted-foreground">ตรวจเอกสารต้นฉบับ เทียบข้อมูล OCR และสรุปรายการเบิกของพนักงาน</p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/finance/claims/export">Export Excel</a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ค้นหารายการเบิก</CardTitle>
          <CardDescription>ค้นหาตามพนักงาน วันที่ใบเสร็จ หรือเปิดจาก QR ที่ employee ส่งให้</CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceClaimFilters employee={employee} dateFrom={dateFrom} dateTo={dateTo} ids={ids} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รอตรวจ</CardDescription>
            <CardTitle>{pending.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{formatMoney(pendingAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>อนุมัติแล้ว/จ่ายแล้ว</CardDescription>
            <CardTitle>{approved.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{formatMoney(approvedAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>พนักงานที่มีรายการ</CardDescription>
            <CardTitle>{perEmployee.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">ตามเงื่อนไขค้นหาปัจจุบัน</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ถูกปฏิเสธ</CardDescription>
            <CardTitle>{rejected.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">มีเหตุผลแจ้งพนักงาน</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รายการทั้งหมด</CardDescription>
            <CardTitle>{summary.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{formatMoney(sumAmount(summary))}</CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>สรุปรายการเบิกตามพนักงาน</CardTitle>
          <CardDescription>รวมจำนวนรายการเบิกและยอดเงิน แยกตามสถานะของแต่ละคน</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y md:hidden">
            {perEmployee.map((row) => (
              <article key={row.employee} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold">{row.employee}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{row.department}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">ยอดรวม</p>
                    <p className="mt-1 font-bold tabular-nums">{formatMoney(row.totalAmount)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-amber-50 p-3 text-amber-900">
                    <p className="text-xs">รอตรวจ</p>
                    <p className="mt-1 font-semibold">{row.submitted} รายการ</p>
                  </div>
                  <div className="rounded-md bg-emerald-50 p-3 text-emerald-900">
                    <p className="text-xs">อนุมัติ / จ่ายแล้ว</p>
                    <p className="mt-1 font-semibold">{row.approved + row.paid} รายการ</p>
                  </div>
                  <div className="rounded-md bg-red-50 p-3 text-red-900">
                    <p className="text-xs">ปฏิเสธ</p>
                    <p className="mt-1 font-semibold">{row.rejected} รายการ</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground">ยอดอนุมัติ</p>
                    <p className="mt-1 font-semibold tabular-nums">{formatMoney(row.approvedAmount)}</p>
                  </div>
                </div>
              </article>
            ))}
            {perEmployee.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลสรุปตามเงื่อนไข</p>
            ) : null}
          </div>

          <div className="table-wrap table-section-summary hidden md:block">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>รอตรวจ</th>
                  <th>อนุมัติ</th>
                  <th>จ่ายแล้ว</th>
                  <th>ปฏิเสธ</th>
                  <th>รวมรายการ</th>
                  <th>ยอดอนุมัติ</th>
                  <th>ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {perEmployee.map((row) => (
                  <tr key={row.employee}>
                    <td>{row.employee}</td>
                    <td>{row.department}</td>
                    <td>{row.submitted}</td>
                    <td>{row.approved}</td>
                    <td>{row.paid}</td>
                    <td>{row.rejected}</td>
                    <td>{row.totalClaims}</td>
                    <td>{formatMoney(row.approvedAmount)}</td>
                    <td>{formatMoney(row.totalAmount)}</td>
                  </tr>
                ))}
                {perEmployee.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted-foreground">ยังไม่มีข้อมูลสรุปตามเงื่อนไข</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>รายการรอตรวจ</CardTitle>
          <CardDescription>รายการเบิกที่ส่งแล้วหรืออยู่ระหว่าง finance review</CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimTable claims={pending} emptyText="ไม่พบรายการเบิกรอตรวจตามเงื่อนไข" actionLabel="ตรวจรายการ" tone="pending" returnHref={returnHref} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>รายการอนุมัติแล้ว</CardTitle>
          <CardDescription>รายการเบิกที่อนุมัติแล้วหรือจ่ายเงินแล้ว ตามเงื่อนไขค้นหาปัจจุบัน</CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimTable claims={approved} emptyText="ยังไม่มีรายการอนุมัติแล้วตามเงื่อนไข" actionLabel="ดูรายละเอียด" tone="approved" returnHref={returnHref} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>รายการถูกปฏิเสธ</CardTitle>
          <CardDescription>รายการเบิกที่ถูก reject พร้อมเหตุผลที่จะแสดงให้พนักงานเห็น</CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimTable claims={rejected} emptyText="ยังไม่มีรายการถูกปฏิเสธตามเงื่อนไข" actionLabel="ดูรายละเอียด" showRejectReason tone="rejected" returnHref={returnHref} />
        </CardContent>
      </Card>
    </AppShell>
  );
}

function ClaimTable({
  claims,
  emptyText,
  actionLabel,
  showRejectReason = false,
  tone = "default",
  returnHref = "/finance/claims"
}: {
  claims: ClaimListRow[];
  emptyText: string;
  actionLabel: string;
  showRejectReason?: boolean;
  tone?: "default" | "pending" | "approved" | "rejected";
  returnHref?: string;
}) {
  return (
    <>
      <div className="divide-y md:hidden">
        {claims.map((claim) => (
          <article key={claim.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-all text-xs text-muted-foreground">{claim.claim_no ?? "ยังไม่มีเลขที่เบิก"}</p>
                <h3 className="mt-1 break-words text-base font-semibold leading-snug">{employeeName(claim)}</h3>
                <p className="mt-1 break-words text-sm text-muted-foreground">{claim.merchant_name ?? "ไม่พบชื่อร้านค้า"}</p>
              </div>
              <Badge className="shrink-0" tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 rounded-md bg-muted/60 p-3">
              <div>
                <p className="text-xs text-muted-foreground">ยอดเบิก</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatMoney(claim.total_amount, claim.currency ?? "THB")}
                </p>
              </div>
              <div className="space-y-1.5 text-right text-sm text-muted-foreground">
                <p className="flex items-center justify-end gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {claim.receipt_date ?? "ไม่พบวันที่"}
                </p>
                <p>
                  Duplicate: {claim.duplicate_score ? <Badge tone="amber">{claim.duplicate_score}%</Badge> : "ไม่พบ"}
                </p>
              </div>
            </div>

            {showRejectReason && claim.reject_reason ? (
              <div className="mt-3 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">เหตุผลที่ไม่อนุมัติ</p>
                  <p className="mt-0.5 break-words">{claim.reject_reason}</p>
                </div>
              </div>
            ) : null}

            <Button asChild className="mt-4 min-h-11 w-full" variant={tone === "pending" ? "default" : "outline"}>
              <Link href={`/finance/claims/${claim.id}?returnTo=${encodeURIComponent(returnHref)}`}>
                <Eye className="h-4 w-4" aria-hidden />
                {actionLabel}
              </Link>
            </Button>
          </article>
        ))}
        {claims.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : null}
      </div>

      <div className={`table-wrap table-section-${tone} hidden md:block`}>
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Employee</th>
              <th>Date</th>
              <th>Merchant</th>
              <th>Total</th>
              <th>Duplicate</th>
              <th>Status</th>
              {showRejectReason ? <th>เหตุผล</th> : null}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.claim_no}</td>
                <td>{employeeName(claim)}</td>
                <td>{claim.receipt_date ?? "-"}</td>
                <td>{claim.merchant_name ?? "-"}</td>
                <td>{formatMoney(claim.total_amount, claim.currency ?? "THB")}</td>
                <td>{claim.duplicate_score ? <Badge tone="amber">{claim.duplicate_score}%</Badge> : "-"}</td>
                <td><Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge></td>
                {showRejectReason ? <td className="max-w-md text-sm text-red-700">{claim.reject_reason ?? "-"}</td> : null}
                <td><Link className="text-primary" href={`/finance/claims/${claim.id}?returnTo=${encodeURIComponent(returnHref)}`}>{actionLabel}</Link></td>
              </tr>
            ))}
            {claims.length === 0 ? (
              <tr>
                <td colSpan={showRejectReason ? 9 : 8} className="text-center text-muted-foreground">{emptyText}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
