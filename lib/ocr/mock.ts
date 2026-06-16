import type { OcrExtractionResult, OcrProvider } from "@/lib/ocr/types";

export class MockOcrProvider implements OcrProvider {
  async extract(): Promise<OcrExtractionResult> {
    return {
      documentType: "RECEIPT",
      documentTypeConfidence: 0.82,
      fields: {
        merchantName: { value: "Mock Merchant", confidence: 0.82 },
        receiptNo: { value: "LOCAL-TEST-001", confidence: 0.74 },
        taxInvoiceNo: { value: null, confidence: 0.2 },
        receiptDate: { value: new Date().toISOString().slice(0, 10), confidence: 0.78 },
        receiptTime: { value: "12:00", confidence: 0.55 },
        totalAmount: { value: 123.45, confidence: 0.86 },
        amountBeforeVat: { value: 115.37, confidence: 0.72 },
        vatAmount: { value: 8.08, confidence: 0.72 },
        taxId: { value: null, confidence: 0.2 },
        branchNo: { value: null, confidence: 0.2 },
        address: { value: null, confidence: 0.2 },
        paymentMethod: { value: "Cash", confidence: 0.5 },
        bankName: { value: null, confidence: 0.2 },
        senderName: { value: null, confidence: 0.2 },
        senderAccount: { value: null, confidence: 0.2 },
        receiverName: { value: null, confidence: 0.2 },
        receiverAccount: { value: null, confidence: 0.2 },
        transactionId: { value: null, confidence: 0.2 },
        referenceNo: { value: null, confidence: 0.2 },
        qrData: { value: null, confidence: 0.2 },
        currency: { value: "THB", confidence: 0.9 }
      },
      rawText: "Local mock OCR result for development testing.",
      warnings: ["Mock OCR provider is active. Replace OCR_PROVIDER=openai when OpenAI quota is available."]
    };
  }
}
