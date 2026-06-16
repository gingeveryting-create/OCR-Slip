import type { OcrDocumentType } from "@/types/database";

export type OcrField<T = string | number | null> = {
  value: T;
  confidence: number;
};

export type OcrExtractionResult = {
  documentType: OcrDocumentType;
  documentTypeConfidence: number;
  fields: {
    merchantName: OcrField<string | null>;
    receiptNo: OcrField<string | null>;
    taxInvoiceNo: OcrField<string | null>;
    receiptDate: OcrField<string | null>;
    receiptTime: OcrField<string | null>;
    totalAmount: OcrField<number | null>;
    amountBeforeVat: OcrField<number | null>;
    vatAmount: OcrField<number | null>;
    taxId: OcrField<string | null>;
    branchNo: OcrField<string | null>;
    address: OcrField<string | null>;
    paymentMethod: OcrField<string | null>;
    bankName: OcrField<string | null>;
    senderName: OcrField<string | null>;
    senderAccount: OcrField<string | null>;
    receiverName: OcrField<string | null>;
    receiverAccount: OcrField<string | null>;
    transactionId: OcrField<string | null>;
    referenceNo: OcrField<string | null>;
    qrData: OcrField<string | null>;
    currency: OcrField<string | null>;
  };
  rawText: string;
  warnings: string[];
};

export interface OcrProvider {
  extract(fileUrl: string, mimeType: string): Promise<OcrExtractionResult>;
}
