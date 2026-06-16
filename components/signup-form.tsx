"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", department: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "สมัครสมาชิกไม่สำเร็จ");
      return;
    }

    setMessage(payload.needsEmailConfirmation
      ? "สมัครสมาชิกสำเร็จ ระบบตั้ง role เป็น EMPLOYEE แล้ว กรุณายืนยันอีเมลถ้า Supabase เปิด email confirmation"
      : "สมัครสมาชิกสำเร็จ ระบบตั้ง role เป็น EMPLOYEE แล้ว");
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
          <UserPlus aria-hidden className="h-6 w-6" />
        </div>
        <CardTitle>สมัครสมาชิก</CardTitle>
        <CardDescription>บัญชีใหม่จะถูกตั้งค่าเป็น Employee โดยอัตโนมัติ</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">แผนก</Label>
            <Input id="department" value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" autoComplete="email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              autoComplete="new-password"
              minLength={6}
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            มีบัญชีแล้ว <Link href="/login" className="text-primary">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
