import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Client Supabase lié à la session de l'utilisateur (cookies), soumis à la RLS.
 * `persistent: false` → cookies de session (option « Se souvenir de moi » décochée).
 */
export async function createSupabaseServerClient({ persistent = true }: { persistent?: boolean } = {}) {
  const store = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            const opts = persistent ? options : { ...options, maxAge: undefined, expires: undefined };
            store.set(name, value, opts);
          }
        } catch {
          /* Appel depuis un Server Component : le rafraîchissement est géré par proxy.ts */
        }
      },
    },
  });
}

/** Client « service » (contourne la RLS) — serveur uniquement, après validation stricte des entrées. */
export function createSupabaseAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
