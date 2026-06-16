import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils";

const importantFields = [
  ["merchantName", "merchant_name", "Merchant"],
  ["receiptNo", "receipt_no", "Receipt No."],
  ["taxInvoiceNo", "tax_invoice_no", "Tax Invoice No."],
  ["receiptDate", "receipt_date", "Receipt Date"],
  ["receiptTime", "receipt_time", "Receipt Time"],
  ["totalAmount", "total_amount", "Total Amount"],
  ["amountBeforeVat", "amount_before_vat", "Amount Before VAT"],
  ["vatAmount", "vat_amount", "VAT Amount"],
  ["taxId", "tax_id", "Tax ID"],
  ["paymentMethod", "payment_method", "Payment Method"],
  ["bankName", "bank_name", "Bank"],
  ["transactionId", "transaction_id", "Transaction ID"],
  ["referenceNo", "reference_no", "Reference No."],
  ["currency", "currency", "Currency"]
] as const;

function extractedValue(claim: any, jsonKey: string) {
  return claim.extracted_json?.fields?.[jsonKey]?.value ?? null;
}

function displayValue(value: unknown, currency?: string | null) {
  if (value == null || value === "") return "";
  if (typeof value === "number") return formatMoney(value, currency ?? undefined);
  return String(value);
}

export function FinanceReviewData({ claim, changed }: { claim: any; changed: string[] }) {
  const confirmed = claim.confirmed_json ?? {};

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {importantFields.map(([jsonKey, dbKey, label]) => {
          const confirmedValue = confirmed[jsonKey] ?? claim[dbKey];
          const originalValue = extractedValue(claim, jsonKey);
          const isChanged = changed.includes(jsonKey) || String(originalValue ?? "") !== String(confirmedValue ?? "");
          return (
            <div className="space-y-2" key={jsonKey}>
              <div className="flex items-center justify-between gap-2">
                <Label>{label}</Label>
                {isChanged ? <Badge tone="amber">แก้ไขแล้ว</Badge> : null}
              </div>
              <Input readOnly value={displayValue(confirmedValue, claim.currency)} className={isChanged ? "border-amber-400 bg-amber-50" : ""} />
              <p className="text-xs text-muted-foreground">OCR: {displayValue(originalValue, claim.currency) || "-"}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Textarea readOnly value={String(confirmed.address ?? claim.address ?? "")} />
      </div>

      {claim.duplicate_warning ? (
        <details className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" open>
          <summary className="cursor-pointer font-semibold">Duplicate warning</summary>
          <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(claim.duplicate_warning, null, 2)}</pre>
        </details>
      ) : null}

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer font-semibold">ดู JSON เพิ่มเติม</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">Extracted JSON</h3>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(claim.extracted_json, null, 2)}</pre>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Confirmed data</h3>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(claim.confirmed_json, null, 2)}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}
