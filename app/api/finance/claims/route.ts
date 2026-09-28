import { apiError, ok } from "@/lib/api";
import { createAdminSupabase, requireProfile } from "@/lib/supabase/server";
import { claimIdSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireProfile(["FINANCE", "ADMIN"]);
    const url = new URL(request.url);
    const employee = (url.searchParams.get("employee")?.trim() ?? "").slice(0, 120);
    const requestedDateFrom = url.searchParams.get("dateFrom")?.trim() ?? "";
    const requestedDateTo = url.searchParams.get("dateTo")?.trim() ?? "";
    const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(requestedDateFrom) ? requestedDateFrom : "";
    const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(requestedDateTo) ? requestedDateTo : "";
    const claimIds = Array.from(
      new Set(
        (url.searchParams.get("ids") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter((id) => claimIdSchema.safeParse(id).success)
      )
    ).slice(0, 50);

    let employeeIds: string[] | null = null;
    if (employee) {
      const admin = createAdminSupabase();
      const pattern = `%${employee}%`;
      const [nameResult, emailResult] = await Promise.all([
        admin.from("profiles").select("id").ilike("full_name", pattern).limit(50),
        admin.from("profiles").select("id").ilike("email", pattern).limit(50)
      ]);
      if (nameResult.error) throw nameResult.error;
      if (emailResult.error) throw emailResult.error;
      employeeIds = Array.from(new Set([...(nameResult.data ?? []), ...(emailResult.data ?? [])].map((profile) => profile.id)));
    }

    let query = supabase
      .from("expense_claims")
      .select("*, profiles!expense_claims_employee_id_fkey(email,full_name,department), expense_attachments(*)")
      .in("status", ["SUBMITTED", "FINANCE_REVIEW", "APPROVED", "REJECTED", "PAID"])
      .order("created_at", { ascending: false });

    if (employeeIds) {
      query = employeeIds.length ? query.in("employee_id", employeeIds) : query.eq("employee_id", "00000000-0000-0000-0000-000000000000");
    }
    if (claimIds.length) query = query.in("id", claimIds);
    if (dateFrom) query = query.gte("receipt_date", dateFrom);
    if (dateTo) query = query.lte("receipt_date", dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return ok({ claims: data });
  } catch (error) {
    return apiError(error);
  }
}
