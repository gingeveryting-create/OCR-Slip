"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialForm = {
  email: "",
  fullName: "",
  department: "",
  role: "EMPLOYEE",
  initialPassword: ""
};

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const generated = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  return `A1!${generated}`;
}

export function AdminCreateUserForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "สร้างผู้ใช้ไม่สำเร็จ");
        return;
      }

      setMessage(`สร้างบัญชี ${form.email} แล้ว กรุณาส่งรหัสผ่านเริ่มต้นให้ผู้ใช้`);
      setForm((current) => ({ ...initialForm, initialPassword: current.initialPassword }));
      router.refresh();
    } catch {
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-user-email">อีเมล</Label>
          <Input id="new-user-email" type="email" autoComplete="off" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-user-name">ชื่อผู้ใช้</Label>
          <Input id="new-user-name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-user-department">แผนก</Label>
          <Input id="new-user-department" value={form.department} onChange={(event) => update("department", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-user-role">Role</Label>
          <select
            id="new-user-role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.role}
            onChange={(event) => update("role", event.target.value)}
          >
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="FINANCE">FINANCE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-password">รหัสผ่านเริ่มต้น</Label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              id="new-user-password"
              className="pl-9 pr-10"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              value={form.initialPassword}
              onChange={(event) => update("initialPassword", event.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="button" variant="outline" onClick={() => update("initialPassword", generatePassword())}>
            <RefreshCw className="h-4 w-4" />
            สุ่มรหัส
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">อย่างน้อย 12 ตัวอักษร และต้องมีตัวอักษรกับตัวเลข ระบบจะไม่แสดงรหัสนี้ในตารางผู้ใช้</p>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      <div>
        <Button type="submit" disabled={saving}>
          <Plus className="h-4 w-4" />
          {saving ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
        </Button>
      </div>
    </form>
  );
}
