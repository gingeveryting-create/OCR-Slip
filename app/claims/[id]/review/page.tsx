import { redirect } from "next/navigation";
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
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Review OCR result</h2>
          <p className="text-muted-foreground">Claim: {claim.claim_no ?? claim.id}</p>
        </div>
        <ClaimActions claimId={claim.id} canDelete={["DRAFT", "OCR_FAILED", "EXTRACTED", "REJECTED"].includes(claim.status)} />
      </div>
      <ClaimReviewForm claim={claim} signedUrl={signedUrl} />
    </AppShell>
  );
}
