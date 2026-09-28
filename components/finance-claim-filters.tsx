"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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

function qrTargetFromValue(value: string) {
  const trimmed = value.trim();
  const batchMatch = trimmed.match(/[?&]ids=([^&#]+)/i);
  if (batchMatch?.[1]) {
    const ids = decodeURIComponent(batchMatch[1])
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length) return { type: "batch" as const, ids };
  }

  const match = trimmed.match(/\/claims\/([0-9a-f-]{36})\/qr/i) ?? trimmed.match(/\/finance\/claims\/([0-9a-f-]{36})/i);
  if (match?.[1]) return { type: "single" as const, id: match[1] };
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return { type: "single" as const, id: trimmed };
  return null;
}

export function FinanceClaimFilters({
  employee,
  dateFrom,
  dateTo,
  ids
}: {
  employee?: string;
  dateFrom?: string;
  dateTo?: string;
  ids?: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const [qrValue, setQrValue] = useState(ids ? `/finance/claims?ids=${ids}` : "");
  const [scanMessage, setScanMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [decodingImage, setDecodingImage] = useState(false);

  function openQrClaim(value = qrValue) {
    const target = qrTargetFromValue(value);
    if (!target) {
      setScanMessage("ไม่พบเลขอ้างอิงหรือรายการเบิกใน QR/URL นี้");
      return;
    }
    if (target.type === "batch") {
      router.push(`/finance/claims?ids=${encodeURIComponent(target.ids.join(","))}`);
      return;
    }
    router.push(`/finance/claims/${target.id}`);
  }

  async function startScan() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanMessage("Browser นี้ไม่รองรับการเปิดกล้อง ให้ใช้แนบรูป QR หรือวาง URL แทน");
      return;
    }

    setScanning(true);
    setScanMessage("กำลังเปิดกล้อง...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanMessage("เล็งกล้องไปที่ QR ของรายการเบิก");
      scanFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (error) {
      setScanning(false);
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      setScanMessage(message.includes("permission") || message.includes("denied") ? "ไม่ได้รับสิทธิ์ใช้กล้อง กรุณาอนุญาตกล้องใน browser" : "เปิดกล้องไม่สำเร็จ ให้ใช้แนบรูป QR หรือวาง URL แทน");
    }
  }

  async function scanLoop() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    try {
      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const codes = await detector.detect(video);
        if (codes[0]?.rawValue) {
          stopScan();
          openQrClaim(codes[0].rawValue);
          return;
        }
      } else if (video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement("canvas");
        const maxSize = 900;
        const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            stopScan();
            openQrClaim(code.data);
            return;
          }
        }
      }
    } catch {
      // Ignore transient decode errors while the camera is moving.
    }

    scanFrameRef.current = requestAnimationFrame(scanLoop);
  }

  function stopScan() {
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current = null;
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
        setScanMessage("อ่าน QR จากรูปไม่สำเร็จ ลอง crop ให้เห็น QR ชัดขึ้น หรือวาง URL/เลขอ้างอิงแทน");
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
            <Link href="/finance/claims">ล้าง</Link>
          </Button>
        </div>
      </form>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="space-y-2">
          <Label htmlFor="qrValue">QR / URL รายการเบิก / เลขอ้างอิง</Label>
          <Input
            id="qrValue"
            value={qrValue}
            onChange={(event) => setQrValue(event.target.value)}
            placeholder="วาง URL จาก QR, เลขอ้างอิง หรือ QR รวมหลายรายการ"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={() => openQrClaim()}>
            เปิดรายการเบิก
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
