"use client";

import { createContext, use, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentKeys } from "@/hooks/student/use-realtime";
import { fetchNotificationsAction } from "@/lib/student/actions/shell";
import type { NotificationItem } from "@/lib/student/queries/shell";
import { cn } from "@/lib/utils";

export type ShellData = { notifications: NotificationItem[]; unreadMessages: number; unreadAnnouncements: number };

const ShellDataContext = createContext<Promise<ShellData> | null>(null);

/** Données du shell transmises en promesse : la page s'affiche sans attendre notifications et compteurs. */
export function ShellDataProvider({ value, children }: { value: Promise<ShellData>; children: React.ReactNode }) {
  return <ShellDataContext.Provider value={value}>{children}</ShellDataContext.Provider>;
}

/** Suspend jusqu'à l'arrivée des données (à utiliser sous <Suspense>). */
export function useShellData(): ShellData {
  const promise = useContext(ShellDataContext);
  if (!promise) throw new Error("useShellData doit être utilisé dans <ShellDataProvider>");
  return use(promise);
}

/** Nombre de messages et annonces non lus (temps réel via le cache des notifications). */
export function useUnreadCount() {
  const data = useShellData();
  const { data: notifications = data.notifications } = useQuery<NotificationItem[]>({
    queryKey: studentKeys.notifications,
    queryFn: () => fetchNotificationsAction(),
    initialData: data.notifications,
    staleTime: 30_000,
  });
  const fromNotifications = notifications.filter((n) => !n.read && n.category === "message").length;
  return Math.max(data.unreadMessages, fromNotifications) + data.unreadAnnouncements;
}

export function MessagesBadge({ variant = "full" }: { variant?: "full" | "compact" | "dot" }) {
  const count = useUnreadCount();
  if (!count) return null;
  if (variant === "dot") {
    return (
      <span className="absolute top-2 right-[calc(50%-1.1rem)] size-2.5 rounded-full bg-or-light shadow-[0_0_8px_rgb(229_193_88/0.8)]">
        <span className="sr-only">Nouveautés</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "relative grid min-w-5 place-items-center rounded-full bg-gradient-or px-1.5 text-[0.7rem] leading-5 font-bold text-noir",
        variant === "compact" ? "absolute top-1 right-1 min-w-4 px-1 text-[0.6rem] leading-4" : "ml-auto",
      )}
    >
      <span className="sr-only">non lus : </span>
      {count > 9 ? "9+" : count}
    </span>
  );
}
