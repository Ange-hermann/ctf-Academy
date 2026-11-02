import { NextResponse, type NextRequest } from "next/server";
import { routes } from "@/config/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

/** Retour des liens e-mail Supabase (confirmation, réinitialisation) : échange du code contre une session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), routes.studentSpace);

  if (code && isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL(`${routes.login}?erreur=lien`, origin));
}
