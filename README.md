# Smart Expense Slip Reader

เว็บแอปสำหรับ expense reimbursement ของบริษัท พนักงานอัปโหลด receipt/slip แล้วระบบอ่านข้อมูลด้วย OCR/AI ก่อนสร้าง claim ให้ Finance ตรวจเอกสารต้นฉบับเทียบกับข้อมูลที่ระบบอ่านได้และข้อมูลที่พนักงานยืนยัน

## Tech Stack

- Next.js App Router, TypeScript, React, Tailwind CSS, shadcn-style UI primitives
- Supabase Auth, PostgreSQL, Row Level Security, Storage
- OpenAI Vision OCR provider ผ่าน abstraction `OcrProvider`
- QR Code: `qrcode`
- Excel export: `exceljs`
- Deploy target: Cloudflare Pages + Supabase

## Local Run

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## Environment Variables

คัดลอกจาก `.env.example` เป็น `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OCR_PROVIDER=openai
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_STORAGE_BUCKET=receipts
```

ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` หรือ `OPENAI_API_KEY` ใน frontend/public code

## Supabase Setup

1. สร้าง Supabase project
2. เปิด SQL Editor แล้วรัน migration ตามลำดับ:
   - `supabase/migrations/202606160001_init.sql`
   - `supabase/migrations/202606160002_storage.sql`
3. ตรวจว่า private storage bucket ชื่อ `receipts` ถูกสร้างแล้ว
4. เปิด Supabase Auth provider ที่ต้องการ เช่น Email/Password
5. ตั้ง environment variables ใน `.env.local`
6. สร้าง first admin user:
   - สมัคร user ผ่าน Supabase Auth หรือหน้า `/login` ตาม flow ที่เปิดไว้
   - ไปที่ SQL Editor แล้วรัน:

```sql
update public.profiles
set role = 'ADMIN', full_name = 'System Admin'
where email = 'YOUR_ADMIN_EMAIL@example.com';
```

7. สร้าง user สำหรับ Finance ด้วย role `FINANCE` ถ้าต้องการทดสอบ finance flow
8. รัน `npm run dev`

## Main Flows

Employee:

1. Login
2. เปิด `/claims/new`
3. Upload image/PDF ไป private Supabase Storage
4. กด Start Extraction
5. API สร้าง signed URL ชั่วคราวและเรียก OpenAI Vision
6. เปิด `/claims/[id]/review`
7. แก้เฉพาะ field ที่ OCR ผิดหรือ confidence ต่ำ
8. Submit claim เพื่อสร้าง `CLMYYYYMMDDXXXX`
9. เปิด QR Code ที่ `/claims/[id]/qr`

Finance:

1. Login ด้วย role `FINANCE`
2. เปิด `/finance`
3. เลือก claim
4. ดู original image/PDF ซ้าย และ extracted/confirmed data ขวา
5. ตรวจ duplicate warning
6. Approve หรือ Reject พร้อม reason
7. Export Excel ที่ `/api/finance/claims/export`

Admin:

- `/admin/users`
- `/admin/expense-types`
- `/admin/document-types`
- `/admin/audit-logs`

## API Routes

- `GET /api/me`
- `POST /api/claims/upload`
- `POST /api/claims/extract`
- `GET /api/claims`
- `GET /api/claims/[id]`
- `PATCH /api/claims/[id]`
- `POST /api/claims/[id]/submit`
- `GET /api/claims/[id]/qrcode`
- `GET /api/finance/claims`
- `POST /api/finance/claims/[id]/approve`
- `POST /api/finance/claims/[id]/reject`
- `GET /api/finance/claims/export`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]/role`
- `GET /api/admin/expense-types`
- `POST /api/admin/expense-types`
- `GET /api/admin/document-types`
- `POST /api/admin/document-types`

## OCR Provider Abstraction

Interface อยู่ที่ `lib/ocr/types.ts`

```ts
interface OcrProvider {
  extract(fileUrl: string, mimeType: string): Promise<OcrExtractionResult>;
}
```

implementation แรกคือ `OpenAiVisionOcrProvider` ที่ `lib/ocr/openai.ts` และ prompt อยู่ที่ `lib/ocr/prompt.ts`

ถ้าจะเปลี่ยนเป็น Google Vision, Azure Document Intelligence หรือ AWS Textract ให้เพิ่ม provider ใหม่และเปลี่ยน `createOcrProvider()`

## Security Notes

- Storage bucket เป็น private
- Server routes ใช้ service role เฉพาะฝั่ง server
- Browser ใช้ Supabase anon key เท่านั้น
- API ตรวจ role ทุก route
- RLS จำกัด employee ให้อ่าน/แก้เฉพาะ claim ตัวเอง
- Finance/Admin อ่าน claim ได้ตาม policy
- QR verify page ต้อง login เพราะหน้า route เรียก `requireProfile()`
- Upload validate MIME type และ limit 10MB
- Audit log ถูกบันทึกเมื่อ upload, OCR, correction, submit, approve, reject และ admin changes

## Duplicate Detection

ระบบตรวจและแสดง warning เท่านั้น ไม่ auto reject โดยใช้เงื่อนไข:

- `file_hash`
- `receipt_no`
- `tax_invoice_no`
- `transaction_id`
- `reference_no`
- `merchant_name + receipt_date + total_amount`
- `employee_id + receipt_date + total_amount`

## Cloudflare Pages Deployment

1. Push project ไป GitHub
2. Connect repository ใน Cloudflare Pages
3. Framework preset: Next.js
4. Build command:

```bash
npm run build
```

5. Output directory:

```bash
.next
```

6. เพิ่ม environment variables ใน Cloudflare Pages:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `OCR_PROVIDER`
   - `NEXT_PUBLIC_APP_URL`
   - `SUPABASE_STORAGE_BUCKET`
7. ใน Supabase Auth เพิ่ม redirect URL ของ Cloudflare Pages domain
8. Deploy
9. ทดสอบ login, upload, extraction, finance review, approve/reject และ Excel export

หมายเหตุ: ถ้าจะ optimize สำหรับ Cloudflare runtime เต็มรูปแบบในอนาคต ให้พิจารณา `@cloudflare/next-on-pages` หรือแยก API บางส่วนไป Cloudflare Workers แต่เวอร์ชันนี้ตั้งใจให้ local development และ Next.js API Routes ใช้งานเร็วที่สุดก่อน
