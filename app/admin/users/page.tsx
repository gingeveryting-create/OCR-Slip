import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const { supabase } = await requireProfile(["ADMIN"]);
  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>จัดการผู้ใช้</CardTitle>
          <CardDescription>เปลี่ยน role ผ่าน API: PATCH /api/admin/users/[id]/role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email</th><th>Name</th><th>Department</th><th>Role</th><th>Created</th></tr></thead>
              <tbody>
                {(users ?? []).map((user: any) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.full_name}</td>
                    <td>{user.department}</td>
                    <td><Badge>{user.role}</Badge></td>
                    <td>{new Date(user.created_at).toLocaleDateString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
