import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/supabase/server";

export default async function AuditLogsPage() {
  const { supabase } = await requireProfile(["ADMIN"]);
  const { data } = await supabase
    .from("audit_logs")
    .select("*, profiles(email,full_name), expense_claims(claim_no)")
    .order("performed_at", { ascending: false })
    .limit(200);
  return (
    <AppShell>
      <Card>
        <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table><thead><tr><th>Time</th><th>Action</th><th>Claim</th><th>By</th><th>Remark</th></tr></thead><tbody>
              {(data ?? []).map((row: any) => (
                <tr key={row.id}>
                  <td>{new Date(row.performed_at).toLocaleString("th-TH")}</td>
                  <td>{row.action}</td>
                  <td>{row.expense_claims?.claim_no ?? row.claim_id ?? "-"}</td>
                  <td>{row.profiles?.full_name ?? row.profiles?.email}</td>
                  <td>{row.remark}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
