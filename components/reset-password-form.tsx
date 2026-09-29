"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialForm = {
  email: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        return;
      }

      setForm(initialForm);
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } catch {
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
          <KeyRound aria-hidden className="h-6 w-6" />
        </div>
        <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
        <CardDescription>ยืนยันบัญชีและรหัสผ่านเดิมก่อนกำหนดรหัสผ่านใหม่</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล / Username</Label>
            <Input id="email" type="email" autoComplete="username" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-password">รหัสผ่านเดิม</Label>
            <Input id="current-password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => update("currentPassword", event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={12} value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} required />
            <p className="text-xs text-muted-foreground">อย่างน้อย 12 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required />
          </div>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "กำลังตรวจสอบ..." : "ยืนยันและเปลี่ยนรหัสผ่าน"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary">กลับไปหน้าเข้าสู่ระบบ</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
