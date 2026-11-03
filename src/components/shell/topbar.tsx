"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { FullMenu } from "@/components/shell/full-menu";
import { GoldLine } from "@/components/shell/gold-line";
import { MegaMenu } from "@/components/shell/mega-menu";
import { MobileDrawer } from "@/components/shell/mobile-drawer";
import { SearchPalette } from "@/components/shell/search-palette";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { Emblem } from "@/components/brand/logo";
import { Magnetic } from "@/components/ui/magnetic";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { mainNav, routes, type NavSection } from "@/content/navigation";
import { useSignedIn } from "@/hooks/use-signed-in";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const Divider = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("mx-2 h-9 w-px shrink-0 bg-line", className)} />
);

/**
 * Barre supérieure publique (maquette) : entrées dorées icône + libellé avec
 * chevron pour les sous-menus, filets verticaux, pastille « S » pour S'inscrire,
 * recherche (Ctrl+K) et menu plein écran. Ligne lumineuse dorée en bas.
 * <1024 px : version compacte (hamburger, médaillon, recherche, inscription).
 */
export function TopBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const closeTimer = useRef<number | undefined>(undefined);
  const signedIn = useSignedIn();

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenSection(null);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = (label: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenSection(label);
  };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenSection(null), 180);
  };

  const active: NavSection | null = mainNav.find((s) => s.label === openSection) ?? null;
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const accountSection: NavSection | null = signedIn
    ? {
        ...mainNav[3],
        label: "Mon espace",
        href: routes.studentSpace,
        children: [
          { label: "Tableau de bord", href: routes.studentSpace, description: "Mon espace étudiant" },
          { label: "Mon profil", href: "/espace-etudiant/profil", description: "Informations et préférences" },
          { label: "Suivre ma candidature", href: routes.application, description: "Inscription, paiement, admission" },
        ],
      }
    : null;
  const sections = signedIn ? [...mainNav.slice(0, 3), accountSection!] : mainNav;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] transition-[background-color,backdrop-filter] duration-500 lg:h-[calc(3.5rem+env(safe-area-inset-top))]",
          scrolled || openSection ? "bg-noir/90 backdrop-blur-md supports-[backdrop-filter]:bg-noir/80" : "bg-noir",
        )}
        onPointerLeave={scheduleClose}
      >
        <div className="relative mx-auto flex h-full max-w-[1600px] items-center justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] lg:pl-[max(1.75rem,env(safe-area-inset-left))] lg:pr-[max(1.75rem,env(safe-area-inset-right))]">
          {/* ——— Mobile / tablette : hamburger, médaillon centré, actions ——— */}
          <button
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="grid size-11 place-items-center rounded-xl text-or transition-colors hover:bg-or/10 lg:hidden"
          >
            <Menu aria-hidden className="size-6" />
          </button>
          <Link href="/" aria-label="CTF CHURCH — Accueil" className="absolute left-1/2 -translate-x-1/2 rounded-full lg:hidden">
            <Emblem size={40} className="size-10 drop-shadow-[0_0_10px_rgb(201_162_39/0.4)]" />
          </Link>

          {/* ——— Bureau : entrées de la maquette ——— */}
          <nav aria-label="Navigation principale" className="hidden h-full items-stretch lg:flex">
            <ul className="flex items-stretch">
              {sections.map((section, si) => {
                const Icon = section.icon;
                const isOpen = openSection === section.label || (openSection === "Mon espace" && section.label === "Mon espace");
                const current = isCurrent(section.href);
                return (
                  <li key={section.label} className="flex items-stretch" onPointerEnter={() => open(section.label)}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls="topbar-mega"
                      onClick={() => setOpenSection(isOpen ? null : section.label)}
                      className={cn(
                        "group relative flex min-w-[6.5rem] items-center justify-center gap-2 px-3 font-nav transition-colors",
                        isOpen || current ? "text-or-light" : "text-or hover:text-or-light",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon aria-hidden strokeWidth={1.7} className="size-4.5 shrink-0" />
                        <span className="text-[10px] font-normal tracking-[0.12em] whitespace-nowrap uppercase">{section.topbarLabel ?? section.label}</span>
                        <ChevronDown
                          aria-hidden
                          className={cn("size-3 shrink-0 transition-transform duration-300", isOpen && "rotate-180")}
                        />
                      </span>
                      {/* Soulignement doré qui se dessine */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-4 bottom-3 h-px origin-left bg-or-light shadow-[0_0_8px_rgb(229_193_88/0.7)] transition-transform duration-300",
                          isOpen ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </button>
                    {si < sections.length - 1 && <Divider className="self-center" />}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ——— Extrémité droite : S'inscrire, recherche puis menu ——— */}
          <div className="flex items-center gap-1.5">
            {/* S'inscrire — pastille dorée « S », effet magnétique + reflet */}
            <Magnetic strength={0.25} className="hidden lg:block">
              <Link
                href={signedIn ? routes.studentSpace : routes.register}
                className="group/reg relative flex items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2 font-nav font-semibold text-or-light"
              >
                <span
                  aria-hidden
                  className="grid size-7 place-items-center rounded-lg bg-gradient-or text-sm font-extrabold text-noir shadow-gold transition-shadow group-hover/reg:glow-gold-sm"
                >
                  S
                </span>
                <span className="text-[10px] tracking-[0.12em] whitespace-nowrap uppercase">
                  {signedIn ? "Mon espace" : "S'inscrire"}
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[160%] skew-x-[-20deg] bg-linear-to-r from-transparent via-or-light/25 to-transparent animate-line-shine"
                />
              </Link>
            </Magnetic>
            <Divider className="hidden self-center lg:block" />
            <button
              type="button"
              aria-label="Rechercher (Ctrl+K)"
              onClick={() => setSearchOpen(true)}
              className="grid size-10 place-items-center rounded-xl text-or transition-colors hover:bg-or/10 hover:text-or-light lg:size-11"
            >
              <Search aria-hidden className="size-[22px]" />
            </button>
            <ThemeToggle className="size-10 lg:size-11" iconClassName="size-[22px]" />
            <Divider className="hidden self-center lg:block" />
            <button
              type="button"
              aria-label="Ouvrir le menu complet"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="hidden size-11 place-items-center rounded-xl text-or transition-colors hover:bg-or/10 hover:text-or-light lg:grid"
            >
              <Menu aria-hidden className="size-6" />
            </button>
            <Magnetic strength={0.25} className="lg:hidden">
              <Link
                href={signedIn ? routes.studentSpace : routes.register}
                aria-label={signedIn ? "Mon espace" : "S'inscrire"}
                className="grid size-10 place-items-center rounded-xl bg-gradient-or font-nav text-base font-extrabold text-noir shadow-gold"
              >
                S
              </Link>
            </Magnetic>
          </div>
        </div>

        <div id="topbar-mega">
          <MegaMenu
            section={active ? sections.find((s) => s.label === active.label) ?? null : null}
            onClose={() => setOpenSection(null)}
            onPointerEnter={() => open(active!.label)}
            onPointerLeave={scheduleClose}
          />
        </div>
        {signedIn && openSection === "Mon espace" && (
          <form action={signOutAction} className="absolute right-7 top-full z-50 hidden lg:block">
            <button
              type="submit"
              className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-noir px-4 font-nav text-sm font-semibold text-blanc/70 hover:border-or/40 hover:text-or-light"
            >
              <LogOut aria-hidden className="size-4" /> Se déconnecter
            </button>
          </form>
        )}

        <GoldLine />
        <ScrollProgress className="absolute inset-x-0 bottom-0 translate-y-0.5" />
      </header>

      <FullMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
