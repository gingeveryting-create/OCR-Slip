export type UserRole = "EMPLOYEE" | "FINANCE" | "ADMIN";

export type ClaimStatus =
  | "DRAFT"
  | "OCR_PROCESSING"
  | "OCR_FAILED"
  | "EXTRACTED"
  | "SUBMITTED"
  | "FINANCE_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "CANCELLED";

export type OcrDocumentType =
  | "BANK_SLIP"
  | "RECEIPT"
  | "TAX_INVOICE_SHORT"
  | "TAX_INVOICE_FULL"
  | "RESTAURANT_RECEIPT"
  | "FUEL_RECEIPT"
  | "HOTEL_RECEIPT"
  | "TRAVEL_RECEIPT"
  | "POS_RECEIPT"
  | "UNKNOWN";

export type ClaimRow = {
  id: string;
  claim_no: string | null;
  employee_id: string;
  expense_type_id: string | null;
  document_type: string | null;
  merchant_name: string | null;
  receipt_no: string | null;
  tax_invoice_no: string | null;
  receipt_date: string | null;
  receipt_time: string | null;
  total_amount: number | null;
  amount_before_vat: number | null;
  vat_amount: number | null;
  tax_id: string | null;
  branch_no: string | null;
  address: string | null;
  payment_method: string | null;
  bank_name: string | null;
  sender_name: string | null;
  sender_account: string | null;
  receiver_name: string | null;
  receiver_account: string | null;
  transaction_id: string | null;
  reference_no: string | null;
  qr_data: string | null;
  currency: string;
  status: ClaimStatus;
  confidence_score: number | null;
  duplicate_score: number | null;
  duplicate_warning: unknown;
  extracted_json: unknown;
  confirmed_json: unknown;
  reject_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  department: string | null;
  role: UserRole;
};
