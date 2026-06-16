"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    const profileResponse = await fetch("/api/me", { credentials: "include" });
    const profilePayload = await profileResponse.json();
    setLoading(false);

    if (!profileResponse.ok || !profilePayload.profile) {
      setError("เข้าสู่ระบบสำเร็จ แต่ไม่พบ profile/role กรุณาตรวจตาราง profiles ใน Supabase");
      return;
    }

    const next = searchParams.get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) router.push(next);
    else if (profilePayload.profile.role === "FINANCE") router.push("/finance");
    else if (profilePayload.profile.role === "ADMIN") router.push("/admin/users");
    else router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
          <ReceiptText aria-hidden className="h-6 w-6" />
        </div>
        <CardTitle>เข้าสู่ระบบ</CardTitle>
        <CardDescription>Smart Expense Slip Reader สำหรับพนักงาน การเงิน และผู้ดูแลระบบ</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี <Link href="/signup" className="text-primary">สมัครสมาชิก</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
