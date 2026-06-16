import Link from "next/link";
import { redirect } from "next/navigation";
import type { ElementType } from "react";
import { ClipboardCheck, FilePlus2, Files, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const navByRole: Record<UserRole, Array<{ href: string; label: string; icon: ElementType }>> = {
  EMPLOYEE: [
    { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/claims/new", label: "อัปโหลดสลิป", icon: FilePlus2 },
    { href: "/claims", label: "เคลมของฉัน", icon: Files }
  ],
  FINANCE: [
    { href: "/finance", label: "ภาพรวมการเงิน", icon: LayoutDashboard },
    { href: "/finance/claims", label: "ตรวจเคลม", icon: ClipboardCheck }
  ],
  ADMIN: [
    { href: "/admin/users", label: "ผู้ใช้", icon: Users },
    { href: "/admin/expense-types", label: "ประเภทค่าใช้จ่าย", icon: Settings },
    { href: "/admin/document-types", label: "ประเภทเอกสาร", icon: Files },
    { href: "/admin/audit-logs", label: "Audit log", icon: ShieldCheck }
  ]
};

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login");
  const nav = navByRole[profile.role];

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">
        <div className="border-b p-5">
          <div className="text-sm font-semibold text-muted-foreground">Smart Expense</div>
          <div className="mt-1 text-lg font-bold">Slip Reader</div>
        </div>
        <div className="flex h-[calc(100dvh-81px)] flex-col justify-between">
          <nav className="space-y-1 p-3">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between px-4 sm:px-6">
            <div>
              <p className="text-sm text-muted-foreground">{profile.department ?? "Company"}</p>
              <h1 className="text-base font-semibold">{profile.full_name ?? profile.email}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border px-3 py-1 text-xs font-medium">{profile.role}</span>
              <LogoutButton compact />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
