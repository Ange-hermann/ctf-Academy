import { AuthShell } from "@/components/forms/auth-shell";
import { ResetPasswordForm } from "@/components/forms/password-forms";
import { routes } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Nouveau mot de passe",
  description: "Choisissez un nouveau mot de passe pour votre compte CTF ACADEMY.",
  path: routes.resetPassword,
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe que vous retiendrez facilement, mais difficile à deviner."
      breadcrumb={[
        { label: "Mon compte", href: "/compte" },
        { label: "Nouveau mot de passe", href: routes.resetPassword },
      ]}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
