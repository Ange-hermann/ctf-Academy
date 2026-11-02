import "server-only";
import { type Tx, withStudent } from "@/lib/student/session";

export type NotificationCategory =
  "announcement" | "message" | "grade" | "comment" | "validation" | "live" | "payment" | "assessment";

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  read: boolean;
};

export type SearchResult = {
  id: string;
  kind: "module" | "lesson" | "message" | "announcement";
  label: string;
  hint: string;
  href: string;
};

/** Messages non lus (écrits par quelqu'un d'autre) : la RLS limite déjà aux conversations de l'étudiant. */
export const unreadMessagesWhere = (userId: string) => ({
  read_at: null,
  OR: [{ author_id: null }, { author_id: { not: userId } }],
});

export async function listNotifications(tx: Tx): Promise<NotificationItem[]> {
  const rows = await tx.notifications.findMany({ orderBy: { created_at: "desc" }, take: 20 });
  return rows.map((n) => ({
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: n.created_at.toISOString(),
    read: n.read_at !== null,
  }));
}

export async function getShellData(userId: string) {
  const [notifications, counts] = await Promise.all([
    withStudent(userId, listNotifications),
    withStudent(userId, async (tx) => ({
      unreadMessages: await tx.messages.count({ where: unreadMessagesWhere(userId) }),
      unreadAnnouncements: await tx.announcements.count({
        where: { announcement_reads: { none: { user_id: userId } } },
      }),
    })),
  ]);
  return { notifications, ...counts };
}

export async function searchStudentContent(userId: string, q: string): Promise<SearchResult[]> {
  const contains = { contains: q, mode: "insensitive" as const };
  return withStudent(userId, async (tx) => {
    const modules = await tx.modules.findMany({ where: { title: contains }, take: 5, orderBy: { sort_order: "asc" } });
    const lessons = await tx.lessons.findMany({
      where: { OR: [{ title: contains }, { content: contains }] },
      take: 6,
      include: { modules: { select: { slug: true, title: true } } },
    });
    const threads = await tx.message_threads.findMany({ where: { subject: contains }, take: 4 });
    const announcements = await tx.announcements.findMany({ where: { title: contains }, take: 3 });
    return [
      ...modules.map((m) => ({
        id: m.id,
        kind: "module" as const,
        label: m.title,
        hint: "Module",
        href: `/espace-etudiant/cours/${m.slug}`,
      })),
      ...lessons.map((l) => ({
        id: l.id,
        kind: "lesson" as const,
        label: l.title,
        hint: `Leçon · ${l.modules.title}`,
        href: `/espace-etudiant/cours/${l.modules.slug}/${l.slug}`,
      })),
      ...threads.map((t) => ({
        id: t.id,
        kind: "message" as const,
        label: t.subject,
        hint: t.category === "trainer" ? "Message · Formateurs" : "Message · Administratif",
        href: `/espace-etudiant/messages/${t.category === "trainer" ? "formateurs" : "administratif"}?fil=${t.id}`,
      })),
      ...announcements.map((a) => ({
        id: a.id,
        kind: "announcement" as const,
        label: a.title,
        hint: "Annonce",
        href: "/espace-etudiant/messages/annonces",
      })),
    ];
  });
}
