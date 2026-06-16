import type { ClaimStatus } from "@/types/database";

export const claimStatusLabels: Record<ClaimStatus, string> = {
  DRAFT: "ร่าง",
  OCR_PROCESSING: "กำลังอ่าน OCR",
  OCR_FAILED: "OCR ล้มเหลว",
  EXTRACTED: "อ่านข้อมูลแล้ว",
  SUBMITTED: "ส่งแล้ว",
  FINANCE_REVIEW: "การเงินกำลังตรวจ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกปฏิเสธ",
  PAID: "จ่ายเงินแล้ว",
  CANCELLED: "ยกเลิก"
};

export function claimStatusLabel(status?: string | null) {
  return claimStatusLabels[status as ClaimStatus] ?? status ?? "-";
}

export function claimStatusTone(status?: string | null) {
  switch (status) {
    case "APPROVED":
    case "PAID":
    case "EXTRACTED":
      return "green";
    case "REJECTED":
    case "OCR_FAILED":
    case "CANCELLED":
      return "red";
    case "OCR_PROCESSING":
    case "FINANCE_REVIEW":
    case "SUBMITTED":
      return "amber";
    default:
      return "gray";
  }
}
