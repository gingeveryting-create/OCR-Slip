import { z } from "zod";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf"
] as const;

export const maxUploadBytes = 10 * 1024 * 1024;

const emptyStringToNull = (value: unknown) => (value === "" ? null : value);
const nullableText = z.preprocess(emptyStringToNull, z.string().nullable().optional());
const nullableNumber = z.preprocess(emptyStringToNull, z.coerce.number().nullable().optional());

export const claimPatchSchema = z.object({
  expenseTypeId: z.string().uuid().nullable().optional(),
  merchantName: nullableText,
  receiptNo: nullableText,
  taxInvoiceNo: nullableText,
  receiptDate: nullableText,
  receiptTime: nullableText,
  totalAmount: nullableNumber,
  amountBeforeVat: nullableNumber,
  vatAmount: nullableNumber,
  taxId: nullableText,
  branchNo: nullableText,
  address: nullableText,
  paymentMethod: nullableText,
  bankName: nullableText,
  senderName: nullableText,
  senderAccount: nullableText,
  receiverName: nullableText,
  receiverAccount: nullableText,
  transactionId: nullableText,
  referenceNo: nullableText,
  qrData: nullableText,
  currency: z.preprocess((value) => value === "" || value == null ? "THB" : value, z.string().optional())
});

export const rejectSchema = z.object({
  reason: z.string().min(3, "Reject reason is required")
});

export const roleSchema = z.object({
  role: z.enum(["EMPLOYEE", "FINANCE", "ADMIN"])
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1).max(120),
  department: z.string().max(120).optional().default("")
});

export const masterDataSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(120),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});
