export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sans Supabase configuré, le site fonctionne en mode démonstration (données d'exemple). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
