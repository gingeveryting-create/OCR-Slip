"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, ImageUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

function claimIdFromQr(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/\/claims\/([0-9a-f-]{36})\/qr/i) ?? trimmed.match(/\/finance\/claims\/([0-9a-f-]{36})/i);
  if (match?.[1]) return match[1];
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return null;
}

export function FinanceClaimFilters({
  employee,
  dateFrom,
  dateTo
}: {
  employee?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [decodingImage, setDecodingImage] = useState(false);

  function openQrClaim(value = qrValue) {
    const id = claimIdFromQr(value);
    if (!id) {
      setScanMessage("ไม่พบ claim id ใน QR/URL นี้");
      return;
    }
    router.push(`/finance/claims/${id}`);
  }

  async function startScan() {
    if (!window.BarcodeDetector) {
      setScanMessage("Browser นี้ยังไม่รองรับ QR scanner ให้ใช้ช่องวาง URL/claim id แทน");
      return;
    }
    setScanning(true);
    setScanMessage("กำลังเปิดกล้อง...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    setScanMessage("เล็งกล้องไปที่ QR ของ claim");

    const scanLoop = async () => {
      if (!videoRef.current || !streamRef.current) return;
      const codes = await detector.detect(videoRef.current);
      if (codes[0]?.rawValue) {
        stopScan();
        openQrClaim(codes[0].rawValue);
        return;
      }
      requestAnimationFrame(scanLoop);
    };
    requestAnimationFrame(scanLoop);
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function decodeQrImage(file?: File) {
    if (!file) return;
    setDecodingImage(true);
    setScanMessage("กำลังอ่าน QR จากรูป...");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxSize = 1600;
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas is not available");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code?.data) {
        setScanMessage("อ่าน QR จากรูปไม่สำเร็จ ลอง crop ให้เห็น QR ชัดขึ้น หรือวาง URL/Claim ID แทน");
        return;
      }
      setQrValue(code.data);
      openQrClaim(code.data);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : "อ่านรูป QR ไม่สำเร็จ");
    } finally {
      setDecodingImage(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]" action="/finance/claims">
        <div className="space-y-2">
          <Label htmlFor="employee">ค้นหาพนักงาน</Label>
          <Input id="employee" name="employee" defaultValue={employee} placeholder="ชื่อหรืออีเมลพนักงาน" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateFrom">วันที่จาก</Label>
          <Input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateTo">วันที่ถึง</Label>
          <Input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">
            <Search className="h-4 w-4" aria-hidden />
            ค้นหา
          </Button>
          <Button asChild type="button" variant="outline">
            <a href="/finance/claims">ล้าง</a>
          </Button>
        </div>
      </form>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="space-y-2">
          <Label htmlFor="qrValue">QR / Claim URL / Claim ID</Label>
          <Input
            id="qrValue"
            value={qrValue}
            onChange={(event) => setQrValue(event.target.value)}
            placeholder="วาง URL จาก QR หรือ claim id"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={() => openQrClaim()}>
            เปิดเคลม
          </Button>
        </div>
        <div className="flex items-end">
          {scanning ? (
            <Button type="button" variant="outline" onClick={stopScan}>
              <X className="h-4 w-4" aria-hidden />
              หยุดสแกน
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={startScan}>
              <Camera className="h-4 w-4" aria-hidden />
              สแกน QR
            </Button>
          )}
        </div>
        <div className="flex items-end">
          <Button asChild type="button" variant="outline">
            <label className="cursor-pointer">
              <ImageUp className="h-4 w-4" aria-hidden />
              {decodingImage ? "กำลังอ่าน..." : "แนบรูป QR"}
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => decodeQrImage(event.target.files?.[0])}
                disabled={decodingImage}
              />
            </label>
          </Button>
        </div>
      </div>
      {scanning ? <video ref={videoRef} className="max-h-72 w-full rounded-md border bg-black object-contain" muted playsInline /> : null}
      {scanMessage ? <p className="text-sm text-muted-foreground">{scanMessage}</p> : null}
    </div>
  );
}
