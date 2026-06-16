"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button className={compact ? "h-9 px-3" : "w-full justify-start gap-3"} onClick={handleLogout} type="button" variant="outline">
      <LogOut className="h-4 w-4" aria-hidden />
      ออกจากระบบ
    </Button>
  );
}
