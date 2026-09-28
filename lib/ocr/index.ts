import { getServerEnv } from "@/lib/env";
import { MockOcrProvider } from "@/lib/ocr/mock";
import { OpenAiVisionOcrProvider } from "@/lib/ocr/openai";
import { TesseractOcrProvider } from "@/lib/ocr/tesseract";
import type { OcrProvider } from "@/lib/ocr/types";

export type OcrProviderName = "mock" | "openai" | "tesseract";

export function createOcrProvider(providerName?: OcrProviderName): OcrProvider {
  const env = getServerEnv();
  const selectedProvider = providerName ?? env.OCR_PROVIDER;
  switch (selectedProvider) {
    case "mock":
      return new MockOcrProvider();
    case "openai":
      return new OpenAiVisionOcrProvider();
    case "tesseract":
      return new TesseractOcrProvider();
    default:
      throw new Error(`Unsupported OCR provider: ${selectedProvider}`);
  }
}
