import { AppShell } from "@/components/app-shell";
import { UploadReceiptForm } from "@/components/upload-receipt-form";

export default function NewClaimPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">อัปโหลด Receipt / Slip</h2>
        <p className="text-muted-foreground">รองรับภาพจากไฟล์หรือกล้องมือถือ ระบบจะ OCR ก่อนให้แก้ไขเฉพาะจุดที่ผิด</p>
      </div>
      <UploadReceiptForm />
    </AppShell>
  );
}
