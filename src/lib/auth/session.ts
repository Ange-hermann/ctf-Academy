import "server-only";
import { getDemoSession } from "@/lib/auth/demo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string | null; email: string; firstName: string; mode: "supabase" | "demo" };

/** Utilisateur connecté (Supabase) ou session de démonstration. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) {
    const demo = await getDemoSession();
    return demo ? { id: null, email: demo.email, firstName: demo.firstName, mode: "demo" } : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", data.user.id).maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    firstName: profile?.first_name ?? (data.user.user_metadata?.first_name as string | undefined) ?? "",
    mode: "supabase",
  };
}
