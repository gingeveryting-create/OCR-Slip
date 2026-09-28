import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClaimActions } from "@/components/claim-actions";
import { ClaimReviewForm } from "@/components/claim-review-form";
import { getClaimDetail } from "@/lib/claims";
import { getCurrentProfile } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimReviewPage({ params }: PageProps) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!["EMPLOYEE", "ADMIN"].includes(profile.role)) redirect("/");
  const { claim, signedUrl } = await getClaimDetail(id, profile);

  return (
    <AppShell variant="employee">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/claims/${claim.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="sr-only">กลับ</span>
          </Link>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold sm:text-2xl">ตรวจสอบข้อมูล OCR</h2>
            <p className="truncate text-sm text-muted-foreground">รายการเบิก: {claim.claim_no ?? claim.id}</p>
          </div>
        </div>
        <ClaimActions claimId={claim.id} canDelete={["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(claim.status)} />
      </div>
      <ClaimReviewForm claim={claim} signedUrl={signedUrl} />
    </AppShell>
  );
}
