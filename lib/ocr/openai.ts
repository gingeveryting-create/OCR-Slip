import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";
import { OCR_EXTRACTION_PROMPT } from "@/lib/ocr/prompt";
import type { OcrExtractionResult, OcrProvider } from "@/lib/ocr/types";
import type { OcrDocumentType } from "@/types/database";

const documentTypes = new Set([
  "BANK_SLIP",
  "RECEIPT",
  "TAX_INVOICE_SHORT",
  "TAX_INVOICE_FULL",
  "RESTAURANT_RECEIPT",
  "FUEL_RECEIPT",
  "HOTEL_RECEIPT",
  "TRAVEL_RECEIPT",
  "POS_RECEIPT",
  "UNKNOWN"
]);

const fieldNames = [
  "merchantName",
  "receiptNo",
  "taxInvoiceNo",
  "receiptDate",
  "receiptTime",
  "totalAmount",
  "amountBeforeVat",
  "vatAmount",
  "taxId",
  "branchNo",
  "address",
  "paymentMethod",
  "bankName",
  "senderName",
  "senderAccount",
  "receiverName",
  "receiverAccount",
  "transactionId",
  "referenceNo",
  "qrData",
  "currency"
] as const;

function confidence(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return 0.2;
  if (number > 1) return Math.max(0, Math.min(1, number / 100));
  return Math.max(0, Math.min(1, number));
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function parseJson(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(trimmed);
}

function normalizeExtraction(input: any): OcrExtractionResult {
  const documentType = documentTypes.has(input?.documentType) ? input.documentType as OcrDocumentType : "UNKNOWN";
  const fields: OcrExtractionResult["fields"] = {} as OcrExtractionResult["fields"];

  for (const key of fieldNames) {
    const raw = input?.fields?.[key];
    const rawValue = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
    const value = ["totalAmount", "amountBeforeVat", "vatAmount"].includes(key)
      ? numberOrNull(rawValue)
      : key === "currency"
        ? textOrNull(rawValue) ?? "THB"
        : textOrNull(rawValue);
    fields[key] = {
      value: value as never,
      confidence: confidence(raw?.confidence)
    };
  }

  return {
    documentType,
    documentTypeConfidence: confidence(input?.documentTypeConfidence),
    fields,
    rawText: String(input?.rawText ?? ""),
    warnings: Array.isArray(input?.warnings) ? input.warnings.map(String) : []
  };
}

export class OpenAiVisionOcrProvider implements OcrProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when OCR_PROVIDER=openai");
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_OCR_MODEL;
  }

  async extract(fileUrl: string, mimeType: string): Promise<OcrExtractionResult> {
    if (mimeType === "application/pdf") {
      const responsesClient = (this.client as any).responses;
      if (!responsesClient?.create) {
        throw new Error("OpenAI SDK version must support Responses API for PDF extraction.");
      }
      const response = await responsesClient.create({
        model: this.model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: OCR_EXTRACTION_PROMPT },
              { type: "input_file", file_url: fileUrl }
            ]
          }
        ],
        text: { format: { type: "json_object" } }
      });
      const content = response.output_text;
      if (!content) throw new Error("OpenAI returned no PDF extraction content.");
      return normalizeExtraction(parseJson(content));
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: fileUrl } }
          ]
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned no extraction content.");
    return normalizeExtraction(parseJson(content));
  }
}
