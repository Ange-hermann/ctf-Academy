import { cn } from "@/lib/utils";

/**
 * Cadre commun des trois espaces (maquette) : barre latérale fixe à gauche,
 * barre supérieure en haut, zone de contenu décalée de la largeur de la barre.
 * Le défilement reste celui de la page (pas de conteneur imbriqué).
 */
export function ShellFrame({
  sidebar,
  topbar,
  children,
  footer,
  contentClassName,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <>
      {sidebar}
      <div className={cn("flex min-h-dvh flex-col md:pl-sidebar-rail lg:pl-sidebar", contentClassName)}>
        {topbar}
        <main id="contenu" className="flex-1">
          {children}
        </main>
        {footer}
      </div>
    </>
  );
}
