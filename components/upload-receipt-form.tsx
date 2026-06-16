"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileUp, RotateCcw, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadReceiptForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function selectFile(nextFile?: File) {
    if (!nextFile) return;
    setFile(nextFile);
    setClaimId(null);
    setError("");
    setPreview(nextFile.type.startsWith("image/") ? URL.createObjectURL(nextFile) : null);
  }

  async function upload() {
    if (!file) return;
    setStatus("กำลังอัปโหลดไฟล์...");
    setError("");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/claims/upload", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Upload failed");
      setStatus("");
      return;
    }
    setClaimId(payload.claim.id);
    setStatus("อัปโหลดสำเร็จ พร้อมเริ่ม OCR");
  }

  async function extract() {
    if (!claimId) return;
    setStatus("OCR_PROCESSING");
    setError("");
    const response = await fetch("/api/claims/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Extraction failed");
      setStatus("OCR_FAILED");
      return;
    }
    router.push(`/claims/${claimId}/review`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>ไฟล์ต้นฉบับ</CardTitle>
          <CardDescription>ลากไฟล์มาวาง หรือเลือกจากเครื่องและกล้องมือถือ</CardDescription>
        </CardHeader>
        <CardContent>
          <label
            className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/35 p-6 text-center hover:bg-muted/55"
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files[0]);
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="Receipt preview" className="max-h-[520px] w-auto rounded-md object-contain" />
            ) : (
              <>
                <FileUp className="mb-3 h-10 w-10 text-primary" aria-hidden />
                <span className="font-medium">วางไฟล์ที่นี่ หรือกดเพื่อเลือกไฟล์</span>
                <span className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP, HEIC, PDF ขนาดไม่เกิน 10MB</span>
              </>
            )}
            <input
              className="sr-only"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ขั้นตอน OCR</CardTitle>
          <CardDescription>อัปโหลดก่อน จากนั้นเริ่มอ่านข้อมูลด้วย AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={upload} disabled={!file || status.includes("อัปโหลด")}>
            <Camera className="h-4 w-4" aria-hidden />
            อัปโหลดไฟล์
          </Button>
          <Button className="w-full" onClick={extract} disabled={!claimId || status === "OCR_PROCESSING"}>
            <ScanText className="h-4 w-4" aria-hidden />
            เริ่ม Extraction
          </Button>
          {error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
              <Button className="mt-3 w-full" variant="outline" onClick={() => setError("")}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                ลองใหม่
              </Button>
            </div>
          ) : null}
          {status ? <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
