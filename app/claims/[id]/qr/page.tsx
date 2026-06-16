import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerEnv } from "@/lib/env";
import { getClaimDetail } from "@/lib/claims";
import { requireProfile } from "@/lib/supabase/server";
import QRCode from "qrcode";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimQrPage({ params }: PageProps) {
  const { id } = await params;
  const { profile } = await requireProfile();
  const { claim } = await getClaimDetail(id, profile);
  const env = getServerEnv();
  const url = `${env.NEXT_PUBLIC_APP_URL}/claims/${id}/qr`;
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 360 });

  return (
    <AppShell>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>QR Code สำหรับตรวจสอบเคลม</CardTitle>
          <CardDescription>หน้านี้ต้อง login และตรวจสิทธิ์ก่อนแสดงข้อมูลเสมอ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <img src={dataUrl} alt="Claim verification QR code" width={360} height={360} className="rounded-md border bg-white p-3" />
          <p className="break-all text-sm text-muted-foreground">{url}</p>
          <p className="font-medium">{claim.claim_no ?? claim.id}</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
