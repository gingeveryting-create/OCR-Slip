import { getServerEnv } from "@/lib/env";
import { MockOcrProvider } from "@/lib/ocr/mock";
import { OpenAiVisionOcrProvider } from "@/lib/ocr/openai";
import { TesseractOcrProvider } from "@/lib/ocr/tesseract";
import type { OcrProvider } from "@/lib/ocr/types";

export function createOcrProvider(): OcrProvider {
  const env = getServerEnv();
  switch (env.OCR_PROVIDER) {
    case "mock":
      return new MockOcrProvider();
    case "openai":
      return new OpenAiVisionOcrProvider();
    case "tesseract":
      return new TesseractOcrProvider();
    default:
      throw new Error(`Unsupported OCR provider: ${env.OCR_PROVIDER}`);
  }
}
