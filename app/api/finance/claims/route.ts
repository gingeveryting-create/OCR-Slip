import { apiError, ok } from "@/lib/api";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireProfile(["FINANCE", "ADMIN"]);
    const url = new URL(request.url);
    const employee = url.searchParams.get("employee")?.trim() ?? "";
    const dateFrom = url.searchParams.get("dateFrom")?.trim() ?? "";
    const dateTo = url.searchParams.get("dateTo")?.trim() ?? "";

    let employeeIds: string[] | null = null;
    if (employee) {
      const admin = createAdminSupabase();
      const safeEmployee = employee.replaceAll(",", " ");
      const { data: profiles } = await admin
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${safeEmployee}%,email.ilike.%${safeEmployee}%`)
        .limit(50);
      employeeIds = (profiles ?? []).map((profile) => profile.id);
    }

    let query = supabase
      .from("expense_claims")
      .select("*, profiles!expense_claims_employee_id_fkey(email,full_name,department), expense_attachments(*)")
      .in("status", ["SUBMITTED", "FINANCE_REVIEW", "APPROVED", "REJECTED", "PAID"])
      .order("created_at", { ascending: false });

    if (employeeIds) {
      query = employeeIds.length ? query.in("employee_id", employeeIds) : query.eq("employee_id", "00000000-0000-0000-0000-000000000000");
    }
    if (dateFrom) query = query.gte("receipt_date", dateFrom);
    if (dateTo) query = query.lte("receipt_date", dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return ok({ claims: data });
  } catch (error) {
    return apiError(error);
  }
}
