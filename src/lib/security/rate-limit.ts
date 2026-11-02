import "server-only";
import { headers } from "next/headers";

/**
 * Limitation de débit en mémoire (fenêtre glissante) par IP et par action.
 * Suffisant pour une instance unique ; en production multi-instances, brancher un stockage partagé
 * (ex. Upstash Redis) derrière la même signature. TODO: stockage partagé si déploiement distribué.
 */
const buckets = new Map<string, number[]>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function rateLimit(action: string, { limit = 5, windowMs = 60_000 } = {}) {
  const key = `${action}:${await clientIp()}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryInSec: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t > windowMs)) buckets.delete(k);
  }
  return { allowed: true, retryInSec: 0 };
}

export const tooManyRequests = (sec: number) =>
  `Trop de tentatives. Merci de patienter ${sec} seconde${sec > 1 ? "s" : ""} avant de réessayer.`;
