import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value?: number | string | null, currency = "THB") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function toInputDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}
