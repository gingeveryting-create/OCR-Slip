import Link from "next/link";
import { redirect } from "next/navigation";
import type { ElementType } from "react";
import {
  ClipboardCheck,
  FilePlus2,
  Files,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { EmployeeBottomNav } from "@/components/employee-bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { cn } from "@/lib/utils";

const navByRole: Record<UserRole, Array<{ href: string; label: string; icon: ElementType }>> = {
  EMPLOYEE: [
    { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/claims/new", label: "อัปโหลดสลิป", icon: FilePlus2 },
    { href: "/claims", label: "รายการเบิกของฉัน", icon: Files }
  ],
  FINANCE: [
    { href: "/finance", label: "ภาพรวมการเงิน", icon: LayoutDashboard },
    { href: "/finance/claims", label: "ตรวจรายการเบิก", icon: ClipboardCheck }
  ],
  ADMIN: [
    { href: "/admin/users", label: "ผู้ใช้", icon: Users },
    { href: "/admin/expense-types", label: "ประเภทค่าใช้จ่าย", icon: Settings },
    { href: "/admin/document-types", label: "ประเภทเอกสาร", icon: Files },
    { href: "/admin/audit-logs", label: "Audit log", icon: ShieldCheck }
  ]
};

export async function AppShell({
  children,
  variant = "default"
}: {
  children: React.ReactNode;
  variant?: "default" | "employee";
}) {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login");
  const nav = navByRole[profile.role];
  const isEmployeeApp = variant === "employee" && profile.role === "EMPLOYEE";

  return (
    <div className={cn("min-h-dvh bg-background", isEmployeeApp && "bg-[#fbf8fb]")}>
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
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
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
        <header
          className={cn(
            "sticky top-0 z-20 border-b bg-background/95 backdrop-blur",
            isEmployeeApp && "hidden border-slate-200 bg-[#fbf8fb]/95 lg:sticky lg:block lg:bg-background/95"
          )}
        >
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{profile.department ?? "Company"}</p>
              <h1 className="truncate text-base font-semibold">{profile.full_name ?? profile.email}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-md border px-2 py-1 text-xs font-medium sm:px-3">{profile.role}</span>
              <LogoutButton compact />
            </div>
          </div>
          {!isEmployeeApp ? (
            <nav className="mobile-nav-scroll flex gap-2 overflow-x-auto border-t px-4 py-2 lg:hidden">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </header>
        <main className={cn("px-4 py-6 sm:px-6", isEmployeeApp && "px-4 py-5 pb-24 lg:pb-6")}>{children}</main>
      </div>

      {isEmployeeApp ? <EmployeeBottomNav /> : null}
    </div>
  );
}
