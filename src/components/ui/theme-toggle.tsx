"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const THEME_KEY = "ctf-theme";

/** <html data-theme> est la source de vérité : observée via MutationObserver. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getTheme = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/**
 * Bascule clair/sombre : persiste dans localStorage « ctf-theme » et met à jour
 * <html data-theme> (lu avant le premier rendu par le script « ctf-theme »).
 */
export function ThemeToggle({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Stockage indisponible : la bascule reste effective pour la session.
    }
  };

  const light = theme === "light";
  const Icon = light ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={light}
      aria-label={light ? "Passer au mode sombre" : "Passer au mode clair"}
      title={light ? "Mode sombre" : "Mode clair"}
      className={cn(
        "grid size-11 place-items-center rounded-xl text-or transition-colors hover:bg-or/10 hover:text-or-light",
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-6 transition-opacity", iconClassName)} />
    </button>
  );
}
