"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClaimActions({
  claimId,
  canDelete = true,
  compact = false,
  mobile = false
}: {
  claimId: string;
  canDelete?: boolean;
  compact?: boolean;
  mobile?: boolean;
}) {
  const router = useRouter();

  async function deleteClaim() {
    const confirmed = window.confirm("ลบรายการเบิกนี้หรือไม่? ไฟล์ใบเสร็จที่อัปโหลดไว้จะถูกลบด้วย");
    if (!confirmed) return;

    const response = await fetch(`/api/claims/${claimId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      window.alert(payload.error ?? "Delete failed");
      return;
    }

    router.push("/claims");
    router.refresh();
  }

  return (
    <div className={mobile ? `grid gap-2 ${canDelete ? "grid-cols-2" : "grid-cols-1"}` : "flex flex-wrap gap-2"}>
      <Button
        asChild
        variant="outline"
        size={compact ? "sm" : "default"}
        className={mobile ? "min-h-11 w-full" : undefined}
      >
        <Link href={`/claims/${claimId}/qr`}>
          <QrCode className="h-4 w-4" aria-hidden />
          {mobile ? "ดู QR" : "Generate QR"}
        </Link>
      </Button>
      {canDelete ? (
        <Button
          variant="destructive"
          size={compact ? "sm" : "default"}
          className={mobile ? "min-h-11 w-full" : undefined}
          onClick={deleteClaim}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {mobile ? "ลบรายการ" : "Delete"}
        </Button>
      ) : null}
    </div>
  );
}
