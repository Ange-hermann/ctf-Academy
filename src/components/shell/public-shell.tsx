import { MobileCta } from "@/components/shell/mobile-cta";
import { ShellFrame } from "@/components/shell/shell-frame";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { TopBar } from "@/components/shell/topbar";

/** Coquille du site public : barre latérale à 7 entrées + barre supérieure de la maquette. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenu"
        className="fixed top-3 left-3 z-[400] -translate-y-24 rounded-xl bg-gradient-or px-4 py-3 font-semibold text-noir focus:translate-y-0"
      >
        Aller au contenu
      </a>
      <ShellFrame
        sidebar={<SidebarNav />}
        topbar={<TopBar />}
        contentClassName="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        {children}
      </ShellFrame>
      <MobileCta />
    </>
  );
}
