import path from "node:path";
import { createWorker } from "tesseract.js";
import type { OcrExtractionResult, OcrProvider } from "@/lib/ocr/types";

function emptyField<T extends string | number | null>(value: T = null as T, confidence = 0.2) {
  return { value, confidence };
}

function normalizeAmount(value?: string | null) {
  if (!value) return null;
  const amount = extractAmounts(value)[0];
  return amount >= 10 ? amount : null;
}

function parseAmountToken(token: string) {
  const cleaned = token.replace(/\s/g, "");
  if (!cleaned) return null;
  const separators = cleaned.match(/[,.]/g) ?? [];
  if (separators.length >= 2) {
    const parts = cleaned.split(/[,.]/);
    const decimal = parts.pop() ?? "";
    const integer = parts.join("");
    const amount = Number(`${integer}.${decimal}`);
    return Number.isFinite(amount) ? amount : null;
  }
  if (separators.length === 1) {
    const [integer, fraction] = cleaned.split(/[,.]/);
    const amount = fraction.length === 3 ? Number(`${integer}${fraction}`) : Number(`${integer}.${fraction}`);
    return Number.isFinite(amount) ? amount : null;
  }
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function extractAmounts(text?: string | null) {
  if (!text) return [];
  const matches = Array.from(text.matchAll(/(?:^|[^\d])(\d{1,3}(?:[,.]\d{3})+[,.]\d{2}|\d{1,6}[,.]\d{2}|\d{2,6})(?=$|[^\d])/g));
  return matches
    .map((match) => parseAmountToken(match[1]))
    .filter((amount): amount is number => amount != null && amount >= 10);
}

function amountsOnLine(line?: string | null) {
  return extractAmounts(line);
}

function lastAmountOnLine(line?: string | null) {
  const amounts = amountsOnLine(line);
  return amounts.length ? amounts[amounts.length - 1] : null;
}

function decimalAmounts(text: string) {
  return extractAmounts(text).filter((amount) => !Number.isInteger(amount));
}

function repeatedDecimalAmount(text: string) {
  const counts = new Map<number, number>();
  for (const amount of decimalAmounts(text)) {
    counts.set(amount, (counts.get(amount) ?? 0) + 1);
  }
  const repeated = Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return repeated[0]?.[0] ?? null;
}

function largestDecimalAmount(text: string) {
  const amounts = decimalAmounts(text).filter((amount) => amount < 1_000_000);
  return amounts.length ? Math.max(...amounts) : null;
}

function amountFromTotalishLines(lines: string[]) {
  const totalish = /total|amount|balance|grand|net|due|sum|รวม|ยอด|สุทธิ|ทั้งหมด|ชำระ|ชําระ|ทั้ง\s*หมด/i;
  const candidateLines = lines.filter((line) => totalish.test(line));
  const direct = candidateLines
    .map((line) => lastAmountOnLine(line))
    .filter((amount): amount is number => amount != null);
  if (direct.length) return Math.max(...direct);
  if (candidateLines.length >= 2) return largestDecimalAmount(lines.join("\n"));
  return null;
}

function currencyAmount(text: string) {
  const match = text.replace(/,/g, "").match(/\b(?:THB|BAHT)\s*([0-9]{2,6}(?:\.\d{1,2})?)/i);
  if (!match?.[1]) return null;
  return normalizeAmount(match[1]);
}

function amountNear(lines: string[], patterns: RegExp[], options: { lookAhead?: number; max?: number } = {}) {
  const lookAhead = options.lookAhead ?? 0;
  for (const pattern of patterns) {
    const index = lines.findIndex((item) => pattern.test(item));
    if (index < 0) continue;
    for (let offset = 0; offset <= lookAhead; offset += 1) {
      const amount = lastAmountOnLine(lines[index + offset]);
      if (amount != null && (options.max == null || amount <= options.max)) return amount;
    }
  }
  return null;
}

function amountAfterLine(lines: string[], anchor: RegExp, options: { lookAhead?: number; min?: number; max?: number } = {}) {
  const index = lines.findIndex((item) => anchor.test(item));
  if (index < 0) return null;
  const lookAhead = options.lookAhead ?? 3;
  const min = options.min ?? 1;
  for (let offset = 1; offset <= lookAhead; offset += 1) {
    const amount = lastAmountOnLine(lines[index + offset]);
    if (amount != null && amount >= min && (options.max == null || amount <= options.max)) return amount;
  }
  return null;
}

function findFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function parseDate(text: string) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (!dmy) return null;
  let year = Number(dmy[3]);
  if (year >= 50 && year < 100) year = 2500 + year - 543;
  else if (year < 100) year += 2000;
  if (year > 2400) year -= 543;
  return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
}

function cleanMerchant(line?: string | null) {
  if (!line) return null;
  const knownBrand = line.match(/\b(Sizzler|Starbucks|Amazon|Big\s*C|Lotus'?s?|Makro|McDonald'?s?|KFC|7[- ]?Eleven)\b/i);
  if (knownBrand?.[1]) return knownBrand[1].replace(/\s+/g, " ").trim();
  const merchantMatch = line.match(/([A-Za-z][A-Za-z &.,'()-]*(?:Cafe|Restaurant|Company|Co\.?|Ltd\.?)[A-Za-z &.,'()-]*)/i);
  if (merchantMatch?.[1]) {
    return merchantMatch[1].replace(/\s+\|.*$/, "").replace(/\s+/g, " ").trim();
  }
  const cleaned = line
    .replace(/^[^A-Za-z]+/, "")
    .replace(/\s+\|.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function detectPaymentMethod(text: string) {
  if (/mastercard/i.test(text)) return "Mastercard";
  if (/visa/i.test(text)) return "Visa";
  if (/\bcard\b|\*{4,}\d{4}|\bSALE\b|à¸šà¸±à¸•à¸£\s*à¹€à¸„à¸£à¸”à¸´à¸•|à¸š à¸± à¸• à¸£ à¹€à¸„ à¸£ à¸” à¸´ à¸•/i.test(text)) return "Card";
  if (/\bcash\b/i.test(text)) return "Cash";
  return null;
}

function detectBankName(text: string) {
  if (/bangkok\s*bank|à¸˜à¸™à¸²à¸„à¸²à¸£à¸à¸£à¸¸à¸‡à¹€à¸—à¸ž/i.test(text)) return "Bangkok Bank";
  if (/kasikorn|kbank|à¸à¸ªà¸´à¸à¸£/i.test(text)) return "Kasikorn Bank";
  if (/siam\s*commercial|scb|à¹„à¸—à¸¢à¸žà¸²à¸“à¸´à¸Šà¸¢à¹Œ/i.test(text)) return "SCB";
  if (/krungthai|à¸à¸£à¸¸à¸‡à¹„à¸—à¸¢/i.test(text)) return "Krungthai Bank";
  if (/krungsri|à¸à¸£à¸¸à¸‡à¸¨à¸£à¸µ/i.test(text)) return "Krungsri";
  if (/ttb|à¸—à¸«à¸²à¸£à¹„à¸—à¸¢|à¸˜à¸™à¸Šà¸²à¸•/i.test(text)) return "TTB";
  return null;
}

function detectDocumentType(text: string) {
  if (/\bSALE\b|merchant\s*copy|customer\s*copy|\btrace\b|\bapp\s*code\b|\btid\b|\bmid\b/i.test(text)) return "POS_RECEIPT";
  if (/transfer|transaction|sender|receiver|à¸žà¸£à¹‰à¸­à¸¡à¹€à¸žà¸¢à¹Œ|promptpay/i.test(text)) return "BANK_SLIP";
  if (/à¹ƒà¸š\s*à¸£à¸±à¸š\s*à¹€à¸‡à¸´à¸™|à¹ƒà¸š à¸£ à¸± à¸š à¹€à¸‡ à¸´ à¸™|à¸ˆà¸³à¸™à¸§à¸™à¹€à¸‡à¸´à¸™à¸£à¸§à¸¡|à¸ˆ à¹ à¸² à¸™ à¸§ à¸™ à¹€à¸‡ à¸´ à¸™ à¸£ à¸§ à¸¡/i.test(text)) return "RECEIPT";
  if (/electric|à¹„à¸Ÿà¸Ÿà¹‰à¸²|à¸„à¹ˆà¸²à¹„à¸Ÿ|due\s*date|amount/i.test(text)) return "RECEIPT";
  if (/fuel|à¸™à¹‰à¸³à¸¡à¸±à¸™|à¸›à¸±à¹Šà¸¡/i.test(text)) return "FUEL_RECEIPT";
  if (/hotel|room|à¹‚à¸£à¸‡à¹à¸£à¸¡/i.test(text)) return "HOTEL_RECEIPT";
  if (/restaurant|cafe|sizzler|food|table|server/i.test(text)) return "RESTAURANT_RECEIPT";
  if (/tax|invoice|inv\.?/i.test(text)) return "TAX_INVOICE_SHORT";
  return "RECEIPT";
}

function parseReceiptFields(rawText: string, confidence: number): OcrExtractionResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const isUtilityBill = /electric|ไฟฟ้า|ค่าไฟ|การไฟฟ้า/i.test(joined);

  const merchantLine =
    lines.find((line) => /electric|à¹„à¸Ÿà¸Ÿà¹‰à¸²|à¸à¸²à¸£à¹„à¸Ÿà¸Ÿà¹‰à¸²|metropolitan|provincial/i.test(line)) ??
    lines.find((line) => /sizzler|cafe|restaurant|company|co\.|ltd|starbucks|amazon|lotus|makro/i.test(line)) ??
    lines.find((line) => /[A-Za-z]/.test(line) && !/receipt|invoice|tax|total|subtotal|server|cashier|bank|trace|tid|mid|sale|customer|merchant/i.test(line)) ??
    null;

  const receiptNo = findFirst(joined, [
    /(?:inv\.?\s*\(.*?\)\s*no|invoice\s*no|receipt\s*no|rcpt\s*no|no\.?)\s*[:#-]?\s*([A-Z0-9-/]+)/i,
    /(?:invoice|inv|receipt|rcpt)\s*[:#-]?\s*([A-Z0-9-/]+)/i,
    /\b([A-Z]{2,}\d{6,})\b/
  ]);
  const taxId = findFirst(joined, [
    /(?:tax\s*id|tax\s*no|ax\s*id)\s*[:#-]?\s*([0-9-]{10,20})/i,
    /(010\d{10})/
  ]);
  const time = findFirst(joined, [/\b(\d{1,2}:\d{2})(?::\d{2})?\s*(?:AM|PM)?\b/i]);
  const receiptDate = parseDate(joined);
  const saleCurrencyAmount =
    currencyAmount(lines.find((line) => /\bSALE\b/i.test(line)) ?? "") ??
    currencyAmount(joined);

  const amountBeforeVat =
    amountNear(lines, [/^subtotal\b/i, /before\s*vat/i], { lookAhead: 1 }) ??
    normalizeAmount(findFirst(joined, [/(?:subtotal|before\s*vat)\s*[:-]?\s*(?:THB|Baht)?\s*([0-9,]+(?:\.\d{1,2})?)/i]));
  const vatAmount =
    amountNear(lines, [/\bvat\b/i, /\buat\b/i, /tax\s*amount/i], { lookAhead: 1, max: amountBeforeVat ?? undefined }) ??
    amountAfterLine(lines, /^subtotal\b/i, { lookAhead: 3, min: 10, max: amountBeforeVat ?? undefined }) ??
    normalizeAmount(findFirst(joined, [/(?:vat|tax)\s*[:-]?\s*(?:THB|Baht)?\s*([0-9,]+(?:\.\d{1,2})?)/i]));
  const calculatedTotal = amountBeforeVat != null && vatAmount != null ? Number((amountBeforeVat + vatAmount).toFixed(2)) : null;
  const genericAnchoredTotal =
    amountNear(lines, [/^total\b/i, /complete\s+subtotal/i, /balance\s+due/i], { lookAhead: 1 }) ??
    normalizeAmount(findFirst(joined, [/(?:grand\s*)?total\s*[:-]?\s*(?:THB|Baht)?\s*([0-9,]+(?:\.\d{1,2})?)/i]));
  const totalishLineAmount = amountFromTotalishLines(lines);
  const utilityAnchoredTotal = isUtilityBill
    ? amountNear(lines, [/amount/i, /ยอด.*ชำระ|ยอด.*ชําระ|รวม.*ชำระ|รวม.*ชําระ|ค่าไฟฟ้า.*ปัจจุบัน|จํานวนเงินรวม/i], { lookAhead: 1 })
    : null;
  const repeatedTotal = repeatedDecimalAmount(joined);
  const utilityTotal = isUtilityBill ? largestDecimalAmount(joined) : null;
  const totalAmount = saleCurrencyAmount ?? calculatedTotal ?? genericAnchoredTotal ?? utilityAnchoredTotal ?? totalishLineAmount ?? repeatedTotal ?? utilityTotal;
  const totalConfidence =
    totalAmount == null ? 0.25 :
    saleCurrencyAmount != null || calculatedTotal != null || genericAnchoredTotal != null || utilityAnchoredTotal != null ? 0.75 :
    totalishLineAmount != null ? 0.5 :
    repeatedTotal != null ? 0.6 :
    utilityTotal != null ? 0.55 :
    0.35;

  const merchantName = isUtilityBill ? "Electricity bill" : cleanMerchant(merchantLine);
  const paymentMethod = detectPaymentMethod(joined);
  const bankName = detectBankName(joined);
  const transactionId = findFirst(joined, [
    /(?:trace|transaction|txn)\s*[:#-]?\s*([A-Z0-9-]{4,30})/i,
    /(?:tid)\s*[:#-]?\s*([A-Z0-9-]{4,30})/i
  ]);
  const referenceNo = findFirst(joined, [
    /(?:app\s*code|approval\s*code|reference|ref|mid)\s*[:#-]?\s*([A-Z0-9-]{4,30})/i,
    /à¹€à¸¥à¸‚\s*à¸—à¸µà¹ˆ\s*#?\s*([0-9 ]{8,30})/i,
    /à¹€à¸¥ à¸‚ à¸— à¸µ à¹ˆ\s*#?\s*([0-9 ]{8,30})/i
  ]);
  const documentType = detectDocumentType(joined);

  return {
    documentType,
    documentTypeConfidence: confidence,
    fields: {
      merchantName: emptyField(merchantName, merchantName ? confidence : 0.25),
      receiptNo: emptyField(receiptNo, receiptNo ? 0.65 : 0.25),
      taxInvoiceNo: emptyField(null, 0.2),
      receiptDate: emptyField(receiptDate, receiptDate ? 0.7 : 0.25),
      receiptTime: emptyField(time, time ? 0.6 : 0.25),
      totalAmount: emptyField(totalAmount, totalConfidence),
      amountBeforeVat: emptyField(amountBeforeVat, amountBeforeVat != null ? 0.65 : 0.25),
      vatAmount: emptyField(vatAmount, vatAmount != null ? 0.6 : 0.25),
      taxId: emptyField(taxId, taxId ? 0.6 : 0.25),
      branchNo: emptyField(null, 0.2),
      address: emptyField(null, 0.2),
      paymentMethod: emptyField(paymentMethod, paymentMethod ? 0.6 : 0.2),
      bankName: emptyField(bankName, bankName ? 0.65 : 0.2),
      senderName: emptyField(null, 0.2),
      senderAccount: emptyField(null, 0.2),
      receiverName: emptyField(null, 0.2),
      receiverAccount: emptyField(null, 0.2),
      transactionId: emptyField(transactionId, transactionId ? 0.55 : 0.25),
      referenceNo: emptyField(referenceNo, referenceNo ? 0.55 : 0.25),
      qrData: emptyField(null, 0.2),
      currency: emptyField(/USD/i.test(joined) ? "USD" : "THB", 0.8)
    },
    rawText,
    warnings: [
      "Tesseract OCR is active. This is local OCR plus code-based parsing, not AI Vision. It is free/local but much less accurate for Thai bills and varied document layouts. Switch OCR_PROVIDER=openai when OpenAI usage is available."
    ]
  };
}

export class TesseractOcrProvider implements OcrProvider {
  async extract(fileUrl: string, mimeType: string): Promise<OcrExtractionResult> {
    if (mimeType === "application/pdf") {
      throw new Error("Tesseract OCR currently supports image receipts only. Convert PDF to image first.");
    }

    const worker = await createWorker("eng+tha", 1, {
      workerPath: path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
      langPath: process.cwd(),
      cachePath: process.cwd(),
      gzip: false
    });
    try {
      const result = await worker.recognize(fileUrl);
      const confidence = Math.max(0.25, Math.min(0.95, (result.data.confidence || 35) / 100));
      return parseReceiptFields(result.data.text || "", confidence);
    } finally {
      await worker.terminate();
    }
  }
}

