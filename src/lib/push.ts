import "server-only";
import webpush from "web-push";
import { getDb } from "@/lib/db";

/**
 * Envoi Web Push (VAPID). La clé publique est exposée côté client pour la
 * souscription ; la clé privée ne quitte jamais le serveur.
 * Sans clés configurées, l'envoi est un no-op (mode dégradé silencieux).
 */
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:contact@example.com";

const configured = Boolean(publicKey && privateKey);
if (configured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
}

export type PushPayload = { title: string; body: string; href?: string };

/**
 * Envoie une notification push à tous les appareils souscrits des utilisateurs
 * donnés (téléphone + ordinateur peuvent chacun avoir leur souscription).
 * Les endpoints expirés (404/410) sont supprimés. Les erreurs réseau sont
 * ignorées : l'envoi push ne doit jamais faire échouer une action métier.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configured || userIds.length === 0) return;
  const db = getDb();
  if (!db) return;
  try {
    const subs = await db.push_subscriptions.findMany({
      where: { user_id: { in: [...new Set(userIds)] } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return;
    const message = JSON.stringify({ title: payload.title, body: payload.body, href: payload.href ?? "/" });
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            message,
            { TTL: 60 * 60 * 12, timeout: 5_000 },
          );
          db.push_subscriptions.update({ where: { id: sub.id }, data: { last_used_at: new Date() } }).catch(() => undefined);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            db.push_subscriptions.delete({ where: { id: sub.id } }).catch(() => undefined);
          }
        }
      }),
    );
  } catch {
    // Envoi best-effort : jamais d'exception vers l'appelant.
  }
}
