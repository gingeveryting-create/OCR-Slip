"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClaimActions({
  claimId,
  canDelete = true,
  compact = false
}: {
  claimId: string;
  canDelete?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  async function deleteClaim() {
    const confirmed = window.confirm("Delete this claim? This will also remove its uploaded receipt file.");
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
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size={compact ? "sm" : "default"}>
        <Link href={`/claims/${claimId}/qr`}>
          <QrCode className="h-4 w-4" aria-hidden />
          Generate QR
        </Link>
      </Button>
      {canDelete ? (
        <Button variant="destructive" size={compact ? "sm" : "default"} onClick={deleteClaim}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </Button>
      ) : null}
    </div>
  );
}
