import Link from "next/link";
import { AuthShell } from "@/components/forms/auth-shell";
import { SignUpForm } from "@/components/forms/signup-form";
import { routes } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Créer un compte",
  description: "Créez votre compte CTF ACADEMY en moins d'une minute.",
  path: routes.signup,
});

export default function SignUpPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques informations suffisent. Vous pourrez ensuite choisir votre formation."
      breadcrumb={[
        { label: "Mon compte", href: "/compte" },
        { label: "Créer un compte", href: routes.signup },
      ]}
    >
      <p className="text-sm text-blanc/65">
        Vous voulez vous inscrire directement à une formation ?{" "}
        <Link href={routes.register} className="font-semibold text-or-light hover:text-or">
          L&apos;inscription en ligne crée votre compte en même temps.
        </Link>
      </p>
      <SignUpForm />
    </AuthShell>
  );
}
