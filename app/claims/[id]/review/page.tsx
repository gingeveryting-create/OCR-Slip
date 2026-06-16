import { AppShell } from "@/components/app-shell";
import { ClaimReviewForm } from "@/components/claim-review-form";
import { getClaimDetail } from "@/lib/claims";
import { requireProfile } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimReviewPage({ params }: PageProps) {
  const { id } = await params;
  const { profile } = await requireProfile(["EMPLOYEE", "ADMIN"]);
  const { claim, signedUrl } = await getClaimDetail(id, profile);

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">ตรวจผล OCR ก่อนส่งเคลม</h2>
        <p className="text-muted-foreground">Claim: {claim.claim_no ?? claim.id}</p>
      </div>
      <ClaimReviewForm claim={claim} signedUrl={signedUrl} />
    </AppShell>
  );
}
