import ExcelJS from "exceljs";
import { apiError } from "@/lib/api";
import { requireProfile } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { supabase } = await requireProfile(["FINANCE", "ADMIN"]);
    const { data, error } = await supabase
      .from("expense_claims")
      .select("claim_no,merchant_name,receipt_date,total_amount,vat_amount,currency,status,profiles!expense_claims_employee_id_fkey(email,full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("claims");
    sheet.columns = [
      { header: "Claim No", key: "claim_no", width: 18 },
      { header: "Employee", key: "employee", width: 28 },
      { header: "Merchant", key: "merchant_name", width: 28 },
      { header: "Receipt Date", key: "receipt_date", width: 16 },
      { header: "Total", key: "total_amount", width: 14 },
      { header: "VAT", key: "vat_amount", width: 14 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "Status", key: "status", width: 16 }
    ];
    (data ?? []).forEach((row: any) =>
      sheet.addRow({
        ...row,
        employee: row.profiles?.full_name ?? row.profiles?.email ?? ""
      })
    );
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="expense-claims.xlsx"`
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
