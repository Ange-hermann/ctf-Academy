import { AuthShell } from "@/components/forms/auth-shell";
import { ForgotPasswordForm } from "@/components/forms/password-forms";
import { routes } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Mot de passe oublié",
  description: "Recevez un lien pour réinitialiser le mot de passe de votre compte CTF ACADEMY.",
  path: routes.forgotPassword,
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Pas d'inquiétude : indiquez votre e-mail et nous vous envoyons un lien pour en choisir un nouveau."
      breadcrumb={[
        { label: "Mon compte", href: "/compte" },
        { label: "Mot de passe oublié", href: routes.forgotPassword },
      ]}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
