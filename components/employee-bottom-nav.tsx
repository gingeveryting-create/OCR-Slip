"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, Home, LogOut, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const employeeBottomNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/claims/new", label: "Scan", icon: ReceiptText },
  { href: "/claims", label: "History", icon: History }
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/claims/new") return pathname === "/claims/new";
  return pathname === "/claims" || (pathname.startsWith("/claims/") && pathname !== "/claims/new");
}

export function EmployeeBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-4 border-t border-slate-200 bg-white/96 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      {employeeBottomNav.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium",
              active ? "text-blue-700" : "text-slate-700"
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        aria-label="ออกจากระบบ"
        className="flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-700"
        onClick={handleLogout}
        type="button"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        <span className="truncate">Logout</span>
      </button>
    </nav>
  );
}
