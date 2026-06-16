"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fields = [
  ["merchantName", "Merchant"],
  ["receiptNo", "Receipt No."],
  ["taxInvoiceNo", "Tax Invoice No."],
  ["receiptDate", "Receipt Date"],
  ["receiptTime", "Receipt Time"],
  ["totalAmount", "Total Amount"],
  ["amountBeforeVat", "Amount Before VAT"],
  ["vatAmount", "VAT Amount"],
  ["taxId", "Tax ID"],
  ["branchNo", "Branch No."],
  ["paymentMethod", "Payment Method"],
  ["bankName", "Bank"],
  ["senderName", "Sender"],
  ["senderAccount", "Sender Account"],
  ["receiverName", "Receiver"],
  ["receiverAccount", "Receiver Account"],
  ["transactionId", "Transaction ID"],
  ["referenceNo", "Reference No."],
  ["currency", "Currency"]
] as const;

export function ClaimReviewForm({ claim, signedUrl }: { claim: any; signedUrl: string | null }) {
  const router = useRouter();
  const extraction = claim.extracted_json;
  const initial = useMemo(() => {
    const values: Record<string, any> = {};
    fields.forEach(([key]) => {
      values[key] = claim.confirmed_json?.[key] ?? extraction?.fields?.[key]?.value ?? "";
    });
    values.address = claim.confirmed_json?.address ?? extraction?.fields?.address?.value ?? "";
    values.qrData = claim.confirmed_json?.qrData ?? extraction?.fields?.qrData?.value ?? "";
    return values;
  }, [claim, extraction]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function confidence(key: string) {
    const value = extraction?.fields?.[key]?.confidence;
    return typeof value === "number" ? Math.round(value * 100) : null;
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/claims/${claim.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "Save failed");
      return false;
    }
    setMessage("บันทึกข้อมูลที่แก้ไขแล้ว");
    router.refresh();
    return true;
  }

  async function submit() {
    const saved = await save();
    if (!saved) return;
    const response = await fetch(`/api/claims/${claim.id}/submit`, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "Submit failed");
      return;
    }
    router.push(`/claims/${claim.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>เอกสารต้นฉบับ</CardTitle>
          <CardDescription>ใช้ภาพนี้เทียบกับค่าที่ OCR อ่านได้</CardDescription>
        </CardHeader>
        <CardContent>
          {signedUrl ? (
            claim.expense_attachments?.[0]?.mime_type === "application/pdf" ? (
              <iframe className="h-[720px] w-full rounded-md border" src={signedUrl} title="Receipt PDF" />
            ) : (
              <Image src={signedUrl} alt="Original receipt" width={760} height={980} className="max-h-[760px] w-full rounded-md object-contain" />
            )
          ) : (
            <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">ไม่มี signed URL สำหรับไฟล์นี้</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ตรวจข้อมูลที่ OCR อ่านได้</CardTitle>
          <CardDescription>ช่อง confidence ต่ำจะแสดงพื้นหลังอ่อน ให้แก้เฉพาะค่าที่ผิดหรือไม่มั่นใจ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.isArray(extraction?.warnings) && extraction.warnings.length ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {extraction.warnings.join(" ")}
            </div>
          ) : null}
          <div className="field-grid">
            {fields.map(([key, label]) => {
              const score = confidence(key);
              const low = score !== null && score < 70;
              return (
                <div className="space-y-2" key={key}>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={key}>{label}</Label>
                    <span className={low ? "text-xs font-medium text-amber-700" : "text-xs text-muted-foreground"}>
                      {score === null ? "-" : `${score}%`}
                    </span>
                  </div>
                  <Input
                    id={key}
                    className={low ? "border-amber-300 bg-amber-50" : ""}
                    value={form[key] ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  />
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={form.address ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qrData">QR Data</Label>
            <Textarea id="qrData" value={form.qrData ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, qrData: event.target.value }))} />
          </div>
          {message ? <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">{message}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={save} disabled={saving}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              บันทึกการแก้ไข
            </Button>
            <Button onClick={submit} disabled={saving}>
              <Send className="h-4 w-4" aria-hidden />
              Submit Claim
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
