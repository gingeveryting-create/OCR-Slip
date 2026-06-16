import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function mapClaimPatch(input: Record<string, unknown>) {
  const patch = {
    expense_type_id: input.expenseTypeId,
    merchant_name: input.merchantName,
    receipt_no: input.receiptNo,
    tax_invoice_no: input.taxInvoiceNo,
    receipt_date: input.receiptDate,
    receipt_time: input.receiptTime,
    total_amount: input.totalAmount,
    amount_before_vat: input.amountBeforeVat,
    vat_amount: input.vatAmount,
    tax_id: input.taxId,
    branch_no: input.branchNo,
    address: input.address,
    payment_method: input.paymentMethod,
    bank_name: input.bankName,
    sender_name: input.senderName,
    sender_account: input.senderAccount,
    receiver_name: input.receiverName,
    receiver_account: input.receiverAccount,
    transaction_id: input.transactionId,
    reference_no: input.referenceNo,
    qr_data: input.qrData,
    currency: input.currency,
    confirmed_json: input
  };
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}
