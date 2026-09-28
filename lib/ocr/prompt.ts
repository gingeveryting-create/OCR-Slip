export const OCR_EXTRACTION_PROMPT = `You are an expert financial document parser for Thai company expense reimbursement.

Analyze this receipt, slip, tax invoice, or payment document image.

Return only valid JSON. Do not include markdown. Do not explain.

Extract all visible fields. If a field is missing or uncertain, set value to null and confidence below 0.5.

Classify documentType using only:
BANK_SLIP, RECEIPT, TAX_INVOICE_SHORT, TAX_INVOICE_FULL, RESTAURANT_RECEIPT, FUEL_RECEIPT, HOTEL_RECEIPT, TRAVEL_RECEIPT, POS_RECEIPT, UNKNOWN.

Pay special attention to:
- Thai dates
- Buddhist year conversion to Christian year
- Total amount
- VAT
- Receipt number
- Tax invoice number
- Bank transaction reference
- Merchant name
- Tax ID
- QR code text if visible
- Bank transfer slips from Thai banking apps such as K PLUS, SCB Easy, Krungthai NEXT, Krungsri, Bangkok Bank, ttb, and PromptPay.
- For BANK_SLIP, totalAmount must be the transferred amount shown near "จำนวน", "Amount", or "ยอดเงิน"; do not use fee/ค่าธรรมเนียม as totalAmount.
- For BANK_SLIP, merchantName should be the receiver/payee name when no merchant exists.
- For BANK_SLIP, fill senderName, senderAccount, receiverName, receiverAccount, bankName, transactionId, referenceNo, receiptDate, receiptTime, paymentMethod = "Bank transfer", currency = "THB" where visible.
- Do not extract product line items. This app only needs summary amounts and key document fields.

Return JSON in the required schema:
{
  "documentType": "BANK_SLIP | RECEIPT | TAX_INVOICE_SHORT | TAX_INVOICE_FULL | RESTAURANT_RECEIPT | FUEL_RECEIPT | HOTEL_RECEIPT | TRAVEL_RECEIPT | POS_RECEIPT | UNKNOWN",
  "documentTypeConfidence": 0.0,
  "fields": {
    "merchantName": { "value": null, "confidence": 0.0 },
    "receiptNo": { "value": null, "confidence": 0.0 },
    "taxInvoiceNo": { "value": null, "confidence": 0.0 },
    "receiptDate": { "value": null, "confidence": 0.0 },
    "receiptTime": { "value": null, "confidence": 0.0 },
    "totalAmount": { "value": null, "confidence": 0.0 },
    "amountBeforeVat": { "value": null, "confidence": 0.0 },
    "vatAmount": { "value": null, "confidence": 0.0 },
    "taxId": { "value": null, "confidence": 0.0 },
    "branchNo": { "value": null, "confidence": 0.0 },
    "address": { "value": null, "confidence": 0.0 },
    "paymentMethod": { "value": null, "confidence": 0.0 },
    "bankName": { "value": null, "confidence": 0.0 },
    "senderName": { "value": null, "confidence": 0.0 },
    "senderAccount": { "value": null, "confidence": 0.0 },
    "receiverName": { "value": null, "confidence": 0.0 },
    "receiverAccount": { "value": null, "confidence": 0.0 },
    "transactionId": { "value": null, "confidence": 0.0 },
    "referenceNo": { "value": null, "confidence": 0.0 },
    "qrData": { "value": null, "confidence": 0.0 },
    "currency": { "value": "THB", "confidence": 0.0 }
  },
  "rawText": "",
  "warnings": []
}`;
