# Security Checklist

Last reviewed: 2026-09-28

## Completed in application code

- [x] Upgraded Next.js to a release that fixes the known Critical/High framework advisories.
- [x] Kept Supabase service-role and OpenAI keys in server-only environment variables.
- [x] Ignored local environment files, local seed credentials, build output, and logs in Git.
- [x] Required an authenticated Supabase user and application profile for protected routes.
- [x] Enforced Employee, Finance, and Admin roles again inside server API routes.
- [x] Restricted Finance claim access to claims that entered the finance workflow.
- [x] Enforced atomic status transitions for OCR, submit, approve, reject, update, and delete.
- [x] Prevented OCR from reopening approved, paid, cancelled, or in-progress claims.
- [x] Validated UUIDs and request bodies with Zod and rejected unknown fields.
- [x] Replaced interpolated Finance search filters with parameterized Supabase filters.
- [x] Added per-user and per-IP rate limits for password changes, upload, OCR, submit, Finance actions, and Admin writes.
- [x] Validated upload MIME type from file signatures instead of trusting the browser filename.
- [x] Limited upload size, image dimensions, image pixels, and approximate PDF page count.
- [x] Sanitized uploaded filenames and stored files in the private receipts bucket.
- [x] Generated signed receipt URLs only after checking claim authorization.
- [x] Added same-origin checks for state-changing API requests.
- [x] Added CSP, clickjacking, MIME sniffing, referrer, camera, isolation, and production HSTS headers.
- [x] Returned generic internal errors to clients while preserving useful server logs.
- [x] Failed writes when audit-log insertion fails instead of silently losing the audit trail.
- [x] Removed public signup; only Admin can create users with an initial password.
- [x] Required the current credentials before changing a password and revoked refresh sessions afterward.
- [x] Raised new-account password requirements to 12 characters with letters and numbers.
- [x] Kept QR verification pages behind login and claim authorization.
- [x] Added repeatable `npm run security:check` and production build verification.

## Supabase migration deployment

- [x] Apply `supabase/migrations/20260928113639_harden_security_controls.sql` to the active Supabase project.
- [x] Confirm authenticated browser users have SELECT-only Data API grants for claims, attachments, OCR results, and audit logs.
- [x] Confirm direct Data API claim updates and audit-log inserts are denied; trusted API routes continue through service role.
- [x] Confirm Finance cannot read DRAFT, OCR_PROCESSING, OCR_FAILED, EXTRACTED, or CANCELLED employee claims.
- [x] Confirm Employee can read only their own claims through the Data API.
- [x] Confirm the `receipts` bucket remains private.
- [x] Confirm signed receipt URLs expire and cannot be reused after expiry.
- [ ] Run Supabase Database and Security Advisors after the migration and resolve new warnings.

## Supabase dashboard configuration

- [ ] Set the production Site URL and exact allowed redirect URLs.
- [ ] Disable unused Auth providers and review session/OTP expiry settings.
- [ ] Rotate Supabase service-role and OpenAI keys if they were ever pasted into chat, logs, screenshots, or Git.
- [ ] Configure database backups and test one restore procedure.
- [ ] Configure alerts for repeated authentication failures, OCR spikes, and server 5xx responses.

## Deployment checks

- [ ] Store secrets only in Cloudflare encrypted variables; never use `NEXT_PUBLIC_` for secret values.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin.
- [ ] Run `npm run security:check` and `npm run build` before each deployment.
- [ ] Test Employee, Finance, and Admin access using separate accounts after deployment.
- [ ] Verify login, Admin user creation, password change, upload, OCR, correction, submit, approve/reject, QR access, and Excel export.
- [ ] Verify a cross-origin POST to `/api/*` returns HTTP 403.
- [ ] Verify unauthenticated protected APIs return HTTP 401.
- [ ] Review Cloudflare and Supabase logs after the first external test.

## Accepted residual risk

- [ ] Track the current moderate `exceljs -> uuid` advisory. The affected UUID buffer APIs are not called by this application. Do not force the audit's suggested ExcelJS downgrade; upgrade when ExcelJS publishes a compatible dependency update, then retest Excel export.

## Recurring review

- [ ] Monthly: run dependency audit and review Supabase advisors.
- [ ] Quarterly: review roles, inactive users, redirect URLs, storage policies, and audit-log retention.
- [ ] After every schema change: review grants and RLS policies before deployment.
- [ ] After every security incident: rotate secrets, invalidate sessions, preserve logs, and document corrective actions.
