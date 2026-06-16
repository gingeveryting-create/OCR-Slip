import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";
import { OCR_EXTRACTION_PROMPT } from "@/lib/ocr/prompt";
import type { OcrExtractionResult, OcrProvider } from "@/lib/ocr/types";

export class OpenAiVisionOcrProvider implements OcrProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when OCR_PROVIDER=openai");
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_OCR_MODEL;
  }

  async extract(fileUrl: string, mimeType: string): Promise<OcrExtractionResult> {
    if (mimeType === "application/pdf") {
      const responsesClient = (this.client as any).responses;
      if (!responsesClient?.create) {
        throw new Error("OpenAI SDK version must support Responses API for PDF extraction.");
      }
      const response = await responsesClient.create({
        model: this.model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: OCR_EXTRACTION_PROMPT },
              { type: "input_file", file_url: fileUrl }
            ]
          }
        ],
        text: { format: { type: "json_object" } }
      });
      const content = response.output_text;
      if (!content) throw new Error("OpenAI returned no PDF extraction content.");
      return JSON.parse(content) as OcrExtractionResult;
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: fileUrl } }
          ]
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned no extraction content.");
    return JSON.parse(content) as OcrExtractionResult;
  }
}
