"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, ImageUp, RotateCcw, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadReceiptForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

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

  async function extract(provider?: "openai" | "tesseract") {
    if (!claimId) return;
    const selectedProvider = provider ?? "tesseract";
    setProcessing(true);
    setStatus(selectedProvider === "openai" ? "กำลังอ่านด้วย GPT OCR..." : "กำลังเตรียม OCR ในเบราว์เซอร์...");
    setError("");
    let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;
    try {
      let rawText: string | undefined;
      let confidence: number | undefined;
      if (selectedProvider === "tesseract") {
        if (!file || !file.type.startsWith("image/")) {
          throw new Error("Tesseract รองรับเฉพาะไฟล์รูปภาพ กรุณาใช้ GPT OCR สำหรับไฟล์ PDF");
        }
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker("eng+tha", 1, {
          logger: (message) => {
            const percent = typeof message.progress === "number" ? ` ${Math.round(message.progress * 100)}%` : "";
            setStatus(`กำลังอ่านเอกสาร: ${message.status}${percent}`);
          }
        });
        const result = await worker.recognize(file);
        rawText = result.data.text.trim();
        confidence = Math.max(0, Math.min(1, (result.data.confidence || 0) / 100));
        if (!rawText) throw new Error("OCR ไม่พบข้อความในรูป กรุณาถ่ายใหม่ให้คมชัดขึ้น");
        setStatus("กำลังบันทึกผล OCR...");
      }

      const response = await fetch("/api/claims/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, provider: selectedProvider, rawText, confidence })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Extraction failed");
      router.push(`/claims/${claimId}/review`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Extraction failed");
      setStatus("OCR_FAILED");
    } finally {
      if (worker) await worker.terminate();
      setProcessing(false);
    }
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
                <span className="font-medium">วางไฟล์ที่นี่ หรือกดปุ่มเพื่อเลือกรูปภาพ</span>
                <span className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP, HEIC, PDF ขนาดไม่เกิน 10MB</span>
                <span className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">
                  <ImageUp className="h-4 w-4" aria-hidden />
                  เลือกรูปภาพ / ถ่ายภาพ
                </span>
              </>
            )}
            <input
              className="sr-only"
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ขั้นตอน OCR</CardTitle>
          <CardDescription>อัปโหลดก่อน จากนั้นเริ่มอ่านข้อมูลด้วย OCR/AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={upload} disabled={!file || processing || status.includes("อัปโหลด")}>
            <FileUp className="h-4 w-4" aria-hidden />
            อัปโหลดไฟล์
          </Button>
          <Button className="w-full" onClick={() => extract()} disabled={!claimId || processing}>
            <ScanText className="h-4 w-4" aria-hidden />
            เริ่ม Extraction
          </Button>
          <Button className="w-full bg-slate-950 hover:bg-slate-900" onClick={() => extract("openai")} disabled={!claimId || processing}>
            <ScanText className="h-4 w-4" aria-hidden />
            OCR ด้วย GPT
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
