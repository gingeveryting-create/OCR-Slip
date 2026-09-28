import assert from "node:assert/strict";
import test from "node:test";
import { parseTesseractText } from "../lib/ocr/tesseract.ts";

test("reads a total when Thai OCR characters and decimal digits are spaced", () => {
  const result = parseTesseractText("ย อ ด ส ุ ท ธิ ์ 168 00", 0.78);

  assert.equal(result.fields.totalAmount.value, 168);
});

test("accepts the common OCR substitution of ราม for รวม", () => {
  const result = parseTesseractText("ร า ม 168.00", 0.78);

  assert.equal(result.fields.totalAmount.value, 168);
});

test("does not treat a spaced receipt date as the total", () => {
  const result = parseTesseractText("วันที่ 19 09 2026\nใบเสร็จ", 0.78);

  assert.equal(result.fields.totalAmount.value, null);
});
