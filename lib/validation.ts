import { z } from "zod";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf"
] as const;

export const maxUploadBytes = 10 * 1024 * 1024;

export const claimPatchSchema = z.object({
  expenseTypeId: z.string().uuid().nullable().optional(),
  merchantName: z.string().nullable().optional(),
  receiptNo: z.string().nullable().optional(),
  taxInvoiceNo: z.string().nullable().optional(),
  receiptDate: z.string().nullable().optional(),
  receiptTime: z.string().nullable().optional(),
  totalAmount: z.coerce.number().nullable().optional(),
  amountBeforeVat: z.coerce.number().nullable().optional(),
  vatAmount: z.coerce.number().nullable().optional(),
  taxId: z.string().nullable().optional(),
  branchNo: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  senderName: z.string().nullable().optional(),
  senderAccount: z.string().nullable().optional(),
  receiverName: z.string().nullable().optional(),
  receiverAccount: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  referenceNo: z.string().nullable().optional(),
  qrData: z.string().nullable().optional(),
  currency: z.string().default("THB").optional()
});

export const rejectSchema = z.object({
  reason: z.string().min(3, "Reject reason is required")
});

export const roleSchema = z.object({
  role: z.enum(["EMPLOYEE", "FINANCE", "ADMIN"])
});

export const masterDataSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(120),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});
