import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/espace-etudiant", "/admin", "/compte/candidature"];
const DEMO_COOKIE = "ctf_demo_session";
const STUDENT = "/espace-etudiant";
const STUDENT_APPLICATION = "/espace-etudiant/candidature";
const FORMATION_PATH = /^\/espace-etudiant\/(eds|edm|diacres|pastorale)(?:\/|$)/;

type EnrollmentRow = {
  admission_status: string;
  payment_status: string;
  formations: { slug: string } | null;
};

/**
 * Rafraîchit la session Supabase et protège les espaces privés.
 * Espace étudiant : accès complet seulement si la candidature est admise (et le paiement confirmé ou partiel),
 * sinon page « Suivre ma candidature » ; les routes d'une formation sont réservées à ses étudiants.
 * Mode démonstration (Supabase non configuré) : un cookie de session de démonstration suffit.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isStudent = pathname === STUDENT || pathname.startsWith(`${STUDENT}/`);

  let response = NextResponse.next({ request });
  const redirectTo = (path: string, query = "") => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = query;
    const res = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };

  if (!url || !key) {
    if (isProtected && !request.cookies.has(DEMO_COOKIE)) {
      return redirectTo("/compte/connexion", `?next=${encodeURIComponent(pathname + search)}`);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  if (isProtected && !authenticated) {
    return redirectTo("/compte/connexion", `?next=${encodeURIComponent(pathname + search)}`);
  }

  if (isStudent && authenticated && pathname !== STUDENT_APPLICATION) {
    const { data: rows } = await supabase
      .from("applications")
      .select("admission_status, payment_status, formations(slug)")
      .order("created_at", { ascending: false });
    const active = ((rows ?? []) as unknown as EnrollmentRow[]).find(
      (r) => r.admission_status === "admitted" && (r.payment_status === "confirmed" || r.payment_status === "partial"),
    );
    if (!active) {
      // Compte d'encadrement sans admission active : son espace est l'administration, pas le suivi de dossier.
      const { data: roleRows } = await supabase.from("user_roles").select("role");
      const staff = (roleRows ?? []).some((r: { role: string }) => r.role !== "student");
      return redirectTo(staff ? "/admin" : STUDENT_APPLICATION);
    }
    const formationPath = pathname.match(FORMATION_PATH)?.[1];
    if (formationPath && formationPath !== active.formations?.slug) return redirectTo(STUDENT);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|demo/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|txt|xml|pdf)$).*)"],
};
