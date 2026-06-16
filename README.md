# Smart Expense Slip Reader

à¹€à¸§à¹‡à¸šà¹à¸­à¸›à¸ªà¸³à¸«à¸£à¸±à¸š expense reimbursement à¸‚à¸­à¸‡à¸šà¸£à¸´à¸©à¸±à¸— à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸­à¸±à¸›à¹‚à¸«à¸¥à¸” receipt/slip à¹à¸¥à¹‰à¸§à¸£à¸°à¸šà¸šà¸­à¹ˆà¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸”à¹‰à¸§à¸¢ OCR/AI à¸à¹ˆà¸­à¸™à¸ªà¸£à¹‰à¸²à¸‡ claim à¹ƒà¸«à¹‰ Finance à¸•à¸£à¸§à¸ˆà¹€à¸­à¸à¸ªà¸²à¸£à¸•à¹‰à¸™à¸‰à¸šà¸±à¸šà¹€à¸—à¸µà¸¢à¸šà¸à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸£à¸°à¸šà¸šà¸­à¹ˆà¸²à¸™à¹„à¸”à¹‰à¹à¸¥à¸°à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸¢à¸·à¸™à¸¢à¸±à¸™

## Tech Stack

- Next.js App Router, TypeScript, React, Tailwind CSS, shadcn-style UI primitives
- Supabase Auth, PostgreSQL, Row Level Security, Storage
- OpenAI Vision OCR provider à¸œà¹ˆà¸²à¸™ abstraction `OcrProvider`
- QR Code: `qrcode`
- Excel export: `exceljs`
- Deploy target: Cloudflare Workers with OpenNext + Supabase

## Local Run

```bash
npm install
npm run dev
```

à¹€à¸›à¸´à¸” `http://localhost:3000`

## Environment Variables

à¸„à¸±à¸”à¸¥à¸­à¸à¸ˆà¸²à¸ `.env.example` à¹€à¸›à¹‡à¸™ `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OCR_PROVIDER=openai
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_STORAGE_BUCKET=receipts
```

à¸«à¹‰à¸²à¸¡à¹ƒà¸ªà¹ˆ `SUPABASE_SERVICE_ROLE_KEY` à¸«à¸£à¸·à¸­ `OPENAI_API_KEY` à¹ƒà¸™ frontend/public code

## Supabase Setup

1. à¸ªà¸£à¹‰à¸²à¸‡ Supabase project
2. à¹€à¸›à¸´à¸” SQL Editor à¹à¸¥à¹‰à¸§à¸£à¸±à¸™ migration à¸•à¸²à¸¡à¸¥à¸³à¸”à¸±à¸š:
   - `supabase/migrations/202606160001_init.sql`
   - `supabase/migrations/202606160002_storage.sql`
3. à¸•à¸£à¸§à¸ˆà¸§à¹ˆà¸² private storage bucket à¸Šà¸·à¹ˆà¸­ `receipts` à¸–à¸¹à¸à¸ªà¸£à¹‰à¸²à¸‡à¹à¸¥à¹‰à¸§
4. à¹€à¸›à¸´à¸” Supabase Auth provider à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£ à¹€à¸Šà¹ˆà¸™ Email/Password
5. à¸•à¸±à¹‰à¸‡ environment variables à¹ƒà¸™ `.env.local`
6. à¸ªà¸£à¹‰à¸²à¸‡ first admin user:
   - à¸ªà¸¡à¸±à¸„à¸£ user à¸œà¹ˆà¸²à¸™ Supabase Auth à¸«à¸£à¸·à¸­à¸«à¸™à¹‰à¸² `/login` à¸•à¸²à¸¡ flow à¸—à¸µà¹ˆà¹€à¸›à¸´à¸”à¹„à¸§à¹‰
   - à¹„à¸›à¸—à¸µà¹ˆ SQL Editor à¹à¸¥à¹‰à¸§à¸£à¸±à¸™:

```sql
update public.profiles
set role = 'ADMIN', full_name = 'System Admin'
where email = 'YOUR_ADMIN_EMAIL@example.com';
```

7. à¸ªà¸£à¹‰à¸²à¸‡ user à¸ªà¸³à¸«à¸£à¸±à¸š Finance à¸”à¹‰à¸§à¸¢ role `FINANCE` à¸–à¹‰à¸²à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸—à¸”à¸ªà¸­à¸š finance flow
8. à¸£à¸±à¸™ `npm run dev`

## Main Flows

Employee:

1. Login
2. à¹€à¸›à¸´à¸” `/claims/new`
3. Upload image/PDF à¹„à¸› private Supabase Storage
4. à¸à¸” Start Extraction
5. API à¸ªà¸£à¹‰à¸²à¸‡ signed URL à¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§à¹à¸¥à¸°à¹€à¸£à¸µà¸¢à¸ OpenAI Vision
6. à¹€à¸›à¸´à¸” `/claims/[id]/review`
7. à¹à¸à¹‰à¹€à¸‰à¸žà¸²à¸° field à¸—à¸µà¹ˆ OCR à¸œà¸´à¸”à¸«à¸£à¸·à¸­ confidence à¸•à¹ˆà¸³
8. Submit claim à¹€à¸žà¸·à¹ˆà¸­à¸ªà¸£à¹‰à¸²à¸‡ `CLMYYYYMMDDXXXX`
9. à¹€à¸›à¸´à¸” QR Code à¸—à¸µà¹ˆ `/claims/[id]/qr`

Finance:

1. Login à¸”à¹‰à¸§à¸¢ role `FINANCE`
2. à¹€à¸›à¸´à¸” `/finance`
3. à¹€à¸¥à¸·à¸­à¸ claim
4. à¸”à¸¹ original image/PDF à¸‹à¹‰à¸²à¸¢ à¹à¸¥à¸° extracted/confirmed data à¸‚à¸§à¸²
5. à¸•à¸£à¸§à¸ˆ duplicate warning
6. Approve à¸«à¸£à¸·à¸­ Reject à¸žà¸£à¹‰à¸­à¸¡ reason
7. Export Excel à¸—à¸µà¹ˆ `/api/finance/claims/export`

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

Interface à¸­à¸¢à¸¹à¹ˆà¸—à¸µà¹ˆ `lib/ocr/types.ts`

```ts
interface OcrProvider {
  extract(fileUrl: string, mimeType: string): Promise<OcrExtractionResult>;
}
```

implementation à¹à¸£à¸à¸„à¸·à¸­ `OpenAiVisionOcrProvider` à¸—à¸µà¹ˆ `lib/ocr/openai.ts` à¹à¸¥à¸° prompt à¸­à¸¢à¸¹à¹ˆà¸—à¸µà¹ˆ `lib/ocr/prompt.ts`

à¸–à¹‰à¸²à¸ˆà¸°à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸›à¹‡à¸™ Google Vision, Azure Document Intelligence à¸«à¸£à¸·à¸­ AWS Textract à¹ƒà¸«à¹‰à¹€à¸žà¸´à¹ˆà¸¡ provider à¹ƒà¸«à¸¡à¹ˆà¹à¸¥à¸°à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™ `createOcrProvider()`

## Security Notes

- Storage bucket à¹€à¸›à¹‡à¸™ private
- Server routes à¹ƒà¸Šà¹‰ service role à¹€à¸‰à¸žà¸²à¸°à¸à¸±à¹ˆà¸‡ server
- Browser à¹ƒà¸Šà¹‰ Supabase anon key à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™
- API à¸•à¸£à¸§à¸ˆ role à¸—à¸¸à¸ route
- RLS à¸ˆà¸³à¸à¸±à¸” employee à¹ƒà¸«à¹‰à¸­à¹ˆà¸²à¸™/à¹à¸à¹‰à¹€à¸‰à¸žà¸²à¸° claim à¸•à¸±à¸§à¹€à¸­à¸‡
- Finance/Admin à¸­à¹ˆà¸²à¸™ claim à¹„à¸”à¹‰à¸•à¸²à¸¡ policy
- QR verify page à¸•à¹‰à¸­à¸‡ login à¹€à¸žà¸£à¸²à¸°à¸«à¸™à¹‰à¸² route à¹€à¸£à¸µà¸¢à¸ `requireProfile()`
- Upload validate MIME type à¹à¸¥à¸° limit 10MB
- Audit log à¸–à¸¹à¸à¸šà¸±à¸™à¸—à¸¶à¸à¹€à¸¡à¸·à¹ˆà¸­ upload, OCR, correction, submit, approve, reject à¹à¸¥à¸° admin changes

## Duplicate Detection

à¸£à¸°à¸šà¸šà¸•à¸£à¸§à¸ˆà¹à¸¥à¸°à¹à¸ªà¸”à¸‡ warning à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ à¹„à¸¡à¹ˆ auto reject à¹‚à¸”à¸¢à¹ƒà¸Šà¹‰à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚:

- `file_hash`
- `receipt_no`
- `tax_invoice_no`
- `transaction_id`
- `reference_no`
- `merchant_name + receipt_date + total_amount`
- `employee_id + receipt_date + total_amount`

## Cloudflare Deployment
This app uses Next.js App Router plus API routes, so the recommended Cloudflare target is Cloudflare Workers through OpenNext, not a static Cloudflare Pages export.

### One-time setup

1. Push the project to GitHub.
2. In Cloudflare, create a Workers project from the GitHub repository or deploy from local Wrangler.
3. Build/deploy command:

```bash
npm run deploy:cloudflare
```

For local Workers runtime preview:

```bash
npm run preview:cloudflare
```

### Environment variables

Set these in Cloudflare Worker variables/secrets. Do not commit real values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_OCR_MODEL`
- `OCR_PROVIDER`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_STORAGE_BUCKET`

For external testing, use `OCR_PROVIDER=openai` when OpenAI billing/usage is available. The local `tesseract` provider is useful for free local tests, but it is slower and less accurate for Thai receipts and is not the best fit for Cloudflare Workers.

### Supabase Auth URLs

In Supabase Auth URL configuration, add:

- Site URL: `https://YOUR_WORKER_DOMAIN`
- Redirect URL: `https://YOUR_WORKER_DOMAIN/**`

Then test login, signup, upload, OCR extraction, employee submit, finance review, approve/reject, QR verify, and Excel export.
