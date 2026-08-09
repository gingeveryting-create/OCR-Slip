"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { QrCode } from "lucide-react";
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
      <div className="flex flex-col justify-between gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">QR รวมหลายรายการ</p>
          <p className="text-sm text-muted-foreground">เลือกรายการเบิกที่ส่งให้การเงินตรวจ แล้วสร้าง QR เดียวเพื่อเปิดเป็นรายการชุดเดียว</p>
        </div>
        {selectedIds.length ? (
          <Button asChild>
            <Link href={qrHref}>
              <QrCode className="h-4 w-4" aria-hidden />
              Generate QR ({selectedIds.length})
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <QrCode className="h-4 w-4" aria-hidden />
            Generate QR (0)
          </Button>
        )}
      </div>

      <div className="table-wrap">
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
              const canSelect = selectableClaims.some((selectableClaim) => selectableClaim.id === claim.id);
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
