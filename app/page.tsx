import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";

export default async function HomePage() {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "FINANCE") redirect("/finance");
  if (profile.role === "ADMIN") redirect("/admin/users");
  redirect("/dashboard");
}
