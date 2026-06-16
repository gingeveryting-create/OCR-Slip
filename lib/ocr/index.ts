import { getServerEnv } from "@/lib/env";
import { OpenAiVisionOcrProvider } from "@/lib/ocr/openai";
import type { OcrProvider } from "@/lib/ocr/types";

export function createOcrProvider(): OcrProvider {
  const env = getServerEnv();
  switch (env.OCR_PROVIDER) {
    case "openai":
      return new OpenAiVisionOcrProvider();
    default:
      throw new Error(`Unsupported OCR provider: ${env.OCR_PROVIDER}`);
  }
}
