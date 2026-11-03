import "server-only";
import { type EnrolledContext, withStudent } from "@/lib/student/session";
import { forLevels, getStudentLevels } from "@/lib/student/queries/levels";

export type ThreadCategory = "trainer" | "administrative";

export const threadCategoryLabels: Record<ThreadCategory, string> = {
  trainer: "Formateurs",
  administrative: "Administratif",
};

export type ThreadSummary = {
  id: string;
  category: ThreadCategory;
  subject: string;
  staffName: string;
  updatedAt: string;
  lastMessage: string | null;
  unread: number;
};

export type MessageItem = {
  id: string;
  authorName: string;
  mine: boolean;
  body: string;
  attachmentName: string | null;
  createdAt: string;
};

export type ThreadDetail = {
  id: string;
  category: ThreadCategory;
  subject: string;
  staffName: string;
  messages: MessageItem[];
};

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorName: string;
  publishedAt: string;
  read: boolean;
  isExample: boolean;
};

export type TicketItem = {
  id: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved";
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ticketStatusLabels: Record<TicketItem["status"], string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
};

const toSummary = (t: {
  id: string;
  category: ThreadCategory;
  subject: string;
  staff_name: string;
  updated_at: Date;
  messages: { body: string; read_at: Date | null; author_id: string | null }[];
}, userId: string): ThreadSummary => ({
  id: t.id,
  category: t.category,
  subject: t.subject,
  staffName: t.staff_name,
  updatedAt: t.updated_at.toISOString(),
  lastMessage: t.messages[0]?.body ?? null,
  unread: t.messages.filter((m) => m.read_at === null && m.author_id !== userId).length,
});

/** Fils de discussion d'une catégorie, triés par activité, avec extrait et nombre de non lus. */
export async function getThreads(ctx: EnrolledContext, category: ThreadCategory): Promise<ThreadSummary[]> {
  const rows = await withStudent(ctx.userId, (tx) =>
    tx.message_threads.findMany({
      where: { student_id: ctx.userId, category },
      orderBy: { updated_at: "desc" },
      include: {
        messages: { orderBy: { created_at: "desc" }, select: { body: true, read_at: true, author_id: true } },
      },
    }),
  );
  return rows.map((t) => toSummary(t, ctx.userId));
}

/** Fil complet (le plus récent en bas), limité au propriétaire par la RLS. */
export async function getThread(ctx: EnrolledContext, threadId: string): Promise<ThreadDetail | null> {
  const t = await withStudent(ctx.userId, (tx) =>
    tx.message_threads.findFirst({
      where: { id: threadId, student_id: ctx.userId },
      include: { messages: { orderBy: { created_at: "asc" } } },
    }),
  );
  if (!t) return null;
  return {
    id: t.id,
    category: t.category,
    subject: t.subject,
    staffName: t.staff_name,
    messages: t.messages.map((m) => ({
      id: m.id,
      authorName: m.author_name,
      mine: m.author_id === ctx.userId,
      body: m.body,
      attachmentName: m.attachment_name,
      createdAt: m.created_at.toISOString(),
    })),
  };
}

/** Annonces (épinglées d'abord), avec marqueur de lecture propre à l'étudiant. */
export async function getAnnouncements(ctx: EnrolledContext): Promise<AnnouncementItem[]> {
  const { rows, levels } = await withStudent(ctx.userId, async (tx) => ({
    levels: await getStudentLevels(tx),
    rows: await tx.announcements.findMany({
      where: { OR: [{ formation_id: null }, { formation_id: ctx.enrollment.formationId }] },
      orderBy: [{ pinned: "desc" }, { published_at: "desc" }],
      include: { announcement_reads: { where: { user_id: ctx.userId }, select: { read_at: true } } },
    }),
  }));
  // Annonces de toute la formation + celles de la classe (niveau en cours) de l'étudiant.
  return rows.filter((a) => forLevels(a.level_id, levels.current)).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    authorName: a.author_name,
    publishedAt: a.published_at.toISOString(),
    read: a.announcement_reads.length > 0,
    isExample: a.is_example,
  }));
}

/** Tickets d'assistance de l'étudiant (suivi des demandes). */
export async function getTickets(ctx: EnrolledContext): Promise<TicketItem[]> {
  const rows = await withStudent(ctx.userId, (tx) =>
    tx.support_tickets.findMany({ orderBy: { created_at: "desc" }, take: 10 }),
  );
  return rows.map((t) => ({
    id: t.id,
    category: t.category,
    subject: t.subject,
    status: t.status,
    resolution: t.resolution,
    createdAt: t.created_at.toISOString(),
    updatedAt: t.updated_at.toISOString(),
  }));
}

/** Vue d'ensemble du centre de messages : compteurs et derniers éléments par canal. */
export async function getMessagesOverview(ctx: EnrolledContext) {
  const [trainer, administrative, announcements, tickets] = await Promise.all([
    getThreads(ctx, "trainer"),
    getThreads(ctx, "administrative"),
    getAnnouncements(ctx),
    getTickets(ctx),
  ]);
  const unreadOf = (list: ThreadSummary[]) => list.reduce((n, t) => n + t.unread, 0);
  return {
    trainer: { threads: trainer.slice(0, 3), unread: unreadOf(trainer), total: trainer.length },
    administrative: { threads: administrative.slice(0, 3), unread: unreadOf(administrative), total: administrative.length },
    announcements: {
      items: announcements.slice(0, 3),
      unread: announcements.filter((a) => !a.read).length,
      total: announcements.length,
    },
    tickets,
  };
}
