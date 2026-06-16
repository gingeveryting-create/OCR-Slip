"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MasterDataForm({ endpoint, withDescription = false }: { endpoint: string; withDescription?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isActive: true })
    });
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "Save failed");
      return;
    }
    setForm({ code: "", name: "", description: "" });
    setMessage("บันทึกแล้ว");
    router.refresh();
  }

  return (
    <form className="grid gap-3 lg:grid-cols-[160px_1fr_auto]" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input id="code" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
      </div>
      <Button className="self-end">
        <Plus className="h-4 w-4" aria-hidden />
        Add
      </Button>
      {withDescription ? (
        <div className="space-y-2 lg:col-span-3">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground lg:col-span-3">{message}</p> : null}
    </form>
  );
}
