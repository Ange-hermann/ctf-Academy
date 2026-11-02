"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Cache client de l'espace étudiant : données affichées depuis le cache pendant le rafraîchissement. */
export function StudentProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: true, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
