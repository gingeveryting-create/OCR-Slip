import { z } from "zod";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf"
] as const;

export const maxUploadBytes = 10 * 1024 * 1024;
export const claimIdSchema = z.string().uuid();

const emptyStringToNull = (value: unknown) => (value === "" ? null : value);
const nullableText = z.preprocess(emptyStringToNull, z.string().trim().max(1000).nullable().optional());
const nullableNumber = z.preprocess(
  emptyStringToNull,
  z.coerce.number().nonnegative().max(999_999_999.99).nullable().optional()
);

export const claimPatchSchema = z.object({
  expenseTypeId: z.string().uuid().nullable().optional(),
  documentType: nullableText,
  merchantName: nullableText,
  receiptNo: nullableText,
  taxInvoiceNo: nullableText,
  receiptDate: z.preprocess(emptyStringToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  receiptTime: z.preprocess(emptyStringToNull, z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional()),
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
  currency: z.preprocess(
    (value) => value === "" || value == null ? "THB" : value,
    z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional()
  )
}).strict();

export const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Reject reason is required").max(1000)
}).strict();

export const roleSchema = z.object({
  role: z.enum(["EMPLOYEE", "FINANCE", "ADMIN"])
}).strict();

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(1).max(120),
  department: z.string().trim().max(120).optional().default(""),
  role: z.enum(["EMPLOYEE", "FINANCE", "ADMIN"]),
  initialPassword: z.string()
    .min(12)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/\d/, "Password must include a number")
}).strict();

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128).regex(/[A-Za-z]/, "Password must include a letter").regex(/\d/, "Password must include a number"),
  fullName: z.string().min(1).max(120),
  department: z.string().max(120).optional().default("")
}).strict();

export const masterDataSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[A-Z0-9_-]+$/i),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true)
}).strict();
