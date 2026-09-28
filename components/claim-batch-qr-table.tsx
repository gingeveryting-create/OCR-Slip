"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Eye, Gauge, QrCode } from "lucide-react";
import { ClaimActions } from "@/components/claim-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { claimStatusLabel, claimStatusTone } from "@/lib/status-labels";
import { formatMoney } from "@/lib/utils";

type EmployeeClaimRow = {
  id: string;
  claim_no: string | null;
  merchant_name: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string | null;
  status: string | null;
  reject_reason: string | null;
  confidence_score: number | null;
};

export function ClaimBatchQrTable({ claims }: { claims: EmployeeClaimRow[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectableClaims = useMemo(
    () => claims.filter((claim) => ["SUBMITTED", "FINANCE_REVIEW", "APPROVED", "REJECTED", "PAID"].includes(claim.status ?? "")),
    [claims]
  );
  const selectableIds = useMemo(() => new Set(selectableClaims.map((claim) => claim.id)), [selectableClaims]);
  const allSelected = selectableClaims.length > 0 && selectableClaims.every((claim) => selectedIds.includes(claim.id));
  const qrHref = `/claims/qr?ids=${encodeURIComponent(selectedIds.join(","))}`;

  function toggleClaim(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((claimId) => claimId !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : selectableClaims.map((claim) => claim.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">QR รวมหลายรายการ</p>
          <p className="text-sm text-muted-foreground">เลือกรายการเบิกที่ส่งให้การเงินตรวจ แล้วสร้าง QR เดียวเพื่อเปิดเป็นรายการชุดเดียว</p>
        </div>
        {selectedIds.length ? (
          <Button asChild className="min-h-11 w-full sm:w-auto">
            <Link href={qrHref}>
              <QrCode className="h-4 w-4" aria-hidden />
              สร้าง QR รวม ({selectedIds.length})
            </Link>
          </Button>
        ) : (
          <Button disabled className="min-h-11 w-full sm:w-auto">
            <QrCode className="h-4 w-4" aria-hidden />
            สร้าง QR รวม (0)
          </Button>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {selectableClaims.length ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-5 w-5 rounded border-input accent-primary"
            />
            เลือกรายการที่สร้าง QR ได้ทั้งหมด ({selectableClaims.length})
          </label>
        ) : null}

        {claims.map((claim) => {
          const canSelect = selectableIds.has(claim.id);
          const canDelete = ["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(claim.status ?? "");

          return (
            <article key={claim.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {canSelect ? (
                  <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border bg-background">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(claim.id)}
                      onChange={() => toggleClaim(claim.id)}
                      aria-label={`เลือกรายการ ${claim.claim_no ?? claim.id} สำหรับ QR รวม`}
                      className="h-5 w-5 rounded border-input accent-primary"
                    />
                  </label>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="break-all text-xs text-muted-foreground">{claim.claim_no ?? "ยังไม่มีเลขที่เบิก"}</p>
                  <h3 className="mt-1 break-words text-base font-semibold leading-snug">
                    {claim.merchant_name ?? "ไม่พบชื่อร้านค้า"}
                  </h3>
                </div>

                <Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3 border-y py-3">
                <div>
                  <p className="text-xs text-muted-foreground">ยอดเบิก</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {formatMoney(claim.total_amount, claim.currency ?? "THB")}
                  </p>
                </div>
                <div className="space-y-1.5 text-right text-sm text-muted-foreground">
                  <p className="flex items-center justify-end gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    {claim.receipt_date ?? "ไม่พบวันที่"}
                  </p>
                  <p className="flex items-center justify-end gap-1.5">
                    <Gauge className="h-4 w-4" aria-hidden />
                    ความมั่นใจ {claim.confidence_score ?? "-"}%
                  </p>
                </div>
              </div>

              {claim.reject_reason ? (
                <div className="mt-3 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium">เหตุผลที่ไม่อนุมัติ</p>
                    <p className="mt-0.5 break-words">{claim.reject_reason}</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link href={`/claims/${claim.id}`}>
                    <Eye className="h-4 w-4" aria-hidden />
                    ดูรายละเอียด
                  </Link>
                </Button>
                <ClaimActions claimId={claim.id} canDelete={canDelete} mobile />
              </div>
            </article>
          );
        })}

        {!claims.length ? (
          <div className="rounded-lg border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            ไม่พบรายการเบิกในช่วงที่เลือก
          </div>
        ) : null}
      </div>

      <div className="table-wrap hidden md:block">
        <table>
          <thead>
            <tr>
              <th className="w-12">
                <input
                  aria-label="เลือกรายการเบิกทั้งหมด"
                  checked={allSelected}
                  disabled={selectableClaims.length === 0}
                  type="checkbox"
                  onChange={toggleAll}
                />
              </th>
              <th>เลขที่เบิก</th>
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
            {claims.map((claim) => {
              const canSelect = selectableIds.has(claim.id);
              return (
                <tr key={claim.id}>
                  <td>
                    <input
                aria-label={`เลือกรายการเบิก ${claim.claim_no ?? claim.id}`}
                      checked={selectedIds.includes(claim.id)}
                      disabled={!canSelect}
                      type="checkbox"
                      onChange={() => toggleClaim(claim.id)}
                    />
                  </td>
                  <td>{claim.claim_no ?? "-"}</td>
                  <td>{claim.merchant_name ?? "-"}</td>
                  <td>{claim.receipt_date ?? "-"}</td>
                  <td>{formatMoney(claim.total_amount, claim.currency ?? "THB")}</td>
                  <td>{claim.confidence_score ?? "-"}</td>
                  <td className="max-w-sm text-sm text-red-700">{claim.status === "REJECTED" ? claim.reject_reason ?? "-" : "-"}</td>
                  <td><Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm"><Link href={`/claims/${claim.id}`}>Open</Link></Button>
                      <ClaimActions claimId={claim.id} canDelete={["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(claim.status ?? "")} compact />
                    </div>
                  </td>
                </tr>
              );
            })}
            {claims.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted-foreground">ยังไม่มีรายการเบิก</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
