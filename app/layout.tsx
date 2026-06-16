import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Expense Slip Reader",
  description: "Company expense reimbursement with OCR review workflow"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
