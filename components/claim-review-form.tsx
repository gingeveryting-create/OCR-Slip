"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CalendarDays, CheckCircle2, FileText, Hash, Save, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils";

const documentTypeOptions = [
  ["RECEIPT", "ใบเสร็จ"],
  ["BANK_SLIP", "สลิปธนาคาร"],
  ["TAX_INVOICE_SHORT", "ใบกำกับภาษีอย่างย่อ"],
  ["TAX_INVOICE_FULL", "ใบกำกับภาษีเต็มรูป"],
  ["RESTAURANT_RECEIPT", "ใบเสร็จร้านอาหาร"],
  ["FUEL_RECEIPT", "ใบเสร็จค่าน้ำมัน"],
  ["HOTEL_RECEIPT", "ใบเสร็จโรงแรม"],
  ["TRAVEL_RECEIPT", "ใบเสร็จเดินทาง"],
  ["POS_RECEIPT", "สลิป POS"],
  ["GOODS_REIMBURSEMENT", "ใบเบิกสินค้า"],
  ["UNKNOWN", "ไม่ทราบประเภท"]
] as const;

const detailFields = [
  ["receiptNo", "เลขที่ใบเสร็จ"],
  ["taxInvoiceNo", "เลขที่ใบกำกับภาษี"],
  ["receiptTime", "เวลา"],
  ["taxId", "เลขประจำตัวผู้เสียภาษี"],
  ["branchNo", "สาขา"],
  ["paymentMethod", "วิธีชำระเงิน"],
  ["bankName", "ธนาคาร"],
  ["senderName", "ผู้โอน"],
  ["senderAccount", "บัญชีผู้โอน"],
  ["receiverName", "ผู้รับ"],
  ["receiverAccount", "บัญชีผู้รับ"],
  ["transactionId", "Transaction ID"],
  ["referenceNo", "Reference No."],
  ["currency", "สกุลเงิน"]
] as const;

function fieldValue(extraction: any, key: string) {
  return extraction?.fields?.[key]?.value ?? "";
}

function confidence(extraction: any, key: string) {
  const value = extraction?.fields?.[key]?.confidence;
  return typeof value === "number" ? Math.round(value * 100) : null;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function extractAmountsFromText(value?: string | null) {
  if (!value) return [];
  const normalized = value
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[๐]/g, "0")
    .replace(/[๑]/g, "1")
    .replace(/[๒]/g, "2")
    .replace(/[๓]/g, "3")
    .replace(/[๔]/g, "4")
    .replace(/[๕]/g, "5")
    .replace(/[๖]/g, "6")
    .replace(/[๗]/g, "7")
    .replace(/[๘]/g, "8")
    .replace(/[๙]/g, "9");
  return Array.from(normalized.matchAll(/(?:^|[^\d])(\d{1,3}(?:[,.]\d{3})+[,.]\d{2}|\d{1,6}[,.]\d{2}|\d{2,6})(?=$|[^\d])/g))
    .map((match) => normalizeNumber(match[1]))
    .filter((amount): amount is number => amount != null && amount >= 1);
}

function bankSlipAmountFallback(extraction: any) {
  const rawText = String(extraction?.rawText ?? "");
  const amountAnchor = /(จำนวน|จํานวน|จ\s*[ํำ]\s*า\s*น\s*ว\s*น|amount)/i;
  const match = rawText.match(new RegExp(`${amountAnchor.source}[\\s\\S]{0,180}`, "i"));
  const amounts = extractAmountsFromText(match?.[0] ?? "");
  if (amounts.length) return amounts[0];
  const afterReference = rawText.match(/(เลขที่รายการ|เลขทีรายการ|transaction)[\s\S]{0,260}/i);
  return extractAmountsFromText(afterReference?.[0] ?? "")[0] ?? null;
}

function scoreLabel(score: number | null) {
  return score === null ? "-" : `${score}%`;
}

export function ClaimReviewForm({ claim, signedUrl }: { claim: any; signedUrl: string | null }) {
  const router = useRouter();
  const extraction = claim.extracted_json;
  const initial = useMemo(() => {
    const values: Record<string, any> = {};
    values.documentType = claim.confirmed_json?.documentType ?? claim.document_type ?? extraction?.documentType ?? "UNKNOWN";
    values.merchantName = claim.confirmed_json?.merchantName ?? fieldValue(extraction, "merchantName") ?? "";
    values.receiptDate = claim.confirmed_json?.receiptDate ?? fieldValue(extraction, "receiptDate") ?? "";
    const extractedTotal = claim.confirmed_json?.totalAmount ?? fieldValue(extraction, "totalAmount");
    values.totalAmount = normalizeNumber(extractedTotal) ?? (values.documentType === "BANK_SLIP" ? bankSlipAmountFallback(extraction) ?? "" : "");
    values.amountBeforeVat = claim.confirmed_json?.amountBeforeVat ?? fieldValue(extraction, "amountBeforeVat") ?? "";
    values.vatAmount = claim.confirmed_json?.vatAmount ?? fieldValue(extraction, "vatAmount") ?? "";
    detailFields.forEach(([key]) => {
      values[key] = claim.confirmed_json?.[key] ?? fieldValue(extraction, key) ?? "";
    });
    values.address = claim.confirmed_json?.address ?? fieldValue(extraction, "address") ?? "";
    values.qrData = claim.confirmed_json?.qrData ?? fieldValue(extraction, "qrData") ?? "";
    return values;
  }, [claim, extraction]);

  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      setMessage(payload.error ?? "บันทึกไม่สำเร็จ");
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
      setMessage(payload.error ?? "ส่งรายการเบิกไม่สำเร็จ");
      return;
    }
    router.push(`/claims/${claim.id}`);
    router.refresh();
  }

  const displayTotal = normalizeNumber(form.totalAmount) ?? 0;
  const isBankSlip = form.documentType === "BANK_SLIP";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card className="overflow-hidden rounded-xl border-slate-200">
        <CardHeader className="border-b bg-white p-4">
          <CardTitle className="text-base">ภาพถ่ายใบเสร็จ</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {signedUrl ? (
            claim.expense_attachments?.[0]?.mime_type === "application/pdf" ? (
              <iframe className="h-[520px] w-full rounded-lg border" src={signedUrl} title="Receipt PDF" />
            ) : (
              <Image src={signedUrl} alt="Original receipt" width={980} height={760} className="max-h-[520px] w-full rounded-lg bg-slate-100 object-contain" />
            )
          ) : (
            <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">ไม่มี signed URL สำหรับไฟล์นี้</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200">
        <CardHeader className="p-4">
          <CardTitle className="text-lg">ตรวจสอบข้อมูล OCR</CardTitle>
          <CardDescription>แก้เฉพาะข้อมูลที่ OCR อ่านผิดหรือไม่มั่นใจ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0">
          {Array.isArray(extraction?.warnings) && extraction.warnings.length ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {extraction.warnings.join(" ")}
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="merchantName">{isBankSlip ? "ผู้รับเงิน / ร้านค้า" : "ชื่อร้านค้า"}</Label>
                <span className="text-xs text-muted-foreground">{scoreLabel(confidence(extraction, "merchantName"))}</span>
              </div>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input id="merchantName" className="pl-9" value={form.merchantName ?? ""} onChange={(event) => updateField("merchantName", event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="receiptDate">วันที่ทำรายการ</Label>
                <span className="text-xs text-muted-foreground">{scoreLabel(confidence(extraction, "receiptDate"))}</span>
              </div>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input id="receiptDate" className="pl-9" type="date" value={form.receiptDate ?? ""} onChange={(event) => updateField("receiptDate", event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">ประเภทเอกสาร</Label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <select
                  id="documentType"
                  className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.documentType ?? "UNKNOWN"}
                  onChange={(event) => updateField("documentType", event.target.value)}
                >
                  {documentTypeOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
                <span className="text-xs text-muted-foreground">{scoreLabel(confidence(extraction, "taxId"))}</span>
              </div>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input id="taxId" className="pl-9" value={form.taxId ?? ""} onChange={(event) => updateField("taxId", event.target.value)} />
              </div>
            </div>
          </section>

          {isBankSlip ? (
            <section className="space-y-3 rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-700" />
                <h3 className="font-semibold">ข้อมูลสลิปโอนเงิน</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["bankName", "ธนาคาร/แอป"],
                  ["senderName", "ผู้โอน"],
                  ["senderAccount", "บัญชีผู้โอน"],
                  ["receiverName", "ผู้รับเงิน"],
                  ["receiverAccount", "บัญชีผู้รับ"],
                  ["transactionId", "เลขที่รายการ"],
                  ["referenceNo", "เลขอ้างอิง"],
                  ["paymentMethod", "วิธีชำระเงิน"]
                ].map(([key, label]) => {
                  const score = confidence(extraction, key);
                  const low = score !== null && score < 70;
                  return (
                    <div className="space-y-2" key={key}>
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={key}>{label}</Label>
                        <span className={low ? "text-xs font-medium text-amber-700" : "text-xs text-muted-foreground"}>{scoreLabel(score)}</span>
                      </div>
                      <Input id={key} className={low ? "border-amber-300 bg-amber-50" : ""} value={form[key] ?? ""} onChange={(event) => updateField(key, event.target.value)} />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div className="grid grid-cols-[1fr_140px] items-center gap-3">
              <Label htmlFor="amountBeforeVat">ยอดก่อนภาษี</Label>
              <Input id="amountBeforeVat" className="text-right" inputMode="decimal" value={form.amountBeforeVat ?? ""} onChange={(event) => updateField("amountBeforeVat", event.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_140px] items-center gap-3">
              <Label htmlFor="vatAmount">ภาษีมูลค่าเพิ่ม</Label>
              <Input id="vatAmount" className="text-right" inputMode="decimal" value={form.vatAmount ?? ""} onChange={(event) => updateField("vatAmount", event.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_140px] items-center gap-3 border-t pt-3">
              <Label htmlFor="totalAmount" className="font-bold">ยอดรวมสุดท้าย</Label>
              <Input id="totalAmount" className="text-right font-bold" inputMode="decimal" value={form.totalAmount ?? ""} onChange={(event) => updateField("totalAmount", event.target.value)} />
            </div>
            <p className="text-right text-xs text-muted-foreground">ตรวจสอบยอดก่อนบันทึก เพราะ OCR อาจอ่านตัวเลขคลาดเคลื่อน</p>
          </section>

          <details className="rounded-lg border bg-white">
            <summary className="cursor-pointer p-4 text-sm font-semibold">ข้อมูลเพิ่มเติมที่ OCR อ่านได้</summary>
            <div className="space-y-4 border-t p-4">
              <div className="field-grid">
                {detailFields.map(([key, label]) => {
                  const score = confidence(extraction, key);
                  const low = score !== null && score < 70;
                  return (
                    <div className="space-y-2" key={key}>
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={key}>{label}</Label>
                        <span className={low ? "text-xs font-medium text-amber-700" : "text-xs text-muted-foreground"}>{scoreLabel(score)}</span>
                      </div>
                      <Input id={key} className={low ? "border-amber-300 bg-amber-50" : ""} value={form[key] ?? ""} onChange={(event) => updateField(key, event.target.value)} />
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่</Label>
                <Textarea id="address" value={form.address ?? ""} onChange={(event) => updateField("address", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrData">QR Data</Label>
                <Textarea id="qrData" value={form.qrData ?? ""} onChange={(event) => updateField("qrData", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Raw text</Label>
                <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">{extraction?.rawText ?? "-"}</pre>
              </div>
            </div>
          </details>

          {message ? <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">{message}</p> : null}
          <div className="sticky bottom-20 z-10 grid grid-cols-2 gap-3 bg-[#fbf8fb]/95 py-3 backdrop-blur lg:static lg:bg-transparent lg:py-0">
            <Button variant="outline" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" aria-hidden />
              บันทึกร่าง
            </Button>
            <Button onClick={submit} disabled={saving} className="bg-slate-950 hover:bg-slate-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              ยืนยันข้อมูล
            </Button>
          </div>
          <p className="sr-only">{formatMoney(displayTotal, form.currency ?? "THB")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
