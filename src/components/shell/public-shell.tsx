import { ShellFrame } from "@/components/shell/shell-frame";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { TopBar } from "@/components/shell/topbar";

/** Coquille du site public : barre latérale à 7 entrées + barre supérieure de la maquette. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenu"
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-[400] -translate-y-24 rounded-xl bg-gradient-or px-4 py-3 font-semibold text-noir focus:translate-y-0"
      >
        Aller au contenu
      </a>
      <ShellFrame sidebar={<SidebarNav />} topbar={<TopBar />}>
        {children}
      </ShellFrame>
    </>
  );
}
