import { AuthShell } from "@/components/forms/auth-shell";
import { LoginForm } from "@/components/forms/login-form";
import { routes } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Se connecter",
  description: "Connectez-vous à votre espace CTF ACADEMY.",
  path: routes.login,
  noIndex: true,
});

export default async function LoginPage({ searchParams }: PageProps<"/compte/connexion">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthShell
      title="Se connecter"
      subtitle="Heureux de vous revoir. Accédez à votre espace et à votre candidature."
      breadcrumb={[
        { label: "Mon compte", href: "/compte" },
        { label: "Se connecter", href: routes.login },
      ]}
    >
      <LoginForm next={next} linkError={sp.erreur === "lien"} />
    </AuthShell>
  );
}
