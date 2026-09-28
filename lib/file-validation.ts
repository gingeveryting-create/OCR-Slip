import { ApiError } from "@/lib/api";

const maxImagePixels = 40_000_000;
const maxImageSide = 12_000;
const maxPdfPages = 30;

const extensionByMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf"
};

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function detectedMime(bytes: Uint8Array) {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8]
      };
    }
    offset += length + 2;
  }
  return null;
}

function assertImageDimensions(bytes: Uint8Array, mimeType: string) {
  const dimensions = mimeType === "image/png"
    ? pngDimensions(bytes)
    : mimeType === "image/jpeg"
      ? jpegDimensions(bytes)
      : null;
  if (!dimensions) return;
  if (
    dimensions.width < 1 || dimensions.height < 1 ||
    dimensions.width > maxImageSide || dimensions.height > maxImageSide ||
    dimensions.width * dimensions.height > maxImagePixels
  ) {
    throw new ApiError("รูปภาพมีความละเอียดสูงเกินขีดจำกัด", 400, "IMAGE_DIMENSIONS_EXCEEDED");
  }
}

function assertPdfLimits(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  const pageCount = text.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  if (pageCount > maxPdfPages) {
    throw new ApiError(`PDF ต้องมีไม่เกิน ${maxPdfPages} หน้า`, 400, "PDF_PAGE_LIMIT_EXCEEDED");
  }
}

export function validateUploadedFile(file: File, buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const actualMime = detectedMime(bytes);
  if (!actualMime || actualMime !== file.type) {
    throw new ApiError("ชนิดไฟล์ไม่ตรงกับเนื้อไฟล์จริง", 400, "FILE_SIGNATURE_MISMATCH");
  }

  if (actualMime === "application/pdf") assertPdfLimits(bytes);
  else assertImageDimensions(bytes, actualMime);

  const cleanBaseName = file.name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "-")
    .slice(0, 200) || `receipt.${extensionByMime[actualMime]}`;

  return {
    actualMime,
    extension: extensionByMime[actualMime],
    safeFileName: cleanBaseName
  };
}
