import { AdminIntro, AdminSection } from "@/components/admin/ui";
import { SiteSettingsForm } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getSiteSettings } from "@/lib/site-settings";

export default async function ParametresPage() {
  await requireAdminRoles(["admin"], adminRoutes.settings);
  const settings = await getSiteSettings();

  return (
    <>
      <AdminIntro
        title="Paramètres du site"
        subtitle="Réglages appliqués au site public — chaque modification est tracée dans le journal d'audit et prend effet immédiatement."
      />
      <AdminSection title="Coordonnées & inscriptions">
        <SiteSettingsForm settings={settings} />
      </AdminSection>
      <p className="mt-4 text-xs text-blanc/45">
        La fermeture des inscriptions masque le formulaire public et bloque toute nouvelle candidature ; un dossier déjà commencé peut
        toujours être terminé. Si aucun numéro WhatsApp n&rsquo;est indiqué, les boutons d&rsquo;assistance du site sont masqués.
      </p>
    </>
  );
}
