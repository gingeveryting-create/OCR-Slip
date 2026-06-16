"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = ["EMPLOYEE", "FINANCE", "ADMIN"] as const;

export function AdminUserRoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveRole() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedRole })
    });
    setSaving(false);
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "Save failed");
      return;
    }
    setMessage("บันทึกแล้ว");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="min-h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={selectedRole}
        onChange={(event) => setSelectedRole(event.target.value)}
      >
        {roles.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <Button size="sm" variant="outline" onClick={saveRole} disabled={saving || selectedRole === role}>
        <Save className="h-4 w-4" aria-hidden />
        บันทึก
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </div>
  );
}
