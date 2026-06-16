import { AppShell } from "@/components/app-shell";
import { MasterDataForm } from "@/components/master-data-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/supabase/server";

export default async function ExpenseTypesPage() {
  const { supabase } = await requireProfile(["ADMIN"]);
  const { data } = await supabase.from("expense_types").select("*").order("code");
  return (
    <AppShell>
      <Card>
        <CardHeader><CardTitle>ประเภทค่าใช้จ่าย</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <MasterDataForm endpoint="/api/admin/expense-types" />
          <div className="table-wrap">
            <table><thead><tr><th>Code</th><th>Name</th><th>Status</th></tr></thead><tbody>
              {(data ?? []).map((row: any) => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td><Badge>{row.is_active ? "ACTIVE" : "INACTIVE"}</Badge></td></tr>)}
            </tbody></table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
