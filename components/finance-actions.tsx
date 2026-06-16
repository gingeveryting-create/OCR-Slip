"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FinanceActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function approve() {
    const response = await fetch(`/api/finance/claims/${claimId}/approve`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) setMessage(payload.error ?? "Approve failed");
    else {
      setMessage("อนุมัติแล้ว");
      router.refresh();
    }
  }

  async function reject() {
    const response = await fetch(`/api/finance/claims/${claimId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const payload = await response.json();
    if (!response.ok) setMessage(payload.error ?? "Reject failed");
    else {
      setMessage("Reject แล้ว");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={approve}>
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Approve
        </Button>
        <Button variant="destructive" onClick={reject} disabled={reason.trim().length < 3}>
          <XCircle className="h-4 w-4" aria-hidden />
          Reject
        </Button>
      </div>
      <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="เหตุผลการ reject" />
      {message ? <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">{message}</p> : null}
    </div>
  );
}
