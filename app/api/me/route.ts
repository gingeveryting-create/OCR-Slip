import { apiError, ok } from "@/lib/api";
import { getCurrentProfile } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { user, profile } = await getCurrentProfile();
    return ok({ user, profile });
  } catch (error) {
    return apiError(error);
  }
}
