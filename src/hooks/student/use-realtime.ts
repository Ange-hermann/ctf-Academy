"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const studentKeys = {
  notifications: ["student", "notifications"] as const,
  messages: ["student", "messages"] as const,
  search: (q: string) => ["student", "search", q] as const,
};

/**
 * Temps réel (Supabase Realtime, soumis à la RLS) : nouvelle notification, nouveau message, nouvelle annonce,
 * commentaire du superviseur. Invalide le cache concerné ; `onEvent` permet aux pages de rafraîchir leurs données.
 */
export function useStudentRealtime(userId: string, onEvent?: (table: string) => void) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`student-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: studentKeys.notifications });
        onEvent?.("notifications");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: studentKeys.messages });
        onEvent?.("messages");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => onEvent?.("announcements"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "thesis_comments" }, () => onEvent?.("thesis_comments"))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, onEvent]);
}
