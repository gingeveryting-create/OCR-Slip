"use client";

import Image from "next/image";
import { useState } from "react";
import { Download, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptViewer({ signedUrl, mimeType }: { signedUrl: string | null; mimeType?: string | null }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  if (!signedUrl) return <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">ไม่พบไฟล์ต้นฉบับ</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="icon" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(2, value + 0.1))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Rotate" onClick={() => setRotation((value) => value + 90)}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button variant="outline" asChild>
          <a href={signedUrl} download>
            <Download className="h-4 w-4" aria-hidden />
            Download
          </a>
        </Button>
      </div>
      <div className="overflow-auto rounded-md border bg-muted/30 p-3">
        {mimeType === "application/pdf" ? (
          <iframe className="h-[760px] w-full bg-white" src={signedUrl} title="Receipt PDF" />
        ) : (
          <Image
            src={signedUrl}
            alt="Original receipt"
            width={820}
            height={1100}
            className="mx-auto max-h-[760px] w-auto origin-center object-contain transition-transform"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
